import axios from '@/axios.config';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  story_duration: string | null; // backend sends a pre-formatted duration string, e.g. "2 hr 20 mins"
  rating: number;
  listens: number;
  like: boolean;
  dislike: boolean;
  wishlisted: boolean;
  view_type: string;
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

/*
 * Backend hero response:
 *
 * {
 *   "type": "hero",
 *   "mode": "explore",
 *   "data": {
 *      ...
 *   }
 * }
 *
 * OR
 *
 * {
 *   "type": "hero",
 *   "mode": "resume",
 *   "data": {
 *      ...
 *   }
 * }
 */

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
  | { type: "featured-books"; title: string; data: ApiStory[]; view_type: string }
  | {
      type: "story-row";
      title: string;
      data: ApiStory[];
      view_type: string;
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
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
    <Path d="M9.5 18a2.5 2.5 0 005 0" />
  </Svg>
);

const ClockIcon = ({ size = 11, color = COLORS.lavDim }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 7v5l3 3" />
  </Svg>
);

const PlayIcon = ({ size = 10, color = "#241b2c" }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const BookIcon = ({ size = 8, color = "#fff" }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Path d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4Z" />
    <Path d="M6 11v1a6 6 0 0012 0v-1M12 18v3" />
  </Svg>
);

const MoonIcon = ({ size = 16, color = COLORS.lav }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 1010.5 10.5Z" />
  </Svg>
);

const StarIcon = ({ size = 11, color = COLORS.gold }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
  </Svg>
);

const FacebookIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V9Z" />
  </Svg>
);

const InstagramIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Rect x={4} y={4} width={16} height={16} rx={4} />
    <Circle cx={12} cy={12} r={3.2} />
    <Circle
      cx={16.6}
      cy={7.4}
      r={0.6}
      fill={color}
      stroke="none"
    />
  </Svg>
);

const WebsiteIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Circle cx={12} cy={12} r={9} />
    <Path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </Svg>
);

const TwitterIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Path d="M21 5.3c-.7.4-1.5.6-2.3.8a3.6 3.6 0 00-6.2 3.3A10.4 10.4 0 014 4.9a3.6 3.6 0 001.1 4.8c-.6 0-1.2-.2-1.7-.4 0 1.7 1.2 3.2 2.9 3.6-.6.2-1.2.2-1.8.1a3.6 3.6 0 003.4 2.5A10.5 10.5 0 013 17.4a10.9 10.9 0 006 1.7c7 0 11-6 11-11.2v-.5c.7-.5 1.4-1.2 1.9-2z" />
  </Svg>
);

const YoutubeIcon = ({ size = 11, color = COLORS.text2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
  >
    <Rect x={3} y={6} width={18} height={12} rx={3} />
    <Path
      d="M11 9.5l4 2.5-4 2.5z"
      fill={color}
      stroke="none"
    />
  </Svg>
);

/* ---------- helpers ---------- */

function isSvgUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".svg");
}

// Backend now sends a pre-formatted duration string (e.g. "2 hr 20 mins"),
// so we just trim/guard it instead of doing seconds math.
function formatDuration(story_duration?: string | null): string {
  return story_duration?.trim() || "";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

// Returns the first letter of the last name in a greeting string, or "U" if not found.
function getInitialFromGreeting(title?: string): string {
  if (!title) return "U";

  const match = title.match(/,\s*([^.]+)\.?$/);
  const name = match ? match[1].trim() : title;

  return name.charAt(0).toUpperCase() || "U";
}

/* ---------- rating badge ---------- */

const RatingBadge: React.FC<{ rating?: number; size?: number }> = ({
  rating,
  size = 11,
}) => {
  if (!rating) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
      }}
    >
      <StarIcon size={size} />
      <Text style={styles.cardFootText}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
};

/* ---------- story row ---------- */

const WaveRule = () => (
  <View
    style={{
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.12)",
      marginVertical:4,
      width: "100%",
    }}
  />
);

