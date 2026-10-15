import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";

import ProgressRingPlayButton from "@/components/ui/ProgressRingPlayButton";
import WishlistHeart from "@/components/ui/WishlistHeart";
import { storyWishlisted, useWishlistStore } from "@/redux/slices/wishlistStore";
import { Story } from "@/type/story";

import styles, { COLORS } from "./gridStyle";

/* =========================================================
   PROPS
========================================================= */

interface StoryGridViewProps {
  bgFill?: string;
  keyType?: string;
  fallbackTitle?: string;
  chips: string[];
  activeChip: string;
  setActiveChip: (chip: string) => void;
  stories: Story[];
  heading: string;
  subheading: string;
  loading: boolean;
  error: string | null;
}

interface IconProps {
  size?: number;
  color?: string;
}

/* =========================================================
   BACK ICON
========================================================= */

const BackIcon = ({
  size = 16,
  color = COLORS.textHi,
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.4}
  >
    <Path
      d="M15 18l-6-6 6-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* =========================================================
   LIST ICON
========================================================= */

const ListIcon = ({
  size = 15,
  color = COLORS.gold,
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
  >
    <Path d="M4 6h16" strokeLinecap="round" />
    <Path d="M4 12h16" strokeLinecap="round" />
    <Path d="M4 18h16" strokeLinecap="round" />
  </Svg>
);

/* =========================================================
   PLAY ICON
========================================================= */

const PlayIcon = ({
  size = 12,
  color = "#241D06",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

/* =========================================================
   DURATION PARSER
========================================================= */

const getDurationInSeconds = (duration?: string): number => {
  if (!duration) return 0;

  const parsed = parseFloat(
    duration.replace(/seconds?/gi, "").trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

/* =========================================================
   CHIP ROW
========================================================= */

const ChipRow: React.FC<{
  chips: string[];
  active: string;
  onSelect: (chip: string) => void;
}> = ({ chips, active, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {chips.map((chip, index) => {
        const isOn =
          chip.toLowerCase() === active.toLowerCase();

        return (
          <TouchableOpacity
            key={`${chip}-${index}`}
            style={[styles.chip, isOn && styles.chipOn]}
            activeOpacity={0.8}
            onPress={() => onSelect(chip)}
          >
            <Text
              style={[
                styles.chipText,
                isOn && styles.chipTextOn,
              ]}
            >
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/* =========================================================
   STORY CARD
========================================================= */

const ReleaseCard: React.FC<{
  item: Story;
  keyType?: string;
}> = ({ item, keyType }) => {
  const { t } = useTranslation();

  const isContinueListening =
    keyType?.toLowerCase() === "continue_listening";

  const totalSeconds = getDurationInSeconds(
    item.story_duration_seconds
  );

  const listenedSeconds = Number(
    item.last_listened_seconds ?? 0
  );

  const progress =
    isContinueListening && totalSeconds > 0
      ? Math.min(
          Math.max(
            (listenedSeconds / totalSeconds) * 100,
            0
          ),
          100
        )
      : 0;

  /* =======================================================
     OPEN STORY
  ======================================================= */

  const openStory = () => {
    console.log(
      "Opening story:",
      item.id,
      item.title
    );

    router.push({
      pathname: "/storyEpisode",
      params: {
        storyId: String(item.id),
        title: item.title,
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.relCard}
      activeOpacity={0.85}
      onPress={openStory}
    >
      {/* =================================================
          COVER
      ================================================= */}

      <View style={styles.relCover}>
        {item.cover ? (
          <Image
            source={{ uri: item.cover }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
              backgroundColor: COLORS.bgSurface,
            }}
          />
        )}

        {/* NEW BADGE (top-left) */}

        {item.isNew && (
          <View style={styles.relNewBadge}>
            <Text style={styles.relBadgeText}>
              {t("common.new", "NEW")}
            </Text>
          </View>
        )}

        {/* HEART (top-right) — shared component + global store.
            Filled pink when the user has already liked it. */}

        <View style={styles.relHeart}>
          <WishlistHeart
            storyId={item.id}
            initialLiked={storyWishlisted(item)}
            size={18}
          />
        </View>

        {/* DAY BADGE (bottom-left) — moved here so it does not
            clash with the heart or the old play button spot */}

        {item.day ? (
          <View style={styles.relDayBadge}>
            <Text style={styles.relDayText}>
              {item.day}
            </Text>
          </View>
        ) : null}
      </View>

      {/* =================================================
          BODY
      ================================================= */}

      <View style={styles.relBody}>
        <Text
          style={styles.relTitle}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text
          style={styles.relAuthor}
          numberOfLines={1}
        >
          {item.author}
        </Text>

        {/* NARRATOR */}

        {!!item.narrator && (
          <Text
            style={[
              styles.relAuthor,
              { opacity: 0.75 },
            ]}
            numberOfLines={1}
          >
            {t("home.voice", "Voice")}: {item.narrator}
          </Text>
        )}

        {/* FOOTER ROW: genre on the left, play button on the right */}

        <View style={styles.relFooter}>
          <View style={styles.relFooterLeft}>
            {item.genre?.length > 0 && (
              <View style={styles.relTag}>
                <Text
                  style={styles.relTagText}
                  numberOfLines={1}
                >
                  {item.genre.join(", ")}
                </Text>
              </View>
            )}
          </View>

          <ProgressRingPlayButton
            style={styles.relPlayBtn}
            active={isContinueListening}
            progress={progress}
            ringColor={COLORS.gold}
          >
            <PlayIcon />
          </ProgressRingPlayButton>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* =========================================================
   MAIN SCREEN
========================================================= */

const StoryGridView: React.FC<StoryGridViewProps> = ({
  bgFill,
  keyType,
  fallbackTitle,
  chips,
  activeChip,
  setActiveChip,
  stories,
  heading,
  subheading,
  loading,
  error,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  /* =======================================================
     SEED GLOBAL WISHLIST STORE

     Stories load aana udane avanga like status ah store la
     podrom. Home / Album la already like pannirundha, store
     value dhaan win aagum (seed overwrite pannaadhu).
  ======================================================= */

  useEffect(() => {
    if (stories?.length) {
      useWishlistStore.getState().seedMany(stories as any[]);
    }
  }, [stories]);

  /* =======================================================
     SWITCH TO LIST
  ======================================================= */

  const handleToggleView = () => {
    router.setParams({
      view_type: "list",
    });
  };

  /* =======================================================
     FILTER
  ======================================================= */

  const isAllSelected =
    activeChip.toLowerCase() ===
    t("common.all", "All").toLowerCase();

  const filteredItems =
    isAllSelected || chips.length === 0
      ? stories
      : keyType === "5"
      ? stories.filter(
          (item) =>
            item.category?.toLowerCase() ===
            activeChip.toLowerCase()
        )
      : stories.filter((item) =>
          item.genre?.some(
            (genre) =>
              genre.toLowerCase() ===
              activeChip.toLowerCase()
          )
        );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.screen}>
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <View
        style={[
          styles.bgFill,
          bgFill
            ? { backgroundColor: bgFill }
            : undefined,
        ]}
        pointerEvents="none"
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0)",
          "#000000",
          "#000000",
        ]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />

      {/* =================================================
          SCROLL
      ================================================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={[
            styles.pageHeader,
            {
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <View style={styles.headerRow}>
            {/* BACK */}

            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <BackIcon />
            </TouchableOpacity>

            {/* TITLE */}

            <View style={styles.pageTitleWrap}>
              <Text
                style={styles.pageTitle}
                numberOfLines={1}
              >
                {heading ||
                  fallbackTitle ||
                  t("common.stories", "Stories")}
              </Text>

              {subheading ? (
                <Text
                  style={styles.pageSub}
                  numberOfLines={2}
                >
                  {subheading}
                </Text>
              ) : null}
            </View>

            {/* LIST TOGGLE */}

            <TouchableOpacity
              style={styles.gridToggle}
              activeOpacity={0.8}
              onPress={handleToggleView}
            >
              <ListIcon />
            </TouchableOpacity>
          </View>

          {/* CHIPS */}

          {chips.length > 0 && (
            <ChipRow
              chips={chips}
              active={activeChip}
              onSelect={setActiveChip}
            />
          )}
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        {loading ? (
          <View
            style={{
              paddingTop: 40,
              alignItems: "center",
            }}
          >
            <ActivityIndicator
              color={COLORS.gold}
              size="large"
            />

            <Text
              style={{
                color: COLORS.textHi,
                marginTop: 10,
              }}
            >
              {t(
                "common.loadingStories",
                "Loading stories..."
              )}
            </Text>
          </View>
        ) : error ? (
          <View
            style={{
              paddingTop: 40,
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                color: COLORS.textHi,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View
            style={{
              paddingTop: 40,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: COLORS.textHi,
              }}
            >
              {t(
                "common.noStoriesFound",
                "No stories found."
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map((item) => (
              <ReleaseCard
                key={item.id}
                item={item}
                keyType={keyType}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StoryGridView;