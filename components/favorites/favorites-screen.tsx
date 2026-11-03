import axios from "@/axios.config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchListenLaterStories } from "@/api/Favourites";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";
import { useFavouritesStore } from "@/redux/slices/favouritesStore";
import ProfileDot from "../ui/ProfileDot";
import SectionTransition from "../ui/SectionTransition";
import { useAppSelector } from "../../utils/typedReduxHooks";
import styles from "./style";

/* ---------- API types ---------- */

interface ApiHero {
  title: string;
  count: number;
}

interface ApiCategory {
  key: string;
  title: string;
  count: number;
}

interface FavoritesSummary {
  hero: ApiHero;
  categories: ApiCategory[];
}

/* ---------- how every saved type looks ----------
 *
 * Page structure (what the PDF asked for - "organise favourite stories,
 * bookmarked chapters, Listen Later items and other saved lists"):
 *
 *   YOUR FAVOURITES  (things you tapped the heart on)
 *     stories | narrators | authors | genres
 *   SAVED FOR LATER
 *     Listen Later   (whole books you plan to hear)
 *     Bookmarks      (chapters you marked while listening)
 */

type Meta = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string; // accent colour of the tile
  /** i18n key for the name shown on the tile */
  labelKey: string;
  labelDefault: string;
  /** i18n key for the one-line explanation under the name */
  hintKey: string;
  hintDefault: string;
};

const FAVOURITE_META: Record<string, Meta> = {
  stories: {
    icon: "heart",
    tint: "#e85c7a",
    labelKey: "favorites.cat.stories",
    labelDefault: "Favourite Stories",
    hintKey: "favorites.cat.storiesHint",
    hintDefault: "Stories you've hearted",
  },
  narrators: {
    icon: "mic",
    tint: "#4ade80",
    labelKey: "favorites.cat.narrators",
    labelDefault: "Narrators",
    hintKey: "favorites.cat.narratorsHint",
    hintDefault: "Voices you love",
  },
  authors: {
    icon: "create",
    tint: "#ed93b1",
    labelKey: "favorites.cat.authors",
    labelDefault: "Authors",
    hintKey: "favorites.cat.authorsHint",
    hintDefault: "Writers you follow",
  },
  genres: {
    icon: "grid",
    tint: "#85b7eb",
    labelKey: "favorites.cat.genres",
    labelDefault: "Genres",
    hintKey: "favorites.cat.genresHint",
    hintDefault: "Your kind of stories",
  },
};

const SAVED_META: Record<string, Meta> = {
  listenLater: {
    icon: "time",
    tint: "#F5B93C",
    labelKey: "favorites.cat.listenLater",
    labelDefault: "Listen Later",
    hintKey: "favorites.cat.listenLaterHint",
    hintDefault: "Books you plan to listen to",
  },
  bookmarks: {
    icon: "bookmark",
    tint: "#c9a16a",
    labelKey: "favorites.cat.bookmarks",
    labelDefault: "Bookmarked Chapters",
    hintKey: "favorites.cat.bookmarksHint",
    hintDefault: "Moments you marked while listening",
  },
};

