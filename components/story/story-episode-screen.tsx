import axios from "@/axios.config";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";

import { LinearGradient } from "expo-linear-gradient";
import { usePlayer } from "../../providers/PlayerProvider";
import { setIsExpanded } from "../../redux/slices/playerReducer";
import styles, {
  BASE_WIDTH,
  COLORS,
  MAX_CONTENT_WIDTH,
  MINI_PLAYER_HEIGHT,
} from "./episodeStyle";


// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatPrice(amount?: number, currency: "INR" | "USD" = "INR") {
  if (amount === undefined || amount === null) return "";
  const symbol = currency === "INR" ? "₹" : "$";
  const isWhole = currency === "INR" && Number.isInteger(amount);
  return `${symbol}${isWhole ? amount : amount.toFixed(2)}`;
}

function formatTotalDuration(chapters: Chapter[]) {
  const totalSeconds = chapters.reduce(
    (sum, chapter) => sum + (chapter.duration_in_seconds || 0),
    0
  );
  if (!totalSeconds) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}


// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

type Chapter = {
  id: string;
  number: number;
  title: string;
  description: string;
  artist: string;
  duration: string;
  duration_in_seconds: number;
  audio_url: string | null;
  video_url: string | null;
  video_status: number;
  cover: string | null;
  free: boolean;
};

type StoryDetail = {
  id: string;
  title: string;
  description: string;
  cover: string;
  genre: string;
  credits: string;
  chapters: Chapter[];
  price_inr?: number;
  price_usd?: number;
  // NOTE: backend sample doesn't currently return this — if/when it does,
  // this screen will automatically respect it and hide the purchase card.
  is_purchased?: boolean;
};


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
            accessibilityLabel={`Show prices in ${option}`}
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
// Track Row
// ---------------------------------------------------------

function TrackRow({
  track,
  chapterIndex,
  locked,
  isLast,
  onLockedPress,
}: {
  track: Chapter;
  chapterIndex: number;
  locked: boolean;
  isLast: boolean;
  onLockedPress: () => void;
}) {
  const { playChapterAt } = usePlayer();
  const dispatch = useDispatch();
  const router = useRouter();

  const onPressPlay = async () => {
    if (locked) {
      onLockedPress();
      return;
    }

    try {
      await playChapterAt(chapterIndex, {
        autoPlay: true,
      });

      dispatch(setIsExpanded(true));

      router.push("/player-standard");
    } catch (error) {
      console.error("Play chapter error:", error);
    }
  };

  return (
    <Pressable
      onPress={onPressPlay}
      style={({ pressed }) => [
        styles.trackRow,
        localStyles.trackRow,
        !isLast && localStyles.trackRowDivider,
        locked && localStyles.trackRowLocked,
        pressed && localStyles.trackRowPressed,
      ]}
      android_ripple={{
        color: "rgba(200,155,76,0.12)",
      }}
    >
      {/* Chapter Number / Lock */}
      <View
        style={[
          styles.trackNumberBadge,
          localStyles.trackNumberBadge,
          !locked && localStyles.trackNumberBadgeActive,
          locked && localStyles.trackNumberBadgeLocked,
        ]}
      >
        {locked ? (
          <Ionicons name="lock-closed" size={12} color={COLORS.textFainter} />
        ) : (
          <Text style={styles.trackNumberText}>{track.number}</Text>
        )}
      </View>

      {/* Chapter Info */}
      <View style={styles.trackInfo}>
        <View style={styles.trackTitleRow}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
        </View>

        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {/* Duration / Video indicator */}
      {!locked ? (
        <View style={localStyles.trackMeta}>
          {track.video_status === 1 && (
            <View style={localStyles.videoBadge}>
              <Ionicons
                name="videocam"
                size={11}
                color={COLORS.gold}
              />
            </View>
          )}
          <Text style={localStyles.trackTime}>{track.duration}</Text>
        </View>
      ) : (
        <Text style={localStyles.lockedLabel}>Locked</Text>
      )}

      {/* Menu */}
      <Pressable
        hitSlop={10}
        style={styles.trackMenuButton}
        onPress={(event) => {
          event.stopPropagation();
        }}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color={COLORS.textFaint}
        />
      </Pressable>
    </Pressable>
  );
}


