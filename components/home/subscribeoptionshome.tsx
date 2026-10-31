import axios from '@/axios.config';
import WishlistHeart from "@/components/ui/WishlistHeart";
import { useCartBadge } from "@/hooks/useCartBadge";
import { storyWishlisted, useWishlistStore } from "@/redux/slices/wishlistStore";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect, SvgUri } from "react-native-svg";
import ProfileDot from '../ui/ProfileDot';
import styles, {
  BED_COVERS,
  CARD_H,
  CARD_RADIUS,
  CARD_W,
  COLORS,
  COVERS,
  GENRE_TILE,
  H_PAD
} from "./style";

/* ---------- API types ---------- */

interface ApiStory {
  id: number;
  cover: string | null;
  title: string;
  author: string;
  narrator: string | null;
  genre: string | null;
  story_duration: string | null;
  story_duration_seconds?: string | number | null;
  rating: number;
  listens: number;
  like: boolean;
  dislike: boolean;
  wishlisted: boolean;
  chapters?: number | null;
  last_listened_seconds?: number | null;
  current_chapter_number?: number | null;
  resume_percentage?: number | null;
  price_inr: number | null;
  price_usd: number | null;
  purchased?: boolean;
  in_cart?: boolean;
}

interface ApiAuthor {
  id: number;
  name: string;
  avatar: string | null;
  storyCount: number;
}

interface ApiGenre {
  id: number;
  name: string;
  icon?: string | null;
  background?: string | null;
}

interface ApiTrendingGenre {
  id: number;
  name: string;
}

interface ConnectLinks {
  youtube?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
  twitter?: string;
}

type HeroMode = "explore" | "resume";

/*
 * Two home-page experiences:
 *  - "buy"        -> rent individual books (price tags + add-to-cart "+").
 *  - "unlimited"  -> Premium browsing (membership banner).
 *
 * WHO SEES WHAT
 *  - Free user (new user / expired plan) -> isSubscribed = false.
 *      Rent Books / Premium switch, cart icon + count, prices with "+",
 *      price-based sections, Premium CTA banner after every 3 blocks.
 *  - Premium user (active plan)          -> isSubscribed = true.
 *      "Premium" label + diamond button in the top bar. No switch, no cart,
 *      no prices, no "Unlimited" pills on thumbnails, no upgrade banners.
 *
 * The backend must return `is_subscribed: true | false` at the top level of
 * the `getHomepageData` response (false when the plan has expired).
 */
type HomeExperience = "buy" | "unlimited";

type RowVariant = "default" | "bed" | "carousel" | "classics" | "reviews" | "square";

interface HeroSection {
  type: "hero";
  mode: HeroMode;
  data: ApiStory;
}

type Section =
  | { type: "greeting"; title: string; subtitle: string }
  | HeroSection
  | { type: "trending-genres"; data: ApiTrendingGenre[] }
  | { type: "resume"; data: ApiStory[] }
  | { type: "featured-books"; title: string; data: ApiStory[]; view_type: string; key_type: string }
  | {
      type: "story-row";
      title: string;
      data: ApiStory[];
      view_type: string;
      key_type: string;
      variant?: RowVariant;
    }
  | { type: "author-row"; title: string; data: ApiAuthor[] }
  | { type: "genre-grid"; title: string; data: ApiGenre[] }
  | { type: "connect-with-us"; data: ConnectLinks };

interface IconProps {
  size?: number;
  color?: string;
}

/* ---------- section configuration (edit here) ---------- */

/*
 * New releases carousel: API `variant: "carousel"` OR one of these key_types.
 */
const NEW_RELEASE_KEY_TYPES = ["new_releases", "new-releases", "new_release", "new"];

/*
 * How each row is drawn. Match order: API `variant`, then key_type, then a
 * title match (the title fallback also covers the Tamil titles).
 * >>> Please confirm the real key_type values from the backend. <<<
 */
const SQUARE_KEY_TYPES = ["trending", "trending_today", "trending-today", "editors_picks", "editor_picks", "editors-picks", "editors_pick"];
const SQUARE_TITLE = /trending|editor/i;

const CLASSICS_KEY_TYPES = ["tamil_classics", "tamil-classics", "classics"];
const CLASSICS_TITLE = /classic|கிளாசிக்/i;

const REVIEWS_KEY_TYPES = ["book_reviews", "book-reviews", "reviews"];
const REVIEWS_TITLE = /review|விமர்சன/i;

/*
 * Price-based sections for Free users (Rent Books mode).
 * These two are EXAMPLES ONLY (₹9, ₹20). Deep Talks will confirm the final
 * price categories - just edit this list. A story is shown in the section
 * whose `price` equals its rental price.
 */
const PRICE_TIERS: { id: string; price: number }[] = [
  { id: "price-9", price: 9 },
  { id: "price-20", price: 20 },
];
// Where the price sections start (after this many content blocks).
const PRICE_SECTIONS_AFTER_BLOCK = 2;

// Premium CTA banner for Free users: after every N content blocks.
const CTA_EVERY_N_BLOCKS = 3;

/* ---------- icons ---------- */

