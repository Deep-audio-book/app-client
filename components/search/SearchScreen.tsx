import axios from '@/axios.config';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { TFunction } from "i18next";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import styles, { COLORS } from "./style";
import { useFocusRefetch } from "../../hooks/useFocusRefetch";
import ProfileDot from "@/components/ui/ProfileDot";
/* ---------- API types (matches the real getSearchPageData response) ---------- */

interface ApiCategory {
  id: number;
  name: string;
  cover: string; // image url
}

interface ApiNarrator {
  id: number;
  name: string;
  cover: string | null; // image url
  sampleAudio: string | null;
  storyCount: number;
}

interface ApiAuthor {
  id: number;
  name: string;
  description: string;
  avatar: string | null; // image url
  storyCount: number;
}

interface ApiGenre {
  id: number;
  name: string;
  icon: string; // image url
  background: string | null; // currently always null from backend
}

type SectionType = "category-grid" | "narrator-row" | "author-row" | "genre-grid";

interface ApiSection<T> {
  type: SectionType;
  title: string;
  data: T[];
}

type AnySection =
  | ApiSection<ApiCategory>
  | ApiSection<ApiNarrator>
  | ApiSection<ApiAuthor>
  | ApiSection<ApiGenre>;

interface SearchScreenData {
  categories: ApiCategory[];
  categoriesTitle: string;
  narrators: ApiNarrator[];
  narratorsTitle: string;
  authors: ApiAuthor[];
  authorsTitle: string;
  genres: ApiGenre[];
  genresTitle: string;
}

/*
 * Was a static object with hardcoded English strings ("Categories",
 * "Narrators", "Authors", "Browse All"). Turned into a function so it
 * can pull the current-language fallback titles from i18n via `t`,
 * instead of always rendering in English regardless of the app's
 * selected language. Only used when the backend hasn't sent a title
 * for a section yet (see parseSections below, which always prefers
 * section.title from the API when present).
 */
function getEmptyScreenData(t: TFunction): SearchScreenData {
  return {
    categories: [],
    categoriesTitle: t("search.categoriesTitle"),
    narrators: [],
    narratorsTitle: t("search.narratorsTitle"),
    authors: [],
    authorsTitle: t("search.authorsTitle"),
    genres: [],
    genresTitle: t("search.genresTitle"),
  };
}

/* Turn the backend's array-of-sections payload into the flat shape the UI wants. */
function parseSections(
  sections: AnySection[] | undefined | null,
  t: TFunction
): SearchScreenData {
  const result: SearchScreenData = getEmptyScreenData(t);

  (sections ?? []).forEach((section) => {
    switch (section.type) {
      case "category-grid":
        result.categories = section.data as ApiCategory[];
        result.categoriesTitle = section.title;
        break;
      case "narrator-row":
        result.narrators = section.data as ApiNarrator[];
        result.narratorsTitle = section.title;
        break;
      case "author-row":
        result.authors = section.data as ApiAuthor[];
        result.authorsTitle = section.title;
        break;
      case "genre-grid":
        result.genres = section.data as ApiGenre[];
        result.genresTitle = section.title;
        break;
      default:
        break;
    }
  });

  return result;
}

/* Fallback tile colors for cards that have no cover/icon image (or while it loads). */
const FALLBACK_TILE_COLORS = [
  "#5b3a8c", "#2c3e50", "#a13d5f", "#1f6f78", "#7a2d2d",
  "#3a1a10", "#4a5d23", "#8c6b3a", "#3a3a5c", "#c9532f",
];
function colorForId(id: number) {
  return FALLBACK_TILE_COLORS[id % FALLBACK_TILE_COLORS.length];
}

interface IconProps {
  size?: number;
  color?: string;
}

/* ---------- icons ---------- */

