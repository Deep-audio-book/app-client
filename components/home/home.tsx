import axios from '@/axios.config';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect, SvgUri } from "react-native-svg";
import styles, { BED_COVERS, COLORS, COVERS } from "./style";

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
  | { type: "featured-books"; title: string; data: ApiStory[]; view_type: string ; key_type: string}
  | {
      type: "story-row";
      title: string;
      data: ApiStory[];
      view_type: string;
      key_type: string;
      variant?: "default" | "bed";
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
      fill={color === "#fff" ? "none" : "none"}
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

const StarIcon = ({ size = 11, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
  </Svg>
);

const HeartIcon = ({
  size = 14,
  color = "#fff",
  filled = false,
}: IconProps & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 2}>
    <Path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.4 4.5 6 4.5c2 0 3.4 1 6 3.4 2.6-2.4 4-3.4 6-3.4 3.6 0 5.5 3.3 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
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
    params: { author_id: author.id.toString() },
  });
}

function goToCart() {
  // router.push({ pathname: "/cart" });
}

function goToLanguageSettings() {
  router.push({ pathname: "/language" });
}

/* ---------- rating badge ---------- */

const RatingBadge: React.FC<{ rating?: number; size?: number }> = ({ rating, size = 11 }) => {
  if (!rating) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <StarIcon size={size} />
      <Text style={styles.cardFootText}>{rating.toFixed(1)}</Text>
    </View>
  );
};

/* ---------- wishlist heart ---------- */

const WishlistHeart: React.FC<{
  storyId: number;
  initialLiked: boolean;
  size?: number;
}> = ({ storyId, initialLiked, size = 14 }) => {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    async (e: any) => {
      e?.stopPropagation?.();
      if (busy) return;

      const next = !liked;
      setLiked(next);
      setBusy(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        await axios.post("/", {
          method: "toggleLike",
          story_id: storyId,
          like: next,
        });
      } catch (err) {
        setLiked(!next);
      } finally {
        setBusy(false);
      }
    },
    [busy, liked, storyId]
  );

  return (
    <TouchableOpacity
      style={localStyles.heartBtn}
      activeOpacity={0.75}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={liked ? t("home.removeFromFavorites") : t("home.addToFavorites")}
    >
      <HeartIcon size={size} filled={liked} color={liked ? "#e85c7a" : "#fff"} />
    </TouchableOpacity>
  );
};

/* ---------- price + add-to-cart ---------- */

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

/* ---------- author / narrator ("Voice: ...") block ---------- */

const AuthorVoiceBlock: React.FC<{
  author: string;
  narrator?: string | null;
  authorStyle: any;
  voiceStyle: any;
}> = ({ author, narrator, authorStyle, voiceStyle }) => {
  const { t } = useTranslation();

  return (
    <>
      <Text style={authorStyle} numberOfLines={1}>
        {author}
      </Text>

      {!!narrator && (
        <Text style={voiceStyle} numberOfLines={1}>
          <Text style={{ color: COLORS.lavDim }}>{t("home.voice")}</Text>
          {narrator}
        </Text>
      )}
    </>
  );
};

/* ---------- story row ---------- */

const WaveRule = () => (
  <View
    style={{
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.12)",
      marginVertical: 4,
      width: "100%",
    }}
  />
);

const StoryCard: React.FC<{
  story: ApiStory;
  fallbackBg: [string, string];
}> = ({ story, fallbackBg }) => {
  const { t } = useTranslation();
  const duration = formatDuration(story.story_duration);

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
          <WishlistHeart storyId={story.id} initialLiked={story.like} size={18} />
        </View>

        <View style={localStyles.priceCartCorner}>
          {/* <PriceCartBadge story={story} /> */}
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {story.title}
      </Text>

      <AuthorVoiceBlock
        author={story.author}
        narrator={story.narrator}
        authorStyle={styles.cardNarrator}
        voiceStyle={[styles.cardNarrator, { opacity: 0.75 }]}
      />

      <View style={[styles.cardFoot, { justifyContent: "space-between" }]}>
        <RatingBadge rating={story.rating} size={10} />

        {duration ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ClockIcon size={10} />
            <Text style={styles.cardFootText}> {duration}</Text>
          </View>
        ) : (
          <Text style={styles.cardFootText}>{t("home.listens", { count: story.listens })}</Text>
        )}
      </View>

      {!!story.genre && <Text style={styles.cardGenre}>{story.genre}</Text>}
    </TouchableOpacity>
  );
};

const StoryRow: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
  key_type: string;
}> = ({ title, stories, view_type, key_type }) => {
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
          <StoryCard key={`${story.id}-${i}`} story={story} fallbackBg={COVERS[i % COVERS.length]} />
        ))}
      </ScrollView>
    </View>
  );
};

