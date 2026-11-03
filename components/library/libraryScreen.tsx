import axios from "@/axios.config";
import {
  getDownloadedStorySummaries,
  withLocalMedia,
} from "../download/downloadService";
import { useDownloadStore, waitForHydration } from "../download/downloadStore";
import { getCurrentUserId } from "../download/currentUser";
import { usePlayer } from "../../providers/PlayerProvider";
import { useResumeLastPlayed } from "../../hooks/useResumeLastPlayed";
import { useLastListenedStore } from "../../redux/slices/lastListenedStore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useOnReconnect } from "../../utils/network";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import ProfileDot from "../ui/ProfileDot";

/* ---------- icons ---------- */

interface IconProps {
  size?: number;
  color?: string;
}

const PlayIcon = ({ size = 15, color = "#000" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = "#3ba36a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={9} />
    <Polyline points="8 12.5 10.8 15 16 9.5" />
  </Svg>
);

const DownloadingIcon = ({ size = 16, color = "#D9A441" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 19h14" strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = 17, color = "rgba(255,255,255,0.35)" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="9 6 15 12 9 18" />
  </Svg>
);

/* ---------- types matching the backend response ---------- */

type LibraryCard = {
  story_id: number;
  title: string;
  cover: string | null;
  genre: string;
  current_chapter_number: number | null;
  total_chapters: number;
  resume_percentage: number | null;
};

/* Raw shape as returned by the backend for a single story inside
   last_played.story / recently_listened.stories[] */
type RawStory = {
  id: number;
  title: string;
  cover: string | null;
  genre?: string[] | string;
  chapters: number;
  current_chapter_number: number | null;
  resume_percentage: number | null;
};

const normalizeStory = (raw: RawStory): LibraryCard => ({
  story_id: raw.id,
  title: raw.title,
  cover: raw.cover ?? null,
  genre: Array.isArray(raw.genre) ? raw.genre.join(" · ") : raw.genre ?? "",
  current_chapter_number: raw.current_chapter_number ?? null,
  total_chapters: raw.chapters,
  resume_percentage: raw.resume_percentage ?? null,
});

type DownloadedRow = {
  storyId: string;
  title: string;
  genre: string;
  coverUri: string | null;
  episodesDownloaded: number;
  totalEpisodes: number;
  allDownloaded: boolean;
};

/* ---------- section header (title + optional "View all") ---------- */

const SectionHeader: React.FC<{ title: string; onViewAll?: () => void }> = ({
  title,
  onViewAll,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.viewAllText}>View all</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* ---------- rented books (with days left) ---------- */

type RentedBook = {
  story_id: number;
  title: string;
  cover: string | null;
  author: string;
  daysLeft: number | null; // null = backend sent no expiry
  endsToday: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reads the rented books out of getLibraryData.
 * Returns null when the backend does not send a rented section at all
 * (then the section is hidden), [] when it is sent but empty.
 *
 * Accepted shapes (any one):
 *   data.rented_books | data.rented.stories | data.rentals.stories | arrays
 * each item: { id | story_id, title, cover, author, days_left
 *              | expires_at | expiry_date | rental_expiry } (or nested `story`)
 */
const parseRented = (data: any): RentedBook[] | null => {
  const raw =
    data?.rented_books ??
    data?.rented?.stories ??
    data?.rentals?.stories ??
    data?.rented ??
    data?.rentals;

  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return [];

  const now = Date.now();
  const books: RentedBook[] = [];

  for (const r of raw) {
    const story = r?.story ?? r;
    const id = story?.id ?? story?.story_id ?? r?.story_id;
    if (id == null) continue;

    const expiry = r?.expires_at ?? r?.expiry_date ?? r?.rental_expiry ?? story?.expires_at;
    const sentDays = r?.days_left ?? r?.rental_days_left ?? r?.remaining_days;

    let daysLeft: number | null = null;
    let endsToday = false;

    if (expiry) {
      const ms = Date.parse(String(expiry)) - now;
      if (Number.isFinite(ms)) {
        if (ms <= 0) continue; // expired: not shown
        daysLeft = Math.ceil(ms / DAY_MS);
        endsToday = ms < DAY_MS;
      }
    } else if (sentDays != null && Number.isFinite(Number(sentDays))) {
      daysLeft = Math.max(0, Number(sentDays));
      endsToday = daysLeft <= 1;
    }

    books.push({
      story_id: Number(id),
      title: String(story?.title ?? ""),
      cover: story?.cover ?? null,
      author: String(story?.author ?? ""),
      daysLeft,
      endsToday,
    });
  }

  return books;
};

const RentedRow: React.FC<{ item: RentedBook }> = ({ item }) => {
  const { t } = useTranslation();

  const left =
    item.daysLeft === null
      ? t("library.rentedActive", "Rented")
      : item.endsToday
      ? t("library.endsToday", "Ends today")
      : t("library.daysLeft", { days: item.daysLeft, defaultValue: "{{days}} days left" });

  const urgent = item.daysLeft !== null && item.daysLeft <= 2;

  return (
    <TouchableOpacity
      style={styles.trackRow}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/storyEpisode",
          params: { storyId: String(item.story_id), tab: "chapters" },
        } as any)
      }
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${left}`}
    >
      <View style={styles.trackArt}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#7a5ae0", "#3a2a8a"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {!!item.author && (
          <Text style={styles.trackMeta} numberOfLines={1}>
            {item.author}
          </Text>
        )}
      </View>

      <View style={[styles.expiryPill, urgent && styles.expiryPillUrgent]}>
        <Ionicons name="time-outline" size={12} color={urgent ? "#ff9a8a" : "#D9A441"} />
        <Text style={[styles.expiryText, urgent && { color: "#ff9a8a" }]}>{left}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- Recently listened row (real backend data) ---------- */

const RecentRow: React.FC<{ item: LibraryCard; onPress: () => void }> = ({ item, onPress }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.trackRow}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.trackArt}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#e04a7a", "#8a2a4a"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackMeta} numberOfLines={1}>
          {item.current_chapter_number
            ? t("library.episodeOf", {
                current: item.current_chapter_number,
                total: item.total_chapters,
                defaultValue: "Episode {{current}}/{{total}}",
              })
            : item.genre}
        </Text>
      </View>

      <ChevronRightIcon />
    </TouchableOpacity>
  );
};

/* ---------- Downloaded row (local data) ---------- */

const DownloadedRowView: React.FC<{
  item: DownloadedRow;
  kind: "audio" | "video";
  onPress: () => void;
}> = ({ item, kind, onPress }) => {
  const { t } = useTranslation();
  const unit = kind === "video" ? "video" : "episode";

  return (
    <TouchableOpacity
      style={styles.trackRow}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.trackArt}>
        {item.coverUri ? (
          <Image source={{ uri: item.coverUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#4ae0b0", "#2a6a8a"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackMeta} numberOfLines={1}>
          {item.allDownloaded
            ? t(`library.${unit}sDownloaded`, {
                n: item.episodesDownloaded,
                defaultValue: `{{n}} ${unit}${item.episodesDownloaded === 1 ? "" : "s"} · Downloaded`,
              })
            : t("library.partDownloaded", {
                done: item.episodesDownloaded,
                total: item.totalEpisodes,
                defaultValue: `{{done}}/{{total}} ${unit}s downloaded`,
              })}
        </Text>
      </View>

      {item.allDownloaded ? <CheckIcon /> : <DownloadingIcon />}
    </TouchableOpacity>
  );
};

/* ---------- one download group: "Downloaded audio" / "Downloaded video" ---------- */

const PREVIEW_COUNT = 3;

const DownloadGroup: React.FC<{
  kind: "audio" | "video";
  rows: DownloadedRow[];
  emptyText: string;
  openingStoryId: string | null;
  onOpen: (item: DownloadedRow) => void;
}> = ({ kind, rows, emptyText, openingStoryId, onOpen }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? rows : rows.slice(0, PREVIEW_COUNT);

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupIcon, kind === "video" && { backgroundColor: "#1f1a2e" }]}>
          <Ionicons
            name={kind === "video" ? "videocam" : "headset"}
            size={15}
            color={kind === "video" ? "#a78bfa" : "#D9A441"}
          />
        </View>

        <Text style={styles.groupTitle}>
          {kind === "video"
            ? t("library.downloadedVideo", "Downloaded video")
            : t("library.downloadedAudio", "Downloaded audio")}
        </Text>

        <Text style={styles.groupCount}>{rows.length}</Text>

        {rows.length > PREVIEW_COUNT && (
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>
              {expanded ? t("library.showLess", "Show less") : t("library.viewAll", "View all")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyStateText}>{emptyText}</Text>
      ) : (
        <View style={styles.trackList}>
          {visible.map((item) => (
            <View key={`${kind}-${item.storyId}`}>
              {openingStoryId === item.storyId ? (
                <View style={styles.trackRow}>
                  <ActivityIndicator size="small" color="#D9A441" />
                  <Text style={[styles.trackMeta, { marginLeft: 12 }]}>
                    {t("library.opening", "Opening…")}
                  </Text>
                </View>
              ) : (
                <DownloadedRowView item={item} kind={kind} onPress={() => onOpen(item)} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/* ---------- main component ---------- */

const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { playChapterAt, setChapters, openPlayerScreen } = usePlayer();
  const { resume, resuming } = useResumeLastPlayed();

  const netInfo = useNetInfo();
  const offline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const [lastPlayed, setLastPlayed] = useState<LibraryCard | null>(null);
  const [recentlyListened, setRecentlyListened] = useState<LibraryCard[]>([]);
  const [rented, setRented] = useState<RentedBook[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [downloadedAudio, setDownloadedAudio] = useState<DownloadedRow[]>([]);
  const [downloadedVideo, setDownloadedVideo] = useState<DownloadedRow[]>([]);
  const [openingStoryId, setOpeningStoryId] = useState<string | null>(null);

  // What the player remembers is newer than the server data loaded here.
  const localLast = useLastListenedStore((s) =>
    lastPlayed ? s.entries[String(lastPlayed.story_id)] : undefined
  );

  // ---- Last played / Rented / Recently listened: backend data ----
  // Needs the network - if offline, we skip the call and hide these
  // blocks; Downloads (below) still work because they are local.
  const fetchLibraryData = useCallback(async () => {
    if (offline) {
      setLibraryLoading(false);
      return;
    }
    const userId = getCurrentUserId();
    if (!userId) {
      setLibraryLoading(false);
      return;
    }

    try {
      setLibraryLoading(true);
      const response = await axios.post("/", {
        method: "getLibraryData",
        user_id: userId,
      });

      if (response.data?.statusCode === 200) {
        const data = response.data.data;

        const lastPlayedStory = data?.last_played?.story;
        setLastPlayed(lastPlayedStory ? normalizeStory(lastPlayedStory) : null);

        const recentStories: RawStory[] = data?.recently_listened?.stories ?? [];
        setRecentlyListened(recentStories.map(normalizeStory));

        // Rented books (free users too) with the days left
        setRented(parseRented(data));
      } else {
        console.log("getLibraryData non-200 statusCode:", response.data?.statusCode);
      }
    } catch (error) {
      console.log("getLibraryData failed:", error);
      // Silent - Downloads below still work fully offline.
    } finally {
      setLibraryLoading(false);
    }
  }, [offline]);

  // internet came back -> reload last played / rented / recent by itself
  useOnReconnect(() => {
    fetchLibraryData();
  });

  // Reload when the person comes back to this tab (they may have listened,
  // rented or downloaded something meanwhile).
  useFocusEffect(
    useCallback(() => {
      fetchLibraryData();
    }, [fetchLibraryData])
  );

  // ---- Downloads: local data, always works, online or offline ----
  const downloadSig = useDownloadStore((s) =>
    Object.values(s.files)
      .map((f) => `${f.storyId}:${f.chapterId}:${f.kind}:${f.status}`)
      .sort()
      .join("|")
  );

  useEffect(() => {
    waitForHydration().then(() => {
      setDownloadedAudio(getDownloadedStorySummaries("audio"));
      setDownloadedVideo(getDownloadedStorySummaries("video"));
    });
  }, [downloadSig]);

  // ---- Tap a downloaded AUDIO story ----
  // A single-episode story plays right away. A multi-episode story opens
  // the chapter list so the person can pick which episode to resume.
  const handleOpenDownloaded = async (item: DownloadedRow) => {
    if (item.totalEpisodes > 1) {
      router.push({
        pathname: "/storyEpisode",
        params: { storyId: item.storyId, tab: "chapters" },
      } as any);
      return;
    }

    try {
      setOpeningStoryId(item.storyId);
      await waitForHydration();
      const story = useDownloadStore.getState().stories[item.storyId];
      if (!story) {
        router.push({ pathname: "/storyEpisode", params: { storyId: item.storyId } } as any);
        return;
      }

      const chapters = withLocalMedia(item.storyId, story.chapters ?? []).map((c) => ({
        ...c,
        story: story.title,
        storyId: story.id,
      }));

      setChapters(chapters);
      await playChapterAt(0, { autoPlay: true });
      openPlayerScreen();
    } catch (error) {
      console.error("Play downloaded story error:", error);
      router.push({ pathname: "/storyEpisode", params: { storyId: item.storyId } } as any);
    } finally {
      setOpeningStoryId(null);
    }
  };

  // ---- Tap a downloaded VIDEO story: open its episode list (videos play there) ----
  const handleOpenDownloadedVideo = (item: DownloadedRow) => {
    router.push({
      pathname: "/storyEpisode",
      params: { storyId: item.storyId, tab: "chapters" },
    } as any);
  };

  // Last played: continue at the episode and the exact second the person
  // stopped at (the player's own record wins over the server's older copy).
  const lastChapter = localLast?.chapterNumber ?? lastPlayed?.current_chapter_number ?? null;

  const lastPercent = (() => {
    if (
      localLast &&
      localLast.durationSec > 0 &&
      lastPlayed &&
      lastChapter === localLast.chapterNumber
    ) {
      return Math.min(100, Math.round((localLast.positionSec / localLast.durationSec) * 100));
    }
    return lastPlayed?.resume_percentage ?? 0;
  })();

  const hasAudio = downloadedAudio.length > 0;
  const hasVideo = downloadedVideo.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.bgFill} pointerEvents="none" />

      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000", "#000000"]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.wrapContent, { paddingBottom: insets.bottom + 12 }]}
      >
        {/* ---------- top bar ---------- */}

        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>{t("library.title", "Library")}</Text>

          <ProfileDot dotStyle={styles.profileDot} textStyle={styles.profileDotText} />
        </View>

        {/* ---------- last played (needs network) ---------- */}

        {offline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              {t(
                "library.offlineNote",
                "You're offline. Last played, rented and recently listened need internet - your downloads below still work."
              )}
            </Text>
          </View>
        ) : libraryLoading && !lastPlayed ? (
          <View style={styles.section}>
            <ActivityIndicator size="small" color="#D9A441" />
          </View>
        ) : (
          lastPlayed && (
            <View style={styles.section}>
              <Text style={styles.eyebrow}>{t("library.lastPlayed", "Last played")}</Text>

              <TouchableOpacity
                style={styles.lastPlayedCard}
                activeOpacity={0.9}
                onPress={() => resume(String(lastPlayed.story_id), lastChapter)}
                accessibilityRole="button"
                accessibilityLabel={`${t("home.resume", "Resume")} ${lastPlayed.title}`}
              >
                <View style={styles.lastPlayedArt}>
                  {lastPlayed.cover ? (
                    <Image
                      source={{ uri: lastPlayed.cover }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={["#e0a94a", "#c05a2a"]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                </View>

                <View style={styles.lastPlayedInfo}>
                  <Text style={styles.lastPlayedTitle} numberOfLines={1}>
                    {lastPlayed.title}
                  </Text>
                  <Text style={styles.lastPlayedSubtitle} numberOfLines={1}>
                    {lastChapter
                      ? t("library.episodeOf", {
                          current: lastChapter,
                          total: lastPlayed.total_chapters,
                          defaultValue: "Episode {{current}}/{{total}}",
                        })
                      : lastPlayed.genre}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${lastPercent}%` }]} />
                  </View>
                </View>

                <View style={styles.resumeButton}>
                  {resuming ? <ActivityIndicator size="small" color="#000" /> : <PlayIcon />}
                </View>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* ---------- rented books + days left (free users too) ---------- */}

        {!offline && rented !== null && (
          <View style={styles.section}>
            <SectionHeader title={t("library.rented", "Rented books")} />

            {rented.length === 0 ? (
              <Text style={styles.emptyStateText}>
                {t("library.noRented", "No rented books right now. Rent a book to listen to it here.")}
              </Text>
            ) : (
              <View style={styles.trackList}>
                {rented.map((item) => (
                  <RentedRow key={item.story_id} item={item} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ---------- downloads: audio and video listed separately ---------- */}

        <View style={styles.section}>
          <SectionHeader title={t("library.downloads", "Downloads")} />

          {!hasAudio && !hasVideo && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {offline
                  ? t(
                      "library.noDownloadsOffline",
                      "No downloads yet. Connect to the internet to download episodes for offline listening."
                    )
                  : t(
                      "library.noDownloads",
                      "No downloads yet. Open a story and tap the download icon on an episode."
                    )}
              </Text>
            </View>
          )}

          {(hasAudio || hasVideo) && (
            <>
              <DownloadGroup
                kind="audio"
                rows={downloadedAudio}
                emptyText={t("library.noAudioDownloads", "No audio downloads yet.")}
                openingStoryId={openingStoryId}
                onOpen={handleOpenDownloaded}
              />

              <DownloadGroup
                kind="video"
                rows={downloadedVideo}
                emptyText={t("library.noVideoDownloads", "No video downloads yet.")}
                openingStoryId={openingStoryId}
                onOpen={handleOpenDownloadedVideo}
              />
            </>
          )}
        </View>

        {/* ---------- recently listened (tap = continue where you stopped) ---------- */}

        {!offline && !libraryLoading && recentlyListened.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t("library.recentlyListened", "Recently listened")} />
            <View style={styles.trackList}>
              {recentlyListened.map((item) => (
                <RecentRow
                  key={item.story_id}
                  item={item}
                  onPress={() => resume(String(item.story_id), item.current_chapter_number)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default LibraryScreen;

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  wrapContent: {
    paddingBottom: 100,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2E635B",
  },
  bgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  profileDotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
  },
  profileDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  offlineBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.35)",
    backgroundColor: "rgba(217,164,65,0.08)",
  },
  offlineBannerText: {
    color: "#E8DFD0",
    fontSize: 12,
    lineHeight: 17,
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    color: "#8a8a8a",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  viewAllText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },

  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9a9a9a",
    lineHeight: 19,
  },

  /* last played card */
  lastPlayedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#151515",
    padding: 12,
    gap: 12,
    marginHorizontal: 16,
  },
  lastPlayedArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  lastPlayedInfo: {
    flex: 1,
  },
  lastPlayedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  lastPlayedSubtitle: {
    fontSize: 12,
    color: "#9a9a9a",
    marginTop: 2,
    marginBottom: 6,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2c2c2c",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#e0834a",
  },
  resumeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  trackList: {
    gap: 0,
  },

  /* download groups + rented expiry */
  group: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  groupIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2a2216",
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  groupCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginRight: 6,
  },
  expiryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(217,164,65,0.12)",
  },
  expiryPillUrgent: {
    backgroundColor: "rgba(255,120,100,0.14)",
  },
  expiryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D9A441",
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingVertical: 9,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1c",
  },
  trackArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#151515",
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  trackMeta: {
    fontSize: 11,
    color: "#8a8a8a",
    marginTop: 1,
  },
});