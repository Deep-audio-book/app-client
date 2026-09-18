import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

/* ---------- icons (same conventions as SearchScreen/FavoritesScreen: stroke-based, 24x24 viewBox) ---------- */

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

const ChevronRightIcon = ({ size = 17, color = "rgba(255,255,255,0.35)" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="9 6 15 12 9 18" />
  </Svg>
);

const HomeIcon = ({ size = 22, color = "#7a7a7a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M3 11.5 12 4l9 7.5" />
    <Path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
  </Svg>
);

const SearchIcon = ({ size = 22, color = "#7a7a7a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={11} cy={11} r={7} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

const BookmarkIcon = ({ size = 22, color = "#7a7a7a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M6 3h12v18l-6-4-6 4V3Z" />
  </Svg>
);

const LibraryIcon = ({ size = 22, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 6h16M4 12h16M4 18h10" />
  </Svg>
);

/* ---------- data ---------- */

type TrackItem = {
  id: string;
  title: string;
  meta: string;
  gradient: [string, string];
  route: string;
};

const LAST_PLAYED = {
  id: "silver-orchard",
  title: "The Silver Orchard",
  subtitle: "Chapter 8 · 12 min left",
  progress: 0.62,
  gradient: ["#e0a94a", "#c05a2a"] as [string, string],
  route: "/player/silver-orchard",
};

const DOWNLOADED: TrackItem[] = [
  { id: "ashwood-falls", title: "Ashwood Falls", meta: "Emma Clarke · 42 min", gradient: ["#4ae0b0", "#2a6a8a"], route: "/title/ashwood-falls" },
  { id: "whispers-fog", title: "Whispers in the Fog", meta: "James Reed · 55 min", gradient: ["#b04ae0", "#5a2a8a"], route: "/title/whispers-fog" },
  { id: "silver-orchard", title: "The Silver Orchard", meta: "Priya Nair · 38 min", gradient: ["#e0a94a", "#c05a2a"], route: "/title/silver-orchard" },
];

const RECENTLY_LISTENED: TrackItem[] = [
  { id: "letters-marlow", title: "Letters from Marlow", meta: "Marcus Chen · Yesterday", gradient: ["#e04a7a", "#8a2a4a"], route: "/title/letters-marlow" },
  { id: "beneath-tide", title: "Beneath the Tide", meta: "Sofia Alves · 2 days ago", gradient: ["#4a6fe0", "#2a3f8a"], route: "/title/beneath-tide" },
  { id: "ashwood-falls-2", title: "Ashwood Falls", meta: "Emma Clarke · 4 days ago", gradient: ["#4ae0b0", "#2a6a8a"], route: "/title/ashwood-falls" },
];

/* ---------- section pieces, matching FavoritesScreen's TouchableOpacity + accessibility pattern ---------- */

const SectionHeader: React.FC<{ title: string; onViewAll: () => void }> = ({ title, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity
      onPress={onViewAll}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View all ${title.toLowerCase()}`}
    >
      <Text style={styles.viewAll}>View all</Text>
    </TouchableOpacity>
  </View>
);

const TrackRow: React.FC<{ item: TrackItem; trailing: "check" | "chevron" }> = ({ item, trailing }) => (
  <TouchableOpacity
    style={styles.trackRow}
    activeOpacity={0.85}
    onPress={() => router.push(item.route as any)}
    accessibilityRole="button"
    accessibilityLabel={item.title}
  >
    <View style={styles.trackArt}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>

    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.trackMeta} numberOfLines={1}>
        {item.meta}
      </Text>
    </View>

    {trailing === "check" ? <CheckIcon /> : <ChevronRightIcon />}
  </TouchableOpacity>
);

/* ---------- main component ---------- */

const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
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
        contentContainerStyle={[styles.wrapContent, { paddingBottom: insets.bottom + 12 }]}
      >
        {/* ---------- top bar, same pattern as SearchScreen/FavoritesScreen ---------- */}

        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>Library</Text>

          <TouchableOpacity
            style={styles.profileDot}
            activeOpacity={0.7}
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <LinearGradient colors={["#e85c3f", "#d9a441"]} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.profileDotText}>S</Text>
          </TouchableOpacity>
        </View>

        {/* ---------- last played ---------- */}

        <View style={styles.section}>
          <Text style={styles.eyebrow}>Last played</Text>

          <TouchableOpacity
            style={styles.lastPlayedCard}
            activeOpacity={0.9}
            onPress={() => router.push(LAST_PLAYED.route as any)}
            accessibilityRole="button"
            accessibilityLabel={`Resume ${LAST_PLAYED.title}`}
          >
            <View style={styles.lastPlayedArt}>
              <LinearGradient
                colors={LAST_PLAYED.gradient}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            <View style={styles.lastPlayedInfo}>
              <Text style={styles.lastPlayedTitle} numberOfLines={1}>
                {LAST_PLAYED.title}
              </Text>
              <Text style={styles.lastPlayedSubtitle} numberOfLines={1}>
                {LAST_PLAYED.subtitle}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${LAST_PLAYED.progress * 100}%` }]} />
              </View>
            </View>

            <View style={styles.resumeButton}>
              <PlayIcon />
            </View>
          </TouchableOpacity>
        </View>

        {/* ---------- downloaded ---------- */}

        <View style={styles.section}>
          <SectionHeader title="Downloaded" onViewAll={() => router.push("/")} />
          <View style={styles.trackList}>
            {DOWNLOADED.map((item) => (
              <TrackRow key={item.id} item={item} trailing="check" />
            ))}
          </View>
        </View>

        {/* ---------- recently listened ---------- */}

        <View style={styles.section}>
          <SectionHeader title="Recently listened" onViewAll={() => router.push("/")} />
          <View style={styles.trackList}>
            {RECENTLY_LISTENED.map((item, i) => (
              <TrackRow key={item.id + i} item={item} trailing="chevron" />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ---------- bottom tab bar, same structure as SearchScreen/FavoritesScreen ---------- */}

     
    </View>
  );
};

export default LibraryScreen;

/* ---------- styles, values reused directly from SearchScreen/FavoritesScreen for a consistent look ---------- */

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

  /* top bar — identical to FavoritesScreen.topbar */
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
  profileDotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  /* generic section — identical spacing to FavoritesScreen.section */
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
  viewAll: {
    fontSize: 12,
    color: "#8a8a8a",
  },

  /* last played card */
  lastPlayedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#151515",
    padding: 12,
    gap: 12,
  },
  lastPlayedArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
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

  /* track list — used for both Downloaded and Recently listened */
  trackList: {
    gap: 0,
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

  /* bottom tab bar — identical to SearchScreen/FavoritesScreen.tabBar */
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222",
    backgroundColor: "#000",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: "#7a7a7a",
  },
  tabLabelActive: {
    color: "#fff",
    fontWeight: "500",
  },
});