/* ---------- Perfect Before Bed ---------- */

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
                  <WishlistHeart storyId={story.id} initialLiked={story.like} size={18} />
                </View>

                <Text style={[styles.bedCoverTitle, { color: "#fff" }]} numberOfLines={2}>
                  {story.title}
                </Text>

                {!!duration && (
                  <View style={styles.bedDurationBadge}>
                    <Text style={styles.bedDurationText}>{duration}</Text>
                  </View>
                )}

                {!!story.rating && (
                  <View style={localStyles.bedRatingBadge}>
                    <StarIcon size={10} />
                    <Text style={localStyles.bedRatingBadgeText}>{story.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.bedCardTitle} numberOfLines={1}>
                {story.title}
              </Text>

              <AuthorVoiceBlock
                author={story.author}
                narrator={story.narrator}
                authorStyle={styles.bedCardNarrator}
                voiceStyle={[styles.bedCardNarrator, { opacity: 0.75 }]}
              />

              <View style={{ flexDirection: "row", justifyContent: "flex-start", marginTop: 4 }}>
                {/* <PriceCartBadge story={story} /> */}
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

function renderSection(section: Section, index: number): React.ReactNode {
  switch (section.type) {
    case "trending-genres":
      return <TrendingGenreChips key={`chips-${index}`} genres={section.data} />;

    case "featured-books":
    case "story-row": {
      const variant = section.type === "story-row" ? section.variant : undefined;

      const isBed = variant === "bed" || section.title?.trim().toLowerCase() === "perfect before bed";

      if (isBed) {
        return (
          <PerfectBeforeBedSection
            key={`${section.type}-${index}`}
            title={section.title}
            stories={section.data}
            view_type={section.view_type}
            key_type={section.key_type}
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

/* ---------- main component ---------- */

const DeepAudiobooksHome: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscoverData = useCallback(
    async (isPullRefresh = false) => {
      try {
        if (isPullRefresh) {
          setRefreshing(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          setLoading(true);
        }

        setError(null);

        const { data } = await axios.post("/", {
          method: "getHomepageData",
        });

        if (data.statusCode === 200) {
          setSections(data.data ?? []);
        } else {
          setError(data.msg || t("home.failedToLoad"));
        }
      } catch (err: any) {
        console.log("Error code:", err.code);
        console.log("Error message:", err.message);
        console.log("Error response:", err.response);

        setError(t("home.somethingWentWrong"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  const onPullRefresh = useCallback(() => {
    fetchDiscoverData(true);
  }, [fetchDiscoverData]);

  useEffect(() => {
    fetchDiscoverData();
  }, [fetchDiscoverData]);

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

              <TouchableOpacity
                style={styles.profileDot}
                activeOpacity={0.7}
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel={t("home.openProfile")}
              >
                <LinearGradient colors={["#e85c3f", "#d9a441"]} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.profileDotText}>{getInitialFromGreeting(greetingSection?.title)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------- hero ---------- */}

          <View style={styles.hero}>
            {!!greetingSection?.title && <Text style={styles.greet}>{greetingSection.title}</Text>}

            {!!greetingSection?.subtitle && <Text style={styles.greetSub}>{greetingSection.subtitle}</Text>}

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
                    <WishlistHeart storyId={heroSection.data.id} initialLiked={heroSection.data.like} size={22} />
                  </View>

                  {!heroSection.data.purchased && !!getStoryPrice(heroSection.data) && (
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
                </View>

                <View style={styles.primaryInfo}>
                  <Text style={styles.primaryLabel}>
                    {heroSection.mode === "resume" ? t("home.continueListening") : t("home.explore")}
                  </Text>

                  <Text style={styles.primaryTitle} numberOfLines={2}>
                    {heroSection.data.title}
                  </Text>

                  <AuthorVoiceBlock
                    author={heroSection.data.author}
                    narrator={heroSection.data.narrator}
                    authorStyle={styles.primaryNarrator}
                    voiceStyle={[styles.primaryNarrator, { opacity: 0.75 }]}
                  />

                  <View style={styles.heroMetaRow}>
                    <RatingBadge rating={heroSection.data.rating} size={12} />

                    {!!heroSection.data.genre && (
                      <View style={styles.heroGenrePill}>
                        <Text style={styles.heroGenrePillText}>{heroSection.data.genre}</Text>
                      </View>
                    )}
                  </View>

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

          {bodySections.map((section, i) => renderSection(section, i))}

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
  heartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  bedRatingBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20,16,35,0.55)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bedRatingBadgeText: {
    color: "#fff",
    fontSize: 10.5,
    fontWeight: "600",
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
  priceCartCorner: {
    position: "absolute",
    left: 7,
    bottom: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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