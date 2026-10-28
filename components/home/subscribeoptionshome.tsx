import axios from '@/axios.config';
import WishlistHeart from "@/components/ui/WishlistHeart";
import { storyWishlisted, useWishlistStore } from "@/redux/slices/wishlistStore";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
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
import styles, { BED_COVERS, CARD_H, CARD_RADIUS, CARD_W, COLORS, COVERS } from "./style";

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
 *  - "buy"        -> individual book purchase browsing (price tags + cart).
 *  - "unlimited"  -> subscription browsing ("Unlimited" pill, subscribe banner).
 *
 * WHO SEES WHAT
 *  - New user / expired plan  -> isSubscribed = false -> Buy + Unlimited
 *                                switch is shown (both options).
 *  - Active subscriber        -> isSubscribed = true  -> no switch, no buy
 *                                option, no price tags, no subscribe banner.
 *                                Everything is "Unlimited".
 *
 * The backend must return `is_subscribed: true | false` at the top level of
 * the `getHomepageData` response (false when the plan has expired).
 */
type HomeExperience = "buy" | "unlimited";

/*
 * Which story-row is rendered as the swipeable "New releases" carousel.
 * Either send `variant: "carousel"` from the API, or make the section's
 * key_type one of the values below (change to match your backend).
 */
const NEW_RELEASE_KEY_TYPES = ["new_releases", "new-releases", "new_release", "new"];

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
      variant?: "default" | "bed" | "carousel";
    }
  | { type: "author-row"; title: string; data: ApiAuthor[] }
  | { type: "genre-grid"; title: string; data: ApiGenre[] }
  | { type: "connect-with-us"; data: ConnectLinks };

interface IconProps {
  size?: number;
  color?: string;
}

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

const ClockIcon = ({ size = 11, color = COLORS.lavDim }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 7v5l3 3" />
  </Svg>
);

