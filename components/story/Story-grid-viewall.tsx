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
import styles, { COLORS } from "./gridStyle";

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

interface ReleaseItem {
  id: string;
  title: string;
  author: string;
  tag: string;
  day: string;
  isNew?: boolean;
  gradientIndex: number;
}

interface DateGroup {
  id: string;
  label: string;
  count: number;
  items: ReleaseItem[];
}

/* ---------- mock data (swap for API data) ---------- */

const CHIPS = [
  "All",
  "HistoryView",
  "Crime",
  "Mystery",
  "Spiritual",
  "Business",
  "Fantasy",
];

const DATE_GROUPS: DateGroup[] = [
  {
    id: "today",
    label: "இன்று",
    count: 2,
    items: [
      {
        id: "1",
        title: "Perunthakka Yavula",
        author: "Yathri",
        tag: "HistoryView",
        day: "Today",
        isNew: true,
        gradientIndex: 3,
      },
      {
        id: "2",
        title: "Isai Kolai",
        author: "Rajesh Kumar",
        tag: "Crime",
        day: "Today",
        isNew: true,
        gradientIndex: 4,
      },
    ],
  },
  {
    id: "yesterday",
    label: "நேற்று",
    count: 2,
    items: [
      {
        id: "3",
        title: "நான்காம் சக்தி",
        author: "இந்திரா சௌந்தர்ராஜன்",
        tag: "Spiritual",
        day: "Yesterday",
        gradientIndex: 5,
      },
      {
        id: "4",
        title: "A for Apple, M for Murder",
        author: "Detective Series",
        tag: "Crime",
        day: "Yesterday",
        gradientIndex: 0,
      },
    ],
  },
  {
    id: "this-week",
    label: "இந்த வாரம்",
    count: 4,
    items: [
      {
        id: "5",
        title: "காற்றாய் மாறிவிடு",
        author: "இந்திரா சௌந்தர்ராஜன்",
        tag: "Drama",
        day: "Mon",
        gradientIndex: 2,
      },
      {
        id: "6",
        title: "Thik Thik Thik",
        author: "இந்திரா சௌந்தர்ராஜன்",
        tag: "Thriller",
        day: "Mon",
        gradientIndex: 1,
      },
      {
        id: "7",
        title: "Iyum Vergal",
        author: "Unknown Author",
        tag: "Mystery",
        day: "Sun",
        gradientIndex: 4,
      },
      {
        id: "8",
        title: "Urgent Siege",
        author: "Damned Anthem",
        tag: "Detective",
        day: "Sun",
        gradientIndex: 5,
      },
    ],
  },
  {
    id: "earlier",
    label: "முந்தையவை",
    count: 2,
    items: [
      {
        id: "9",
        title: "ஐந்தாம் சக்தி",
        author: "இந்திரா சௌந்தர்ராஜன்",
        tag: "Spiritual",
        day: "Aug 3",
        gradientIndex: 3,
      },
      {
        id: "10",
        title: "ஏழாவது ஜென்மம்",
        author: "இந்திரா சௌந்தர்ராஜன்",
        tag: "Spiritual",
        day: "Aug 1",
        gradientIndex: 0,
      },
    ],
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

const GridIcon = ({ size = 15, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
    <Rect x={3} y={3} width={7} height={7} rx={1.5} />
    <Rect x={14} y={3} width={7} height={7} rx={1.5} />
    <Rect x={3} y={14} width={7} height={7} rx={1.5} />
    <Rect x={14} y={14} width={7} height={7} rx={1.5} />
  </Svg>
);

const PlayIcon = ({ size = 12, color = "#241D06" }: IconProps) => (
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


type ApiStory = {
  id: number;
  title: string;
  [key: string]: any;
};

type StoryGridViewProps = {
  title: string;
  stories: ApiStory[];
};

/* ---------- sub components ---------- */

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

const ReleaseCard: React.FC<{ item: ReleaseItem }> = ({ item }) => {
  const gradient = CARD_GRADIENTS[item.gradientIndex % CARD_GRADIENTS.length];

  return (
    <TouchableOpacity
      style={styles.relCard}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/storyView",
          params: { id: item.id, title: item.title },
        })
      }
    >
      <View style={styles.relCover}>
        <LinearGradient
          colors={gradient}
          start={GRAD_ANGLE.start}
          end={GRAD_ANGLE.end}
          style={StyleSheet.absoluteFillObject}
        />

        {item.isNew && (
          <View style={styles.relNewBadge}>
            <Text style={styles.relBadgeText}>NEW</Text>
          </View>
        )}

        <View style={styles.relDayBadge}>
          <Text style={styles.relDayText}>{item.day}</Text>
        </View>

        <View style={styles.relPlayBtn}>
          <PlayIcon />
        </View>
      </View>

      <View style={styles.relBody}>
        <Text style={styles.relTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.relAuthor} numberOfLines={1}>
          {item.author}
        </Text>
        <View style={styles.relTag}>
          <Text style={styles.relTagText}>{item.tag}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DateGroupSection: React.FC<{ group: DateGroup }> = ({ group }) => (
  <View>
    <View style={styles.dateGroupLabelRow}>
      <Text style={styles.dateGroupLabel}>{group.label}</Text>
      <Text style={styles.dateGroupCount}> · {group.count} titles</Text>
      <View style={styles.dateGroupRule} />
    </View>

    <View style={styles.grid}>
      {group.items.map((item) => (
        <ReleaseCard key={item.id} item={item} />
      ))}
    </View>
  </View>
);

const MiniPlayer: React.FC<{
  title: string;
  subtitle: string;
  progress: number; // 0..1
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

    <TouchableOpacity
      style={styles.mpPlayBtn}
      onPress={onTogglePlay}
      hitSlop={8}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </TouchableOpacity>

    <Text style={styles.mpExpand}>⌃</Text>
  </TouchableOpacity>
);


/* ---------- main screen ---------- */

const StoryGridView: React.FC<StoryGridViewProps> = ({
  title,
  stories,
}) => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title?: string }>();
  const [activeChip, setActiveChip] = React.useState(CHIPS[0]);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const filteredGroups =
    activeChip === CHIPS[0]
      ? DATE_GROUPS
      : DATE_GROUPS.map((g) => ({
          ...g,
          items: g.items.filter((i) => i.tag === activeChip),
        })).filter((g) => g.items.length > 0);

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
              <Text style={styles.pageTitle}>
                 {params.title || "New Releases"}
              </Text>
              <Text style={styles.pageSub}>
                Freshly added, newest first
              </Text>
            </View>

            <TouchableOpacity
              style={styles.gridToggle}
              accessibilityRole="button"
              accessibilityLabel="Toggle grid view"
            >
              <GridIcon />
            </TouchableOpacity>
          </View>

          <ChipRow
            chips={CHIPS}
            active={activeChip}
            onSelect={setActiveChip}
          />
        </View>

        {filteredGroups.map((group) => (
          <DateGroupSection key={group.id} group={group} />
        ))}
      </ScrollView>
    </View>
  );
};

export default StoryGridView;


