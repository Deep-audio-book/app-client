import axios from "@/axios.config";
import PurchaseOptionsCard from "@/components/ui/PurchaseOptionsCard";
import WishlistHeart from "@/components/ui/WishlistHeart";
import { storyWishlisted, useWishlistStore } from "@/redux/slices/wishlistStore";
import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { TFunction } from "i18next";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useDispatch, useSelector } from "react-redux";
import {
  cancelChapterDownloads,
  cancelStoryDownloads,
  debugDownloads,
  deleteChapterDownloads,
  deleteStoryDownloads,
  downloadChapterMedia,
  downloadStoryChapters,
  localUri,
  verifyDownloads,
  withLocalMedia,
} from "../download/downloadService";
import {
  DownloadRecord,
  fileKey,
  useDownloadStore,
  waitForHydration,
} from "../download/downloadStore";
import type { Chapter, MediaKind, StoryDetail } from "../download/types";

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusRefetch } from "../../hooks/useFocusRefetch";
import { usePlayer } from "../../providers/PlayerProvider";
import { setIsExpanded } from "../../redux/slices/playerReducer";
import { RootState } from "../../redux/store";
import styles, {
  BASE_WIDTH,
  COLORS,
  MAX_CONTENT_WIDTH,
  MINI_PLAYER_HEIGHT,
} from "./episodeStyle";

// Bookmarks tab removed
type TabKey = "about" | "chapters";

// Shape of one item in the "Recommended" list coming from the backend
type RecommendedStory = {
  id: string | number;
  title: string;
  cover: string;
  genre?: string;
  like?: boolean;
};

// One story inside the user's cart (comes from backend `getCart`)
type CartItem = {
  id: string | number;
  title: string;
  cover?: string;
  genre?: string;
  price_inr?: number;
  price_usd?: number;
};

// TODO: put the route path of THIS screen here (the file name of this screen
// inside your expo-router `app/` folder), so tapping a recommended story
// opens its own page.
const ALBUM_ROUTE = "/storyEpisode";

// TODO: your checkout / cart screen route (used by the "Checkout" button)
const CART_ROUTE = "/cart";

// TODO: your website / deep link base (used if backend sends no `share_url`)
const SHARE_BASE_URL = "https://yourdomain.com/story";

// Backend method that returns the recommended / latest stories
const RECOMMENDED_METHOD = "getRecommendedStories";
const RECOMMENDED_LIMIT = 10;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Backend decides which episodes are free. Handles true / 1 / "1" / "true".
function isFree(chapter?: { free?: unknown } | null) {
  const value = chapter?.free;
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatPrice(amount?: number, currency: "INR" | "USD" = "INR") {
  if (amount === undefined || amount === null) return "";
  const symbol = currency === "INR" ? "₹" : "$";
  const isWhole = currency === "INR" && Number.isInteger(amount);
  return `${symbol}${isWhole ? amount : amount.toFixed(2)}`;
}

function formatTotalDuration(chapters: Chapter[], t: TFunction) {
  const totalSeconds = chapters.reduce(
    (sum, chapter) => sum + (chapter.duration_in_seconds || 0),
    0
  );
  if (!totalSeconds) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0
      ? t("album.durationHM", { h: hours, m: minutes })
      : t("album.durationH", { h: hours });
  }
  return t("album.durationM", { m: minutes });
}

// Chapters the user has listened to (kept per story while the app is open,
// so the bright line is still there when you come back to the screen).
// If your backend sends a flag (listened / is_listened / completed) on each
// chapter, that is used too (see isChapterListened below).
const listenedStore = new Map<string, Set<string>>();

// ---- Winding path layout (chapter list) ----
const NORMAL_H = 64; // normal row height
const ACTIVE_H = 90; // playing row height
const ROW_GAP = 22; // gap between rows (the glowing line shows here)
// 0 = card sticks to left edge, 1 = sticks to right edge
const PATH_PATTERN = [0, 1, 0.12, 0.88];

function rowGeometry(index: number, active: boolean, rowWidth: number) {
  const w = active ? rowWidth : Math.round(rowWidth * 0.8);
  const slack = rowWidth - w;
  const left = active
    ? 0
    : Math.round(slack * PATH_PATTERN[index % PATH_PATTERN.length]);
  return { w, left, h: active ? ACTIVE_H : NORMAL_H, cx: left + w / 2 };
}

// Glowing curve from this row's centre to the next row's centre.
// It is drawn BEHIND the cards (next rows paint on top of it).
function PathConnector({
  fromX,
  toX,
  fromH,
  toH,
  width,
  lit,
}: {
  fromX: number;
  toX: number;
  fromH: number;
  toH: number;
  width: number;
  // true = both chapters already listened -> bright glowing line
  lit: boolean;
}) {
  const startY = fromH / 2;
  const endY = fromH + ROW_GAP + toH / 2;
  const midY = (startY + endY) / 2;
  const d = `M ${fromX} ${startY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${endY}`;

  return (
    <Svg
      width={width}
      height={endY + 6}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {lit ? (
        <>
          {/* outer glow */}
          <Path
            d={d}
            stroke={COLORS.gold}
            strokeOpacity={0.18}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
          {/* inner glow */}
          <Path
            d={d}
            stroke={COLORS.gold}
            strokeOpacity={0.4}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          {/* bright core */}
          <Path
            d={d}
            stroke="#FFE2A3"
            strokeOpacity={1}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={fromX} cy={startY} r={5} fill={COLORS.gold} fillOpacity={0.35} />
          <Circle cx={fromX} cy={startY} r={3} fill="#FFE2A3" />
          <Circle cx={toX} cy={endY} r={5} fill={COLORS.gold} fillOpacity={0.35} />
          <Circle cx={toX} cy={endY} r={3} fill="#FFE2A3" />
        </>
      ) : (
        <>
          {/* dull line: not listened yet */}
          <Path
            d={d}
            stroke="#FFFFFF"
            strokeOpacity={0.13}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={fromX} cy={startY} r={2.5} fill="#FFFFFF" fillOpacity={0.2} />
          <Circle cx={toX} cy={endY} r={2.5} fill="#FFFFFF" fillOpacity={0.2} />
        </>
      )}
    </Svg>
  );
}

// ---------------------------------------------------------
// Equalizer (wave) bars - animate while playing, flatten when paused
// ---------------------------------------------------------

