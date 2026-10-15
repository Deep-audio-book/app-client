import axios from "@/axios.config";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Path,
  Polyline,
  Rect,
} from "react-native-svg";

import styles from "./style";
import ProfileDot from "../ui/ProfileDot";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../utils/typedReduxHooks";

/* ---------- icons ---------- */

interface IconProps {
  size?: number;
  color?: string;
}

const HeadsetIcon = ({
  size = 18,
  color = "#d9a441",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M4 13v-1a8 8 0 0116 0v1" />
    <Rect x={2} y={13} width={4} height={7} rx={1.5} />
    <Rect x={18} y={13} width={4} height={7} rx={1.5} />
  </Svg>
);

const UserIcon = ({
  size = 18,
  color = "#4ade80",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </Svg>
);

const FeatherIcon = ({
  size = 18,
  color = "#ed93b1",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M20 4c-6 0-14 3-16 11 3-1 5-1 7-3M20 4c0 6-3 14-11 16-1-2-1-4-3-7" />
    <Path d="M9 15l6-6" />
  </Svg>
);

const GenresIcon = ({
  size = 18,
  color = "#85b7eb",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Rect x={3} y={3} width={7} height={7} rx={1.5} />
    <Rect x={14} y={3} width={7} height={7} rx={1.5} />
    <Rect x={3} y={14} width={7} height={7} rx={1.5} />
    <Rect x={14} y={14} width={7} height={7} rx={1.5} />
  </Svg>
);

const ChevronRightIcon = ({
  size = 17,
  color = "rgba(255,255,255,0.35)",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Polyline points="9 6 15 12 9 18" />
  </Svg>
);

const PlayIcon = ({
  size = 18,
  color = "#712B13",
}: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke="none"
  >
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

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

/* ---------- static menu styling ---------- */

type MenuMeta = {
  iconBg: string;
  Icon: React.FC<IconProps>;
  iconColor: string;
};

const MENU_META: Record<string, MenuMeta> = {
  stories: {
    iconBg: "#2a2216",
    Icon: HeadsetIcon,
    iconColor: "#d9a441",
  },

  narrators: {
    iconBg: "#16221e",
    Icon: UserIcon,
    iconColor: "#4ade80",
  },

  authors: {
    iconBg: "#221621",
    Icon: FeatherIcon,
    iconColor: "#ed93b1",
  },

  genres: {
    iconBg: "#16191f",
    Icon: GenresIcon,
    iconColor: "#85b7eb",
  },
};

/* ---------- menu row ---------- */

interface MenuRowProps {
  category: ApiCategory;
}

const MenuRow: React.FC<MenuRowProps> = ({
  category,
}) => {
  const meta = MENU_META[category.key];

  if (!meta) {
    return null;
  }

  const { Icon } = meta;

  /*
   * Get current user directly from Redux.
   */
  const user = useAppSelector(
    (s) => s.auth.user
  );

  const handlePress = () => {
    switch (category.key) {
      case "stories":
        router.push({
          pathname: "/storyView",
          params: {
            view_type: "grid",
            key_type: "favorite",
            api_method: "getFavouriteStories",
            user_id: user?.userId?.toString(),
          },
        });
        break;

      case "narrators":
         router.push({
            pathname: '/narrator',
            params: {
              method: 'getFavouriteNarrators',
              dataKey: 'favorites-narrators',
              detailMethod: 'getFavouriteNarratorDetails',
              idKey: 'narrator_id',
              title: 'Narrators',
            },
          })
        break;

      case "authors":
        router.push({
            pathname: '/author',
            params: {
              method: 'getFavouriteAuthors',
              dataKey: 'favorites-authors',
              detailMethod: 'getFavouriteAuthorDetails',
              idKey: 'author_id',
              title: 'Authors',
            },
          })

        break;

      case "genres":
        router.push({
            pathname: '/genre',
            params: {
              method: 'getFavouriteGenres',
              dataKey: 'favorites-genres',
              detailMethod: 'getFavouriteGenreDetails',
              idKey: 'genre_id',
              title: 'Genres',
            },
          })
        break;

      default:
        break;
    }
  };

  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${category.title}, ${category.count} items`}
    >
      <View
        style={[
          styles.menuIconWrap,
          {
            backgroundColor: meta.iconBg,
          },
        ]}
      >
        <Icon
          size={18}
          color={meta.iconColor}
        />
      </View>

      <Text
        style={styles.menuLabel}
        numberOfLines={1}
      >
        {category.title}
      </Text>

      <Text style={styles.menuCount}>
        {category.count}
      </Text>

      <ChevronRightIcon />
    </TouchableOpacity>
  );
};

/* ---------- main component ---------- */

const FavoritesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  /*
   * Needed here to build the storyView params for the hero play button.
   */
  const user = useAppSelector(
    (s) => s.auth.user
  );

  const [summary, setSummary] =
    useState<FavoritesSummary | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const { t } = useTranslation();

  /*
   * Refetch every time this screen comes into focus.
   */
  const {
    loading,
    refetch: fetchFavoritesSummary,
  } = useFocusRefetch(async () => {
    try {
      setError(null);

      const { data } = await axios.post("/", {
        method: "getFavouritesSummary",
      });

      if (data?.statusCode === 200) {
        setSummary(data.data);
      } else {
        setError(
          data?.msg ||
            t("favorites.failedToLoad", {
              defaultValue:
                "Failed to load favorites",
            })
        );
      }
    } catch (err: any) {
      console.log(
        "getFavouritesSummary error:",
        err?.response?.data ||
          err?.message ||
          err
      );

      setError(
        t("favorites.somethingWentWrong", {
          defaultValue:
            "Something went wrong. Please try again.",
        })
      );
    }
  });

  /*
   * Play button on the hero card -> storyView, same shape of
   * params as the "stories" menu row.
   */
  const handleHeroPlayPress = () => {
    router.push({
      pathname: "/storyView",
      params: {
        view_type: "list",
        key_type: "favorite",
        api_method: "getFavouriteStories",
        user_id: user?.userId?.toString(),
      },
    });
  };

  /* ---------- loading ---------- */

  if (loading && !summary) {
    return (
      <View
        style={[
          styles.wrap,
          styles.centerFill,
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#fff"
        />
      </View>
    );
  }

  /* ---------- error ---------- */

  if (error && !summary) {
    return (
      <View
        style={[
          styles.wrap,
          styles.centerFill,
        ]}
      >
        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={fetchFavoritesSummary}
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>
            {t("common.retry", {
              defaultValue: "Retry",
            })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- data ---------- */

  const hero = summary?.hero;

  const categories =
    summary?.categories ?? [];

  return (
    <View style={styles.wrap}>
      {/* Background */}

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
        contentContainerStyle={[
          styles.wrapContent,
          {
            paddingBottom:
              insets.bottom + 12,
          },
        ]}
      >
        {/* ---------- top bar ---------- */}

        <View
          style={[
            styles.topbar,
            {
              paddingTop:
                insets.top + 8,
            },
          ]}
        >
          <Text style={styles.screenTitle}>
            {t("favorites.title")}
          </Text>

          <ProfileDot
            dotStyle={styles.profileDot}
            textStyle={styles.profileDotText}
          />
        </View>

        {/* ---------- hero card ---------- */}

        {!!hero && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.9}
              onPress={handleHeroPlayPress}
              accessibilityRole="button"
              accessibilityLabel={`Play ${hero.title}`}
            >
              <LinearGradient
                colors={[
                  "#f2c14e",
                  "#e85c3f",
                ]}
                start={{
                  x: 0.2,
                  y: 0,
                }}
                end={{
                  x: 0.8,
                  y: 1,
                }}
                style={
                  StyleSheet.absoluteFillObject
                }
              />

              <Text
                style={styles.heroTitle}
                numberOfLines={2}
              >
                {hero.title}
              </Text>

              <Text
                style={styles.heroSubtitle}
              >
                {hero.count}{" "}
                {t("favorites.titles")}
              </Text>

              <View
                style={styles.heroPlayButton}
              >
                <PlayIcon size={18} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- menu list ---------- */}

        <View style={styles.section}>
          <View style={styles.menuList}>
            {categories.map(
              (category) => (
                <MenuRow
                  key={category.key}
                  category={category}
                />
              )
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default FavoritesScreen;