/* ---------- small pieces ---------- */

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <View style={local.sectionHeader}>
    <Text style={local.sectionTitle}>{title}</Text>
    {!!subtitle && <Text style={local.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

/** Square tile used for the "Your favourites" grid. */
const FavouriteTile: React.FC<{
  meta: Meta;
  count: number;
  onPress: () => void;
}> = ({ meta, count, onPress }) => {
  const { t } = useTranslation();
  const label = t(meta.labelKey, { defaultValue: meta.labelDefault });
  const hint = t(meta.hintKey, { defaultValue: meta.hintDefault });

  return (
    <TouchableOpacity
      style={local.tile}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
    >
      <LinearGradient
        colors={[`${meta.tint}55`, "#1c1c1c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[local.tileIcon, { backgroundColor: `${meta.tint}33` }]}>
        <Ionicons name={meta.icon} size={20} color={meta.tint} />
      </View>

      <View style={{ flex: 1 }} />

      <Text style={local.tileCount}>{count}</Text>
      <Text style={local.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={local.tileHint} numberOfLines={2}>
        {hint}
      </Text>
    </TouchableOpacity>
  );
};

/** Wide row used for the "Saved for later" section. */
const SavedRow: React.FC<{
  meta: Meta;
  count: number;
  onPress: () => void;
}> = ({ meta, count, onPress }) => {
  const { t } = useTranslation();
  const label = t(meta.labelKey, { defaultValue: meta.labelDefault });
  const hint = t(meta.hintKey, { defaultValue: meta.hintDefault });

  return (
    <TouchableOpacity
      style={local.savedRow}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
    >
      <View style={[local.savedIcon, { backgroundColor: `${meta.tint}26` }]}>
        <Ionicons name={meta.icon} size={20} color={meta.tint} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={local.savedLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={local.savedHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>

      <View style={[local.countPill, { borderColor: `${meta.tint}66` }]}>
        <Text style={[local.countPillText, { color: meta.tint }]}>{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.35)" />
    </TouchableOpacity>
  );
};

/* ---------- main component ---------- */

const FavoritesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const setManyFavourite = useFavouritesStore((s) => s.setMany);

  const [summary, setSummary] = useState<FavoritesSummary | null>(null);
  const [listenLaterCount, setListenLaterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /* Refetch every time this screen comes into focus. */
  const { loading, refetch } = useFocusRefetch(async () => {
    try {
      setError(null);

      // Summary + Listen Later load together. Listen Later may fail on its
      // own (e.g. older backend) without breaking the whole page.
      const [summaryRes, listenLater] = await Promise.allSettled([
        axios.post("/", { method: "getFavouritesSummary" }),
        fetchListenLaterStories(),
      ]);

      if (listenLater.status === "fulfilled") {
        setListenLaterCount(listenLater.value.length);
        // keep the Listen Later buttons everywhere in sync with this list
        setManyFavourite(
          "listenLater",
          listenLater.value.map((s: any) => s.id).filter((id: any) => id != null),
          true
        );
      }

      if (summaryRes.status === "rejected") throw summaryRes.reason;

      const { data } = summaryRes.value;
      if (data?.statusCode === 200) {
        setSummary(data.data);
      } else {
        setError(
          data?.msg ||
            t("favorites.failedToLoad", {
              defaultValue: "Failed to load favorites",
            })
        );
      }
    } catch (err: any) {
      console.log(
        "getFavouritesSummary error:",
        err?.response?.data || err?.message || err
      );
      setError(
        t("favorites.somethingWentWrong", {
          defaultValue: "Something went wrong. Please try again.",
        })
      );
    }
  });

  const userId = user?.userId?.toString();

  /* ---------- navigation ---------- */

  const openFavouriteStories = (viewType: "grid" | "list") =>
    router.push({
      pathname: "/storyView",
      params: {
        view_type: viewType,
        key_type: "favorite",
        api_method: "getFavouriteStories",
        user_id: userId,
        title: t("favorites.cat.stories", { defaultValue: "Favourite Stories" }),
      },
    });

  const openCategory = (key: string) => {
    switch (key) {
      case "stories":
        openFavouriteStories("grid");
        break;
      case "narrators":
        router.push({
          pathname: "/narrator",
          params: {
            method: "getFavouriteNarrators",
            dataKey: "favorites-narrators",
            detailMethod: "getFavouriteNarratorDetails",
            idKey: "narrator_id",
            title: t("favorites.cat.narrators", { defaultValue: "Narrators" }),
          },
        });
        break;
      case "authors":
        router.push({
          pathname: "/author",
          params: {
            method: "getFavouriteAuthors",
            dataKey: "favorites-authors",
            detailMethod: "getFavouriteAuthorDetails",
            idKey: "author_id",
            title: t("favorites.cat.authors", { defaultValue: "Authors" }),
          },
        });
        break;
      case "genres":
        router.push({
          pathname: "/genre",
          params: {
            method: "getFavouriteGenres",
            dataKey: "favorites-genres",
            detailMethod: "getFavouriteGenreDetails",
            idKey: "genre_id",
            title: t("favorites.cat.genres", { defaultValue: "Genres" }),
          },
        });
        break;
      case "listenLater":
        router.push({
          pathname: "/storyView",
          params: {
            view_type: "grid",
            key_type: "listen_later",
            api_method: "getListenLaterStories",
            user_id: userId,
            title: t("favorites.cat.listenLater", { defaultValue: "Listen Later" }),
          },
        });
        break;
      case "bookmarks":
        // chapters (not stories), so they have their own screen
        router.push("/bookmarks" as any);
        break;
    }
  };

  /* ---------- loading / error ---------- */

  if (loading && !summary) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={[styles.wrap, styles.centerFill]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={refetch}
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>
            {t("common.retry", { defaultValue: "Retry" })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- data ---------- */

  const categories = summary?.categories ?? [];
  const countOf = (key: string) =>
    categories.find((c) => c.key === key)?.count ?? 0;

  const favouriteCategories = categories.filter((c) => FAVOURITE_META[c.key]);
  const hasBookmarks = categories.some((c) => c.key === "bookmarks");

  const totalSaved =
    favouriteCategories.reduce((sum, c) => sum + (c.count || 0), 0) +
    listenLaterCount +
    countOf("bookmarks");

  const hero = summary?.hero;
  const storyCount = hero?.count ?? countOf("stories");

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
        contentContainerStyle={[
          styles.wrapContent,
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        {/* ---------- top bar ---------- */}
        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>{t("favorites.title")}</Text>
          <ProfileDot
            dotStyle={styles.profileDot}
            textStyle={styles.profileDotText}
          />
        </View>

        {/* ---------- hero: play everything you have hearted ---------- */}
        {!!hero && storyCount > 0 && (
          <SectionTransition sectionKey="hero" index={0} style={styles.section}>
            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.9}
              onPress={() => openFavouriteStories("list")}
              accessibilityRole="button"
              accessibilityLabel={`Play ${hero.title}`}
            >
              <LinearGradient
                colors={["#f2c14e", "#e85c3f"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* soft decorative circles */}
              <View style={local.heroCircleBig} />
              <View style={local.heroCircleSmall} />

              <Ionicons
                name="heart"
                size={22}
                color="rgba(74,27,12,0.75)"
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.heroTitle} numberOfLines={2}>
                {hero.title}
              </Text>
              <Text style={styles.heroSubtitle}>
                {hero.count} {t("favorites.titles")}
              </Text>

              <View style={styles.heroPlayButton}>
                <Ionicons name="play" size={18} color="#712B13" />
              </View>
            </TouchableOpacity>
          </SectionTransition>
        )}

        {/* ---------- empty state ---------- */}
        {totalSaved === 0 && (
          <SectionTransition sectionKey="empty" index={1} style={styles.section}>
            <View style={local.emptyCard}>
              <Ionicons name="heart-outline" size={34} color="#e85c7a" />
              <Text style={local.emptyTitle}>
                {t("favorites.noFavoritesYet")}
              </Text>
              <Text style={local.emptyHint}>
                {t("favorites.emptyHint", {
                  defaultValue:
                    "Tap the heart on any story, author, narrator or genre to keep it here.",
                })}
              </Text>
            </View>
          </SectionTransition>
        )}

        {/* ---------- YOUR FAVOURITES ---------- */}
        {favouriteCategories.length > 0 && (
          <SectionTransition sectionKey="favs" index={1} style={styles.section}>
            <SectionHeader
              title={t("favorites.section.favourites", {
                defaultValue: "Your favourites",
              })}
              subtitle={t("favorites.section.favouritesHint", {
                defaultValue:
                  "Everything you've marked with a heart - stories, voices, writers and genres.",
              })}
            />
            <View style={local.grid}>
              {favouriteCategories.map((c) => (
                <FavouriteTile
                  key={c.key}
                  meta={FAVOURITE_META[c.key]}
                  count={c.count}
                  onPress={() => openCategory(c.key)}
                />
              ))}
            </View>
          </SectionTransition>
        )}

        {/* ---------- SAVED FOR LATER ---------- */}
        <SectionTransition sectionKey="saved" index={2} style={styles.section}>
          <SectionHeader
            title={t("favorites.section.saved", { defaultValue: "Saved for later" })}
            subtitle={t("favorites.section.savedHint", {
              defaultValue:
                "Listen Later keeps whole books. Bookmarks keep single chapters.",
            })}
          />
          <View style={styles.menuList}>
            <SavedRow
              meta={SAVED_META.listenLater}
              count={listenLaterCount}
              onPress={() => openCategory("listenLater")}
            />
            {hasBookmarks && (
              <SavedRow
                meta={SAVED_META.bookmarks}
                count={countOf("bookmarks")}
                onPress={() => openCategory("bookmarks")}
              />
            )}
          </View>
        </SectionTransition>
      </ScrollView>
    </View>
  );
};

/* ---------- local styles ---------- */

const GAP = 12;

const local = StyleSheet.create({
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    width: "47.8%",
    flexGrow: 1,
    minHeight: 148,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileCount: { color: "#fff", fontSize: 26, fontWeight: "800" },
  tileLabel: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },
  tileHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 66,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  savedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  savedLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  savedHint: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 },
  countPill: {
    minWidth: 30,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  countPillText: { fontSize: 12, fontWeight: "700" },

  heroCircleBig: {
    position: "absolute",
    right: -30,
    bottom: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroCircleSmall: {
    position: "absolute",
    right: 60,
    bottom: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 8,
  },
  emptyTitle: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptyHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});

export default FavoritesScreen;