function EqualizerBars({
  playing,
  color = COLORS.gold,
}: {
  playing: boolean;
  color?: string;
}) {
  const bars = useRef([0, 1, 2, 3].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!playing) {
      bars.forEach((b) => {
        b.stopAnimation();
        Animated.timing(b, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    const loops = bars.map((b, i) => {
      const d = 360 + i * 90; // each bar different speed = wave look
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(b, {
            toValue: 1,
            duration: d,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(b, {
            toValue: 0.25,
            duration: d,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });

    return () => loops.forEach((l) => l.stop());
  }, [playing]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: 22,
        height: 16,
        marginRight: 8,
      }}
    >
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY: b }],
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------
// Cover-driven background
// ---------------------------------------------------------
// The blurred cover is the whole screen background, so every story
// automatically gets its own colours. Dark gradients on top keep the
// text readable.

function CoverBackground({ uri }: { uri?: string | null }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#07060A" }]} />

      {/* Full-screen blurred cover (no hard edge halfway down the screen).
          recyclingKey + transition = old story's cover never lingers and the
          new one fades in smoothly. */}
      {!!uri && (
        <Image
          key={uri}
          source={{ uri }}
          style={localStyles.bgImage}
          contentFit="cover"
          blurRadius={Platform.OS === "android" ? 24 : 40}
          transition={400}
          cachePolicy="memory-disk"
          recyclingKey={uri}
        />
      )}

      {/* One long, smooth fade: some cover colour at the top, almost black at
          the bottom. Many stops = no visible band / cut line. */}
      <LinearGradient
        colors={[
          "rgba(7,6,10,0.30)",
          "rgba(7,6,10,0.55)",
          "rgba(7,6,10,0.80)",
          "rgba(7,6,10,0.93)",
          "rgba(7,6,10,0.97)",
        ]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* soft vignette at the very top for the header icons */}
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]}
        style={localStyles.topShade}
      />
    </View>
  );
}

// ---------------------------------------------------------
// Currency Toggle
// ---------------------------------------------------------

function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: "INR" | "USD";
  onChange: (currency: "INR" | "USD") => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={localStyles.currencyToggle}>
      {(["INR", "USD"] as const).map((option) => {
        const active = currency === option;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            hitSlop={6}
            style={[
              localStyles.currencyToggleOption,
              active && localStyles.currencyToggleOptionActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("album.showPrices", { currency: option })}
          >
            <Text
              style={[
                localStyles.currencyToggleText,
                active && localStyles.currencyToggleTextActive,
              ]}
            >
              {option === "INR" ? "₹ INR" : "$ USD"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------
// Download control (per episode)
// ---------------------------------------------------------

function DownloadControl({
  story,
  track,
}: {
  story: StoryDetail;
  track: Chapter;
}) {
  const { t } = useTranslation();
  const audio = useDownloadStore((s) => s.files[fileKey(story.id, track.id, "audio")]);
  const video = useDownloadStore((s) => s.files[fileKey(story.id, track.id, "video")]);
  const hasVideo = track.video_status === 1;

  const active = [audio, video].filter(
    (r): r is DownloadRecord => r?.status === "downloading"
  );
  const downloading = active.length > 0;
  const downloaded = audio?.status === "downloaded";
  const failed = audio?.status === "failed";
  const progress = active.length
    ? active.reduce((sum, r) => sum + r.progress, 0) / active.length
    : 0;

  const start = async (kinds: MediaKind[]) => {
    try {
      for (const kind of kinds) {
        await downloadChapterMedia(story, track, kind);
      }
    } catch (error: any) {
      Alert.alert(
        t("album.download.failedTitle"),
        error?.message ?? t("album.download.tryAgain")
      );
    }
  };

  const handlePress = () => {
    if (downloading) {
      Alert.alert(t("album.download.cancelTitle"), track.title, [
        { text: t("album.download.keep"), style: "cancel" },
        {
          text: t("album.download.cancelAction"),
          style: "destructive",
          onPress: () => cancelChapterDownloads(story.id, track.id),
        },
      ]);
      return;
    }

    if (downloaded) {
      const buttons: any[] = [
        { text: t("album.download.close"), style: "cancel" },
      ];
      if (hasVideo && video?.status !== "downloaded") {
        buttons.push({
          text: t("album.download.videoToo"),
          onPress: () => start(["video"]),
        });
      }
      buttons.push({
        text: t("album.download.remove"),
        style: "destructive",
        onPress: () => deleteChapterDownloads(story.id, track.id),
      });
      Alert.alert(
        t("album.download.downloadedTitle"),
        t("album.download.downloadedMsg", { title: track.title }),
        buttons
      );
      return;
    }

    if (hasVideo) {
      Alert.alert(t("album.download.episodeTitle"), track.title, [
        { text: t("album.download.audioOnly"), onPress: () => start(["audio"]) },
        {
          text: t("album.download.audioVideo"),
          onPress: () => start(["audio", "video"]),
        },
        { text: t("album.download.cancel"), style: "cancel" },
      ]);
      return;
    }

    start(["audio"]);
  };

  // Downloaded state is already shown by the green tick on the cover,
  // so here we only show the download / progress / failed icon.
  return (
    <Pressable
      hitSlop={10}
      style={localStyles.dlButton}
      onPress={(event) => {
        event.stopPropagation();
        handlePress();
      }}
      accessibilityRole="button"
      accessibilityLabel={
        downloaded
          ? t("album.download.downloadedTitle")
          : t("album.download.episodeTitle")
      }
    >
      {downloading ? (
        <Text style={localStyles.dlPercent}>{Math.round(progress * 100)}%</Text>
      ) : downloaded ? (
        <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />
      ) : (
        <Ionicons
          name="arrow-down-circle-outline"
          size={22}
          color={failed ? "#E57373" : COLORS.textFaint}
        />
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------
// Track Row (glass card on a winding glowing path)
// ---------------------------------------------------------

function TrackRow({
  track,
  story,
  chapterIndex,
  index,
  locked,
  offline,
  isActive,
  isPlaying,
  fallbackCover,
  rowWidth,
  hasNext,
  nextActive,
  lineLit,
  prepareChapters,
  onLockedPress,
}: {
  track: Chapter;
  story: StoryDetail;
  chapterIndex: number;
  index: number;
  locked: boolean;
  offline: boolean;
  isActive: boolean;
  isPlaying: boolean;
  fallbackCover?: string | null;
  rowWidth: number;
  hasNext: boolean;
  nextActive: boolean;
  lineLit: boolean;
  prepareChapters: () => Promise<void>;
  onLockedPress: () => void;
}) {
  const { t } = useTranslation();
  const player = usePlayer() as any;
  const { playChapterAt } = player;
  const dispatch = useDispatch();
  const router = useRouter();

  const audioRecord = useDownloadStore((s) => s.files[fileKey(story.id, track.id, "audio")]);
  const hasLocalAudio = audioRecord?.status === "downloaded";

  // A downloaded episode was already unlocked when it was downloaded.
  const effectiveLocked = locked && !hasLocalAudio;
  const unavailableOffline = offline && !hasLocalAudio;
  const dimmed = effectiveLocked || unavailableOffline;

  // Active chapter tap -> pause / resume (does not open the player screen).
  const togglePlayback = () => {
    player.handlePlayPause?.();
  };

  const onPressPlay = async () => {
    if (isActive) {
      togglePlayback();
      return;
    }

    if (unavailableOffline) {
      Alert.alert(t("album.offlineTitle"), t("album.offlineDownloadToListen"));
      return;
    }

    if (effectiveLocked) {
      onLockedPress();
      return;
    }

    try {
      // Hand THIS story's episodes to the player only now (user pressed play)
      await prepareChapters();
      await playChapterAt(chapterIndex, { autoPlay: true });
      dispatch(setIsExpanded(true));
      router.push("/player-standard");
    } catch (error) {
      console.error("Play chapter error:", error);
    }
  };

  const thumb = (track as any).cover || fallbackCover;
  const thumbSize = isActive ? 66 : 46;
  const thumbRadius = isActive ? thumbSize / 2 : 12;

  // winding-path geometry
  const geo = rowGeometry(index, isActive, rowWidth);
  const nextGeo = rowGeometry(index + 1, nextActive, rowWidth);

  return (
    <View style={{ height: geo.h, width: rowWidth, overflow: "visible" }}>
      {/* glowing line to the next chapter (behind the cards) */}
      {hasNext && (
        <PathConnector
          fromX={geo.cx}
          toX={nextGeo.cx}
          fromH={geo.h}
          toH={nextGeo.h}
          width={rowWidth}
          lit={lineLit}
        />
      )}

      <View
        style={{
          position: "absolute",
          left: geo.left,
          width: geo.w,
          height: geo.h,
        }}
      >
        <Pressable
          onPress={onPressPlay}
          android_ripple={{ color: "rgba(200,155,76,0.12)" }}
          style={({ pressed }) => [
            localStyles.card,
            { height: geo.h, backgroundColor: "rgba(18,15,14,0.92)" },
            isActive && localStyles.cardActive,
            isActive && { backgroundColor: "rgba(52,38,14,0.94)" },
            dimmed && localStyles.cardDimmed,
            pressed && localStyles.cardPressed,
          ]}
        >
          {/* Thumbnail */}
          <View
            style={[
              localStyles.thumbWrap,
              { width: thumbSize, height: thumbSize, borderRadius: thumbRadius },
              isActive && localStyles.thumbWrapActive,
            ]}
          >
            {!!thumb && (
              <Image
                source={{ uri: thumb }}
                style={{ width: "100%", height: "100%", borderRadius: thumbRadius }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={String(track.id)}
                blurRadius={effectiveLocked ? 6 : 0}
              />
            )}

            {isActive && (
              <View style={localStyles.thumbCenterIcon}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={20}
                  color={COLORS.cream}
                />
              </View>
            )}

            {/* Downloaded tick */}
            {hasLocalAudio && !isActive && (
              <View style={localStyles.tickBadge}>
                <Ionicons name="checkmark" size={12} color="#0B2A1D" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={localStyles.cardInfo}>
            <Text
              style={[localStyles.cardTitle, isActive && localStyles.cardTitleActive]}
              numberOfLines={1}
            >
              {track.title}
            </Text>

            {isActive ? (
              <View style={localStyles.activeMetaRow}>
                <EqualizerBars playing={isPlaying} />
                <Text style={localStyles.cardTime}>
                  {String(track.number).padStart(2, "0")} ·{" "}
                  {isPlaying ? t("album.nowPlaying") : t("album.paused")} ·{" "}
                  {track.duration}
                </Text>
              </View>
            ) : (
              <Text style={localStyles.cardTime}>
                {String(track.number).padStart(2, "0")} · {track.duration}
              </Text>
            )}
          </View>

          {/* Right side */}
          <View style={localStyles.cardRight}>
            {effectiveLocked ? (
              <Ionicons name="lock-closed" size={18} color={COLORS.textFainter} />
            ) : unavailableOffline ? (
              <Text style={localStyles.lockedLabel}>{t("album.onlineOnly")}</Text>
            ) : (
              <>
                {track.video_status === 1 && (
                  <View style={localStyles.videoBadge}>
                    <Ionicons name="videocam" size={11} color={COLORS.gold} />
                  </View>
                )}
                <DownloadControl story={story} track={track} />
              </>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// Credits Section
// ---------------------------------------------------------

function CreditsSection({ credits }: { credits: string }) {
  const { t } = useTranslation();

  if (!credits) {
    return null;
  }

  const creditItems = credits
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <View style={[styles.creditsSection, localStyles.creditsCard]}>
      <Text style={styles.creditsHeading}>{t("album.credits")}</Text>

      {creditItems.map((item, index) => {
        const separatorIndex = item.indexOf(":");

        let label = item;
        let value = "";

        if (separatorIndex !== -1) {
          label = item.substring(0, separatorIndex).trim();
          value = item.substring(separatorIndex + 1).trim();
        }

        return (
          <View key={`${item}-${index}`} style={styles.creditsRow}>
            <Text style={styles.creditsLabel}>{label}</Text>

            {value ? <Text style={styles.creditsValue}>{value}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------
// Tabs
// ---------------------------------------------------------

function RecommendedSection({
  stories,
  onPressStory,
}: {
  stories: RecommendedStory[];
  onPressStory: (story: RecommendedStory) => void;
}) {
  const { t } = useTranslation();

  if (!stories.length) return null;

  return (
    <View style={localStyles.recSection}>
      <Text style={styles.creditsHeading}>{t("album.recommended")}</Text>

      <FlatList
        data={stories}
        horizontal
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={localStyles.recList}
        ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressStory(item)}
            style={({ pressed }) => [
              localStyles.recCard,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("album.openStory", { title: item.title })}
          >
            <View>
              <Image
                source={{ uri: item.cover }}
                style={localStyles.recCover}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={String(item.id)}
              />

              {/* Same shared heart as every other screen */}
              <View style={localStyles.recHeart}>
                <WishlistHeart
                  storyId={item.id}
                  initialLiked={storyWishlisted(item)}
                  size={14}
                />
              </View>
            </View>

            <Text style={localStyles.recTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {!!item.genre && (
              <Text style={localStyles.recGenre} numberOfLines={1}>
                {item.genre}
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: "about", labelKey: "album.tabs.about" },
  { key: "chapters", labelKey: "album.tabs.chapters" },
];

function Tabs({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={localStyles.tabsRow}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            hitSlop={6}
            style={[localStyles.tab, active && localStyles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {active && <View style={localStyles.tabDot} />}
            <Text style={[localStyles.tabText, active && localStyles.tabTextActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------
// Main Screen
// ---------------------------------------------------------

export default function AlbumScreen() {
  const { storyId, cover: coverParam } = useLocalSearchParams<{
    storyId?: string;
    title?: string;
    cover?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  const [storyDetail, setStoryDetail] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // true when the story was loaded from the offline snapshot
  const [fromCache, setFromCache] = useState(false);
  const [tab, setTab] = useState<TabKey>("chapters");
  const [recommended, setRecommended] = useState<RecommendedStory[]>([]);

  // true once a story is on screen -> later focus refetches are silent
  // (no full-screen spinner / error screen when coming back from the player)
  const storyLoadedRef = useRef(false);

  // The screen can be re-used for another story (e.g. tapping a recommended
  // story). `isStale` = the story in state is NOT the one in the route, so we
  // never show the previous story's cover/details while the new one loads.
  const latestStoryIdRef = useRef(String(storyId));
  latestStoryIdRef.current = String(storyId);
  const isStale = !!storyDetail && String(storyDetail.id) !== String(storyId);
  storyLoadedRef.current = !!storyDetail && !isStale;

  // Pay-per-book state
  const [purchased, setPurchased] = useState(false);
  // One-time "listen to this book only" rental + unlimited subscription
  const [rented, setRented] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [rentBusy, setRentBusy] = useState(false);
  const [cartState, setCartState] = useState<"idle" | "loading" | "added">(
    "idle"
  );
  // Total number of stories in the user's cart (shown as badge on cart icon)
  const [cartCount, setCartCount] = useState(0);
  // Cart popup (opens from the header cart icon) + the stories inside it
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const player = usePlayer() as any;
  const { playChapterAt, setChapters } = player;
  const currentChapterId: number | string | undefined =
    player.currentChapter?.id ?? player.currentTrack?.id;

  // Read isPlaying from the SAME redux slice the player screen uses
  const isPlayerPlaying = useSelector((s: RootState) => !!s.player.isPlaying);

  // Which story does the player (mini player) currently hold?
  const playerStoryId: string | number | undefined =
    player.currentChapter?.storyId ??
    player.currentTrack?.storyId ??
    player.chapters?.[0]?.storyId;
  const playerHasStory = playerStoryId !== undefined && playerStoryId !== null;
  const dispatch = useDispatch();

  // Listened chapters of THIS story (drives the bright / dull line)
  const [listenedIds, setListenedIds] = useState<Set<string>>(new Set());

  // story changed -> load what was already listened for it
  useEffect(() => {
    if (!storyDetail) return;
    setListenedIds(
      new Set(listenedStore.get(String(storyDetail.id)) ?? [])
    );
  }, [storyDetail?.id]);

  // a chapter of THIS story is playing -> mark it as listened
  useEffect(() => {
    if (!storyDetail || currentChapterId === undefined) return;
    if (String(playerStoryId) !== String(storyDetail.id)) return;

    const sid = String(storyDetail.id);
    const cid = String(currentChapterId);

    const saved = listenedStore.get(sid) ?? new Set<string>();
    saved.add(cid);
    listenedStore.set(sid, saved);

    setListenedIds((prev) => {
      if (prev.has(cid)) return prev;
      const next = new Set(prev);
      next.add(cid);
      return next;
    });
  }, [currentChapterId, playerStoryId, storyDetail?.id]);

  // Network state
  const netInfo = useNetInfo();
  const offline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const isOfflineMode = offline || fromCache;

  const downloadedSig = useDownloadStore((s) =>
    storyDetail
      ? storyDetail.chapters
          .map(
            (c) =>
              `${s.files[fileKey(storyDetail.id, c.id, "audio")]?.status === "downloaded" ? 1 : 0}${
                s.files[fileKey(storyDetail.id, c.id, "video")]?.status === "downloaded" ? 1 : 0
              }${s.files[fileKey(storyDetail.id, c.id, "audio")]?.coverFile ? 1 : 0}`
          )
          .join("")
      : ""
  );
  const downloadedCount = useDownloadStore((s) =>
    storyDetail
      ? storyDetail.chapters.filter(
          (c) => s.files[fileKey(storyDetail.id, c.id, "audio")]?.status === "downloaded"
        ).length
      : 0
  );
  const downloadingCount = useDownloadStore((s) =>
    storyDetail
      ? storyDetail.chapters.filter(
          (c) => s.files[fileKey(storyDetail.id, c.id, "audio")]?.status === "downloading"
        ).length
      : 0
  );
  const coverFile = useDownloadStore((s) =>
    storyId ? s.stories[String(storyId)]?.coverFile : null
  );

  // -------------------------------------------------------
  // Fetch Story Detail (falls back to offline snapshot)
  // -------------------------------------------------------

  useEffect(() => {
    verifyDownloads();
  }, []);

  // Runs on first open AND every time this screen comes back into focus
  // (e.g. after closing the player, finishing a purchase, subscribing, or
  // changing the language), so story, lock state and recommendations are
  // always fresh. First load shows the spinner; later refetches are silent.
  useFocusRefetch(async () => {
    if (!storyId) return;

    await fetchStoryDetail(storyLoadedRef.current);

    if (!offline) {
      await fetchRecommended();
    }
  });

  // storyId changed while this screen stays mounted -> throw away the old
  // story right away and load the new one (focus refetch won't fire here,
  // because the screen never lost focus).
  const prevStoryIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = String(storyId);

    // first mount: useFocusRefetch already loads it
    if (prevStoryIdRef.current === undefined) {
      prevStoryIdRef.current = id;
      return;
    }
    if (prevStoryIdRef.current === id) return;
    prevStoryIdRef.current = id;

    setStoryDetail(null);
    setPurchased(false);
    setRented(false);
    setIsSubscribed(false);
    setFromCache(false);
    setCartState("idle");
    setCartOpen(false);
    setRecommended([]);
    setTab("chapters");
    setError(null);
    setLoading(true);

    fetchStoryDetail(false);
    if (!offline) fetchRecommended();
  }, [storyId]);

  // Back online after showing the offline snapshot -> refresh quietly
  useEffect(() => {
    if (fromCache && !offline && storyId) {
      fetchStoryDetail(true);
      fetchRecommended();
    }
  }, [offline]);

  const playerChapters = useMemo(() => {
    if (!storyDetail) return [];

    const isLocal = (url?: string | null) => !!url?.startsWith("file://");

    // Story cover (local copy when downloaded). The player uses it as the
    // artwork + blurred background for chapters that have no cover of their own.
    const savedCover = useDownloadStore.getState().stories[String(storyDetail.id)]?.coverFile;
    const storyCover = savedCover ? localUri(savedCover) : storyDetail.cover;

    const all = withLocalMedia(storyDetail.id, storyDetail.chapters ?? []).map((chapter) => ({
      ...chapter,
      // No chapter cover -> use the story cover. Doing it here means the
      // player screen AND the mini player (which only read `cover`) both get it.
      cover: chapter.cover || storyCover,
      story: storyDetail.title,
      storyId: storyDetail.id,
      storyCover,
    }));

    if (!isOfflineMode) return all;

    return all
      .filter((chapter) => isLocal(chapter.audio_url))
      .map((chapter) =>
        isLocal(chapter.video_url)
          ? chapter
          : { ...chapter, video_url: null, video_status: 0 }
      );
  }, [storyDetail, downloadedSig, isOfflineMode]);

  // chapter id -> index in the player list (O(1) lookup, matters for 100+ episodes)
  const chapterIndexById = useMemo(() => {
    const map = new Map<string, number>();
    playerChapters.forEach((c, i) => map.set(String(c.id), i));
    return map;
  }, [playerChapters]);

  useEffect(() => {
    if (!storyDetail) return;

    if (__DEV__) {
      debugDownloads();
    }

    // IMPORTANT: do NOT push this story's episodes into the player just
    // because the page opened - that replaced whatever was already in the
    // mini player. Only keep the list in sync when the player is already on
    // THIS story (e.g. an episode finished downloading -> local file url).
    if (playerHasStory && String(playerStoryId) === String(storyDetail.id)) {
      setChapters(playerChapters);
    }
  }, [playerChapters]);

  // Called right before playing: load this story into the player if it
  // isn't there yet (user explicitly pressed play).
  const prepareChapters = async () => {
    if (!storyDetail) return;
    if (playerHasStory && String(playerStoryId) === String(storyDetail.id)) return;

    setChapters(playerChapters);
    // let the provider commit the new list before playChapterAt reads it
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  };

  const fetchStoryDetail = async (silent = false) => {
    // If the route changes to another story while this request is running,
    // its response must be ignored (otherwise the old story comes back).
    const requestId = String(storyId);
    const isCurrent = () => requestId === latestStoryIdRef.current;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const response = await axios.post("/", {
        method: "getStoryDetail",
        story_id: Number(storyId),
      });

      if (!isCurrent()) return;

      if (
        response.data &&
        response.data.statusCode === 200 &&
        response.data.data
      ) {
        const story: StoryDetail = response.data.data;

        // The backend puts the user-specific flags at the TOP LEVEL of the
        // response (next to `data`), e.g.
        //   { is_subscribed, subscription: { is_active, expiry_date },
        //     is_rented,     rental:       { is_active, expiry_date }, data: {...} }
        // so read them from there first, then fall back to `data.*`.
        const root: any = response.data;
        const detail0: any = story;
        const flag = (...values: unknown[]) => {
          const found = values.find((v) => v !== undefined && v !== null);
          return Boolean(found);
        };

        setStoryDetail(story);
        setPurchased(
          flag(detail0.is_purchased, root.is_purchased, root.purchase?.is_active)
        );
        // is_subscribed must be false for new users AND users whose plan expired.
        setRented(flag(root.is_rented, root.rental?.is_active, detail0.is_rented));
        setIsSubscribed(
          flag(root.is_subscribed, root.subscription?.is_active, detail0.is_subscribed)
        );
        setFromCache(false);

        // Cart: total items in cart + is THIS story already in the cart
        setCartCount(Number(root.cart_count ?? detail0.cart_count ?? 0));
        setCartState(flag(root.in_cart, detail0.in_cart) ? "added" : "idle");

        // Backend `like` anuppina, global wishlist store la seed panrom
        // (store la already value irundha overwrite aagadhu)
        const detail: any = story;
        if (detail.wishlisted != null || detail.like != null) {
          useWishlistStore.getState().seed(story.id, storyWishlisted(detail));
        }

        // Keep the offline snapshot fresh if this story has downloads
        await waitForHydration();
        const store = useDownloadStore.getState();
        if (store.stories[String(story.id)]) {
          store.saveStory(story);
        }
      } else if (!silent) {
        setError(t("album.loadFailed"));
      }
    } catch (err: any) {
      console.error("getStoryDetail error:", err);
      if (silent || !isCurrent()) return;

      // No response from server = network problem -> try the offline copy
      const isNetworkError = !err?.response;
      await waitForHydration();
      const cached = useDownloadStore.getState().stories[String(storyId)];

      if (isNetworkError && cached) {
        setStoryDetail(cached);
        setPurchased(Boolean(cached.is_purchased));
        setFromCache(true);
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("album.somethingWentWrong")
        );
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const fetchRecommended = async () => {
    const requestId = String(storyId);

    try {
      const response = await axios.post("/", {
        method: RECOMMENDED_METHOD,
        story_id: Number(storyId), // so the backend can exclude this story
        limit: RECOMMENDED_LIMIT,
      });

      if (requestId !== latestStoryIdRef.current) return;

      const payload = response.data?.data;
      const list: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.stories)
        ? payload.stories
        : [];

      const items: RecommendedStory[] = list
        .filter((s) => s && s.id != null && String(s.id) !== String(storyId))
        .slice(0, RECOMMENDED_LIMIT)
        .map((s) => ({
          id: s.id,
          title: s.title,
          cover: s.cover,
          genre: s.genre,
          like: storyWishlisted(s),
        }));

      setRecommended(items);

      // Recommended stories oda like status um global store la seed
      useWishlistStore.getState().seedMany(items);

      // Download the covers in the background, so opening one is instant
      const covers = items.map((i) => i.cover).filter(Boolean);
      if (covers.length) {
        Image.prefetch(covers, "memory-disk").catch(() => {});
      }
    } catch (err) {
      // Recommendations are optional - just hide the section
      console.warn("Recommended stories error:", err);
      setRecommended([]);
    }
  };

  const openRecommended = (story: RecommendedStory) => {
    if (story.cover) {
      Image.prefetch(story.cover, "memory-disk").catch(() => {});
    }

    router.push({
      pathname: ALBUM_ROUTE as any,
      params: {
        storyId: String(story.id),
        title: story.title,
        cover: story.cover, // lets the next screen show the cover instantly
      },
    });
  };

  // -------------------------------------------------------
  // Pay-per-book: add to cart
  // -------------------------------------------------------

  const handleAddToCart = async () => {
    // Active subscribers never buy individual books (everything is unlocked)
    if (!storyDetail || cartState === "loading" || purchased || isSubscribed) return;

    try {
      setCartState("loading");

      const res = await axios.post("/", {
        method: "addToCart",
        story_id: Number(storyDetail.id),
      });

      const data = res.data?.data;
      setCartCount(Number(data?.cart_count ?? cartCount + 1));
      setCartState("added");
    } catch (error: any) {
      console.error("Add to cart error:", error);
      setCartState("idle");

      Alert.alert(
        t("album.cart.failTitle"),
        error?.response?.data?.message ||
          error?.message ||
          t("album.download.tryAgain")
      );
    }
  };

  // -------------------------------------------------------
  // Cart popup: list of stories in the cart
  // -------------------------------------------------------

  const fetchCart = async () => {
    try {
      setCartLoading(true);

      const res = await axios.post("/", { method: "getCart" });
      const payload = res.data?.data;
      const list: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      const items: CartItem[] = list
        .filter((s) => s && s.id != null)
        .map((s) => ({
          id: s.id,
          title: s.title,
          cover: s.cover,
          genre: s.genre,
          price_inr: s.price_inr,
          price_usd: s.price_usd,
        }));

      setCartItems(items);
      setCartCount(Number(payload?.cart_count ?? items.length));
    } catch (err: any) {
      console.error("getCart error:", err);
      Alert.alert(
        t("album.cart.failTitle"),
        err?.response?.data?.message ||
          err?.message ||
          t("album.download.tryAgain")
      );
      setCartOpen(false);
    } finally {
      setCartLoading(false);
    }
  };

  // Header cart icon: just OPEN the list (adding is done from the
  // purchase card / locked episode popup)
  const handleCartPress = () => {
    if (offline) {
      Alert.alert(t("album.offlineTitle"), t("album.offlineConnectUnlock"));
      return;
    }
    setCartOpen(true);
    fetchCart();
  };

  const closeCart = () => setCartOpen(false);

  const handleRemoveFromCart = async (item: CartItem) => {
    // remove right away, put it back if the request fails
    const previous = cartItems;
    setCartItems(previous.filter((c) => String(c.id) !== String(item.id)));

    try {
      const res = await axios.post("/", {
        method: "removeFromCart",
        story_id: Number(item.id),
      });

      setCartCount(
        Number(res.data?.data?.cart_count ?? Math.max(previous.length - 1, 0))
      );

      // removed the story we are looking at -> header icon goes back to normal
      if (storyDetail && String(item.id) === String(storyDetail.id)) {
        setCartState("idle");
      }
    } catch (err: any) {
      console.error("removeFromCart error:", err);
      setCartItems(previous);
      Alert.alert(
        t("album.cart.failTitle"),
        err?.response?.data?.message ||
          err?.message ||
          t("album.download.tryAgain")
      );
    }
  };

  const openCartStory = (item: CartItem) => {
    closeCart();
    if (storyDetail && String(item.id) === String(storyDetail.id)) return;

    router.push({
      pathname: ALBUM_ROUTE as any,
      params: {
        storyId: String(item.id),
        title: item.title,
        cover: item.cover,
      },
    });
  };

  const handleCheckout = () => {
    closeCart();
    router.push(CART_ROUTE as any);
  };

  // -------------------------------------------------------
  // Share story
  // -------------------------------------------------------

  const handleShare = async () => {
    if (!storyDetail) return;

    const url =
      (storyDetail as any).share_url ?? `${SHARE_BASE_URL}/${storyDetail.id}`;

    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message: storyDetail.title, url }
          : { message: `${storyDetail.title}\n${url}` }
      );
    } catch (err) {
      console.warn("Share error:", err);
    }
  };

  // -------------------------------------------------------
  // One-time "listen to this book only" (rental)
  // -------------------------------------------------------

  const handleRentListen = async () => {
    if (!storyDetail || rentBusy || purchased || rented || isSubscribed) return;

    try {
      setRentBusy(true);

      await axios.post("/", {
        method: "rentStory",
        story_id: Number(storyDetail.id),
      });

      setRented(true);
      // Refresh quietly so the backend unlocks the episode audio urls
      await fetchStoryDetail(true);
    } catch (error: any) {
      console.error("Rent story error:", error);

      Alert.alert(
        t("album.cart.failTitle"),
        error?.response?.data?.message ||
          error?.message ||
          t("album.download.tryAgain")
      );
    } finally {
      setRentBusy(false);
    }
  };

  const handleSubscribe = () => {
    router.push("/plans");
  };

  const onLockedChapterPress = () => {
    if (!storyDetail) return;

    if (offline) {
      Alert.alert(t("album.offlineTitle"), t("album.offlineConnectUnlock"));
      return;
    }

    const price =
      currency === "INR" ? storyDetail.price_inr : storyDetail.price_usd;

    Alert.alert(
      t("album.lockedTitle"),
      t("album.lockedMsg", {
        title: storyDetail.title,
        price: formatPrice(price, currency),
      }),
      [
        { text: t("album.notNow"), style: "cancel" },
        { text: t("album.cart.add"), onPress: handleAddToCart },
      ]
    );
  };

  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  if (loading || isStale) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#07060A",
          },
        ]}
      >
        {/* cover from the route params (if the previous screen passed it) */}
        <CoverBackground uri={coverParam} />
        <StatusBar style="light" />

        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          style={[localStyles.loadingBack, { top: insets.top + 6 }]}
          accessibilityRole="button"
          accessibilityLabel={t("album.goBack")}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.cream} />
        </Pressable>

        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>
          {t("album.loading")}
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------
  // Error
  // -------------------------------------------------------

  if (error || !storyDetail) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
        ]}
      >
        <StatusBar style="light" />
        <View style={localStyles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.gold} />
        </View>
        <Text
          style={{
            color: COLORS.cream,
            fontSize: 16,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 22,
          }}
        >
          {error || t("album.notFound")}
        </Text>

        <Pressable
          onPress={() => fetchStoryDetail()}
          style={({ pressed }) => [
            localStyles.retryButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="refresh" size={16} color={COLORS.bgDeep} />
          <Text style={{ color: COLORS.bgDeep, fontWeight: "600", marginLeft: 6 }}>
            {t("album.retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  // -------------------------------------------------------
  // Responsive values
  // -------------------------------------------------------

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.9, 1.2);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(20 * scale), sideInset);

  const coverSize = Math.round(clampValue(124 * scale, 100, 144));

  const hasPaidContent =
    !!storyDetail.chapters?.some((chapter) => !isFree(chapter)) &&
    (typeof storyDetail.price_inr === "number" ||
      typeof storyDetail.price_usd === "number");

  // Owned / rented / unlimited subscriber -> every episode is unlocked
  const hasAccess = purchased || rented || isSubscribed;

  // "One-time purchase" banner (only while still locked)
  const showPurchaseCard = hasPaidContent && !hasAccess && !isOfflineMode;

  // Purchase options card (buy / listen this book only / unlimited).
  //   new user / expired plan -> shown
  //   active subscriber       -> hidden (nothing to buy)
  const showPurchaseOptions = hasPaidContent && !isOfflineMode && !isSubscribed;

  const rentalPrice =
    Number(
      currency === "INR"
        ? (storyDetail as any).rental_price_inr
        : (storyDetail as any).rental_price_usd
    ) || null;

  const currentPrice =
    currency === "INR" ? storyDetail.price_inr : storyDetail.price_usd;

  const totalDuration = formatTotalDuration(storyDetail.chapters ?? [], t);

  // Local cover (offline) or remote cover. This same uri drives the background.
  const coverUri = coverFile ? localUri(coverFile) : storyDetail.cover;

  const unlockedChapters = (storyDetail.chapters ?? []).filter(
    (chapter) => isFree(chapter) || hasAccess
  );
  const allUnlockedDownloaded =
    unlockedChapters.length > 0 && downloadedCount >= unlockedChapters.length;

  // Is the player (mini player) already holding THIS story?
  const isThisStoryActive =
    playerHasStory && String(playerStoryId) === String(storyDetail.id);

  // -------------------------------------------------------
  // Play entire story
  // -------------------------------------------------------

  const handlePlayAlbum = async () => {
    // This story is already loaded in the player -> the big Play
    // button pauses / resumes instead of restarting episode 1.
    if (isThisStoryActive) {
      player.handlePlayPause?.();
      return;
    }

    if (playerChapters.length === 0) {
      if (isOfflineMode) {
        Alert.alert(
          t("album.offlineTitle"),
          t("album.offlineDownloadEpisodes")
        );
      }
      return;
    }

    const startChapter = playerChapters[0];
    const isLocal = !!startChapter.audio_url?.startsWith("file://");

    if (!isFree(startChapter) && !hasAccess && !isLocal) {
      onLockedChapterPress();
      return;
    }

    try {
      await prepareChapters();
      await playChapterAt(0, { autoPlay: true });
      dispatch(setIsExpanded(true));
      router.push("/player-standard");
    } catch (error) {
      console.error("Play story error:", error);
    }
  };

  // -------------------------------------------------------
  // Download whole story (audio)
  // -------------------------------------------------------

  const handleDownloadAll = () => {
    if (downloadingCount > 0) {
      Alert.alert(t("album.download.stopTitle"), t("album.download.stopMsg"), [
        { text: t("album.download.keepGoing"), style: "cancel" },
        {
          text: t("album.download.stop"),
          style: "destructive",
          onPress: () => cancelStoryDownloads(storyDetail.id),
        },
      ]);
      return;
    }

    if (allUnlockedDownloaded) {
      Alert.alert(
        t("album.download.downloadedTitle"),
        t("album.download.allDownloaded"),
        [
          { text: t("album.download.close"), style: "cancel" },
          {
            text: t("album.download.removeAll"),
            style: "destructive",
            onPress: () => deleteStoryDownloads(storyDetail.id),
          },
        ]
      );
      return;
    }

    if (offline) {
      Alert.alert(t("album.offlineTitle"), t("album.offlineConnectDownload"));
      return;
    }

    const files = useDownloadStore.getState().files;
    const pending = unlockedChapters.filter((chapter) => {
      const status = files[fileKey(storyDetail.id, chapter.id, "audio")]?.status;
      return status !== "downloaded" && status !== "downloading";
    });

    if (pending.length === 0) return;

    Alert.alert(
      t("album.download.forOfflineTitle"),
      t("album.download.forOfflineMsg", { count: pending.length }),
      [
        { text: t("album.download.cancel"), style: "cancel" },
        {
          text: t("album.download.download"),
          onPress: async () => {
            try {
              await downloadStoryChapters(storyDetail, pending, "audio");
            } catch (err: any) {
              Alert.alert(
                t("album.download.failedTitle"),
                err?.message ?? t("album.download.tryAgain")
              );
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------
  // Header
  // -------------------------------------------------------

  const listHeader = (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      {/* Top bar: back | favourite, download-all, cart (with count), share */}
      <View style={[localStyles.topBar, { marginTop: insets.top + 6 }]}>
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [
            localStyles.iconButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("album.goBack")}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.cream} />
        </Pressable>

        <View style={localStyles.topBarRight}>
          {/* Shared heart: Home / Grid / List oda same store, so like status ellaa edathulayum sync */}
          <WishlistHeart
            storyId={storyDetail.id}
            initialLiked={storyWishlisted(storyDetail)}
            size={23}
            withBackground={false}
            inactiveColor={COLORS.cream}
          />

          {/* Download all episodes */}
          <Pressable
            hitSlop={8}
            onPress={handleDownloadAll}
            style={({ pressed }) => [
              localStyles.iconButton,
              localStyles.iconButtonFilled,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("album.downloadAll")}
          >
            {downloadingCount > 0 ? (
              <ActivityIndicator size="small" color={COLORS.gold} />
            ) : allUnlockedDownloaded ? (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.gold} />
            ) : (
              <Ionicons name="download-outline" size={21} color={COLORS.cream} />
            )}
          </Pressable>

          {/* Cart: hidden for active subscribers (they never buy single books) */}
          {!isSubscribed && (
            <Pressable
              hitSlop={8}
              onPress={handleCartPress}
              style={({ pressed }) => [
                localStyles.iconButton,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("album.cart.open", "Open cart")}
            >
              <Ionicons
                name={cartCount > 0 ? "cart" : "cart-outline"}
                size={23}
                color={cartState === "added" ? COLORS.gold : COLORS.cream}
              />
              {cartCount > 0 && (
                <View style={localStyles.cartBadge}>
                  <Text style={localStyles.cartBadgeText}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Share */}
          <Pressable
            hitSlop={8}
            onPress={handleShare}
            style={({ pressed }) => [
              localStyles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("album.share", "Share")}
          >
            <Ionicons name="share-outline" size={22} color={COLORS.cream} />
          </Pressable>
        </View>
      </View>

      {/* Offline banner */}
      {isOfflineMode && (
        <View style={localStyles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={COLORS.gold} />
          <Text style={localStyles.offlineBannerText}>
            {t("album.offlineBanner")}
          </Text>
        </View>
      )}

      {/* Cover + title */}
      <View style={localStyles.heroRow}>
        <View
          style={[
            localStyles.coverShadowWrap,
            { width: coverSize, height: coverSize, borderRadius: 22 },
          ]}
        >
          <Image
            source={{ uri: coverUri }}
            style={[
              localStyles.coverImage,
              { width: coverSize, height: coverSize, borderRadius: 22 },
            ]}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            priority="high"
          />
        </View>

        <View style={localStyles.heroTextCol}>
          <Text
            style={localStyles.heroTitle}
            numberOfLines={4}
            accessibilityRole="header"
          >
            {storyDetail.title}
          </Text>

          {!!storyDetail.genre && (
            <Text style={localStyles.heroGenre}>{storyDetail.genre}</Text>
          )}

          <Text style={localStyles.heroMeta}>
            {t("album.episodeCount", { count: storyDetail.chapters.length })}
            {totalDuration ? `  •  ${totalDuration}` : ""}
          </Text>

          {/* Play + price */}
          <View style={localStyles.heroActions}>
            <Pressable
              onPress={handlePlayAlbum}
              style={({ pressed }) => [
                localStyles.playPill,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("album.playStory")}
            >
              <Ionicons
                name={isThisStoryActive && isPlayerPlaying ? "pause" : "play"}
                size={16}
                color={COLORS.bgDeep}
              />
              <Text style={localStyles.playPillText}>
                {isThisStoryActive && isPlayerPlaying
                  ? t("album.pause", "Pause")
                  : t("album.play")}
              </Text>
            </Pressable>

            {hasPaidContent && !isOfflineMode && (
              <View style={localStyles.pricePill}>
                {hasAccess ? (
                  <>
                    <Ionicons
                      name={
                        purchased
                          ? "checkmark-circle"
                          : isSubscribed
                          ? "infinite"
                          : "time-outline"
                      }
                      size={14}
                      color={COLORS.gold}
                    />
                    <Text style={localStyles.pricePillText}>
                      {purchased
                        ? t("album.owned")
                        : isSubscribed
                        ? t("album.unlimited", "Unlimited")
                        : t("album.rented", "Rented")}
                    </Text>
                  </>
                ) : (
                  <Text style={localStyles.pricePillText}>
                    {formatPrice(currentPrice, currency)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <Tabs value={tab} onChange={setTab} />

      {/* One-time purchase banner (chapters tab only) */}
      {tab === "chapters" && showPurchaseCard && (
        <View style={localStyles.pricingBanner}>
          <View style={localStyles.pricingBannerAccent} />
          <View style={localStyles.pricingBannerIcon}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.gold}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.pricingBannerTitle}>
              {t("album.oneTime")}
            </Text>
            <Text style={localStyles.pricingBannerSub}>
              {t("album.oneTimeSub", {
                price: formatPrice(currentPrice, currency),
                count: storyDetail.chapters.length,
              })}
            </Text>
          </View>
        </View>
      )}

      {tab === "chapters" && <View style={{ height: 18 }} />}
    </View>
  );

  // -------------------------------------------------------
  // Footer
  // -------------------------------------------------------

  const purchaseSection = showPurchaseOptions ? (
    <View style={localStyles.purchaseSection}>
      {!purchased && (
        <View style={localStyles.currencyRow}>
          <CurrencyToggle currency={currency} onChange={setCurrency} />
        </View>
      )}

      <PurchaseOptionsCard
        bookPrice={currentPrice}
        rentalPrice={isSubscribed || rented || purchased ? null : rentalPrice}
        currency={currency}
        owned={purchased}
        isSubscribed={isSubscribed}
        buyBusy={cartState === "loading"}
        buyDone={cartState === "added"}
        rentBusy={rentBusy}
        onBuy={handleAddToCart}
        onRentListen={handleRentListen}
        onSubscribe={handleSubscribe}
      />
    </View>
  ) : null;

  const listFooter = (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      {tab === "chapters" && purchaseSection}

      {tab === "about" && (
        <>
          <Text style={[styles.creditsHeading, localStyles.aboutHeading]}>
            {t("album.aboutTitle", { title: storyDetail.title })}
          </Text>

          <Text style={localStyles.description} maxFontSizeMultiplier={1.4}>
            {storyDetail.description}
          </Text>

          <CreditsSection credits={storyDetail.credits} />
          {purchaseSection}

          {/* Last 10 stories from the backend */}
          {!isOfflineMode && (
            <RecommendedSection
              stories={recommended}
              onPressStory={openRecommended}
            />
          )}
        </>
      )}
    </View>
  );

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: "#07060A" }]}>
      <CoverBackground uri={coverUri} />
      <StatusBar style="light" />

      <FlatList
        data={tab === "chapters" ? storyDetail.chapters : []}
        keyExtractor={(item) => String(item.id)}
        // re-render rows when play / pause or the active chapter changes
        extraData={`${isPlayerPlaying}-${currentChapterId}-${playerStoryId}-${listenedIds.size}`}
        renderItem={({ item, index }) => {
          const chapters = storyDetail.chapters;
          const next = chapters[index + 1];
          const rowWidth = contentWidth - horizontalPadding * 2;

          const isItemActive = (c?: Chapter) =>
            !!c &&
            isThisStoryActive &&
            currentChapterId !== undefined &&
            String(currentChapterId) === String(c.id);

          // listened = played in the app OR flagged by the backend
          const isChapterListened = (c?: Chapter) => {
            if (!c) return false;
            const flag: any = c;
            return (
              isItemActive(c) ||
              listenedIds.has(String(c.id)) ||
              flag.listened === true ||
              flag.is_listened === true ||
              flag.is_listened === 1 ||
              flag.completed === true
            );
          };

          // bright line only between two listened chapters
          const lineLit = isChapterListened(item) && isChapterListened(next);

          return (
            <View style={{ paddingHorizontal: horizontalPadding }}>
              <TrackRow
                track={item}
                story={storyDetail}
                index={index}
                chapterIndex={chapterIndexById.get(String(item.id)) ?? -1}
                locked={!isFree(item) && !hasAccess}
                offline={isOfflineMode}
                isActive={isItemActive(item)}
                isPlaying={isPlayerPlaying}
                fallbackCover={coverUri}
                rowWidth={rowWidth}
                hasNext={!!next}
                nextActive={isItemActive(next)}
                lineLit={lineLit}
                prepareChapters={prepareChapters}
                onLockedPress={onLockedChapterPress}
              />
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
        // 100+ episodes: only render what is near the screen
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        // off, so the glowing line between rows never gets clipped
        removeClippedSubviews={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{
          maxWidth: MAX_CONTENT_WIDTH,
          width: contentWidth,
          alignSelf: "center",
          paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Cart popup: stories added to cart (never opened for subscribers,
          because their cart icon is hidden) */}
      <Modal
        visible={cartOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCart}
      >
        <View style={localStyles.cartOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCart} />

          <View
            style={[
              localStyles.cartSheet,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={localStyles.cartHandle} />

            <View style={localStyles.cartHeaderRow}>
              <Text style={localStyles.cartTitle}>
                {t("album.cart.title", "My Cart")}
                {cartCount > 0 ? `  (${cartCount})` : ""}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={closeCart}
                accessibilityRole="button"
                accessibilityLabel={t("album.download.close")}
              >
                <Ionicons name="close" size={22} color={COLORS.cream} />
              </Pressable>
            </View>

            {cartLoading ? (
              <View style={localStyles.cartCenter}>
                <ActivityIndicator size="small" color={COLORS.gold} />
              </View>
            ) : cartItems.length === 0 ? (
              <View style={localStyles.cartCenter}>
                <Ionicons name="cart-outline" size={34} color={COLORS.textFaint} />
                <Text style={localStyles.emptyTitle}>{t("album.cart.empty", "Your cart is empty")}</Text>
                <Text style={localStyles.emptySub}>
                  {t("album.cart.emptyHint", "Stories you add to the cart will show up here.")}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={cartItems}
                  keyExtractor={(item) => String(item.id)}
                  style={{ maxHeight: 360 }}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item }) => {
                    const price =
                      currency === "INR" ? item.price_inr : item.price_usd;
                    return (
                      <Pressable
                        onPress={() => openCartStory(item)}
                        style={({ pressed }) => [
                          localStyles.cartRow,
                          pressed && localStyles.cardPressed,
                        ]}
                      >
                        <Image
                          source={{ uri: item.cover }}
                          style={localStyles.cartRowCover}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          recyclingKey={String(item.id)}
                        />
                        <View style={localStyles.cardInfo}>
                          <Text style={localStyles.cardTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          {!!item.genre && (
                            <Text style={localStyles.recGenre} numberOfLines={1}>
                              {item.genre}
                            </Text>
                          )}
                          {price !== undefined && (
                            <Text style={localStyles.cartRowPrice}>
                              {formatPrice(price, currency)}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          hitSlop={10}
                          onPress={() => handleRemoveFromCart(item)}
                          accessibilityRole="button"
                          accessibilityLabel={t("album.cart.remove", "Remove from cart")}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={19}
                            color={COLORS.textFaint}
                          />
                        </Pressable>
                      </Pressable>
                    );
                  }}
                />

                <Pressable
                  onPress={handleCheckout}
                  style={({ pressed }) => [
                    localStyles.checkoutButton,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={localStyles.checkoutText}>
                    {t("album.cart.checkout", "Checkout")}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------
// Local styles
// ---------------------------------------------------------

const GLASS = "rgba(255,255,255,0.07)";
const GLASS_BORDER = "rgba(255,255,255,0.10)";

const localStyles = StyleSheet.create({
  // ---- Background ----
  bgImage: {
    // a little bigger than the screen so blurred edges never show
    position: "absolute",
    top: -60,
    left: -60,
    right: -60,
    bottom: -60,
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },

  loadingBack: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  // ---- Top bar ----
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonFilled: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  // ---- Cart badge ----
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(7,6,10,0.8)",
  },
  cartBadgeText: {
    color: COLORS.bgDeep,
    fontSize: 10,
    fontWeight: "800",
  },

  // ---- Cart popup ----
  cartOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  cartSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: GLASS_BORDER,
    backgroundColor: "#14110F",
  },
  cartHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  cartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cartTitle: {
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: "700",
  },
  cartCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
  },
  cartRowCover: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.maroon,
  },
  cartRowPrice: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  checkoutButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
  },
  checkoutText: {
    color: COLORS.bgDeep,
    fontSize: 15,
    fontWeight: "700",
  },

  errorIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(200,155,76,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 26,
    backgroundColor: COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },

  // ---- Offline banner ----
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(200,155,76,0.10)",
  },
  offlineBannerText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  // ---- Hero ----
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginTop: 14,
  },
  coverShadowWrap: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.55,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  coverImage: {
    backgroundColor: COLORS.maroon,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 32,
    color: COLORS.cream,
  },
  heroGenre: {
    marginTop: 6,
    color: COLORS.gold,
    fontSize: 13.5,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  heroMeta: {
    marginTop: 4,
    color: COLORS.textMutedDeep,
    fontSize: 12.5,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  playPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 5 },
    }),
  },
  playPillText: {
    color: COLORS.bgDeep,
    fontWeight: "700",
    fontSize: 14,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(200,155,76,0.10)",
  },
  pricePillText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: "600",
  },

  // ---- Tabs ----
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: GLASS,
    borderColor: COLORS.goldBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {},
    }),
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.cream,
    fontWeight: "700",
  },

  // ---- Description ----
  aboutHeading: {
    marginTop: 4,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },

  // ---- Pricing banner ----
  pricingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 16,
    backgroundColor: "rgba(200,155,76,0.09)",
    overflow: "hidden",
  },
  pricingBannerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.gold,
  },
  pricingBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(200,155,76,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  pricingBannerTitle: {
    color: COLORS.cream,
    fontSize: 13.5,
    fontWeight: "600",
  },
  pricingBannerSub: {
    color: COLORS.textMutedDeep,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  // ---- Chapter card (glass pill) ----
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
  },
  cardActive: {
    paddingVertical: 10,
    paddingLeft: 10,
    borderRadius: 36,
    borderColor: COLORS.gold,
    backgroundColor: "rgba(200,155,76,0.14)",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.55,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 8 },
    }),
  },
  cardDimmed: {
    opacity: 0.55,
  },
  cardPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  thumbWrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  thumbWrapActive: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  thumbCenterIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  tickBadge: {
    position: "absolute",
    top: -5,
    left: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#5FD39B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(7,6,10,0.8)",
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardNumber: {
    color: COLORS.textFaint,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  cardTitle: {
    color: COLORS.cream,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
  },
  cardTitleActive: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: "700",
  },
  cardTime: {
    color: COLORS.textFainter,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  activeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(200,155,76,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  lockedLabel: {
    color: COLORS.textFainter,
    fontSize: 11.5,
    fontStyle: "italic",
  },

  // ---- Per-episode download button ----
  dlButton: {
    minWidth: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dlPercent: {
    color: COLORS.gold,
    fontSize: 11.5,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // ---- Empty text (used by the cart popup) ----
  emptyTitle: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
  emptySub: {
    color: COLORS.textFaint,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 240,
  },

  // ---- Currency toggle ----
  currencyToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(240,230,210,0.06)",
    borderRadius: 20,
    padding: 3,
  },
  currencyToggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  currencyToggleOptionActive: {
    backgroundColor: COLORS.gold,
  },
  currencyToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textFaint,
  },
  currencyToggleTextActive: {
    color: COLORS.bgDeep,
  },

  // ---- Purchase options ----
  purchaseSection: {
    marginTop: 24,
  },
  currencyRow: {
    alignItems: "flex-end",
    marginBottom: 10,
  },

  // ---- Recommended ----
  recSection: {
    marginTop: 28,
  },
  recList: {
    paddingTop: 12,
    paddingRight: 8,
  },
  recCard: {
    width: 120,
  },
  recCover: {
    width: 120,
    height: 120,
    borderRadius: 18,
    backgroundColor: COLORS.maroon,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  recHeart: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  recTitle: {
    color: COLORS.cream,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  recGenre: {
    color: COLORS.textFaint,
    fontSize: 11.5,
    marginTop: 2,
    textTransform: "capitalize",
  },

  // ---- Credits ----
  creditsCard: {
    marginTop: 8,
  },
});