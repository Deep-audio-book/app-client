import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CoverItem } from "@/api/books";
import { theme } from "../ui/theme";

const c = theme.colors;
const f = theme.font;

const HERO_HEIGHT = 470;
const TILE_W = 130;
const TILE_H = 170;
const GAP = 16;
const COLS = 3;
const ROWS = 5;
const TILE_COLORS = [c.tileA, c.tileB, c.tileC];

// Height of one full set of tiles in a column. Scrolling by exactly this
// distance makes the loop seamless (the 2nd set looks identical to the 1st).
const PERIOD = ROWS * (TILE_H + GAP);

// Per-column scroll settings: direction + speed (ms for one full loop).
// Alternating directions and different speeds gives a nice parallax feel.
const COLUMN_MOTION = [
  { reverse: false, duration: 30000 }, // goes up
  { reverse: true, duration: 38000 }, // goes down
  { reverse: false, duration: 34000 }, // goes up
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Builds the phrase used in the subtitle:
 *  - no / invalid total  -> "hundreds of"
 *  - under 1,000         -> exact number, e.g. "18"
 *  - 1,000 and above     -> "over 412,000" (rounded down to the thousand)
 */
function formatTitleCount(total?: number): string {
  if (!total || total <= 0) return "hundreds of";
  if (total < 1000) return `${total}`;
  const rounded = Math.floor(total / 1000) * 1000;
  return `over ${rounded.toLocaleString("en-US")}`;
}

/**
 * Picks which cover goes in a given grid slot. The stride (col * 3 + row * 2)
 * keeps neighbouring tiles (same row / same column) different whenever there
 * are at least 5 covers, instead of repeating the same cover side by side.
 */
function pickItem(items: CoverItem[], col: number, row: number) {
  if (!items.length) return undefined;
  return items[(col * 3 + row * 2) % items.length];
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function CoverTile({
  item,
  colorIndex,
}: {
  item?: CoverItem;
  colorIndex: number;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: TILE_COLORS[colorIndex % 3] }]}>
      {item && (
        <>
          <Image
            source={{ uri: item.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
          />
          <View style={styles.tileShade} pointerEvents="none" />
        </>
      )}
      {item?.type === "video" && (
        <Ionicons
          name="play-circle"
          size={28}
          color={c.accent}
          style={styles.tileBadge}
        />
      )}
    </View>
  );
}

/**
 * One vertical column that scrolls forever.
 * It renders the tiles twice (2 * ROWS) and animates translateY by exactly
 * one PERIOD, then loops, so the user never sees a jump.
 */
function ScrollingColumn({
  items,
  col,
  reverse,
  duration,
}: {
  items: CoverItem[];
  col: number;
  reverse: boolean;
  duration: number;
}) {
  const translateY = React.useRef(
    new Animated.Value(reverse ? -PERIOD : 0)
  ).current;

  React.useEffect(() => {
    translateY.setValue(reverse ? -PERIOD : 0);

    const loop = Animated.loop(
      Animated.timing(translateY, {
        toValue: reverse ? 0 : -PERIOD,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [translateY, reverse, duration]);

  return (
    <View style={{ marginTop: col % 2 === 0 ? 0 : -TILE_H / 2 }}>
      <Animated.View style={{ gap: GAP, transform: [{ translateY }] }}>
        {Array.from({ length: ROWS * 2 }).map((_, i) => {
          const row = i % ROWS; // 2nd half repeats the 1st half exactly
          return (
            <CoverTile
              key={i}
              item={pickItem(items, col, row)}
              colorIndex={row + col}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

function CoverGrid({ items }: { items: CoverItem[] }) {
  const { width } = useWindowDimensions();
  const gridW = COLS * TILE_W + (COLS - 1) * GAP;
  const gridH = ROWS * (TILE_H + GAP);

  return (
    <View
      style={{
        position: "absolute",
        width: gridW,
        height: gridH,
        left: (width - gridW) / 2,
        top: -gridH / 2 + HERO_HEIGHT / 2,
        transform: [{ rotate: "25deg" }],
        flexDirection: "row",
        gap: GAP,
      }}
    >
      {Array.from({ length: COLS }).map((_, col) => (
        <ScrollingColumn
          key={col}
          col={col}
          items={items}
          reverse={COLUMN_MOTION[col].reverse}
          duration={COLUMN_MOTION[col].duration}
        />
      ))}
    </View>
  );
}

type MiniPlayerProps = {
  elapsed: string;
  total: string;
  progress: number; // 0 - 1
  style?: object;
  compact?: boolean;
};

function MiniPlayer({ elapsed, total, progress, style, compact }: MiniPlayerProps) {
  return (
    <View style={[styles.player, compact && styles.playerCompact, style]}>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{elapsed}</Text>
        <Text style={styles.time}>{total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
      </View>
      <View style={styles.controls}>
        <Ionicons name="play-back" size={compact ? 16 : 20} color={c.textPrimary} />
        <View style={[styles.pauseBtn, compact && styles.pauseBtnCompact]}>
          <Ionicons name="pause" size={compact ? 14 : 18} color={c.onAccent} />
        </View>
        <Ionicons name="play-forward" size={compact ? 16 : 20} color={c.textPrimary} />
      </View>
    </View>
  );
}

function Hero({ items }: { items: CoverItem[] }) {
  return (
    <View style={styles.hero}>
      <CoverGrid items={items} />

      <LinearGradient
        colors={[c.accent, "#FAEF3E00"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.streak}
      />

      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: "#535353" }]} />
        <View style={[styles.dot, { backgroundColor: "#7A7A7A" }]} />
        <View style={[styles.dot, { backgroundColor: c.accent }]} />
      </View>

      <MiniPlayer
        compact
        elapsed="12:35"
        total="20:09:00"
        progress={0.45}
        style={styles.playerTop}
      />
      <MiniPlayer
        elapsed="12:35"
        total="27:49"
        progress={0.4}
        style={styles.playerBottom}
      />

      <LinearGradient colors={["#00000000", c.background]} style={styles.heroFade} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
type Props = {
  items?: CoverItem[]; // book covers from your backend; placeholders if empty
  totalTitles?: number; // shown in the subtitle
  onLogin?: () => void;
  onSignUp?: () => void;
};

export default function OnboardingScreen({
  items = [],
  totalTitles,
  onLogin,
  onSignUp,
}: Props) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[c.backgroundTop, c.background]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
      />

      <Hero items={items} />

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Text style={styles.title}>DeepAudio Books</Text>
        <Text style={styles.subtitle}>
          Sign up today to access audiobooks from our library of{" "}
          {formatTitleCount(totalTitles)} titles, plus enjoy member-exclusive
          perks.
        </Text>

        <Pressable
          onPress={onLogin}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Log In</Text>
        </Pressable>

        <Pressable
          onPress={onSignUp}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },

  hero: { height: HERO_HEIGHT, overflow: "hidden" },
  heroFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 140 },
  tile: { width: TILE_W, height: TILE_H, borderRadius: 22, overflow: "hidden" },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000033" },
  tileBadge: { position: "absolute", right: 10, bottom: 10 },

  streak: {
    position: "absolute",
    left: -60,
    bottom: 120,
    width: 300,
    height: 30,
    transform: [{ rotate: "25deg" }],
  },

  dots: {
    position: "absolute",
    top: 160,
    right: 14,
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 24,
    backgroundColor: c.surface,
    transform: [{ rotate: "25deg" }],
  },
  dot: { width: 28, height: 28, borderRadius: 14 },

  player: {
    position: "absolute",
    width: 210,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  playerCompact: { width: 185, paddingVertical: 10 },
  playerTop: { top: 200, right: 18, transform: [{ rotate: "22deg" }] },
  playerBottom: { top: 320, left: 62, transform: [{ rotate: "25deg" }] },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { fontFamily: f.medium, fontSize: 10, color: c.textSecondary },
  track: {
    height: 3,
    marginVertical: 8,
    borderRadius: 2,
    backgroundColor: c.surfaceRaised,
    justifyContent: "center",
  },
  trackFill: { height: 3, borderRadius: 2, backgroundColor: c.accent },
  thumb: {
    position: "absolute",
    width: 9,
    height: 9,
    marginLeft: -4,
    borderRadius: 5,
    backgroundColor: c.textPrimary,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnCompact: { width: 32, height: 32, borderRadius: 16 },

  content: { flex: 1, paddingHorizontal: 28 },
  title: {
    fontFamily: f.bold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: c.textPrimary,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: f.regular,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.3,
    color: c.textSecondary,
  },
  primaryBtn: {
    marginTop: 28,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: f.semibold, fontSize: 18, color: c.onAccent },
  secondaryBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: f.medium, fontSize: 16, color: c.textPrimary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});