const StoryCard: React.FC<{
  story: ApiStory;
  fallbackBg: [string, string];
}> = ({ story, fallbackBg }) => {
  const duration = formatDuration(story.story_duration);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
    >
      <View style={styles.cardCover}>
        {story.cover ? (
          <Image
            source={{ uri: story.cover }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={fallbackBg}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={styles.ribbonCard}>
          <BookIcon size={7} />
          <Text style={styles.ribbonText}>Audio</Text>
        </View>
      </View>

      <Text
        style={styles.cardTitle}
        numberOfLines={2}
      >
        {story.title}
      </Text>

      <Text
        style={styles.cardNarrator}
        numberOfLines={1}
      >
        {story.narrator || story.author}
      </Text>

      <View
        style={[
          styles.cardFoot,
          {
            justifyContent: "space-between",
          },
        ]}
      >
        <RatingBadge rating={story.rating} size={10} />

        {duration ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ClockIcon size={10} />
            <Text style={styles.cardFootText}>
              {" "}
              {duration}
            </Text>
          </View>
        ) : (
          <Text style={styles.cardFootText}>
            {story.listens} listens
          </Text>
        )}
      </View>

      {!!story.genre && (
        <Text style={styles.cardGenre}>
          {story.genre}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const StoryRow: React.FC<{
  title: string;
  stories: ApiStory[];
  view_type: string;
}> = ({ title, stories, view_type }) => {
  if (!stories.length) return null;

  return (
    <View style={styles.rowSec}>
      <WaveRule />

      <View style={styles.rowHead}>
        <Text style={styles.rowTitle}>{title}</Text>

        <TouchableOpacity
  onPress={() => {
    // console.log(
    //   "View all pressed for title:",
    //   title,
    //   "view_type:",
    //   view_type
    // );

    router.push({
      pathname: "/storyView",
      params: {
        title,
        view_type,
        stories: JSON.stringify(stories),
      },
    });
  }}
  accessibilityRole="button"
  accessibilityLabel={`View all ${title}`}
>
  <Text style={styles.viewAll}>View all</Text>
</TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowScroll}
      >
        {stories.map((story, i) => (
          <StoryCard
            key={`${story.id}-${i}`}
            story={story}
            fallbackBg={COVERS[i % COVERS.length]}
          />
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
}> = ({ title, stories, view_type }) => {
  if (!stories.length) return null;

  return (
    <View style={styles.bedSection}>
      <View style={styles.bedHeader}>
        <View style={styles.bedIconWrap}>
          <MoonIcon />
        </View>

        <View style={styles.bedHeaderText}>
          <Text style={styles.bedTitle}>
            {title}
          </Text>

          <Text style={styles.bedSubtitle}>
            Soft, slow stories to wind down with
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "/storyView",
              params: {
                title,
                view_type,
                stories: JSON.stringify(stories),
              },
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={`View all ${title}`}
        >
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bedRowScroll}
      >
        {stories.map((story, i) => {
          const duration = formatDuration(
            story.story_duration
          );

          return (
            <View
              style={styles.bedCard}
              key={`${story.id}-${i}`}
            >
              <View style={styles.bedCover}>
                {story.cover ? (
                  <Image
                    source={{ uri: story.cover }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={
                      BED_COVERS[
                        i % BED_COVERS.length
                      ]
                    }
                    style={StyleSheet.absoluteFillObject}
                  />
                )}

                <LinearGradient
                  colors={[
                    "rgba(10,8,20,0)",
                    "rgba(10,8,20,0.7)",
                  ]}
                  style={StyleSheet.absoluteFillObject}
                />

                <Text
                  style={[
                    styles.bedCoverTitle,
                    { color: "#fff" },
                  ]}
                  numberOfLines={2}
                >
                  {story.title}
                </Text>

                {!!duration && (
                  <View style={styles.bedDurationBadge}>
                    <Text style={styles.bedDurationText}>
                      {duration}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={styles.bedCardTitle}
                numberOfLines={1}
              >
                {story.title}
              </Text>

              <Text
                style={styles.bedCardNarrator}
                numberOfLines={1}
              >
                {story.narrator || story.author}
              </Text>

              <RatingBadge rating={story.rating} size={9} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ---------- trending genre chips ---------- */

const TrendingGenreChips: React.FC<{
  genres: ApiTrendingGenre[];
}> = ({ genres }) => {
  if (!genres.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {genres.map((g) => (
        <View
          style={styles.chip}
          key={g.id}
        >
          <Text style={styles.chipText}>
            #{g.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

/* ---------- author row ---------- */

const AuthorRow: React.FC<{
  title: string;
  authors: ApiAuthor[];
}> = ({ title, authors }) => {
  if (!authors.length) return null;

  return (
    <View style={styles.tertiary}>
      <View style={styles.tertiaryHead}>
        <Text style={styles.tertiaryTitle}>
          {title}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/author")}
        >
          <Text style={styles.viewAll}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.authorRow}>
          {authors.map((author) => (
            <TouchableOpacity
              key={author.id}
              style={styles.authorChip}
              activeOpacity={0.85}
            >
              {author.avatar ? (
                <Image
                  source={{ uri: author.avatar }}
                  style={styles.authorAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.authorChipText}>
                  {getInitials(author.name)}
                </Text>
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
}> = ({ title, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      {title}
    </Text>

    <TouchableOpacity
      onPress={onViewAll}
      accessibilityRole="button"
      accessibilityLabel={`View all ${title}`}
    >
      <Text style={styles.viewAll}>
        View all
      </Text>
    </TouchableOpacity>
  </View>
);

function GenreTile({
  item,
}: {
  item: ApiGenre;
}) {
  return (
    <Pressable style={styles.genreAvatar}>
      <View style={styles.genreIconBox}>
        {item.icon ? (
          isSvgUrl(item.icon) ? (
            <SvgUri
              width={100}
              height={100}
              uri={item.icon}
            />
          ) : (
            <Image
              source={{ uri: item.icon }}
              style={{
                width: 100,
                height: 100,
              }}
              resizeMode="contain"
            />
          )
        ) : null}

        <Text
          style={styles.genreName}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
}

function GenreGridSection({
  title,
  data,
}: {
  title: string;
  data: ApiGenre[];
}) {
  const router = useRouter();

  if (!data.length) return null;

  return (
    <View
      style={[
        styles.section,
        {
          paddingHorizontal: 18,
        },
      ]}
    >
      <SectionHeader
        title={title}
        onViewAll={() => router.push("/genre")}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
      >
        {data.map((item) => (
          <GenreTile
            key={item.id}
            item={item}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/* ---------- connect with us footer ---------- */

const SOCIAL_ICON_MAP: Record<
  keyof ConnectLinks,
  React.FC<IconProps>
> = {
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  website: WebsiteIcon,
  twitter: TwitterIcon,
};

const ConnectFooter: React.FC<{
  links?: ConnectLinks;
}> = ({ links }) => {
  if (!links) return null;

  const entries = (
    Object.keys(SOCIAL_ICON_MAP) as (keyof ConnectLinks)[]
  ).filter((k) => !!links[k]);

  if (!entries.length) return null;

  return (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>
          Connect with us
        </Text>

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
                onPress={() =>
                  Linking.openURL(url)
                }
              >
                <Icon />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.footerCopy}>
        © {new Date().getFullYear()} Deep Audiobooks.
        Stories worth hearing.
      </Text>
    </View>
  );
};

/* ---------- section dispatcher ---------- */

function renderSection(
  section: Section,
  index: number
): React.ReactNode {
  switch (section.type) {
    case "trending-genres":
      return (
        <TrendingGenreChips
          key={`chips-${index}`}
          genres={section.data}
        />
      );

    case "featured-books":
    case "story-row": {
      const variant =
        section.type === "story-row"
          ? section.variant
          : undefined;

      const isBed =
        variant === "bed" ||
        section.title
          ?.trim()
          .toLowerCase() ===
          "perfect before bed";

      if (isBed) {
        return (
          <PerfectBeforeBedSection
            key={`${section.type}-${index}`}
            title={section.title}
            stories={section.data}
            view_type={section.view_type}
          />
        );
      }

      return (
        <StoryRow
          key={`${section.type}-${index}`}
          title={section.title}
          stories={section.data}
          view_type={section.view_type}
        />
      );
    }

    case "author-row":
      return (
        <AuthorRow
          key={`author-${index}`}
          title={section.title}
          authors={section.data}
        />
      );

    case "genre-grid":
      return (
        <GenreGridSection
          key={`genres-${index}`}
          title={section.title}
          data={section.data}
        />
      );

    // greeting, hero and connect-with-us
    // are rendered separately.
    default:
      return null;
  }
}

/* ---------- main component ---------- */

const DeepAudiobooksHome: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const fetchDiscoverData = useCallback(
    async (isPullRefresh = false) => {
      try {
        if (isPullRefresh) {
          setRefreshing(true);

          Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Light
          );
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
          setError(
            data.msg ||
              "Failed to load explore data"
          );
        }
      } catch (err: any) {
        console.log(
          "Error code:",
          err.code
        );

        console.log(
          "Error message:",
          err.message
        );

        console.log(
          "Error response:",
          err.response
        );

        setError(
          "Something went wrong. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const onPullRefresh = useCallback(() => {
    fetchDiscoverData(true);
  }, [fetchDiscoverData]);

  useEffect(() => {
    fetchDiscoverData();
  }, [fetchDiscoverData]);

  const greetingSection = sections.find(
    (
      s
    ): s is Extract<
      Section,
      { type: "greeting" }
    > => s.type === "greeting"
  );

  const heroSection = sections.find(
    (
      s
    ): s is Extract<
      Section,
      { type: "hero" }
    > => s.type === "hero"
  );

  const connectSection = sections.find(
    (
      s
    ): s is Extract<
      Section,
      { type: "connect-with-us" }
    > =>
      s.type === "connect-with-us"
  );

  /*
   * Remove greeting, hero and footer sections
   * from the normal body rendering.
   */
  const bodySections = sections.filter(
    (s) =>
      s.type !== "greeting" &&
      s.type !== "hero" &&
      s.type !== "connect-with-us"
  );

  if (loading && !sections.length) {
    return (
      <View
        style={[
          styles.wrap,
          styles.centerFill,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.lav}
        />
      </View>
    );
  }

  if (error && !sections.length) {
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
          onPress={() =>
            fetchDiscoverData()
          }
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        contentContainerStyle={
          styles.wrapContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={COLORS.lav}
            colors={[COLORS.lav]}
            progressBackgroundColor="#1a1420"
            title="Pulling fresh stories..."
            titleColor={COLORS.text2}
          />
        }
      >
        <View style={styles.screen}>

          {/* ---------- top bar ---------- */}

          <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.wordmark}>
              <Text style={styles.deep}>
                deep
              </Text>

              <Text style={styles.aud}>
                audiobooks
              </Text>
            </View>

            <View style={styles.topActions}>
              <View style={styles.bell}>
                <BellIcon />
              </View>

              <TouchableOpacity
                style={styles.profileDot}
                activeOpacity={0.7}
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <Text style={styles.profileDotText}>
                  {getInitialFromGreeting(
                    greetingSection?.title
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------- hero ---------- */}

          <View style={styles.hero}>

            {!!greetingSection?.title && (
              <Text style={styles.greet}>
                {greetingSection.title}
              </Text>
            )}

            {!!greetingSection?.subtitle && (
              <Text style={styles.greetSub}>
                {greetingSection.subtitle}
              </Text>
            )}

            {heroSection?.data && (
              <View style={styles.primaryCard}>

                {/* ---------- cover ---------- */}

                <View style={styles.primaryCover}>
                  {heroSection.data.cover ? (
                    <Image
                      source={{
                        uri: heroSection.data.cover,
                      }}
                      style={
                        StyleSheet.absoluteFillObject
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={[
                        "#3a2f22",
                        "#1a1410",
                      ]}
                      style={
                        StyleSheet.absoluteFillObject
                      }
                    />
                  )}

                  <View style={styles.ribbon}>
                    <BookIcon />

                    <Text
                      style={styles.ribbonText}
                    >
                      Audio book
                    </Text>
                  </View>
                </View>

                {/* ---------- hero information ---------- */}

                <View style={styles.primaryInfo}>

                  {/* 
                   * RESUME:
                   * Continue listening
                   *
                   * DISCOVER:
                   * Discover
                   */}

                  <Text style={styles.primaryLabel}>
                    {heroSection.mode === "resume"
                      ? "Continue listening"
                      : "Explore"}
                  </Text>

                  <Text
                    style={styles.primaryTitle}
                    numberOfLines={2}
                  >
                    {heroSection.data.title}
                  </Text>

                  <Text
                    style={styles.primaryNarrator}
                    numberOfLines={1}
                  >
                    {heroSection.data.narrator ||
                      heroSection.data.author}
                  </Text>

                  <RatingBadge
                    rating={heroSection.data.rating}
                    size={12}
                  />

                  {!!heroSection.data.genre && (
                    <Text
                      style={[
                        styles.cardGenre,
                        {
                          marginBottom: 10,
                        },
                      ]}
                    >
                      {heroSection.data.genre}
                    </Text>
                  )}

                  {/* 
                   * Button changes according to backend mode
                   */}

                  <TouchableOpacity
                    style={styles.resumeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={
                      heroSection.mode ===
                      "resume"
                        ? `Resume ${heroSection.data.title}`
                        : `Listen to ${heroSection.data.title}`
                    }
                  >
                    <PlayIcon />

                    <Text
                      style={
                        styles.resumeBtnText
                      }
                    >
                      {heroSection.mode ===
                      "resume"
                        ? "Resume"
                        : "Listen now"}
                    </Text>
                  </TouchableOpacity>

                </View>
              </View>
            )}
          </View>

          {/* ---------- body sections ---------- */}

          {bodySections.map(
            (section, i) =>
              renderSection(
                section,
                i
              )
          )}

          {/* ---------- footer ---------- */}

          <ConnectFooter
            links={connectSection?.data}
          />

        </View>
      </ScrollView>
    </View>
  );
};

export default DeepAudiobooksHome;
