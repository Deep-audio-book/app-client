import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import ProgressRingPlayButton from "@/components/ui/ProgressRingPlayButton";
import { Story } from "@/type/story";
import styles, { COLORS } from "./listStyle";

/* =========================================================
   PROPS
========================================================= */

interface StoryListViewProps {
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

const BackIcon = ({ size = 16, color = COLORS.textHi }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
    <Path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/* =========================================================
   GRID ICON (toggle button, points to switching to grid view)
========================================================= */

const GridIcon = ({ size = 15, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
    <Rect x={3} y={3} width={7} height={7} rx={1.5} />
    <Rect x={14} y={3} width={7} height={7} rx={1.5} />
    <Rect x={3} y={14} width={7} height={7} rx={1.5} />
    <Rect x={14} y={14} width={7} height={7} rx={1.5} />
  </Svg>
);

/* =========================================================
   PLAY ICON
========================================================= */

const PlayIcon = ({ size = 13, color = "#241D06" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

/* =========================================================
   DURATION PARSER
========================================================= */

const getDurationInSeconds = (duration?: string): number => {
  if (!duration) return 0;
  const parsed = parseFloat(duration.replace(/seconds?/gi, "").trim());
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
        const isOn = chip.toLowerCase() === active.toLowerCase();

        return (
          <TouchableOpacity
            key={`${chip}-${index}`}
            style={[styles.chip, isOn && styles.chipOn]}
            activeOpacity={0.8}
            onPress={() => onSelect(chip)}
          >
            <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/* =========================================================
   STORY ROW
========================================================= */

const TrendingRow: React.FC<{
  item: Story;
  keyType?: string;
}> = ({ item, keyType }) => {
  const isContinueListening = keyType?.toLowerCase() === "continue_listening";

  const totalSeconds = getDurationInSeconds(item.story_duration_seconds);
  const listenedSeconds = Number(item.last_listened_seconds ?? 0);

  const progress =
    isContinueListening && totalSeconds > 0
      ? Math.min(Math.max((listenedSeconds / totalSeconds) * 100, 0), 100)
      : 0;

  /* =======================================================
     OPEN STORY

     IMPORTANT:
     No API call here.
     No await here.
     Navigation only.
  ======================================================= */

  const openStory = () => {
    console.log("Opening story from list:", item.id, item.title);

    router.push({
      pathname: "/storyEpisode",
      params: {
        storyId: String(item.id),
        title: item.title,
      },
    });
  };

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={openStory}>
      {/* =================================================
          COVER
      ================================================= */}

      <View style={styles.rowCover}>
        {item.cover ? (
          <Image
            source={{ uri: item.cover }}
            style={styles.rowCoverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.rowCoverImage, { backgroundColor: COLORS.bgSurface }]} />
        )}
      </View>

      {/* =================================================
          BODY
      ================================================= */}

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>

        <Text style={styles.rowAuthor} numberOfLines={1}>
          {item.author}
        </Text>

        {/* Narrator ("Voice: <name>") — only rendered when the
            backend actually sends a narrator for this story. */}

        {!!item.narrator && (
          <Text style={[styles.rowAuthor, { opacity: 0.75 }]} numberOfLines={1}>
            Voice: {item.narrator}
          </Text>
        )}

        <View style={styles.rowMeta}>
          {item.genre?.length > 0 && (
            <View style={styles.rowTag}>
              <Text style={styles.rowTagText} numberOfLines={1}>
                {item.genre.join(", ")}
              </Text>
            </View>
          )}

          {item.playsLabel ? (
            <Text style={styles.rowPlays}>{item.playsLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* =================================================
          PLAY BUTTON — same position/size as before, now
          with an optional progress ring drawn around it
          instead of a separate "RESUME %" label underneath.
      ================================================= */}

      <ProgressRingPlayButton
        style={styles.rowPlayBtn}
        active={isContinueListening}
        progress={progress}
        ringColor={COLORS.gold}
      >
        <PlayIcon />
      </ProgressRingPlayButton>
    </TouchableOpacity>
  );
};

/* =========================================================
   MAIN SCREEN
========================================================= */

const StoryListView: React.FC<StoryListViewProps> = ({
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

  /* =======================================================
     SWITCH TO GRID
  ======================================================= */

  const handleToggleView = () => {
    router.setParams({ view_type: "grid" });
  };

  /* =======================================================
     FILTER HELPER

     Accepts either a genre array (string[]) or a single
     category string (string) and matches it against the
     active chip.
  ======================================================= */

  const matchesChip = (
    value: string | string[] | undefined,
    chip: string
  ) => {
    if (chip.toLowerCase() === "all") return true;
    const target = chip.trim().toLowerCase();

    if (Array.isArray(value)) {
      return value.some((entry) => entry.trim().toLowerCase() === target);
    }

    return value?.trim().toLowerCase() === target;
  };

  /* =======================================================
     FILTER + SORT

     keyType === "5" -> filter by `category`
     everything else -> filter by `genre`
  ======================================================= */

  const filteredItems = stories
    .filter((item) =>
      keyType === "5"
        ? matchesChip(item.category, activeChip)
        : matchesChip(item.genre, activeChip)
    )
    .slice()
    .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.screen}>
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <View
        style={[styles.bgFill, bgFill ? { backgroundColor: bgFill } : undefined]}
        pointerEvents="none"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000", "#000000"]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />

      {/* =================================================
          SCROLL
      ================================================= */}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            {/* BACK */}

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <BackIcon />
            </TouchableOpacity>

            {/* TITLE */}

            <View style={styles.pageTitleWrap}>
              <Text style={styles.pageTitle} numberOfLines={1}>
                {heading || fallbackTitle || "Stories"}
              </Text>

              {subheading ? (
                <Text style={styles.pageSub} numberOfLines={2}>
                  {subheading}
                </Text>
              ) : null}
            </View>

            {/* GRID BUTTON */}

            <TouchableOpacity
              style={styles.sortBtn}
              onPress={handleToggleView}
              accessibilityRole="button"
              accessibilityLabel="Switch to grid view"
            >
              <GridIcon />
            </TouchableOpacity>
          </View>

          {/* =================================================
              CHIPS
          ================================================= */}

          {chips.length > 0 && (
            <ChipRow chips={chips} active={activeChip} onSelect={setActiveChip} />
          )}
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={COLORS.gold} size="large" />
            <Text style={{ color: COLORS.textHi, marginTop: 10 }}>
              Loading stories...
            </Text>
          </View>
        ) : error ? (
          <View style={{ paddingTop: 40, alignItems: "center", paddingHorizontal: 20 }}>
            <Text style={{ color: COLORS.textHi, textAlign: "center" }}>{error}</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: COLORS.textHi }}>No stories in this category.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredItems.map((item) => (
              <TrendingRow key={item.id} item={item} keyType={keyType} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StoryListView;
