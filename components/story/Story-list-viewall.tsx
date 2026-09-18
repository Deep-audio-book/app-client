import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import styles, { COLORS } from "./listStyle";

/* ---------- colors ---------- */

const GRAD_ANGLE = { start: { x: 0.15, y: 0 }, end: { x: 0.85, y: 1 } };

const CARD_GRADIENTS: [string, string][] = [
  ["#22403A", "#0E1B19"], // g1
  ["#3A2340", "#0E1B19"], // g2
  ["#40311A", "#0E1B19"], // g3
  ["#3A1E22", "#0E1B19"], // g4
  ["#2C1B1B", "#0E1B19"], // g5
  ["#1B2C26", "#0E1B19"], // g6
];

/* ---------- types ---------- */

type TrendDirection = "up" | "down" | "same";

interface TrendingItem {
  id: string;
  rank: number;
  title: string;
  author: string;
  tag: string;
  plays: string;
  trend: TrendDirection;
  trendDelta?: number;
  gradientIndex: number;
}

type TimeRange = "Today" | "This Week" | "This Month";

/* ---------- mock data (swap for API data) ---------- */

const TIME_RANGES: TimeRange[] = ["Today", "This Week", "This Month"];

const CHIPS = [
  "அனைத்தும்",
  "History",
  "Crime",
  "Mystery",
  "Spiritual",
  "Business",
  "Fantasy",
];

const TRENDING_ITEMS: TrendingItem[] = [
  {
    id: "1",
    rank: 1,
    title: "ஏழாவது ஜென்மம்",
    author: "இந்திரா சௌந்தர்ராஜன்",
    tag: "Spiritual",
    plays: "12.4K plays",
    trend: "up",
    trendDelta: 2,
    gradientIndex: 0,
  },
  {
    id: "2",
    rank: 2,
    title: "காற்றாய் மாறிவிடு",
    author: "இந்திரா சௌந்தர்ராஜன்",
    tag: "Drama",
    plays: "9.8K plays",
    trend: "same",
    gradientIndex: 2,
  },
  {
    id: "3",
    rank: 3,
    title: "Iyum Vergal",
    author: "Unknown Author",
    tag: "Mystery",
    plays: "7.1K plays",
    trend: "up",
    trendDelta: 5,
    gradientIndex: 4,
  },
  {
    id: "4",
    rank: 4,
    title: "ஐந்தாம் சக்தி",
    author: "இந்திரா சௌந்தர்ராஜன்",
    tag: "Spiritual",
    plays: "6.5K plays",
    trend: "down",
    trendDelta: 1,
    gradientIndex: 1,
  },
  {
    id: "5",
    rank: 5,
    title: "Isai Kolai",
    author: "Rajesh Kumar",
    tag: "Crime",
    plays: "5.9K plays",
    trend: "up",
    trendDelta: 3,
    gradientIndex: 3,
  },
  {
    id: "6",
    rank: 6,
    title: "Thik Thik Thik",
    author: "இந்திரா சௌந்தர்ராஜன்",
    tag: "Thriller",
    plays: "5.2K plays",
    trend: "same",
    gradientIndex: 5,
  },
  {
    id: "7",
    rank: 7,
    title: "Urgent Siege",
    author: "Damned Anthem",
    tag: "Detective",
    plays: "4.8K plays",
    trend: "down",
    trendDelta: 2,
    gradientIndex: 0,
  },
  {
    id: "8",
    rank: 8,
    title: "Perunthakka Yavula",
    author: "Yathri",
    tag: "History",
    plays: "4.1K plays",
    trend: "up",
    trendDelta: 1,
    gradientIndex: 2,
  },
  {
    id: "9",
    rank: 9,
    title: "A for Apple, M for Murder",
    author: "Detective Series",
    tag: "Crime",
    plays: "3.6K plays",
    trend: "same",
    gradientIndex: 4,
  },
  {
    id: "10",
    rank: 10,
    title: "நான்காம் சக்தி",
    author: "இந்திரா சௌந்தர்ராஜன்",
    tag: "Spiritual",
    plays: "3.1K plays",
    trend: "down",
    trendDelta: 3,
    gradientIndex: 5,
  },
];

/* ---------- icons ---------- */

interface IconProps {
  size?: number;
  color?: string;
}

