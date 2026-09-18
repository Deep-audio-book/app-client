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
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";

/* ---------- icons (same conventions as SearchScreen: stroke-based, 24x24 viewBox) ---------- */

interface IconProps {
  size?: number;
  color?: string;
}

const HeadsetIcon = ({ size = 18, color = "#d9a441" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 13v-1a8 8 0 0116 0v1" />
    <Rect x={2} y={13} width={4} height={7} rx={1.5} />
    <Rect x={18} y={13} width={4} height={7} rx={1.5} />
  </Svg>
);

const UserIcon = ({ size = 18, color = "#4ade80" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </Svg>
);

const FeatherIcon = ({ size = 18, color = "#ed93b1" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M20 4c-6 0-14 3-16 11 3-1 5-1 7-3M20 4c0 6-3 14-11 16-1-2-1-4-3-7" />
    <Path d="M9 15l6-6" />
  </Svg>
);

const GenresIcon = ({ size = 18, color = "#85b7eb" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={3} width={7} height={7} rx={1.5} />
    <Rect x={14} y={3} width={7} height={7} rx={1.5} />
    <Rect x={3} y={14} width={7} height={7} rx={1.5} />
    <Rect x={14} y={14} width={7} height={7} rx={1.5} />
  </Svg>
);

const ChevronRightIcon = ({ size = 17, color = "rgba(255,255,255,0.35)" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="9 6 15 12 9 18" />
  </Svg>
);

const PlayIcon = ({ size = 18, color = "#712B13" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M8 5v14l11-7z" />
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

const BookmarkTabIcon = ({ size = 22, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M6 3h12v18l-6-4-6 4V3Z" />
  </Svg>
);

const LibraryIcon = ({ size = 22, color = "#7a7a7a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 6h16M4 12h16M4 18h10" />
  </Svg>
);

/* ---------- data ---------- */

type MenuItem = {
  id: string;
  label: string;
  count: number;
  iconBg: string;
  Icon: React.FC<IconProps>;
  iconColor: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  { id: "audiobooks", label: "Stories", count: 32, iconBg: "#2a2216", Icon: HeadsetIcon, iconColor: "#d9a441", route: "/favorites/audiobooks" },
  { id: "narrators", label: "Narrators", count: 8, iconBg: "#16221e", Icon: UserIcon, iconColor: "#4ade80", route: "/favorites/narrators" },
  { id: "authors", label: "Authors", count: 6, iconBg: "#221621", Icon: FeatherIcon, iconColor: "#ed93b1", route: "/favorites/authors" },
  { id: "genres", label: "Genres", count: 5, iconBg: "#16191f", Icon: GenresIcon, iconColor: "#85b7eb", route: "/favorites/genres" },
];

/* ---------- section pieces, matching SearchScreen's TouchableOpacity + accessibility pattern ---------- */

const MenuRow: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { Icon } = item;
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.85}
      onPress={() => router.push(item.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${item.count} items`}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
        <Icon size={18} color={item.iconColor} />
      </View>

      <Text style={styles.menuLabel} numberOfLines={1}>
        {item.label}
      </Text>

      <Text style={styles.menuCount}>{item.count}</Text>

      <ChevronRightIcon />
    </TouchableOpacity>
  );
};

/* ---------- main component ---------- */

const FavoritesScreen: React.FC = () => {
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
        {/* ---------- top bar, same pattern as SearchScreen ---------- */}

        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>Favorites</Text>

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

        {/* ---------- hero card ---------- */}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Play liked audiobooks"
          >
            <LinearGradient
              colors={["#f2c14e", "#e85c3f"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <Text style={styles.heroTitle}>Liked Stories</Text>
            <Text style={styles.heroSubtitle}>32 titles</Text>

            <View style={styles.heroPlayButton}>
              <PlayIcon size={18} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ---------- menu list ---------- */}

        <View style={styles.section}>
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <MenuRow key={item.id} item={item} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ---------- bottom tab bar, same structure as SearchScreen's ---------- */}
    </View>
  );
};

export default FavoritesScreen;

/* ---------- styles, values reused directly from SearchScreen for a consistent look ---------- */

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

  /* top bar — identical to SearchScreen.topbar */
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

  /* generic section — identical spacing to SearchScreen.section */
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  /* hero card */
  heroCard: {
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    padding: 16,
    justifyContent: "flex-end",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a1b0c",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#712b13",
    marginTop: 3,
  },
  heroPlayButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  /* menu list */
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  menuCount: {
    fontSize: 12,
    color: "#8a8a8a",
    marginRight: 2,
  },

  /* bottom tab bar — identical to SearchScreen.tabBar */
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