// ---------------------------------------------------------
// Credits Section
// ---------------------------------------------------------

function CreditsSection({ credits }: { credits: string }) {
  if (!credits) {
    return null;
  }

  const creditItems = credits
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <View style={[styles.creditsSection, localStyles.creditsCard]}>
      <Text style={styles.creditsHeading}>Credits</Text>

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

            {value ? (
              <Text style={styles.creditsValue}>{value}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}


// ---------------------------------------------------------
// Main Screen
// ---------------------------------------------------------

export default function AlbumScreen() {
  const { storyId } = useLocalSearchParams<{
    storyId?: string;
    title?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [storyDetail, setStoryDetail] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pay-per-book state
  const [purchased, setPurchased] = useState(false);
  const [cartState, setCartState] = useState<"idle" | "loading" | "added">(
    "idle"
  );
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const { playChapterAt, setChapters } = usePlayer();
  const dispatch = useDispatch();


  // -------------------------------------------------------
  // Fetch Story Detail
  // -------------------------------------------------------

  useEffect(() => {
    if (storyId) {
      fetchStoryDetail();
    }
  }, [storyId]);


  const fetchStoryDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post("/", {
        method: "getStoryDetail",
        story_id: Number(storyId),
      });

      if (
        response.data &&
        response.data.statusCode === 200 &&
        response.data.data
      ) {
        const story: StoryDetail = response.data.data;

        setStoryDetail(story);
        setPurchased(Boolean(story.is_purchased));

        // Push chapters into the player's own copy so playChapterAt()
        // has something to read from, and stamp story/storyId onto
        // each chapter for the mini-player / now-playing label.
        setChapters(
          (story.chapters ?? []).map((chapter) => ({
            ...chapter,
            story: story.title,
            storyId: story.id,
          }))
        );
      } else {
        setError("Unable to load story details.");
      }
    } catch (error: any) {
      console.error("getStoryDetail error:", error);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };


  // -------------------------------------------------------
  // Pay-per-book: add to cart
  // -------------------------------------------------------

  const handleAddToCart = async () => {
    if (!storyDetail || cartState === "loading" || purchased) return;

    try {
      setCartState("loading");

      // NOTE: adjust `method` name to match whatever your backend expects.
      await axios.post("/", {
        method: "addToCart",
        story_id: Number(storyDetail.id),
      });

      setCartState("added");
    } catch (error: any) {
      console.error("Add to cart error:", error);
      setCartState("idle");

      Alert.alert(
        "Couldn't add to cart",
        error?.response?.data?.message || error?.message || "Please try again."
      );
    }
  };

  const onLockedChapterPress = () => {
    if (!storyDetail) return;

    const price =
      currency === "INR" ? storyDetail.price_inr : storyDetail.price_usd;

    Alert.alert(
      "This episode is locked",
      `Unlock every episode of "${storyDetail.title}" for ${formatPrice(
        price,
        currency
      )}.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Add to Cart", onPress: handleAddToCart },
      ]
    );
  };


  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  if (loading) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
      >
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>
          Loading story...
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
          {error || "Story not found"}
        </Text>

        <Pressable
          onPress={fetchStoryDetail}
          style={({ pressed }) => [
            localStyles.retryButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="refresh" size={16} color={COLORS.bgDeep} />
          <Text style={{ color: COLORS.bgDeep, fontWeight: "600", marginLeft: 6 }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }


  // -------------------------------------------------------
  // Responsive values (kept light — this layout doesn't need
  // the big hero-height math the old design did)
  // -------------------------------------------------------

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.9, 1.2);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(26 * scale), sideInset);

  const coverSize = Math.round(clampValue(112 * scale, 92, 132));
  const playButtonSize = Math.round(clampValue(58 * scale, 52, 68));
  const smallButtonSize = Math.round(clampValue(42 * scale, 38, 48));

  const hasPaidContent =
    !!storyDetail.chapters?.some((chapter) => !chapter.free) &&
    (typeof storyDetail.price_inr === "number" ||
      typeof storyDetail.price_usd === "number");

  const showPurchaseCard = hasPaidContent && !purchased;

  const currentPrice =
    currency === "INR" ? storyDetail.price_inr : storyDetail.price_usd;

  const totalDuration = formatTotalDuration(storyDetail.chapters ?? []);


  // -------------------------------------------------------
  // Play entire story
  // -------------------------------------------------------

  const handlePlayAlbum = async () => {
    if (!storyDetail.chapters || storyDetail.chapters.length === 0) {
      return;
    }

    const firstChapter = storyDetail.chapters[0];

    if (!firstChapter.free && !purchased) {
      onLockedChapterPress();
      return;
    }

    try {
      await playChapterAt(0, { autoPlay: true });
      dispatch(setIsExpanded(true));
      router.push("/player-standard");
    } catch (error) {
      console.error("Play story error:", error);
    }
  };


  // -------------------------------------------------------
  // Header (back nav + cover/title row + description + actions
  // + pricing banner + "Episodes" label) — all scrolls normally,
  // nothing here is absolutely positioned.
  // -------------------------------------------------------

  const listHeader = (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      {/* Back button */}
      <Pressable
        hitSlop={10}
        onPress={() => router.back()}
        style={({ pressed }) => [
          localStyles.backButton,
          { marginTop: insets.top + 6 },
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color={COLORS.gold} />
      </Pressable>

      {/* Cover + title/genre row */}
      <View style={localStyles.heroRow}>
        <View
          style={[
            localStyles.coverShadowWrap,
            { width: coverSize, height: coverSize, borderRadius: coverSize * 0.18 },
          ]}
        >
          <Image
            source={{ uri: storyDetail.cover }}
            style={[
              localStyles.coverImage,
              { width: coverSize, height: coverSize, borderRadius: coverSize * 0.18 },
            ]}
            resizeMode="cover"
          />
        </View>

        <View style={localStyles.heroTextCol}>
          <Text
            style={localStyles.heroTitle}
            numberOfLines={10}
            accessibilityRole="header"
          >
            {storyDetail.title}
          </Text>

          <View style={localStyles.metaRow}>
            <View style={localStyles.pill}>
              <Text style={localStyles.pillText}>{storyDetail.genre}</Text>
            </View>

            <View style={localStyles.metaDot} />

            <Text style={localStyles.metaPlain}>
              {storyDetail.chapters.length}{" "}
              {storyDetail.chapters.length === 1 ? "episode" : "episodes"}
            </Text>

            {totalDuration && (
              <>
                <View style={localStyles.metaDot} />
                <Text style={localStyles.metaPlain}>{totalDuration}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Actions row: share / play / bookmark + price on the right */}
      <View style={localStyles.actionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.circleButtonSmall,
            localStyles.circleButton,
            {
              width: smallButtonSize,
              height: smallButtonSize,
              borderRadius: smallButtonSize / 2,
            },
            pressed && localStyles.circleButtonPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="arrow-redo" size={16} color={COLORS.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            localStyles.playButton,
            {
              width: playButtonSize,
              height: playButtonSize,
              borderRadius: playButtonSize / 2,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          ]}
          onPress={handlePlayAlbum}
          accessibilityRole="button"
          accessibilityLabel="Play story"
        >
          <Ionicons
            name="play"
            size={22}
            color={COLORS.bgDeep}
            style={[styles.playIcon, { marginLeft: 2 }]}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.circleButtonSmall,
            localStyles.circleButton,
            {
              width: smallButtonSize,
              height: smallButtonSize,
              borderRadius: smallButtonSize / 2,
            },
            pressed && localStyles.circleButtonPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add to favorites"
        >
          <Ionicons name="bookmark" size={16} color={COLORS.textMuted} />
        </Pressable>

        <View style={{ flex: 1 }} />

        {hasPaidContent && (
          <View style={[localStyles.priceCol, purchased && localStyles.ownedPill]}>
            {purchased && (
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={COLORS.gold}
                style={{ marginBottom: 2 }}
              />
            )}
            <Text style={localStyles.priceFrom}>
              {purchased ? "Owned" : "Full story"}
            </Text>
            {!purchased && (
              <Text style={localStyles.priceAmt}>
                {formatPrice(currentPrice, currency)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* One-time purchase banner */}
      {showPurchaseCard && (
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
              One-time purchase, no subscription
            </Text>
            <Text style={localStyles.pricingBannerSub}>
              {formatPrice(currentPrice, currency)} unlocks all{" "}
              {storyDetail.chapters.length} episodes, forever
            </Text>
          </View>
        </View>
      )}

      <View style={localStyles.sectionLabelRow}>
        <Text style={localStyles.sectionLabel}>Episodes</Text>
        <Text style={localStyles.sectionLabelCount}>
          {storyDetail.chapters.length}
        </Text>
      </View>
    </View>
  );


  // -------------------------------------------------------
  // Footer: purchase card (inline, scrolls with content — no
  // absolute positioning, so it can never overlap the episode
  // list) + credits.
  // -------------------------------------------------------

  const listFooter = (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      {showPurchaseCard && (
        <View style={localStyles.purchaseCard}>
          <View style={localStyles.purchaseCardGlow} />

          <View style={localStyles.purchaseCardTopRow}>
            <View>
              <Text style={localStyles.purchaseLabel}>
                Unlock the full story
              </Text>
              <Text style={localStyles.purchaseSubLabel}>
                All {storyDetail.chapters.length} episodes, listen anytime
              </Text>
            </View>

            <CurrencyToggle currency={currency} onChange={setCurrency} />
          </View>

          <View style={localStyles.purchaseCardBottomRow}>
            <Text style={localStyles.purchasePrice}>
              {formatPrice(currentPrice, currency)}
            </Text>

            <Pressable
              onPress={handleAddToCart}
              disabled={cartState === "loading"}
              style={({ pressed }) => [
                localStyles.cartButton,
                cartState === "added" && localStyles.cartButtonAdded,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add story to cart"
            >
              {cartState === "loading" ? (
                <ActivityIndicator size="small" color={COLORS.bgDeep} />
              ) : cartState === "added" ? (
                <>
                  <Ionicons name="checkmark" size={17} color={COLORS.bgDeep} />
                  <Text style={localStyles.cartButtonText}>Added</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cart-outline" size={17} color={COLORS.bgDeep} />
                  <Text style={localStyles.cartButtonText}>Add to Cart</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Description */}
      <Text style={[styles.creditsHeading, localStyles.aboutHeading]}>
        About {storyDetail.title} :
      </Text>

      <Text style={localStyles.description} maxFontSizeMultiplier={1.4}>
        {storyDetail.description}
      </Text>

      <CreditsSection credits={storyDetail.credits} />
    </View>
  );


  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.bgFill} pointerEvents="none" />

      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000", "#000000"]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />
      <StatusBar style="light" />

      <FlatList
        data={storyDetail.chapters}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: horizontalPadding }}>
            <TrackRow
              track={item}
              chapterIndex={index}
              locked={!item.free && !purchased}
              isLast={index === storyDetail.chapters.length - 1}
              onLockedPress={onLockedChapterPress}
            />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{
          maxWidth: MAX_CONTENT_WIDTH,
          width: contentWidth,
          alignSelf: "center",
          // Leave room for a persistent mini-player elsewhere in the
          // app, if one is docked at the bottom of the screen.
          paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}


// ---------------------------------------------------------
// Local styles — the cover-beside-title hero, left-aligned
// description, and inline (non-floating) purchase card that
// match the actual Agal Vilakku design.
// ---------------------------------------------------------

const localStyles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
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

  // ---- Hero row: cover + title/genre ----
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 16,
  },
  coverShadowWrap: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  coverImage: {
    backgroundColor: COLORS.maroon,
    borderWidth: 1,
    borderColor: "rgba(240,230,210,0.08)",
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontFamily: "Roboto",
    fontWeight: "700",
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: 0.1,
    color: COLORS.cream,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(200,155,76,0.08)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textFainter,
  },
  metaPlain: {
    color: COLORS.textMutedDeep,
    fontSize: 12,
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

  // ---- Actions row ----
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 24,
  },
  circleButton: {
    backgroundColor: "rgba(240,230,210,0.05)",
    borderWidth: 1,
    borderColor: "rgba(240,230,210,0.08)",
  },
  circleButtonPressed: {
    backgroundColor: "rgba(240,230,210,0.1)",
  },
  playButton: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  priceCol: {
    alignItems: "flex-end",
  },
  ownedPill: {
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(200,155,76,0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  priceFrom: {
    color: COLORS.textFainter,
    fontSize: 11,
  },
  priceAmt: {
    fontFamily: "Fraunces-Medium",
    fontSize: 23,
    color: COLORS.cream,
    marginTop: 2,
  },

  // ---- Pricing banner ----
  pricingBanner: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 16,
    backgroundColor: "rgba(200,155,76,0.07)",
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

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 28,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.cream,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sectionLabelCount: {
    fontSize: 12,
    color: COLORS.textFainter,
    fontWeight: "500",
  },

  // ---- Episode row ----
  trackRow: {
    borderRadius: 14,
  },
  trackRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(240,230,210,0.07)",
  },
  trackRowPressed: {
    backgroundColor: "rgba(240,230,210,0.04)",
  },
  trackRowLocked: {
    opacity: 0.55,
  },
  trackNumberBadge: {
    borderWidth: 1,
    borderColor: "rgba(240,230,210,0.1)",
  },
  trackNumberBadgeActive: {
    backgroundColor: "rgba(200,155,76,0.08)",
    borderColor: COLORS.goldBorder,
  },
  trackNumberBadgeLocked: {
    borderColor: "rgba(166,146,122,0.3)",
    backgroundColor: "transparent",
  },
  trackMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  videoBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(200,155,76,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  trackTime: {
    color: COLORS.textFainter,
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
  lockedLabel: {
    color: COLORS.textFainter,
    fontSize: 11.5,
    fontStyle: "italic",
    marginRight: 4,
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

  // ---- Purchase card — inline in the scroll flow, sits right
  // after the episode list (matches .bundle-bar in the mock).
  // No position:absolute, so it can never overlap content.
  purchaseCard: {
    marginTop: 24,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.goldBorderFaint,
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 5 },
    }),
  },
  purchaseCardGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(200,155,76,0.08)",
  },
  purchaseCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  purchaseCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(240,230,210,0.08)",
  },
  purchaseLabel: {
    color: COLORS.cream,
    fontSize: 14.5,
    fontWeight: "600",
  },
  purchaseSubLabel: {
    color: COLORS.textFaint,
    fontSize: 12,
    marginTop: 3,
  },
  purchasePrice: {
    fontFamily: "Fraunces-Medium",
    color: COLORS.cream,
    fontSize: 27,
  },
  cartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    minWidth: 128,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  cartButtonAdded: {
    backgroundColor: COLORS.goldLight,
  },
  cartButtonText: {
    color: COLORS.bgDeep,
    fontSize: 13.5,
    fontWeight: "600",
  },

  // ---- Credits ----
  creditsCard: {
    marginTop: 8,
  },
});