const BellIcon = ({ size = 15, color = COLORS.text1 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
    <Path d="M9.5 18a2.5 2.5 0 005 0" />
  </Svg>
);

const LanguageIcon = ({ size = 15, color = COLORS.text1 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3.5 4.5h11a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H8l-3 2.5V13.5H3.5A1.5 1.5 0 012 12V6a1.5 1.5 0 011.5-1.5Z" />
    <Path d="M5.5 7.5h6M5.5 9.8h4" strokeWidth={1.4} />
    <Path
      d="M20.5 9.5h-6A1.5 1.5 0 0013 11v5a1.5 1.5 0 001.5 1.5H16v2.3l2.7-2.3h1.8A1.5 1.5 0 0022 16v-5a1.5 1.5 0 00-1.5-1.5Z"
      fill="none"
    />
    <Path d="M15.3 12.6h5.4M15.3 14.9h3.5" strokeWidth={1.4} />
  </Svg>
);

const PlayIcon = ({ size = 12, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const MoonIcon = ({ size = 16, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 1010.5 10.5Z" />
  </Svg>
);

const PlusIcon = ({ size = 16, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 13l4 4 10-10" />
  </Svg>
);

const ChevronRightIcon = ({ size = 16, color = COLORS.text1 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 5l7 7-7 7" />
  </Svg>
);

const ShoppingCartIcon = ({ size = 13, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={9} cy={20} r={1.3} fill={color} stroke="none" />
    <Circle cx={17} cy={20} r={1.3} fill={color} stroke="none" />
    <Path d="M2.5 3h2l2.4 12.2a2 2 0 002 1.6h8.2a2 2 0 002-1.6L21 7H6" />
  </Svg>
);

const DiamondIcon = ({ size = 14, color = COLORS.highlight }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6.2 3h11.6L22 9.2 12 21 2 9.2 6.2 3Z" />
    <Path d="M2 9.2h20M9 3l-2 6.2L12 21M15 3l2 6.2L12 21" stroke="#241b2c" strokeWidth={1} fill="none" strokeOpacity={0.45} />
  </Svg>
);

const SparkleIcon = ({ size = 16, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7L12 2Z" />
  </Svg>
);

const StarIcon = ({ size = 12, color = COLORS.highlight, filled = true }: IconProps & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <Path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8L12 2.5Z" />
  </Svg>
);

const QuoteIcon = ({ size = 18, color = COLORS.lavDim }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M4 17.5c0-4 1.4-7.2 5-9.5l1 1.4C8 10.6 7.4 12 7.3 13.4H10V19H4v-1.5Zm10 0c0-4 1.4-7.2 5-9.5l1 1.4c-2.1 1.2-2.7 2.6-2.8 4H20V19h-6v-1.5Z" />
  </Svg>
);

const FacebookIcon = ({ size = 16, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V9Z" />
  </Svg>
);

const InstagramIcon = ({ size = 16, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={4} y={4} width={16} height={16} rx={4} />
    <Circle cx={12} cy={12} r={3.2} />
    <Circle cx={16.6} cy={7.4} r={0.6} fill={color} stroke="none" />
  </Svg>
);

const WebsiteIcon = ({ size = 16, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </Svg>
);

const TwitterIcon = ({ size = 16, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 5.3c-.7.4-1.5.6-2.3.8a3.6 3.6 0 00-6.2 3.3A10.4 10.4 0 014 4.9a3.6 3.6 0 001.1 4.8c-.6 0-1.2-.2-1.7-.4 0 1.7 1.2 3.2 2.9 3.6-.6.2-1.2.2-1.8.1a3.6 3.6 0 003.4 2.5A10.5 10.5 0 013 17.4a10.9 10.9 0 006 1.7c7 0 11-6 11-11.2v-.5c.7-.5 1.4-1.2 1.9-2z" />
  </Svg>
);

const YoutubeIcon = ({ size = 16, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={6} width={18} height={12} rx={3} />
    <Path d="M11 9.5l4 2.5-4 2.5z" fill={color} stroke="none" />
  </Svg>
);

/* ---------- helpers ---------- */

function isSvgUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".svg");
}

function formatDuration(story_duration?: string | null): string {
  return story_duration?.trim() || "";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return initials || "?";
}

type Currency = "INR" | "USD";
const ACTIVE_CURRENCY: Currency = "INR";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
};

function getStoryPrice(
  story: Pick<ApiStory, "price_inr" | "price_usd">,
  currency: Currency = ACTIVE_CURRENCY
): number | null {
  return currency === "USD" ? story.price_usd : story.price_inr;
}

function formatPrice(price?: number | null, currency: Currency = ACTIVE_CURRENCY): string {
  if (!price) return "";
  return `${CURRENCY_SYMBOLS[currency]}${Math.round(price)}`;
}

function formatCount(n?: number | null): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
}

function isNewReleaseSection(section: { key_type?: string; variant?: string }): boolean {
  return section.variant === "carousel" || NEW_RELEASE_KEY_TYPES.includes(String(section.key_type));
}

function detectRowVariant(section: { key_type?: string; variant?: string; title?: string }): RowVariant {
  const key = String(section.key_type ?? "").toLowerCase();
  const title = String(section.title ?? "");
  const v = section.variant;

  if (v === "bed" || key === "5") return "bed";
  if (isNewReleaseSection(section)) return "carousel";
  if (v === "classics" || CLASSICS_KEY_TYPES.includes(key) || CLASSICS_TITLE.test(title)) return "classics";
  if (v === "reviews" || REVIEWS_KEY_TYPES.includes(key) || REVIEWS_TITLE.test(title)) return "reviews";
  if (v === "square" || SQUARE_KEY_TYPES.includes(key) || SQUARE_TITLE.test(title)) return "square";
  return "default";
}

function goToStoryEpisode(storyId: number) {
  router.push({
    pathname: "/storyEpisode",
    params: { storyId },
  });
}

function goToGenreStories(genre: { id: number; name: string }) {
  router.push({
    pathname: "/storyView",
    params: {
      title: genre.name,
      view_type: "grid",
      key_type: "genre",
      api_method: "getGenreStories",
      genre_id: String(genre.id),
    },
  });
}

function goToAuthorDetails(author: ApiAuthor) {
  router.push({
    pathname: "/author-details",
    params: {
      id: author.id.toString(),
      method: 'getAuthorDetails',
      id_key: 'author_id',
      title: 'Author',
    },
  });
}

function goToViewAll(title: string, view_type: string, key_type: string, stories?: ApiStory[]) {
  router.push({
    pathname: "/storyView",
    params: {
      title,
      view_type,
      key_type,
      api_method: 'getStoryListViewAll',
      ...(stories ? { stories: JSON.stringify(stories) } : {}),
    },
  });
}

function goToCart() {
  router.push("/cart" as any);
}

function goToLanguageSettings() {
  router.push({ pathname: "/language" });
}

// Subscription / plans screen (app/(tabs)/plans.tsx).
function goToSubscribe() {
  // plans is a tab screen, so navigate() switches to it instead of stacking a duplicate.
  router.navigate("/(tabs)/plans" as any);
}

/*
 * Likes from every story on the homepage are seeded into the global
 * wishlist store so all screens stay in sync.
 */
function collectStories(list: any[]): any[] {
  const stories: any[] = [];

  for (const s of list) {
    if (!s) continue;
    if (Array.isArray(s.data)) {
      stories.push(...s.data);
    } else if (s.type === "hero" && s.data) {
      stories.push(s.data);
    }
  }

  return stories.filter((x) => x && x.id != null && typeof x.title === "string");
}

// Touch helpers: bigger hit area + no iOS "delay content touches" lag.
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
// `delaysContentTouches` (iOS) is missing from React Native's TS types, so it
// is spread from a loosely-typed object. It stops iOS from delaying taps
// inside scroll views.
const NO_TOUCH_DELAY = { delaysContentTouches: false } as object;
const H_SCROLL = {
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  nestedScrollEnabled: true,
  keyboardShouldPersistTaps: "handled" as const,
  ...NO_TOUCH_DELAY,
};

/* ---------- home context (replaces prop-drilling of `experience`) ---------- */

const HomeContext = createContext<{ experience: HomeExperience; isSubscribed: boolean }>({
  experience: "buy",
  isSubscribed: false,
});
const useHome = () => useContext(HomeContext);

/* ---------- add to cart "+" (shared store, works everywhere) ---------- */

const CartPlusButton: React.FC<{ story: ApiStory; size?: number }> = ({ story, size = 30 }) => {
  const { t } = useTranslation();
  const inCartStore = useCartBadge((s) => !!s.ids[String(story.id)]);
  const add = useCartBadge((s) => s.add);
  const [busy, setBusy] = useState(false);
  const inCart = inCartStore || !!story.in_cart;

  const onPress = useCallback(
    async (e?: any) => {
      e?.stopPropagation?.(); // never open the book when "+" is tapped
      if (inCart) {
        goToCart();
        return;
      }
      if (busy) return;

      setBusy(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const ok = await add(story.id);
      setBusy(false);

      if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Alert.alert(t("home.cartError"));
    },
    [inCart, busy, add, story.id, t]
  );

  return (
    <TouchableOpacity
      style={[
        localStyles.cartBtn,
        { width: size, height: size, borderRadius: size / 2 },
        inCart && localStyles.cartBtnDone,
      ]}
      activeOpacity={0.8}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={inCart ? t("home.inCartOpen") : t("home.addToCart", { title: story.title })}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#241b2c" />
      ) : inCart ? (
        <CheckIcon size={size * 0.55} />
      ) : (
        <PlusIcon size={size * 0.55} />
      )}
    </TouchableOpacity>
  );
};

/* ---------- price pill + "+" (Rent Books mode) ---------- */

const PriceCartRow: React.FC<{ story: ApiStory; align?: "flex-end" | "flex-start" | "center" }> = ({
  story,
  align = "flex-end",
}) => {
  const { t } = useTranslation();

  if (story.purchased) {
    return (
      <View style={[localStyles.ownedPill, { alignSelf: align }]}>
        <Text style={localStyles.ownedPillText}>{t("home.owned")}</Text>
      </View>
    );
  }

  const price = getStoryPrice(story);
  if (!price) return null;

  return (
    <View style={[localStyles.priceRow, { alignSelf: align }]}>
      <Text style={localStyles.priceText}>{formatPrice(price)}</Text>
      <CartPlusButton story={story} />
    </View>
  );
};

/*
 * Corner badge on a thumbnail.
 *  - Premium user          -> nothing (no repeated "Unlimited" word).
 *  - Free user, Premium tab -> small diamond only (no text).
 *  - Free user, Rent mode   -> price + add-to-cart "+".
 */
const AccessBadge: React.FC<{ story: ApiStory; align?: "flex-end" | "flex-start" | "center" }> = ({
  story,
  align = "flex-end",
}) => {
  const { experience, isSubscribed } = useHome();

  if (isSubscribed) return null;

  if (experience === "unlimited") {
    return (
      <View style={[localStyles.diamondBadge, { alignSelf: align }]}>
        <DiamondIcon size={12} />
      </View>
    );
  }

  return <PriceCartRow story={story} align={align} />;
};

/* ---------- small shared pieces ---------- */

const ViewAllButton: React.FC<{ title: string; onPress: () => void; light?: boolean }> = ({ title, onPress, light }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.viewAllBtn, light && localStyles.viewAllBtnLight]}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("home.viewAllOf", { title })}
    >
      <Text style={styles.viewAll} numberOfLines={1}>
        {t("home.viewAll")}
      </Text>
    </TouchableOpacity>
  );
};

const SectionHead: React.FC<{ title: string; subtitle?: string; onViewAll?: () => void }> = ({
  title,
  subtitle,
  onViewAll,
}) => (
  <View style={styles.rowHead}>
    <View style={styles.rowHeadText}>
      <Text style={styles.rowTitle} numberOfLines={2}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    {onViewAll && <ViewAllButton title={title} onPress={onViewAll} />}
  </View>
);

const AuthorText: React.FC<{ author: string; authorStyle: any }> = ({ author, authorStyle }) => (
  <Text style={authorStyle} numberOfLines={1}>
    {author}
  </Text>
);

const GenreText: React.FC<{ genre?: string | null; genreStyle: any }> = ({ genre, genreStyle }) => {
  if (!genre) return null;
  return (
    <Text style={genreStyle} numberOfLines={1}>
      {genre}
    </Text>
  );
};

const CoverImage: React.FC<{ story: ApiStory; fallback: [string, string] }> = ({ story, fallback }) =>
  story.cover ? (
    <Image source={{ uri: story.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
  ) : (
    <LinearGradient colors={fallback} style={StyleSheet.absoluteFillObject} />
  );

/* ---------- story card (cover only) ----------
 * shape "portrait" -> 3:4 (vertical book / show thumbnails)
 * shape "square"   -> 1:1 (Trending, Editor's Picks)
 */
const StoryCard: React.FC<{
  story: ApiStory;
  fallbackBg: [string, string];
  shape: "portrait" | "square";
}> = ({ story, fallbackBg, shape }) => {
  const { t } = useTranslation();
  const square = shape === "square";

  return (
    <TouchableOpacity
      style={square ? styles.cardSquare : styles.card}
      activeOpacity={0.85}
      onPress={() => goToStoryEpisode(story.id)}
      accessibilityRole="button"
      accessibilityLabel={t("home.openStory", { title: story.title })}
    >
      <View style={[square ? styles.cardCoverSquare : styles.cardCover, localStyles.cardCoverShadow]}>
        <CoverImage story={story} fallback={fallbackBg} />

        <View style={localStyles.heartCorner}>
          <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={18} />
        </View>

        <View style={localStyles.cardAccessCorner} pointerEvents="box-none">
          <AccessBadge story={story} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StoryRow: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
  shape: "portrait" | "square";
  subtitle?: string;
}> = ({ title, stories, view_type, key_type, shape, subtitle }) => {
  if (!stories.length) return null;

  return (
    <View style={styles.rowSec}>
      <SectionHead title={title} subtitle={subtitle} onViewAll={() => goToViewAll(title, view_type, key_type)} />

      <ScrollView {...H_SCROLL} contentContainerStyle={styles.rowScroll}>
        {stories.map((story, i) => (
          <StoryCard key={`${story.id}-${i}`} story={story} fallbackBg={COVERS[i % COVERS.length]} shape={shape} />
        ))}
      </ScrollView>
    </View>
  );
};

/* ---------- Price-based section (Rent Books mode, free users) ---------- */

const PriceSection: React.FC<{ price: number; stories: ApiStory[] }> = ({ price, stories }) => {
  const { t } = useTranslation();
  const label = formatPrice(price);
  const title = t("home.priceTierTitle", { price: label });

  return (
    <StoryRow
      title={title}
      subtitle={t("home.priceTierSubtitle", { price: label })}
      stories={stories}
      view_type="grid"
      key_type={`price_${price}`}
      shape="portrait"
    />
  );
};

/* ---------- New releases: looping coverflow carousel ----------
 * - Selected slide: full opacity + highlight border.
 * - Unselected slides: reduced opacity (and scale).
 * - All animation runs on the native driver (opacity / scale / border
 *   opacity) so swiping stays smooth; only the active index uses state.
 * - Cards are memoised so a swipe re-renders only the few cards whose
 *   distance changed, instead of the whole tripled list.
 */
const OVERLAP = 0.72; // distance between card centres, as a fraction of card width

const NewBadge: React.FC<{ label: string }> = ({ label }) => (
  <View style={localStyles.newPillWrap} pointerEvents="none">
    <LinearGradient
      colors={["#FFD700", "#FFD700"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={localStyles.newPill}
    >
      <SparkleIcon size={9} color="#ec7a0f" />
      <Text style={localStyles.newPillText}>{label}</Text>
    </LinearGradient>
  </View>
);

const CarouselItem = React.memo(function CarouselItem({
  story,
  index,
  distance,
  itemW,
  cardW,
  cardH,
  scrollX,
  onPress,
  newLabel,
  openLabel,
}: {
  story: ApiStory;
  index: number;
  distance: number; // 0 = selected (capped at 3)
  itemW: number;
  cardW: number;
  cardH: number;
  scrollX: Animated.Value;
  onPress: (index: number) => void;
  newLabel: string;
  openLabel: string;
}) {
  const inputRange = [(index - 2) * itemW, (index - 1) * itemW, index * itemW, (index + 1) * itemW, (index + 2) * itemW];

  const scale = scrollX.interpolate({ inputRange, outputRange: [0.7, 0.86, 1, 0.86, 0.7], extrapolate: "clamp" });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 0.5, 1, 0.5, 0.35], extrapolate: "clamp" });
  const highlight = scrollX.interpolate({ inputRange, outputRange: [0, 0, 1, 0, 0], extrapolate: "clamp" });

  return (
    <Animated.View
      style={{
        width: itemW,
        height: cardH,
        zIndex: 10 - distance,
        opacity,
        transform: [{ scale }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[localStyles.carouselCard, { width: cardW, height: cardH, left: (itemW - cardW) / 2 }]}
        onPress={() => onPress(index)}
        accessibilityRole="button"
        accessibilityLabel={openLabel}
      >
        <CoverImage story={story} fallback={COVERS[index % COVERS.length]} />
        <NewBadge label={newLabel} />

        {/* highlight frame: only visible on the selected slide */}
        <Animated.View pointerEvents="none" style={[localStyles.carouselHighlight, { opacity: highlight }]} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const NewReleaseCarousel: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
}> = ({ title, stories, view_type, key_type }) => {
  const { t } = useTranslation();
  const { width: winW } = useWindowDimensions();
  const [boxW, setBoxW] = useState(winW - 28);

  const n = stories.length;
  const loop = n >= 3;
  const base = loop ? n : 0; // first item of the middle copy
  const data = useMemo(() => (loop ? [...stories, ...stories, ...stories] : stories), [stories, loop]);

  const [rawActive, setRawActive] = useState(base);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const lastRaw = useRef(base);

  // 3:4 card (CARD_W x CARD_H). Only shrinks on very small screens.
  const cardW = Math.min(CARD_W + 12, boxW * 0.52);
  const cardH = cardW * (CARD_H / CARD_W);
  const itemW = cardW * OVERLAP;
  const sidePad = (boxW - itemW) / 2;

  // Start on the middle copy so there are cards on both sides.
  useEffect(() => {
    if (!n) return;
    const x = base * itemW;
    scrollX.setValue(x);
    lastRaw.current = base;
    setRawActive(base);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 0);
    return () => clearTimeout(id);
  }, [n, base, itemW, scrollX]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (e: any) => {
          const raw = Math.max(0, Math.min(data.length - 1, Math.round(e.nativeEvent.contentOffset.x / itemW)));
          if (raw !== lastRaw.current) {
            lastRaw.current = raw;
            setRawActive(raw);
            Haptics.selectionAsync();
          }
        },
      }),
    [scrollX, data.length, itemW]
  );

  // After a swipe settles near either end, jump (invisibly) to the same
  // card in the middle copy.
  const onMomentumEnd = useCallback(
    (e: any) => {
      if (!loop) return;
      const raw = Math.round(e.nativeEvent.contentOffset.x / itemW);
      if (raw < n || raw >= 2 * n) {
        const next = base + (raw % n);
        lastRaw.current = next;
        setRawActive(next);
        scrollRef.current?.scrollTo({ x: next * itemW, animated: false });
      }
    },
    [loop, itemW, n, base]
  );

  const onCardPress = useCallback(
    (i: number) => {
      if (i === lastRaw.current) {
        goToStoryEpisode(data[i].id);
      } else {
        scrollRef.current?.scrollTo({ x: i * itemW, animated: true });
      }
    },
    [data, itemW]
  );

  if (!n) return null;

  const active = loop ? rawActive % n : Math.min(rawActive, n - 1);
  const current = stories[active];
  const newLabel = t("home.newTag", { defaultValue: "NEW" });

  return (
    <View style={localStyles.nrPanel}>
      <LinearGradient
        colors={["rgba(123,77,219,0.38)", "rgba(36,27,44,0.55)", "rgba(0,0,0,0.0)"]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={localStyles.nrHeader}>
        <View style={localStyles.nrHeaderTop}>
          <View style={localStyles.nrTitleRow}>
            <SparkleIcon size={15} />
            <Text style={localStyles.nrTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <ViewAllButton title={title} light onPress={() => goToViewAll(title, view_type, key_type)} />
        </View>

        <Text style={localStyles.nrSubtitle}>
          {t("home.newReleasesSubtitle", { defaultValue: "Fresh stories, just for you" })}
        </Text>
      </View>

      <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemW}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumEnd}
          overScrollMode="never"
          {...NO_TOUCH_DELAY}
          nestedScrollEnabled
          contentOffset={{ x: base * itemW, y: 0 }}
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingVertical: 12 }}
          style={{ height: cardH + 24 }}
        >
          {data.map((story, i) => (
            <CarouselItem
              key={`${story.id}-${i}`}
              story={story}
              index={i}
              distance={Math.min(Math.abs(i - rawActive), 3)}
              itemW={itemW}
              cardW={cardW}
              cardH={cardH}
              scrollX={scrollX}
              onPress={onCardPress}
              newLabel={newLabel}
              openLabel={t("home.openStory", { title: story.title })}
            />
          ))}
        </Animated.ScrollView>
      </View>

      {/* details for the selected card */}
      <View style={localStyles.carouselInfo}>
        <Text style={localStyles.carouselTitle} numberOfLines={1}>
          {current.title}
        </Text>
        <View style={localStyles.carouselMetaRow}>
          <Text style={localStyles.carouselAuthor} numberOfLines={1}>
            {current.author}
          </Text>
          <AccessBadge story={current} align="center" />
        </View>
      </View>

      {/* position dots */}
      <View style={localStyles.dotsRow}>
        {stories.map((st, i) => (
          <View key={`dot-${st.id}-${i}`} style={[localStyles.dot, i === active && localStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

/* ---------- Perfect for Bedtime Stories ---------- */

const PerfectBeforeBedSection: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
}> = ({ title, stories, view_type, key_type }) => {
  const { t } = useTranslation();

  if (!stories.length) return null;

  return (
    <View style={styles.bedSection}>
      <View style={styles.bedHeader}>
        <View style={styles.bedIconWrap}>
          <MoonIcon />
        </View>

        <View style={styles.bedHeaderText}>
          <Text style={styles.bedTitle}>{title}</Text>
          <Text style={styles.bedSubtitle}>{t("home.bedSubtitle")}</Text>
        </View>

        <ViewAllButton title={title} onPress={() => goToViewAll(title, view_type, key_type, stories)} />
      </View>

      <ScrollView {...H_SCROLL} contentContainerStyle={styles.bedRowScroll}>
        {stories.map((story, i) => {
          const duration = formatDuration(story.story_duration);

          return (
            <TouchableOpacity
              style={styles.bedCard}
              key={`${story.id}-${i}`}
              activeOpacity={0.85}
              onPress={() => goToStoryEpisode(story.id)}
              accessibilityRole="button"
              accessibilityLabel={t("home.openStory", { title: story.title })}
            >
              <View style={styles.bedCover}>
                <CoverImage story={story} fallback={BED_COVERS[i % BED_COVERS.length]} />

                <LinearGradient colors={["rgba(10,8,20,0)", "rgba(10,8,20,0.55)"]} style={StyleSheet.absoluteFillObject} />

                <View style={localStyles.heartCorner}>
                  <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={18} />
                </View>

                {/* The title is NOT drawn on the thumbnail any more - it only
                    appears once, below the cover. */}

                {!!duration && (
                  <View style={styles.bedDurationBadge}>
                    <Text style={styles.bedDurationText}>{duration}</Text>
                  </View>
                )}

                <View style={localStyles.bedAccessCorner} pointerEvents="box-none">
                  <AccessBadge story={story} />
                </View>
              </View>

              <Text style={styles.bedCardTitle} numberOfLines={1}>
                {story.title}
              </Text>

              <GenreText genre={story.genre} genreStyle={styles.bedGenreText} />

              <AuthorText author={story.author} authorStyle={styles.bedCardNarrator} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ---------- Tamil Classics: gold "heritage shelf" ---------- */

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const ClassicsSection: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
}> = ({ title, stories, view_type, key_type }) => {
  const { t } = useTranslation();

  if (!stories.length) return null;

  return (
    <View style={localStyles.classicsPanel}>
      <LinearGradient
        colors={["rgba(232,195,77,0.20)", "rgba(232,195,77,0.04)", "rgba(0,0,0,0)"]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={localStyles.classicsHead}>
        <View style={styles.rowHeadText}>
          <View style={localStyles.classicsOrnamentRow}>
            <View style={localStyles.classicsLine} />
            <SparkleIcon size={11} color={COLORS.gold} />
          </View>
          <Text style={localStyles.classicsTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.rowSubtitle}>{t("home.classicsSubtitle")}</Text>
        </View>

        <ViewAllButton title={title} onPress={() => goToViewAll(title, view_type, key_type)} />
      </View>

      <ScrollView {...H_SCROLL} contentContainerStyle={localStyles.classicsScroll}>
        {stories.map((story, i) => (
          <TouchableOpacity
            key={`${story.id}-${i}`}
            style={localStyles.classicCard}
            activeOpacity={0.85}
            onPress={() => goToStoryEpisode(story.id)}
            accessibilityRole="button"
            accessibilityLabel={t("home.openStory", { title: story.title })}
          >
            <View style={localStyles.classicFrame}>
              <View style={localStyles.classicCover}>
                <CoverImage story={story} fallback={COVERS[i % COVERS.length]} />
                <View style={localStyles.heartCorner}>
                  <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={16} />
                </View>
              </View>
            </View>

            <Text style={localStyles.classicTitle} numberOfLines={2}>
              {story.title}
            </Text>
            <AuthorText author={story.author} authorStyle={localStyles.classicAuthor} />
            <View style={{ marginTop: 6 }}>
              <AccessBadge story={story} align="flex-start" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

/* ---------- Book Reviews: wide review cards with star ratings ---------- */

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <StarIcon key={i} size={12} filled={rating >= i + 0.5} />
    ))}
  </View>
);

const ReviewsSection: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
}> = ({ title, stories, view_type, key_type }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width * 0.8, 320);

  if (!stories.length) return null;

  return (
    <View style={styles.rowSec}>
      <SectionHead
        title={title}
        subtitle={t("home.reviewsSubtitle")}
        onViewAll={() => goToViewAll(title, view_type, key_type)}
      />

      <ScrollView
        {...H_SCROLL}
        snapToInterval={cardW + 12}
        decelerationRate="fast"
        contentContainerStyle={[styles.rowScroll, { gap: 12 }]}
      >
        {stories.map((story, i) => {
          const rating = Number(story.rating) || 0;

          return (
            <TouchableOpacity
              key={`${story.id}-${i}`}
              style={[localStyles.reviewCard, { width: cardW }]}
              activeOpacity={0.85}
              onPress={() => goToStoryEpisode(story.id)}
              accessibilityRole="button"
              accessibilityLabel={t("home.openStory", { title: story.title })}
            >
              <View style={localStyles.reviewCover}>
                <CoverImage story={story} fallback={COVERS[i % COVERS.length]} />
              </View>

              <View style={localStyles.reviewBody}>
                <QuoteIcon />
                <Text style={localStyles.reviewTitle} numberOfLines={2}>
                  {story.title}
                </Text>
                <AuthorText author={story.author} authorStyle={localStyles.reviewAuthor} />

                <View style={localStyles.reviewRatingRow}>
                  <Stars rating={rating} />
                  {rating > 0 && <Text style={localStyles.reviewRatingText}>{rating.toFixed(1)}</Text>}
                </View>

                {!!story.listens && (
                  <Text style={localStyles.reviewListens}>{t("home.listens", { count: formatCount(story.listens) })}</Text>
                )}

                <View style={{ marginTop: 8 }}>
                  <AccessBadge story={story} align="flex-start" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ---------- trending genre chips ---------- */

const TrendingGenreChips: React.FC<{ genres: ApiTrendingGenre[] }> = ({ genres }) => {
  const { t } = useTranslation();

  if (!genres.length) return null;

  return (
    <ScrollView {...H_SCROLL} contentContainerStyle={styles.chipRow}>
      {genres.map((g) => (
        <TouchableOpacity
          style={styles.chip}
          key={g.id}
          activeOpacity={0.8}
          onPress={() => goToGenreStories(g)}
          accessibilityRole="button"
          accessibilityLabel={t("home.browseGenre", { name: g.name })}
        >
          <Text style={styles.chipText}>#{g.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

/* ---------- author row ---------- */

const AuthorRow: React.FC<{ title: string; authors: ApiAuthor[] }> = ({ title, authors }) => {
  const { t } = useTranslation();

  if (!authors.length) return null;

  return (
    <View style={styles.tertiary}>
      <View style={styles.tertiaryHead}>
        <Text style={styles.tertiaryTitle}>{title}</Text>
        <ViewAllButton title={title} onPress={() => router.push("/author")} />
      </View>

      <ScrollView {...H_SCROLL}>
        <View style={styles.authorRow}>
          {authors.map((author) => (
            <TouchableOpacity
              key={author.id}
              style={styles.authorChip}
              activeOpacity={0.85}
              onPress={() => goToAuthorDetails(author)}
              accessibilityRole="button"
              accessibilityLabel={t("home.openAuthor", { name: author.name })}
            >
              {author.avatar ? (
                <Image source={{ uri: author.avatar }} style={styles.authorAvatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.authorChipText}>{getInitials(author.name)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/* ---------- Genres: the FULL list, scrollable, two rows of 1:1 tiles ---------- */

function GenreTile({ item }: { item: ApiGenre }) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => goToGenreStories(item)}
      accessibilityRole="button"
      accessibilityLabel={t("home.openGenre", { name: item.name })}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      <View style={[styles.genreIconBox, !!item.background && { backgroundColor: item.background }]}>
        {item.icon ? (
          isSvgUrl(item.icon) ? (
            <SvgUri width={GENRE_TILE} height={GENRE_TILE} uri={item.icon} />
          ) : (
            <Image source={{ uri: item.icon }} style={{ width: GENRE_TILE, height: GENRE_TILE }} resizeMode="contain" />
          )
        ) : null}

        <Text style={styles.genreName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
}

function GenreGridSection({ title, data }: { title: string; data: ApiGenre[] }) {
  const { t, i18n } = useTranslation();
  const [all, setAll] = useState<ApiGenre[]>(data);

  // The home response may only carry a few genres. Load the complete list
  // (same call the Genres screen uses) so every genre is on the Home Screen.
  useEffect(() => {
    let alive = true;

    axios
      .post("/", { method: "getAllGenre" })
      .then(({ data: res }) => {
        if (!alive || res?.statusCode !== 200) return;
        const sec = (res.data ?? []).find((s: any) => s.type === "all-genres");
        if (Array.isArray(sec?.data) && sec.data.length) setAll(sec.data);
      })
      .catch(() => {
        /* keep the genres that came with the home response */
      });

    return () => {
      alive = false;
    };
  }, [i18n.language]);

  // Home data refresh (pull-to-refresh / language change) updates the fallback.
  useEffect(() => {
    setAll((prev) => (prev.length > data.length ? prev : data));
  }, [data]);

  const rows = useMemo(() => {
    const top: ApiGenre[] = [];
    const bottom: ApiGenre[] = [];
    all.forEach((g, i) => (i % 2 === 0 ? top : bottom).push(g));
    return bottom.length ? [top, bottom] : [top];
  }, [all]);

  if (!all.length) return null;

  return (
    <View style={styles.section}>
      <SectionHead
        title={title || t("home.genres")}
        subtitle={t("home.genresSubtitle")}
        onViewAll={() => router.push("/genre")}
      />

      <ScrollView {...H_SCROLL} contentContainerStyle={{ paddingHorizontal: H_PAD }}>
        <View style={{ gap: 12 }}>
          {rows.map((row, r) => (
            <View key={r} style={styles.genreRow}>
              {row.map((item) => (
                <GenreTile key={item.id} item={item} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- connect with us footer ---------- */

const SOCIAL_ICON_MAP: Record<keyof ConnectLinks, React.FC<IconProps>> = {
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  website: WebsiteIcon,
  twitter: TwitterIcon,
};

// Deep Audiobooks website (used when the API does not send a website link).
const WEBSITE_URL = "https://www.deepaudiobooks.com/";

const openLink = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

const ConnectFooter: React.FC<{ links?: ConnectLinks }> = ({ links }) => {
  const { t } = useTranslation();

  const websiteUrl = links?.website || WEBSITE_URL;

  // The website icon is not repeated in the icon row: it has its own link below.
  const entries = (Object.keys(SOCIAL_ICON_MAP) as (keyof ConnectLinks)[]).filter(
    (k) => k !== "website" && !!links?.[k]
  );

  return (
    <View style={styles.footer}>
      {!!entries.length && (
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>{t("home.connectWithUs")}</Text>

        <View style={styles.socialRow}>
          {entries.map((key) => {
            const Icon = SOCIAL_ICON_MAP[key];
            const url = links?.[key] as string;

            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.social, pressed && { opacity: 0.6 }]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={key}
                onPress={() => openLink(url)}
              >
                <Icon />
              </Pressable>
            );
          })}
        </View>
      </View>
      )}

      <Pressable
        style={({ pressed }) => [localStyles.websiteLink, pressed && { opacity: 0.6 }]}
        hitSlop={HIT_SLOP}
        onPress={() => openLink(websiteUrl)}
        accessibilityRole="link"
        accessibilityLabel={t("home.visitWebsite")}
      >
        <WebsiteIcon size={14} color={COLORS.lav} />
        <Text style={localStyles.websiteLinkText}>{t("home.visitWebsite")}</Text>
      </Pressable>

      {/* Copyright / tagline wording is pending approval from Deep Talks
          (home.copyright in the locale files). */}
      <Text style={styles.footerCopy}>{t("home.copyright", { year: new Date().getFullYear() })}</Text>
    </View>
  );
};

/* ---------- membership banners (free users) ---------- */

/*
 * Dedicated membership banner (Premium tab). It EXPLAINS the membership
 * with benefit lines - a different design from the slim CTA strip below.
 * >>> Only list benefits that are really available. Deep Talks will
 *     confirm the final benefit text (home.membershipPoint1 / 2 / 3). <<<
 */
const MembershipBanner: React.FC = () => {
  const { t } = useTranslation();
  const points = [t("home.membershipPoint1"), t("home.membershipPoint2")].filter(Boolean);

  return (
    <View style={localStyles.memCard}>
      <LinearGradient
        colors={["#3b2a63", "#1d2f35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={localStyles.memHead}>
        <View style={localStyles.memEmblem}>
          <DiamondIcon size={26} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={localStyles.memTitle}>{t("home.membershipTitle")}</Text>
          <Text style={localStyles.memSubtitle}>{t("home.membershipSubtitle")}</Text>
        </View>
      </View>

      <View style={localStyles.memPoints}>
        {points.map((p, i) => (
          <View key={i} style={localStyles.memPointRow}>
            <View style={localStyles.memTick}>
              <CheckIcon size={11} color="#241b2c" />
            </View>
            <Text style={localStyles.memPointText}>{p}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={localStyles.memBtn}
        activeOpacity={0.85}
        hitSlop={HIT_SLOP}
        onPress={goToSubscribe}
        accessibilityRole="button"
        accessibilityLabel={t("home.seePlans")}
      >
        <Text style={localStyles.memBtnText}>{t("home.seePlans")}</Text>
        <ChevronRightIcon size={16} color="#241b2c" />
      </TouchableOpacity>
    </View>
  );
};

/* Slim Premium CTA strip: repeated after every 3 content blocks for free users. */
const PremiumCtaBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={goToSubscribe}
      accessibilityRole="button"
      accessibilityLabel={t("home.premiumCtaTitle")}
      style={({ pressed }) => [localStyles.ctaWrap, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={["rgba(245,185,60,0.28)", "rgba(183,155,209,0.22)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={localStyles.ctaCard}
      >
        <View style={localStyles.ctaPlus}>
          <PlusIcon size={18} color="#241b2c" />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={localStyles.ctaTitle} numberOfLines={1}>
            {t("home.premiumCtaTitle")}
          </Text>
          <Text style={localStyles.ctaSubtitle} numberOfLines={2}>
            {t("home.premiumCtaSubtitle")}
          </Text>
        </View>

        <DiamondIcon size={20} />
      </LinearGradient>
    </Pressable>
  );
};

/* ---------- Rent Books / Premium switch (free users only) ---------- */

const ModeChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  icon: (color: string) => React.ReactNode;
}> = ({ label, active, onPress, icon }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], flexShrink: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        hitSlop={6}
        style={[styles.modeChip, active && styles.modeChipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        {icon(active ? "#241b2c" : COLORS.text2)}
        <Text
          style={[styles.modeChipText, active && styles.modeChipTextActive]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const HomeExperienceSwitch: React.FC<{
  value: HomeExperience;
  onChange: (v: HomeExperience) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();

  const select = (next: HomeExperience) => {
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View style={styles.modeSwitch}>
      <ModeChip
        label={t("home.modeBuy")}
        active={value === "buy"}
        onPress={() => select("buy")}
        icon={(c) => <ShoppingCartIcon size={15} color={c} />}
      />
      <ModeChip
        label={t("home.modeUnlimited")}
        active={value === "unlimited"}
        onPress={() => select("unlimited")}
        icon={(c) => <DiamondIcon size={15} color={c} />}
      />
    </View>
  );
};

/* ---------- top bar pieces ---------- */

const CartHeaderButton: React.FC = () => {
  const { t } = useTranslation();
  const count = useCartBadge((s) => s.count);

  return (
    <TouchableOpacity
      style={localStyles.iconBtn}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
      onPress={goToCart}
      accessibilityRole="button"
      accessibilityLabel={t("home.cartWithCount", { count })}
    >
      <ShoppingCartIcon size={17} color={COLORS.text1} />
      {count > 0 && (
        <View style={localStyles.cartCountBadge}>
          <Text style={localStyles.cartCountText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/* ---------- Continue Listening / Explore card ---------- */

const ContinueListeningCard: React.FC<{ hero: HeroSection }> = ({ hero }) => {
  const { t } = useTranslation();
  const { experience, isSubscribed } = useHome();
  const story = hero.data;
  const resume = hero.mode === "resume";

  const pct = story.resume_percentage == null ? null : Math.max(0, Math.min(100, Math.round(story.resume_percentage)));
  const chapter = story.current_chapter_number;
  const total = story.chapters;

  const metaParts: string[] = [];
  if (resume && chapter && total) metaParts.push(t("home.chapterOf", { current: chapter, total }));
  if (resume && pct != null) metaParts.push(t("home.listened", { percent: pct }));

  const showRent = !isSubscribed && experience === "buy" && !story.purchased && !!getStoryPrice(story);

  return (
    <TouchableOpacity
      style={localStyles.clCard}
      activeOpacity={0.92}
      onPress={() => goToStoryEpisode(story.id)}
      accessibilityRole="button"
      accessibilityLabel={t("home.openStory", { title: story.title })}
    >
      {/* blurred cover as the card background: no flat empty space */}
      {story.cover ? (
        <Image source={{ uri: story.cover }} style={StyleSheet.absoluteFillObject} blurRadius={Platform.OS === "ios" ? 40 : 18} />
      ) : (
        <LinearGradient colors={["#3a2f22", "#1a1410"]} style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient
        colors={["rgba(20,16,35,0.55)", "rgba(10,12,16,0.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={localStyles.clRow}>
        {/* 3:4 cover. Nothing overlaps it except the favourite heart. */}
        <View style={localStyles.clCover}>
          <CoverImage story={story} fallback={["#3a2f22", "#1a1410"]} />
          <View style={localStyles.heartCorner}>
            <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={16} />
          </View>
        </View>

        <View style={localStyles.clInfo}>
          <View style={localStyles.clLabelRow}>
            <View style={localStyles.clLiveDot} />
            <Text style={localStyles.clLabel} numberOfLines={1}>
              {resume ? t("home.continueListening") : t("home.explore")}
            </Text>
          </View>

          <Text style={localStyles.clTitle} numberOfLines={2}>
            {story.title}
          </Text>

          <AuthorText author={story.author} authorStyle={localStyles.clAuthor} />
          <GenreText genre={story.genre} genreStyle={styles.primaryGenreText} />

          {resume && pct != null && (
            <View style={localStyles.clProgressWrap}>
              <View style={localStyles.clProgressTrack}>
                <View style={[localStyles.clProgressFill, { width: `${pct}%` }]} />
              </View>
              {!!metaParts.length && <Text style={localStyles.clMeta}>{metaParts.join("  ·  ")}</Text>}
            </View>
          )}

          <View style={localStyles.clActions}>
            <TouchableOpacity
              style={localStyles.clPlayBtn}
              activeOpacity={0.85}
              hitSlop={HIT_SLOP}
              onPress={() => goToStoryEpisode(story.id)}
              accessibilityRole="button"
              accessibilityLabel={
                resume
                  ? t("home.openStory", { title: `${t("home.resume")} ${story.title}` })
                  : t("home.openStory", { title: story.title })
              }
            >
              <PlayIcon />
              <Text style={localStyles.clPlayText} numberOfLines={1}>
                {resume ? t("home.resume") : t("home.listenNow")}
              </Text>
            </TouchableOpacity>

            {/* Price + working "+" now sit beside the Resume button,
                not on top of the thumbnail. */}
            {showRent && <PriceCartRow story={story} align="center" />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- Listening journey / chapter roadmap ----------
 * Placed right under Continue Listening. Completed chapters are filled and
 * joined by a solid line, the chapter being listened to is the biggest,
 * highlighted node with a "Now" tag, upcoming chapters are dim outlines.
 * The list auto-scrolls so the current chapter is in view.
 */
const NODE_W = 62;
const MAX_NODES = 100;

const ListeningJourney: React.FC<{ story: ApiStory }> = ({ story }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  const total = Math.min(Number(story.chapters) || 0, MAX_NODES);
  const current = Math.max(1, Math.min(Number(story.current_chapter_number) || 1, total || 1));

  useEffect(() => {
    const x = Math.max(0, (current - 1) * NODE_W - (width - H_PAD * 2) / 2 + NODE_W / 2);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: true }), 250);
    return () => clearTimeout(id);
  }, [current, width, story.id]);

  if (total < 2) return null;

  return (
    <View style={localStyles.jWrap}>
      <View style={localStyles.jHead}>
        <Text style={localStyles.jTitle}>{t("home.journeyTitle")}</Text>
        <Text style={localStyles.jSub}>{t("home.chapterOf", { current, total })}</Text>
      </View>

      <ScrollView ref={scrollRef} {...H_SCROLL} contentContainerStyle={localStyles.jScroll}>
        {Array.from({ length: total }, (_, idx) => {
          const n = idx + 1;
          const done = n < current;
          const isCurrent = n === current;

          return (
            <Pressable
              key={n}
              style={localStyles.jNode}
              onPress={() => goToStoryEpisode(story.id)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t("home.chapterOpen", { n })}
              accessibilityState={{ selected: isCurrent }}
            >
              {/* connector to the previous node */}
              {idx > 0 && (
                <View style={[localStyles.jLine, (done || isCurrent) && localStyles.jLineDone]} />
              )}

              <View
                style={[
                  localStyles.jDot,
                  done && localStyles.jDotDone,
                  isCurrent && localStyles.jDotCurrent,
                ]}
              >
                {done ? (
                  <CheckIcon size={13} color="#241b2c" />
                ) : isCurrent ? (
                  <PlayIcon size={14} color="#241b2c" />
                ) : (
                  <Text style={localStyles.jDotText}>{n}</Text>
                )}
              </View>

              <Text style={[localStyles.jLabel, isCurrent && localStyles.jLabelCurrent]} numberOfLines={1}>
                {isCurrent ? t("home.nowChapter") : t("home.chapterShort", { n })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ---------- section dispatcher ---------- */

function hasData(section: Section): boolean {
  switch (section.type) {
    case "trending-genres":
    case "featured-books":
    case "story-row":
    case "author-row":
    case "genre-grid":
      return Array.isArray(section.data) && section.data.length > 0;
    default:
      return false;
  }
}

function renderSection(section: Section, index: number): React.ReactNode {
  switch (section.type) {
    case "trending-genres":
      return <TrendingGenreChips key={`chips-${index}`} genres={section.data} />;

    case "featured-books":
    case "story-row": {
      const variantProp = section.type === "story-row" ? section.variant : undefined;
      const variant = detectRowVariant({
        key_type: section.key_type,
        variant: variantProp,
        title: section.title,
      });
      const key = `${section.type}-${index}`;
      // NOTE: `key` must not live inside this spread object (React warning).
      const common = {
        title: section.title,
        stories: section.data,
        view_type: section.view_type,
        key_type: section.key_type,
      };

      switch (variant) {
        case "bed":
          return <PerfectBeforeBedSection key={key} {...common} />;
        case "carousel":
          return <NewReleaseCarousel key={key} {...common} />;
        case "classics":
          return <ClassicsSection key={key} {...common} />;
        case "reviews":
          return <ReviewsSection key={key} {...common} />;
        case "square":
          // Trending Today / Editor's Picks keep the existing row style, 1:1 thumbnails.
          return <StoryRow key={key} {...common} shape="square" />;
        default:
          return <StoryRow key={key} {...common} shape="portrait" />;
      }
    }

    case "author-row":
      return <AuthorRow key={`author-${index}`} title={section.title} authors={section.data} />;

    case "genre-grid":
      return <GenreGridSection key={`genres-${index}`} title={section.title} data={section.data} />;

    default:
      return null;
  }
}

/* ---------- main component ---------- */

const DeepAudiobooksHome: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the free user picked on the switch (Rent Books / Premium).
  const [experience, setExperience] = useState<HomeExperience>("buy");

  // true = active Premium subscriber. false = free user (new OR expired plan).
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSubscribedRef = useRef(false);
  // Ignore responses from older requests (e.g. user taps the switch quickly).
  const requestIdRef = useRef(0);

  // Premium users always get the premium experience; Rent mode is gone.
  const activeExperience: HomeExperience = isSubscribed ? "unlimited" : experience;

  const fetchDiscoverData = useCallback(
    async (isPullRefresh = false, silent = false) => {
      const reqId = ++requestIdRef.current;

      try {
        if (isPullRefresh) {
          setRefreshing(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (!silent) {
          setLoading(true);
        }

        if (!silent) setError(null);

        const { data } = await axios.post("/", {
          method: "getHomepageData",
          // Hint for the backend (it should also decide from the auth token).
          home_type: isSubscribedRef.current ? "unlimited" : experience,
        });

        if (reqId !== requestIdRef.current) return; // a newer request is in flight

        if (data.statusCode === 200) {
          const list: Section[] = data.data ?? [];
          setSections(list);

          // Seed likes + "already in cart" flags from every story on the page.
          const stories = collectStories(list as any[]);
          useWishlistStore.getState().seedMany(stories);
          useCartBadge.getState().seedFromStories(stories);

          // Backend sends is_subscribed = false for new users & expired plans.
          const sub = !!(data.is_subscribed ?? data.subscription?.is_active ?? false);
          isSubscribedRef.current = sub;
          setIsSubscribed(sub);

          // Free users: keep the cart count in the header up to date.
          if (!sub) useCartBadge.getState().refresh();
        } else if (!silent) {
          setError(data.msg || t("home.failedToLoad"));
        }
      } catch (err: any) {
        console.log("Error code:", err.code);
        console.log("Error message:", err.message);

        // Silent background refreshes never replace the screen with an error.
        if (reqId === requestIdRef.current && !silent) setError(t("home.somethingWentWrong"));
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t, experience]
  );

  const onPullRefresh = useCallback(() => {
    fetchDiscoverData(true);
  }, [fetchDiscoverData]);

  useEffect(() => {
    fetchDiscoverData();
    // Re-fetch when the chosen experience (Rent / Premium) changes.
  }, [fetchDiscoverData]);

  // Quietly refresh when the screen regains focus (e.g. after subscribing or
  // renting a book elsewhere). A ref keeps this from also firing whenever
  // the Rent/Premium tab changes.
  const fetchRef = useRef(fetchDiscoverData);
  fetchRef.current = fetchDiscoverData;
  const hasFocusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isSubscribedRef.current) useCartBadge.getState().refresh();

      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true; // first focus is covered by the mount fetch
        return;
      }
      fetchRef.current(false, true);
    }, [])
  );

  const greetingSection = sections.find(
    (s): s is Extract<Section, { type: "greeting" }> => s.type === "greeting"
  );

  const heroSection = sections.find(
    (s): s is Extract<Section, { type: "hero" }> => s.type === "hero"
  );

  const connectSection = sections.find(
    (s): s is Extract<Section, { type: "connect-with-us" }> => s.type === "connect-with-us"
  );

  const bodySections = useMemo(
    () =>
      sections.filter(
        (s) => s.type !== "greeting" && s.type !== "hero" && s.type !== "resume" && s.type !== "connect-with-us"
      ),
    [sections]
  );

  /*
   * Body = content blocks in order, plus (free users only):
   *  - price-based sections (Rent Books mode) after the first couple of blocks
   *  - a Premium CTA banner after every CTA_EVERY_N_BLOCKS content blocks
   * Chips are not counted as a "content block".
   */
  const bodyNodes = useMemo(() => {
    const items: { node: React.ReactNode; counts: boolean }[] = [];

    bodySections.forEach((section, i) => {
      if (!hasData(section)) return;
      const node = renderSection(section, i);
      if (node) items.push({ node, counts: section.type !== "trending-genres" });
    });

    // price-based sections
    if (!isSubscribed && activeExperience === "buy") {
      const seen = new Set<number>();
      const all = collectStories(sections as any[]).filter((s: ApiStory) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return !s.purchased;
      }) as ApiStory[];

      const priceNodes = PRICE_TIERS.map((tier) => {
        const list = all.filter((s) => Math.round(getStoryPrice(s) ?? -1) === tier.price);
        return list.length ? (
          <PriceSection key={tier.id} price={tier.price} stories={list} />
        ) : null;
      }).filter(Boolean) as React.ReactNode[];

      if (priceNodes.length) {
        let counted = 0;
        let at = items.length;
        for (let i = 0; i < items.length; i++) {
          if (counted === PRICE_SECTIONS_AFTER_BLOCK) {
            at = i;
            break;
          }
          if (items[i].counts) counted++;
        }
        items.splice(at, 0, ...priceNodes.map((node) => ({ node, counts: true })));
      }
    }

    // Premium CTA banners
    const out: React.ReactNode[] = [];
    let blocks = 0;
    items.forEach((it, i) => {
      out.push(it.node);
      if (it.counts) {
        blocks++;
        if (!isSubscribed && blocks % CTA_EVERY_N_BLOCKS === 0) {
          out.push(<PremiumCtaBanner key={`cta-${i}`} />);
        }
      }
    });

    return out;
  }, [bodySections, sections, isSubscribed, activeExperience]);

  const ctx = useMemo(
    () => ({ experience: activeExperience, isSubscribed }),
    [activeExperience, isSubscribed]
  );

  if (loading && !sections.length) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <ActivityIndicator size="large" color={COLORS.lav} />
      </View>
    );
  }

  if (error && !sections.length) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDiscoverData()} accessibilityRole="button">
          <Text style={styles.retryBtnText}>{t("home.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showJourney =
    heroSection?.mode === "resume" && Number(heroSection.data.chapters) >= 2;

  return (
    <HomeContext.Provider value={ctx}>
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
          contentContainerStyle={styles.wrapContent}
          {...NO_TOUCH_DELAY}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={COLORS.lav}
              colors={[COLORS.lav]}
              progressBackgroundColor="#1a1420"
              title={t("home.pullingFreshStories")}
              titleColor={COLORS.text2}
            />
          }
        >
          <View style={styles.screen}>
            {/* ---------- top bar ---------- */}

            <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
              <View>
                <View style={styles.wordmark}>
                  <Text style={styles.deep}>deep</Text>
                  <Text style={styles.aud}>audiobooks</Text>
                </View>

                {/* clear "Premium" label near the top of the screen */}
                {isSubscribed && (
                  <View style={localStyles.premiumPill}>
                    <DiamondIcon size={10} />
                    <Text style={localStyles.premiumPillText}>{t("home.premium")}</Text>
                  </View>
                )}
              </View>

              <View style={styles.topActions}>
                <TouchableOpacity
                  style={localStyles.iconBtn}
                  activeOpacity={0.7}
                  hitSlop={HIT_SLOP}
                  onPress={goToLanguageSettings}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.changeLanguage")}
                >
                  <LanguageIcon size={16} />
                </TouchableOpacity>

                {/* cart: free users only (Premium users do not rent books) */}
                {!isSubscribed && <CartHeaderButton />}

                <View style={styles.bell}>
                  <BellIcon />
                </View>

                {/* diamond button next to the profile icon */}
                {isSubscribed && (
                  <TouchableOpacity
                    style={localStyles.diamondBtn}
                    activeOpacity={0.7}
                    hitSlop={HIT_SLOP}
                    onPress={goToSubscribe}
                    accessibilityRole="button"
                    accessibilityLabel={t("home.openPremium")}
                  >
                    <DiamondIcon size={17} />
                  </TouchableOpacity>
                )}

                <ProfileDot dotStyle={styles.profileDot} textStyle={styles.profileDotText} />
              </View>
            </View>

            {/* ---------- Rent Books / Premium switch: free users only ---------- */}

            {!isSubscribed && <HomeExperienceSwitch value={experience} onChange={setExperience} />}

            {/* ---------- hero ---------- */}

            <View style={styles.hero}>
              {!!greetingSection?.title && <Text style={styles.greet}>{greetingSection.title}</Text>}

              {!!greetingSection?.subtitle && <Text style={styles.greetSub}>{greetingSection.subtitle}</Text>}

              {/* dedicated membership banner: free users, Premium tab */}
              {activeExperience === "unlimited" && !isSubscribed && <MembershipBanner />}

              {heroSection?.data && <ContinueListeningCard hero={heroSection} />}

              {showJourney && heroSection && <ListeningJourney story={heroSection.data} />}
            </View>

            {/* ---------- body sections ---------- */}

            {bodyNodes}

            {/* ---------- footer ---------- */}

            <ConnectFooter links={connectSection?.data} />
          </View>
        </ScrollView>
      </View>
    </HomeContext.Provider>
  );
};

/* ---------- local styles ---------- */

const localStyles = StyleSheet.create({
  heartCorner: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: "rgba(245,185,60,0.16)",
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.5)",
  },
  premiumPillText: {
    color: COLORS.highlight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  diamondBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(245,185,60,0.14)",
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCoverShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  cardAccessCorner: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    alignItems: "flex-end",
  },
  bedAccessCorner: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    alignItems: "flex-end",
  },
  viewAllBtnLight: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* ---------- price / cart ---------- */
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceText: {
    backgroundColor: "#ffffff",
    color: "#241b2c",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
  },
  cartBtn: {
    backgroundColor: COLORS.lav,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnDone: {
    backgroundColor: "#8fd19e",
  },
  ownedPill: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownedPillText: {
    color: "#8fd19e",
    fontSize: 10,
    fontWeight: "600",
  },
  diamondBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(20,16,35,0.72)",
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------- new releases carousel ---------- */
  nrPanel: {
    marginHorizontal: 14,
    marginTop: 30,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(20,16,35,0.85)",
    borderWidth: 1,
    borderColor: "rgba(183,155,209,0.28)",
  },
  nrHeader: {
    gap: 4,
    paddingHorizontal: 16,
  },
  nrHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nrTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nrTitle: {
    flexShrink: 1,
    color: COLORS.text1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  nrSubtitle: {
    color: COLORS.text2,
    fontSize: 12,
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.highlight,
  },
  carouselCard: {
    position: "absolute",
    top: 0,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: "#1a1420",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  carouselHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CARD_RADIUS,
    borderWidth: 3,
    borderColor: COLORS.highlight,
  },
  newPillWrap: {
    position: "absolute",
    top: 10,
    left: 10,
    shadowColor: "#7b4ddb",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  newPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  newPillText: {
    color: "#170808",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  carouselInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 4,
    gap: 6,
  },
  carouselTitle: {
    color: COLORS.highlight,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  carouselMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  carouselAuthor: {
    color: COLORS.text2,
    fontSize: 12.5,
    flexShrink: 1,
  },

  /* ---------- Tamil Classics ---------- */
  classicsPanel: {
    marginTop: 30,
    marginHorizontal: H_PAD,
    paddingVertical: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(232,195,77,0.35)",
    backgroundColor: "rgba(27,22,12,0.9)",
  },
  classicsHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  classicsOrnamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  classicsLine: {
    width: 28,
    height: 1.5,
    backgroundColor: COLORS.gold,
  },
  classicsTitle: {
    fontFamily: SERIF,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    color: COLORS.gold,
  },
  classicsScroll: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  classicCard: {
    width: 132,
  },
  classicFrame: {
    padding: 3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(232,195,77,0.7)",
  },
  classicCover: {
    width: 120,
    height: 160, // 3:4
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  classicTitle: {
    marginTop: 8,
    fontFamily: SERIF,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.text1,
  },
  classicAuthor: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.text3,
  },

  /* ---------- Book Reviews ---------- */
  reviewCard: {
    flexDirection: "row",
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.hair,
  },
  reviewCover: {
    width: 90,
    height: 120, // 3:4
    borderRadius: 12,
    overflow: "hidden",
  },
  reviewBody: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
  },
  reviewTitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: COLORS.text1,
  },
  reviewAuthor: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.text3,
  },
  reviewRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  reviewRatingText: {
    color: COLORS.highlight,
    fontSize: 12.5,
    fontWeight: "800",
  },
  reviewListens: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.text2,
  },

  /* ---------- footer website link ---------- */
  websiteLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    minHeight: 40,
    marginTop: 10,
  },
  websiteLinkText: {
    color: COLORS.lav,
    fontSize: 13,
    fontWeight: "600",
  },

  /* ---------- membership banner (free users) ---------- */
  memCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.4)",
  },
  memHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memEmblem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245,185,60,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  memTitle: {
    color: COLORS.text1,
    fontSize: 19,
    fontWeight: "800",
  },
  memSubtitle: {
    color: COLORS.text2,
    fontSize: 12.5,
    marginTop: 2,
  },
  memPoints: {
    marginTop: 14,
    gap: 9,
  },
  memPointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memTick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
  memPointText: {
    flex: 1,
    color: COLORS.text1,
    fontSize: 13,
    lineHeight: 18,
  },
  memBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 46,
    marginTop: 16,
    borderRadius: 23,
    backgroundColor: COLORS.highlight,
  },
  memBtnText: {
    color: "#241b2c",
    fontSize: 14.5,
    fontWeight: "800",
  },

  /* ---------- Premium CTA strip ---------- */
  ctaWrap: {
    marginTop: 30,
    marginHorizontal: H_PAD,
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,185,60,0.35)",
  },
  ctaPlus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    color: COLORS.text1,
    fontSize: 15,
    fontWeight: "800",
  },
  ctaSubtitle: {
    color: COLORS.text2,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },

  /* ---------- Continue Listening card ---------- */
  clCard: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: COLORS.panel,
  },
  clRow: {
    flexDirection: "row",
    gap: 14,
  },
  clCover: {
    width: 108,
    height: 144, // 3:4
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  clInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
  },
  clLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  clLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.highlight,
  },
  clLabel: {
    flexShrink: 1,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.highlight,
    textTransform: "uppercase",
  },
  clTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: COLORS.text1,
  },
  clAuthor: {
    marginTop: 2,
    fontSize: 12.5,
    color: COLORS.text2,
  },
  clProgressWrap: {
    marginTop: 8,
    gap: 5,
  },
  clProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  clProgressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.highlight,
  },
  clMeta: {
    fontSize: 11,
    color: COLORS.text2,
  },
  clActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  clPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.highlight,
  },
  clPlayText: {
    color: "#241b2c",
    fontWeight: "800",
    fontSize: 13.5,
  },

  /* ---------- listening journey ---------- */
  jWrap: {
    marginTop: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: "rgba(27,36,38,0.9)",
    borderWidth: 1,
    borderColor: COLORS.hair,
  },
  jHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  jTitle: {
    color: COLORS.text1,
    fontSize: 14.5,
    fontWeight: "700",
  },
  jSub: {
    color: COLORS.highlight,
    fontSize: 12,
    fontWeight: "700",
  },
  jScroll: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  jNode: {
    width: NODE_W,
    alignItems: "center",
    justifyContent: "flex-start",
    height: 66,
  },
  jLine: {
    position: "absolute",
    top: 18,
    right: NODE_W / 2 + 14,
    width: NODE_W - 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  jLineDone: {
    backgroundColor: COLORS.lav,
  },
  jDot: {
    width: 30,
    height: 30,
    marginTop: 3,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  jDotDone: {
    backgroundColor: COLORS.lav,
    borderColor: COLORS.lav,
  },
  jDotCurrent: {
    width: 38,
    height: 38,
    marginTop: 0,
    borderRadius: 19,
    backgroundColor: COLORS.highlight,
    borderColor: "rgba(245,185,60,0.45)",
    borderWidth: 4,
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  jDotText: {
    color: COLORS.text3,
    fontSize: 11.5,
    fontWeight: "700",
  },
  jLabel: {
    marginTop: 6,
    fontSize: 10.5,
    color: COLORS.text3,
    fontWeight: "600",
  },
  jLabelCurrent: {
    color: COLORS.highlight,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});

export default DeepAudiobooksHome;