const BackIcon = ({ size = 16, color = COLORS.textHi }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
    <Path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SortIcon = ({ size = 16, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
    <Path d="M4 7h16M7 12h10M10 17h4" strokeLinecap="round" />
  </Svg>
);

const PlayIcon = ({ size = 13, color = "#241D06" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const PauseIcon = ({ size = 12, color = "#241D06" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Rect x={6} y={5} width={4} height={14} />
    <Rect x={14} y={5} width={4} height={14} />
  </Svg>
);


/* ---------- sub components ---------- */

const SegmentedControl: React.FC<{
  options: TimeRange[];
  active: TimeRange;
  onSelect: (opt: TimeRange) => void;
}> = ({ options, active, onSelect }) => (
  <View style={styles.segmented}>
    {options.map((opt) => {
      const isOn = opt === active;
      return (
        <TouchableOpacity
          key={opt}
          style={[styles.segItem, isOn && styles.segItemOn]}
          activeOpacity={0.8}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.segItemText, isOn && styles.segItemTextOn]}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const ChipRow: React.FC<{
  chips: string[];
  active: string;
  onSelect: (chip: string) => void;
}> = ({ chips, active, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipRow}
  >
    {chips.map((chip) => {
      const isOn = chip === active;
      return (
        <TouchableOpacity
          key={chip}
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

const TrendBadge: React.FC<{ trend: TrendDirection; delta?: number; isTop3: boolean }> = ({
  trend,
  delta,
  isTop3,
}) => {
  if (trend === "same") {
    return <Text style={[styles.trendText, styles.trendSame]}>—</Text>;
  }

  const isUp = trend === "up";

  return (
    <Text
      style={[
        styles.trendText,
        isUp ? styles.trendUp : styles.trendDown,
      ]}
    >
      {isUp ? "▲" : "▼"} {delta}
    </Text>
  );
};

const TrendingRow: React.FC<{ item: TrendingItem }> = ({ item }) => {
  const isTop3 = item.rank <= 3;
  const gradient = CARD_GRADIENTS[item.gradientIndex % CARD_GRADIENTS.length];

  return (
    <TouchableOpacity
      style={[styles.row, isTop3 && styles.rowTop3]}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/storyView",
          params: { id: item.id, title: item.title },
        })
      }
    >
      <View style={styles.rankCol}>
        <Text style={[styles.rankNum, isTop3 && styles.rankNumTop3]}>
          {item.rank}
        </Text>
        <TrendBadge trend={item.trend} delta={item.trendDelta} isTop3={isTop3} />
      </View>

      <View style={styles.rowCover}>
        <LinearGradient
          colors={gradient}
          start={GRAD_ANGLE.start}
          end={GRAD_ANGLE.end}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowAuthor} numberOfLines={1}>
          {item.author}
        </Text>
        <View style={styles.rowMeta}>
          <View style={styles.rowTag}>
            <Text style={styles.rowTagText}>{item.tag}</Text>
          </View>
          <Text style={styles.rowPlays}>{item.plays}</Text>
        </View>
      </View>

      <View style={styles.rowPlayBtn}>
        <PlayIcon />
      </View>
    </TouchableOpacity>
  );
};

const MiniPlayer: React.FC<{
  title: string;
  subtitle: string;
  progress: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
}> = ({ title, subtitle, progress, isPlaying, onTogglePlay, onExpand }) => (
  <TouchableOpacity
    style={styles.miniplayer}
    activeOpacity={0.9}
    onPress={onExpand}
  >
    <View style={styles.mpProgressTrack}>
      <View
        style={[
          styles.mpProgressFill,
          { width: `${Math.round(progress * 100)}%` },
        ]}
      />
    </View>

    <LinearGradient
      colors={CARD_GRADIENTS[1]}
      start={GRAD_ANGLE.start}
      end={GRAD_ANGLE.end}
      style={styles.mpCover}
    />

    <View style={styles.mpInfo}>
      <Text style={styles.mpTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.mpSub} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>

    <TouchableOpacity style={styles.mpPlayBtn} onPress={onTogglePlay} hitSlop={8}>
      {isPlaying ? <PauseIcon /> : <PlayIcon size={12} />}
    </TouchableOpacity>

    <Text style={styles.mpExpand}>⌃</Text>
  </TouchableOpacity>
);

type ApiStory = {
  id: number;
  title: string;
  [key: string]: any;
};
type StoryViewAllProps = {
  title: string;
  stories: ApiStory[];
};
 

/* ---------- main screen ---------- */

const StoryViewAll: React.FC<StoryViewAllProps> = ({
  title,
  stories,
}) => {
  const insets = useSafeAreaInsets();
  useLocalSearchParams<{ title?: string }>();
  const [timeRange, setTimeRange] = React.useState<TimeRange>("This Week");
  const [activeChip, setActiveChip] = React.useState(CHIPS[0]);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const filteredItems =
    activeChip === CHIPS[0]
      ? TRENDING_ITEMS
      : TRENDING_ITEMS.filter((i) => i.tag === activeChip);

  return (
    <View style={styles.screen}>
        <View
          style={styles.bgFill}
          pointerEvents="none"
        />

        <LinearGradient
          colors={[
            "rgba(0,0,0,0)",
            "#000000",
            "#000000",
          ]}
          locations={[
            0.026,
            0.6377,
            1,
          ]}
          style={styles.bgOverlay}
          pointerEvents="none"
        />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <BackIcon />
            </TouchableOpacity>

            <View style={styles.pageTitleWrap}>
              <Text style={styles.pageTitle}>Trending Now</Text>
              <Text style={styles.pageSub}>
                Ranked by plays across Deep Audiobooks
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sortBtn}
              accessibilityRole="button"
              accessibilityLabel="Sort options"
            >
              <SortIcon />
            </TouchableOpacity>
          </View>

          <SegmentedControl
            options={TIME_RANGES}
            active={timeRange}
            onSelect={setTimeRange}
          />

          <ChipRow chips={CHIPS} active={activeChip} onSelect={setActiveChip} />
        </View>

        <Text style={styles.resultCount}>
          {filteredItems.length} trending titles · updated 2 hours ago
        </Text>

        <View style={styles.list}>
          {filteredItems.map((item) => (
            <TrendingRow key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>

      {/* <MiniPlayer
        title="Urgent Siege"
        subtitle="Damned Anthem · Ch. 6"
        progress={0.38}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onExpand={() => router.push("/player")}
      /> */}

     
    </View>
  );
};

export default StoryViewAll;