const PlayIcon = ({ size = 10, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const BookIcon = ({ size = 8, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4Z" />
    <Path d="M6 11v1a6 6 0 0012 0v-1M12 18v3" />
  </Svg>
);

const MoonIcon = ({ size = 16, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 1010.5 10.5Z" />
  </Svg>
);

const CartAddIcon = ({ size = 16, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 13l4 4 10-10" />
  </Svg>
);

const ShoppingCartIcon = ({ size = 13, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={9} cy={20} r={1.3} fill={color} stroke="none" />
    <Circle cx={17} cy={20} r={1.3} fill={color} stroke="none" />
    <Path d="M2.5 3h2l2.4 12.2a2 2 0 002 1.6h8.2a2 2 0 002-1.6L21 7H6" />
  </Svg>
);

const FacebookIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V9Z" />
  </Svg>
);

const InstagramIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={4} y={4} width={16} height={16} rx={4} />
    <Circle cx={12} cy={12} r={3.2} />
    <Circle cx={16.6} cy={7.4} r={0.6} fill={color} stroke="none" />
  </Svg>
);

const WebsiteIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </Svg>
);

const TwitterIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 5.3c-.7.4-1.5.6-2.3.8a3.6 3.6 0 00-6.2 3.3A10.4 10.4 0 014 4.9a3.6 3.6 0 001.1 4.8c-.6 0-1.2-.2-1.7-.4 0 1.7 1.2 3.2 2.9 3.6-.6.2-1.2.2-1.8.1a3.6 3.6 0 003.4 2.5A10.5 10.5 0 013 17.4a10.9 10.9 0 006 1.7c7 0 11-6 11-11.2v-.5c.7-.5 1.4-1.2 1.9-2z" />
  </Svg>
);

const YoutubeIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={6} width={18} height={12} rx={3} />
    <Path d="M11 9.5l4 2.5-4 2.5z" fill={color} stroke="none" />
  </Svg>
);

const CrownIcon = ({ size = 14, color = "#241b2c" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
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

function getInitialFromGreeting(title?: string): string {
  if (!title) return "U";
  const match = title.match(/,\s*([^.]+)\.?$/);
  const name = match ? match[1].trim() : title;
  return name.charAt(0).toUpperCase() || "U";
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

function formatResumeProgress(story: ApiStory): string | null {
  if (story.resume_percentage == null) return null;
  return `${Math.round(story.resume_percentage)}%`;
}

function isNewReleaseSection(section: { key_type?: string; variant?: string }): boolean {
  return section.variant === "carousel" || NEW_RELEASE_KEY_TYPES.includes(String(section.key_type));
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

function goToCart() {
  // router.push({ pathname: "/cart" });
}

function goToLanguageSettings() {
  router.push({ pathname: "/language" });
}

// Placeholder route for the subscription / plans screen.
function goToSubscribe() {
  router.push({ pathname: "/subscribehome" });
}

/*
 * Homepage response la irukkura ellaa stories (hero + rows) oda like status ah
 * global wishlist store la seed panradhu. Appo ellaa screen um sync la irukkum.
 */
function seedWishlistFromSections(list: any[]) {
  const stories: any[] = [];

  for (const s of list) {
    if (!s) continue;
    if (Array.isArray(s.data)) {
      stories.push(...s.data);
    } else if (s.type === "hero" && s.data) {
      stories.push(s.data);
    }
  }

  useWishlistStore.getState().seedMany(stories.filter((x) => x && x.id != null));
}

/* ---------- price + add-to-cart (available for a future cart-enabled detail screen) ---------- */

function useAddToCart(storyId: number, initialInCart?: boolean) {
  const [inCart, setInCart] = useState(!!initialInCart);
  const [busy, setBusy] = useState(false);

  const addToCart = useCallback(
    async (e?: any) => {
      e?.stopPropagation?.();
      if (busy || inCart) return;

      setBusy(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        await axios.post("/", {
          method: "addToCart",
          story_id: storyId,
        });
        setInCart(true);
      } catch (err) {
        // Keep inCart false so the user can retry.
      } finally {
        setBusy(false);
      }
    },
    [busy, inCart, storyId]
  );

  return { inCart, busy, addToCart };
}

const PriceCartBadge: React.FC<{
  story: ApiStory;
  compact?: boolean;
}> = ({ story, compact = true }) => {
  const { t } = useTranslation();
  const { inCart, addToCart } = useAddToCart(story.id, story.in_cart);

  if (story.purchased) {
    return (
      <View style={localStyles.ownedPill}>
        <Text style={localStyles.ownedPillText}>{t("home.owned")}</Text>
      </View>
    );
  }

  const price = getStoryPrice(story);
  if (!price) return null;

  return (
    <View style={[localStyles.priceRow, compact && localStyles.priceRowCompact]}>
      <Text style={localStyles.priceText}>{formatPrice(price)}</Text>

      <TouchableOpacity
        style={[localStyles.cartBtn, inCart && localStyles.cartBtnDone]}
        activeOpacity={0.8}
        onPress={addToCart}
        accessibilityRole="button"
        accessibilityLabel={inCart ? t("home.alreadyInCart") : t("home.addToCart", { title: story.title })}
      >
        {inCart ? <CheckIcon /> : <CartAddIcon />}
      </TouchableOpacity>
    </View>
  );
};

/* ---------- access badge: price tag (buy mode) vs unlimited tag ---------- */

const AccessBadge: React.FC<{
  experience: HomeExperience;
  price?: number | null;
  purchased?: boolean;
}> = ({ experience, price, purchased }) => {
  const { t } = useTranslation();

  if (experience === "unlimited") {
    return (
      <View style={[localStyles.accessPill, localStyles.accessPillUnlimited]}>
        <CrownIcon size={10} color={COLORS.lav} />
        <Text style={[localStyles.accessPillText, localStyles.accessPillTextUnlimited]} numberOfLines={1}>
          {t("home.unlimitedTag")}
        </Text>
      </View>
    );
  }

  if (purchased) {
    return (
      <View style={localStyles.ownedPill}>
        <Text style={localStyles.ownedPillText}>{t("home.owned")}</Text>
      </View>
    );
  }

  if (!price) return null;

  return (
    <View style={localStyles.accessPill}>
      <Text style={[localStyles.accessPillText, localStyles.accessPillTextPrice]} numberOfLines={1}>
        {formatPrice(price)}
      </Text>
    </View>
  );
};

/* ---------- author block (single line, no voice/narrator row) ---------- */

const AuthorText: React.FC<{
  author: string;
  authorStyle: any;
}> = ({ author, authorStyle }) => (
  <Text style={authorStyle} numberOfLines={1}>
    {author}
  </Text>
);

/* ---------- genre line (plain text under the title, not a badge) ---------- */

const GenreText: React.FC<{
  genre?: string | null;
  genreStyle: any;
}> = ({ genre, genreStyle }) => {
  if (!genre) return null;
  return (
    <Text style={genreStyle} numberOfLines={1}>
      {genre}
    </Text>
  );
};

/* ---------- story row ---------- */

// Thin divider between rows. marginVertical is 0 so the only space
// around it comes from rowSec.paddingTop (above) and rowHead.marginTop (below).
const WaveRule = () => (
  <View
    style={{
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.12)",
      marginVertical: 0,
      width: "100%",
    }}
  />
);

/*
 * Grid card: the cover only. It carries the wishlist heart (top-right)
 * and the price / Unlimited pill (bottom-right). The title / genre /
 * author lines under the cover are removed so no empty space is left
 * between this row and the next. To bring them back, add the Text
 * elements below the cover View and set cardCover.marginBottom to 8
 * in style.ts.
 *
 * Size comes from the shared CARD_W x CARD_H (2:3) in style.ts, so a
 * 600 x 900 cover image fits here, in the bed row and in the
 * New releases carousel without cropping.
 */
const StoryCard: React.FC<{
  story: ApiStory;
  fallbackBg: [string, string];
  experience: HomeExperience;
}> = ({ story, fallbackBg, experience }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => goToStoryEpisode(story.id)}
      accessibilityRole="button"
      accessibilityLabel={t("home.openStory", { title: story.title })}
    >
      <View style={[styles.cardCover, localStyles.cardCoverShadow]}>
        {story.cover ? (
          <Image source={{ uri: story.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient colors={fallbackBg} style={StyleSheet.absoluteFillObject} />
        )}

        <View style={localStyles.heartCorner}>
          <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={18} />
        </View>

        <View style={localStyles.cardAccessCorner}>
          <AccessBadge experience={experience} price={getStoryPrice(story)} purchased={story.purchased} />
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
  experience: HomeExperience;
}> = ({ title, stories, view_type, key_type, experience }) => {
  const { t } = useTranslation();

  if (!stories.length) return null;

  return (
    <View style={styles.rowSec}>
      <WaveRule />

      <View style={styles.rowHead}>
        <Text style={styles.rowTitle}>{title}</Text>

        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "/storyView",
              params: {
                title,
                view_type,
                key_type,
                api_method: 'getStoryListViewAll',
              },
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={t("home.viewAllOf", { title })}
        >
          <Text style={styles.viewAll}>{t("home.viewAll")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {stories.map((story, i) => (
          <StoryCard key={`${story.id}-${i}`} story={story} fallbackBg={COVERS[i % COVERS.length]} experience={experience} />
        ))}
      </ScrollView>
    </View>
  );
};

/* ---------- New releases: looping coverflow carousel ---------- */

/*
 * Centre card is biggest, neighbours are smaller and tucked behind it.
 * The list loops endlessly (stories are tripled and silently re-centred
 * after every swipe), so the centre card ALWAYS has a card on both sides
 * — on iOS and Android, even on the very first/last title.
 * Cards stay opaque (far cards are dimmed with an overlay, not
 * transparency). Card size comes from the shared CARD_W x CARD_H in
 * style.ts (scaled down only on very small screens, ratio unchanged).
 */
const OVERLAP = 0.72; // distance between card centres, as a fraction of card width

const SparkleIcon = ({ size = 16, color = COLORS.lav }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7L12 2Z" />
  </Svg>
);

/*
 * "NEW" badge on carousel covers.
 *   "pill"   -> small glowing gradient pill, top-left (default, doesn't cover the art)
 *   "ribbon" -> slim diagonal ribbon across the bottom-left corner
 */
const NEW_BADGE_STYLE = "pill" as "pill" | "ribbon";

const NewBadge: React.FC<{ label: string }> = ({ label }) => {
  if (NEW_BADGE_STYLE === "ribbon") {
    return (
      <View style={localStyles.newRibbon} pointerEvents="none">
        <Text style={localStyles.newRibbonText}>{label}</Text>
      </View>
    );
  }

  return (
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
};

const NewReleaseCarousel: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
  experience: HomeExperience;
}> = ({ title, stories, view_type, key_type, experience }) => {
  const { t } = useTranslation();
  const { width: winW } = useWindowDimensions();
  const [boxW, setBoxW] = useState(winW - 28);

  const n = stories.length;
  const loop = n >= 3;
  const base = loop ? n : 0; // first item of the middle copy
  const data = useMemo(() => (loop ? [...stories, ...stories, ...stories] : stories), [stories, loop]);

  const [rawActive, setRawActive] = useState(base);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const lastRaw = useRef(base);

  // Same size as every other card (CARD_W x CARD_H, 2:3). Only shrinks
  // on very small screens so it never overflows; ratio stays the same.
  const cardW = Math.min(CARD_W, boxW * 0.5);
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

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (e: any) => {
      const raw = Math.max(0, Math.min(data.length - 1, Math.round(e.nativeEvent.contentOffset.x / itemW)));
      if (raw !== lastRaw.current) {
        lastRaw.current = raw;
        setRawActive(raw);
        Haptics.selectionAsync();
      }
    },
  });

  // After a swipe settles near either end, jump (invisibly) to the same
  // card in the middle copy.
  const onMomentumEnd = (e: any) => {
    if (!loop) return;
    const raw = Math.round(e.nativeEvent.contentOffset.x / itemW);
    if (raw < n || raw >= 2 * n) {
      const next = base + (raw % n);
      lastRaw.current = next;
      setRawActive(next);
      scrollRef.current?.scrollTo({ x: next * itemW, animated: false });
    }
  };

  if (!n) return null;

  const active = loop ? rawActive % n : Math.min(rawActive, n - 1);
  const current = stories[active];

  return (
    <View style={localStyles.nrPanel}>
      <LinearGradient
        colors={["rgba(123,77,219,0.38)", "rgba(36,27,44,0.55)", "rgba(0,0,0,0.0)"]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* centred heading + small View all pill in the corner */}
      <View style={localStyles.nrHeader}>
        <View style={localStyles.nrTitleRow}>
          <SparkleIcon size={15} />
          <Text style={localStyles.nrTitle}>{title}</Text>
        </View>
        <Text style={localStyles.nrSubtitle}>
          {t("home.newReleasesSubtitle", { defaultValue: "Fresh stories, just for you" })}
        </Text>
      </View>

      <TouchableOpacity
        style={localStyles.nrViewAll}
        activeOpacity={0.85}
        onPress={() => {
          router.push({
            pathname: "/storyView",
            params: { title, view_type, key_type, api_method: 'getStoryListViewAll' },
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={t("home.viewAllOf", { title })}
      >
        <Text style={localStyles.nrViewAllText}>{t("home.viewAll")}</Text>
      </TouchableOpacity>

      <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
        <Animated.ScrollView
          ref={scrollRef as any}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemW}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumEnd}
          contentOffset={{ x: base * itemW, y: 0 }}
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingVertical: 10 }}
          style={{ height: cardH + 20 }}
        >
          {data.map((story, i) => {
            const inputRange = [(i - 2) * itemW, (i - 1) * itemW, i * itemW, (i + 1) * itemW, (i + 2) * itemW];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.7, 0.86, 1, 0.86, 0.7],
              extrapolate: "clamp",
            });
            const dim = scrollX.interpolate({
              inputRange,
              outputRange: [0.55, 0.3, 0, 0.3, 0.55],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={`${story.id}-${i}`}
                style={{
                  width: itemW,
                  height: cardH,
                  zIndex: 1000 - Math.abs(i - rawActive),
                  transform: [{ scale }],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[localStyles.carouselCard, { width: cardW, height: cardH, left: (itemW - cardW) / 2 }]}
                  onPress={() => {
                    if (i === rawActive) {
                      goToStoryEpisode(story.id);
                    } else {
                      scrollRef.current?.scrollTo({ x: i * itemW, animated: true });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.openStory", { title: story.title })}
                >
                  {story.cover ? (
                    <Image source={{ uri: story.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={COVERS[i % COVERS.length]} style={StyleSheet.absoluteFillObject} />
                  )}

                  <NewBadge label={t("home.newTag", { defaultValue: "NEW" })} />

                  <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000", opacity: dim }]}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.ScrollView>
      </View>

      {/* details for the centred card */}
      <View style={localStyles.carouselInfo}>
        <Text style={localStyles.carouselTitle} numberOfLines={1}>
          {current.title}
        </Text>
        <View style={localStyles.carouselMetaRow}>
          <Text style={localStyles.carouselAuthor} numberOfLines={1}>
            {current.author}
          </Text>
          <AccessBadge experience={experience} price={getStoryPrice(current)} purchased={current.purchased} />
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

/* ---------- Perfect Before Bed ---------- */

const PerfectBeforeBedSection: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
  experience: HomeExperience;
}> = ({ title, stories, view_type, key_type, experience }) => {
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

        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "/storyView",
              params: {
                title,
                view_type,
                key_type,
                api_method: 'getStoryListViewAll',
                stories: JSON.stringify(stories),
              },
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={t("home.viewAllOf", { title })}
        >
          <Text style={styles.viewAll}>{t("home.viewAll")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bedRowScroll}>
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
                {story.cover ? (
                  <Image source={{ uri: story.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={BED_COVERS[i % BED_COVERS.length]} style={StyleSheet.absoluteFillObject} />
                )}

                <LinearGradient colors={["rgba(10,8,20,0)", "rgba(10,8,20,0.7)"]} style={StyleSheet.absoluteFillObject} />

                <View style={localStyles.heartCorner}>
                  <WishlistHeart storyId={story.id} initialLiked={storyWishlisted(story)} size={18} />
                </View>

                <Text style={[styles.bedCoverTitle, { color: "#fff" }]} numberOfLines={2}>
                  {story.title}
                </Text>

                {!!duration && (
                  <View style={styles.bedDurationBadge}>
                    <Text style={styles.bedDurationText}>{duration}</Text>
                  </View>
                )}

                <View style={localStyles.bedAccessCorner}>
                  <AccessBadge experience={experience} price={getStoryPrice(story)} purchased={story.purchased} />
                </View>
              </View>

              {/* Details below the cover: title -> genre (plain text) -> author. */}
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

/* ---------- trending genre chips ---------- */

const TrendingGenreChips: React.FC<{ genres: ApiTrendingGenre[] }> = ({ genres }) => {
  const { t } = useTranslation();

  if (!genres.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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

const AuthorRow: React.FC<{
  title: string;
  authors: ApiAuthor[];
}> = ({ title, authors }) => {
  const { t } = useTranslation();

  if (!authors.length) return null;

  return (
    <View style={styles.tertiary}>
      <View style={styles.tertiaryHead}>
        <Text style={styles.tertiaryTitle}>{title}</Text>

        <TouchableOpacity onPress={() => router.push("/author")}>
          <Text style={styles.viewAll}>{t("home.viewAll")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

/* ---------- genre grid ---------- */

const SectionHeader: React.FC<{
  title: string;
  onViewAll: () => void;
}> = ({ title, onViewAll }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <TouchableOpacity onPress={onViewAll} accessibilityRole="button" accessibilityLabel={t("home.viewAllOf", { title })}>
        <Text style={styles.viewAll}>{t("home.viewAll")}</Text>
      </TouchableOpacity>
    </View>
  );
};

function GenreTile({ item }: { item: ApiGenre }) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.genreAvatar}
      onPress={() => goToGenreStories(item)}
      accessibilityRole="button"
      accessibilityLabel={t("home.openGenre", { name: item.name })}
    >
      <View style={styles.genreIconBox}>
        {item.icon ? (
          isSvgUrl(item.icon) ? (
            <SvgUri width={100} height={100} uri={item.icon} />
          ) : (
            <Image source={{ uri: item.icon }} style={{ width: 100, height: 100 }} resizeMode="contain" />
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
  const router = useRouter();

  if (!data.length) return null;

  return (
    <View style={[styles.section, { paddingHorizontal: 18 }]}>
      <SectionHeader title={title} onViewAll={() => router.push("/genre")} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
        {data.map((item) => (
          <GenreTile key={item.id} item={item} />
        ))}
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

const ConnectFooter: React.FC<{ links?: ConnectLinks }> = ({ links }) => {
  const { t } = useTranslation();

  if (!links) return null;

  const entries = (Object.keys(SOCIAL_ICON_MAP) as (keyof ConnectLinks)[]).filter((k) => !!links[k]);

  if (!entries.length) return null;

  return (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>{t("home.connectWithUs")}</Text>

        <View style={styles.socialRow}>
          {entries.map((key) => {
            const Icon = SOCIAL_ICON_MAP[key];
            const url = links[key] as string;

            return (
              <TouchableOpacity
                key={key}
                style={styles.social}
                accessibilityRole="button"
                accessibilityLabel={key}
                onPress={() => Linking.openURL(url)}
              >
                <Icon />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.footerCopy}>{t("home.copyright", { year: new Date().getFullYear() })}</Text>
    </View>
  );
};

/* ---------- section dispatcher ---------- */

function renderSection(section: Section, index: number, experience: HomeExperience): React.ReactNode {
  switch (section.type) {
    case "trending-genres":
      return <TrendingGenreChips key={`chips-${index}`} genres={section.data} />;

    case "featured-books":
    case "story-row": {
      const variant = section.type === "story-row" ? section.variant : undefined;

      const isBed = variant === "bed" || section.key_type === "5";

      if (isBed) {
        return (
          <PerfectBeforeBedSection
            key={`${section.type}-${index}`}
            title={section.title}
            stories={section.data}
            view_type={section.view_type}
            key_type={section.key_type}
            experience={experience}
          />
        );
      }

      // New releases -> swipeable coverflow carousel
      if (isNewReleaseSection({ key_type: section.key_type, variant })) {
        return (
          <NewReleaseCarousel
            key={`${section.type}-${index}`}
            title={section.title}
            stories={section.data}
            view_type={section.view_type}
            key_type={section.key_type}
            experience={experience}
          />
        );
      }

      return (
        <StoryRow
          key={`${section.type}-${index}`}
          title={section.title}
          stories={section.data}
          view_type={section.view_type}
          key_type={section.key_type}
          experience={experience}
        />
      );
    }

    case "author-row":
      return <AuthorRow key={`author-${index}`} title={section.title} authors={section.data} />;

    case "genre-grid":
      return <GenreGridSection key={`genres-${index}`} title={section.title} data={section.data} />;

    default:
      return null;
  }
}

/* ---------- home experience switch (non-subscribers only) ----------
 * Spotify-style filter chips: two separate pills, the selected one is filled
 * with the brand colour, with a small icon, press-scale animation and haptic.
 */

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
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.modeChip, active && styles.modeChipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        {icon(active ? "#241b2c" : COLORS.text2)}
        <Text style={[styles.modeChipText, active && styles.modeChipTextActive]} numberOfLines={1}>
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
        icon={(c) => <CrownIcon size={15} color={c} />}
      />
    </View>
  );
};

/* ---------- subscribe banner (unlimited experience, non-subscribers only) ---------- */

const SubscribeBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={goToSubscribe}
      accessibilityRole="button"
      accessibilityLabel={t("home.subscribeNow")}
      style={{ marginBottom: 14 }}
    >
      <LinearGradient
        colors={["rgba(183,155,209,0.30)", "rgba(46,99,91,0.30)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.subscribeBanner}
      >
        <View style={styles.subscribeBannerIconWrap}>
          <CrownIcon size={18} color={COLORS.lav} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.subscribeBannerTitle}>{t("home.unlimitedBannerTitle")}</Text>
          <Text style={styles.subscribeBannerSubtitle}>{t("home.unlimitedBannerSubtitle")}</Text>
        </View>

        <View style={styles.subscribeBtn}>
          <Text style={styles.subscribeBtnText}>{t("home.subscribeNow")}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/* ---------- main component ---------- */

const DeepAudiobooksHome: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the user picked on the switch (only matters for non-subscribers).
  const [experience, setExperience] = useState<HomeExperience>("buy");

  // true = active subscriber. false = new user OR expired plan.
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSubscribedRef = useRef(false);
  // Ignore responses from older requests (e.g. user taps Buy/Unlimited quickly).
  const requestIdRef = useRef(0);

  // Subscribers always get the unlimited experience; the Buy option is gone.
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

          // Ellaa stories oda like status ah global store la seed panrom
          seedWishlistFromSections(list as any[]);

          // Backend sends is_subscribed = false for new users & expired plans.
          const sub = !!(data.is_subscribed ?? data.subscription?.is_active ?? false);
          isSubscribedRef.current = sub;
          setIsSubscribed(sub);
        } else if (!silent) {
          setError(data.msg || t("home.failedToLoad"));
        }
      } catch (err: any) {
        console.log("Error code:", err.code);
        console.log("Error message:", err.message);
        console.log("Error response:", err.response);

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
    // Re-fetch when the chosen experience (Buy / Unlimited) changes.
  }, [fetchDiscoverData]);

  // Quietly refresh when the screen regains focus (e.g. after subscribing or
  // buying a book elsewhere), so Buy/Unlimited reflects the latest plan.
  // A ref keeps this from also firing whenever the Buy/Unlimited tab changes.
  const fetchRef = useRef(fetchDiscoverData);
  fetchRef.current = fetchDiscoverData;
  const hasFocusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
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

  const bodySections = sections.filter(
    (s) => s.type !== "greeting" && s.type !== "hero" && s.type !== "resume" && s.type !== "connect-with-us"
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
        contentContainerStyle={styles.wrapContent}
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
            <View style={styles.wordmark}>
              <Text style={styles.deep}>deep</Text>
              <Text style={styles.aud}>audiobooks</Text>
            </View>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={localStyles.langBtn}
                activeOpacity={0.7}
                onPress={goToLanguageSettings}
                accessibilityRole="button"
                accessibilityLabel={t("home.changeLanguage")}
              >
                <LanguageIcon size={16} />
              </TouchableOpacity>

              <View style={styles.bell}>
                <BellIcon />
              </View>

              <ProfileDot dotStyle={styles.profileDot} textStyle={styles.profileDotText} />
            </View>
          </View>

          {/* ---------- Buy vs Unlimited switch: new users & expired plans only ---------- */}

          {!isSubscribed && <HomeExperienceSwitch value={experience} onChange={setExperience} />}

          {/* ---------- hero ---------- */}

          <View style={styles.hero}>
            {!!greetingSection?.title && <Text style={styles.greet}>{greetingSection.title}</Text>}

            {!!greetingSection?.subtitle && <Text style={styles.greetSub}>{greetingSection.subtitle}</Text>}

            {activeExperience === "unlimited" && !isSubscribed && <SubscribeBanner />}

            {heroSection?.data && (
              <TouchableOpacity
                style={styles.primaryCard}
                activeOpacity={0.9}
                onPress={() => goToStoryEpisode(heroSection.data.id)}
                accessibilityRole="button"
                accessibilityLabel={t("home.openStory", { title: heroSection.data.title })}
              >
                <View style={styles.primaryCover}>
                  {heroSection.data.cover ? (
                    <Image source={{ uri: heroSection.data.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={["#3a2f22", "#1a1410"]} style={StyleSheet.absoluteFillObject} />
                  )}

                  <View style={styles.ribbon}>
                    <BookIcon />
                    <Text style={styles.ribbonText}>{t("home.audioBook")}</Text>
                  </View>

                  <View style={localStyles.heartCornerHero}>
                    <WishlistHeart storyId={heroSection.data.id} initialLiked={storyWishlisted(heroSection.data)} size={22} />
                  </View>

                  {/* Buy price + cart: only in Buy mode, never for subscribers */}
                  {activeExperience === "buy" && !heroSection.data.purchased && !!getStoryPrice(heroSection.data) && (
                    <View style={styles.heroCoverPriceCart}>
                      <Text style={styles.heroCoverPriceText}>{formatPrice(getStoryPrice(heroSection.data))}</Text>

                      <TouchableOpacity
                        style={styles.heroCoverCartBtn}
                        activeOpacity={0.85}
                        onPress={(e) => {
                          e.stopPropagation();
                          axios
                            .post("/", {
                              method: "addToCart",
                              story_id: heroSection.data.id,
                            })
                            .then(goToCart)
                            .catch(() => {});
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t("home.addToCart", { title: heroSection.data.title })}
                      >
                        <CartAddIcon size={12} color="#241b2c" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeExperience === "unlimited" && (
                    <View style={styles.heroCoverPriceCart}>
                      <AccessBadge experience="unlimited" />
                    </View>
                  )}
                </View>

                {/* Details on the right: label + title (up to 2 lines) + genre + author. */}
                <View style={styles.primaryInfo}>
                  <Text style={styles.primaryLabel}>
                    {heroSection.mode === "resume" ? t("home.continueListening") : t("home.explore")}
                  </Text>

                  <Text style={styles.primaryTitle} numberOfLines={2}>
                    {heroSection.data.title}
                  </Text>

                  <GenreText genre={heroSection.data.genre} genreStyle={styles.primaryGenreText} />

                  <AuthorText author={heroSection.data.author} authorStyle={styles.primaryNarrator} />

                  <View style={styles.heroActionRow}>
                    <TouchableOpacity
                      style={styles.resumeBtn}
                      activeOpacity={0.85}
                      onPress={() => goToStoryEpisode(heroSection.data.id)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        heroSection.mode === "resume"
                          ? t("home.openStory", { title: `${t("home.resume")} ${heroSection.data.title}` })
                          : t("home.openStory", { title: heroSection.data.title })
                      }
                    >
                      <PlayIcon />

                      <Text style={styles.resumeBtnText} numberOfLines={1}>
                        {heroSection.mode === "resume" ? t("home.resume") : t("home.listenNow")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* ---------- body sections ---------- */}

          {bodySections.map((section, i) => renderSection(section, i, activeExperience))}

          {/* ---------- footer ---------- */}

          <ConnectFooter links={connectSection?.data} />
        </View>
      </ScrollView>
    </View>
  );
};

/* ---------- local styles ---------- */

const localStyles = StyleSheet.create({
  heartCorner: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  heartCornerHero: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  langBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    right: 7,
    bottom: 7,
  },
  bedAccessCorner: {
    position: "absolute",
    right: 8,
    bottom: 8,
  },
  cardMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },

  /* ---------- new releases carousel ---------- */
  nrPanel: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(20,16,35,0.85)",
    borderWidth: 1,
    borderColor: "rgba(183,155,209,0.28)",
  },
  nrHeader: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 70,
  },
  nrTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nrTitle: {
    color: COLORS.text1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  nrSubtitle: {
    color: COLORS.text2,
    fontSize: 11,
    textAlign: "center",
  },
  nrViewAll: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nrViewAllText: {
    color: COLORS.lav,
    fontSize: 11,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.lav,
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
  newRibbon: {
    position: "absolute",
    left: -38,
    bottom: 26,
    width: 140,
    paddingVertical: 4,
    backgroundColor: "#7b4ddb",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-38deg" }],
  },
  newRibbonText: {
    color: "#170808",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  carouselInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 4,
    gap: 4,
  },
  carouselTitle: {
    color: COLORS.text1,
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 12,
    flexShrink: 1,
  },

  // Shared price/unlimited pill used by AccessBadge.
  accessPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  accessPillUnlimited: {
    backgroundColor: "rgba(20,16,35,0.72)",
    borderColor: "rgba(183,155,209,0.4)",
  },
  accessPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  accessPillTextPrice: {
    color: "#241b2c",
  },
  accessPillTextUnlimited: {
    color: COLORS.lav,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  priceRowCompact: {
    alignSelf: "flex-end",
  },
  priceText: {
    backgroundColor: "#ffffff",
    color: "#241b2c",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  cartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lav,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnDone: {
    backgroundColor: "#8fd19e",
  },
  ownedPill: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownedPillText: {
    color: "#8fd19e",
    fontSize: 10,
    fontWeight: "600",
  },
});

export default DeepAudiobooksHome;