const SearchIcon = ({ size = 18, color = "#8a8a8a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={11} cy={11} r={7} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

const UserIcon = ({ size = 24, color = "#8a8a8a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </Svg>
);

/* ---------- navigation helpers ---------- */

// NOTE: adjust this pathname to match whatever route actually owns the
// live "type and results appear" search experience in your app.
const SEARCH_RESULTS_ROUTE = "/search-results";

function goToSearchResults() {
  router.push({
    pathname: "/",
  });
}

function goToGenreStories(genre: ApiGenre) {
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

function goToCategoryStories(category: ApiCategory) {
  router.push({
    pathname: "/storyView",
    params: {
      title: category.name,
      view_type: "grid",
      key_type: String(category.id),
      api_method: "getStoryListViewAll",
      // category_id: String(category.id),
    },
  });
}

function goToNarratorDetails(narrator: ApiNarrator) {
 
  router.push({
        pathname: '/author-details',
        params: {
          method: 'getNarratorDetails',
          id_key: 'narrator_id',
          id: narrator.id.toString(),
          title: 'Narrator',
        },
      });
}

function goToAuthorDetails(author: ApiAuthor) {
  router.push({
    pathname: "/author-details",
    params: { id: author.id.toString(),
      method: 'getAuthorDetails',
      id_key: 'author_id',
      title: 'Author',
     },
  });
}

/* ---------- big spotlight category card (Live Events / Home of I-Pop style) ---------- */

const CategoryCard: React.FC<{ category: ApiCategory }> = ({ category }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: colorForId(category.id) }]}
      activeOpacity={0.85}
      onPress={() => goToCategoryStories(category)}
      accessibilityRole="button"
      accessibilityLabel={t("search.browse", { name: category.name })}
    >
      {!!category.cover && (
        <Image source={{ uri: category.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}

      {/* scrim so the title stays legible over any cover photo */}
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <Text style={styles.categoryCardText} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------- small genre grid tile (Browse all genres) ---------- */

const GenreTile: React.FC<{ genre: ApiGenre }> = ({ genre }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.genreTile, { backgroundColor: genre.background ?? colorForId(genre.id) }]}
      activeOpacity={0.85}
      onPress={() => goToGenreStories(genre)}
      accessibilityRole="button"
      accessibilityLabel={t("search.browse", { name: genre.name })}
    >
      <View style={styles.genreTileIconWrap}>
        {!!genre.icon && (
          <Image
            source={{ uri: genre.icon }}
            style={styles.genreTileIcon}
            resizeMode="contain"
          />
        )}
      </View>

      <Text style={styles.genreTileText} numberOfLines={1}>
        {genre.name}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------- narrator avatar ---------- */

const NarratorAvatar: React.FC<{ narrator: ApiNarrator }> = ({ narrator }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.narratorItem}
      activeOpacity={0.85}
      onPress={() => goToNarratorDetails(narrator)}
      accessibilityRole="button"
      accessibilityLabel={t("search.open", { name: narrator.name })}
    >
      <View style={styles.narratorAvatarWrap}>
        {narrator.cover ? (
          <Image
            source={{ uri: narrator.cover }}
            style={styles.narratorAvatarImg}
            resizeMode="cover"
          />
        ) : (
          <UserIcon size={24} />
        )}
      </View>

      <Text style={styles.narratorName} numberOfLines={1}>
        {narrator.name}
      </Text>

      {narrator.storyCount > 0 && (
        <Text style={styles.narratorCount} numberOfLines={1}>
          {t("search.storyCount", { count: narrator.storyCount })}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/* ---------- author card ---------- */

const AuthorCard: React.FC<{ author: ApiAuthor }> = ({ author }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.authorCard}
      activeOpacity={0.85}
      onPress={() => goToAuthorDetails(author)}
      accessibilityRole="button"
      accessibilityLabel={t("search.open", { name: author.name })}
    >
      {author.avatar ? (
        <Image source={{ uri: author.avatar }} style={styles.authorCardImg} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#3a1a10", "#c9532f"]} style={styles.authorCardImg} />
      )}

      <Text style={styles.authorCardName} numberOfLines={1}>
        {author.name}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------- section header ---------- */

const SectionHeader: React.FC<{ title: string; onViewAll?: () => void }> = ({
  title,
  onViewAll,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {onViewAll && (
        <TouchableOpacity
          onPress={onViewAll}
          accessibilityRole="button"
          accessibilityLabel={t("search.viewAllOf", { title })}
        >
          <Text style={styles.viewAll}>{t("search.seeAll")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ---------- main component ---------- */

const SearchScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SearchScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetches every time this screen comes into focus (not just on first
  // mount), so switching language and coming back always shows fresh data.
  // `loading` comes from the hook — no separate useState/useEffect needed.
  const { loading, refetch: fetchSearchScreenData } = useFocusRefetch(async () => {
    try {
      setError(null);

      const { data: res } = await axios.post("/", {
        method: "getSearchPageData",
      });

      if (res.statusCode === 200) {
        setData(parseSections(res.data as AnySection[], t));
      } else {
        setError(res.msg || t("search.failedToLoad"));
      }
    } catch (err: any) {
      console.log("Error code:", err.code);
      console.log("Error message:", err.message);
      console.log("Error response:", err.response);

      // No more mock fallback — surface a real error so Retry actually means something.
      setData(null);
      setError(
        err.code === "ECONNABORTED" || err.message === "Network Error"
          ? t("search.noInternet")
          : t("search.somethingWentWrong")
      );
    }
  });

  if (loading && !data) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <ActivityIndicator size="large" color={COLORS.lav} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={fetchSearchScreenData}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t("search.retryLoading")}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.retryBtnText}>{t("search.retry")}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const categories = data?.categories ?? [];
  const narrators = data?.narrators ?? [];
  const authors = data?.authors ?? [];
  const genres = data?.genres ?? [];

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
        contentContainerStyle={[styles.wrapContent, { paddingBottom: insets.bottom + 12 }]}
      >
        {/* ---------- top bar ---------- */}

        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>{t("search.title")}</Text>
        <ProfileDot dotStyle={styles.profileDot} textStyle={styles.profileDotText} />
          
        </View>

        {/* ---------- search bar (tap -> navigate to live search results screen) ---------- */}

        <TouchableOpacity
          style={styles.searchBarWrap}
          activeOpacity={0.8}
          onPress={goToSearchResults}
          accessibilityRole="button"
          accessibilityLabel={t("search.openSearch")}
        >
          <SearchIcon size={18} />
          <Text style={styles.searchInputPlaceholder}>{t("search.placeholder")}</Text>
        </TouchableOpacity>

        {/* ---------- categories (category-grid section) ---------- */}

        {!!categories.length && (
          <View style={styles.section}>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          </View>
        )}

        {/* ---------- narrators (narrator-row section) ---------- */}

        {!!narrators.length && (
          <View style={styles.section}>
            <SectionHeader
              title={data?.narratorsTitle ?? ""}
              onViewAll={() => router.push("/narrator")}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.narratorRow}>
              {narrators.map((narrator) => (
                <NarratorAvatar key={narrator.id} narrator={narrator} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---------- authors (author-row section) ---------- */}

        {!!authors.length && (
          <View style={styles.section}>
            <SectionHeader
              title={data?.authorsTitle ?? ""}
              onViewAll={() => router.push("/author")}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.authorRow}>
              {authors.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---------- genres (genre-grid section) ---------- */}

        {!!genres.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleStandalone}>
              {data?.genresTitle ?? ""}
            </Text>

            <View style={styles.genreGrid}>
              {genres.map((genre) => (
                <GenreTile key={genre.id} genre={genre} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SearchScreen;

