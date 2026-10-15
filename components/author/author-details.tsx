import axios from '@/axios.config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import styles from './style';

const DESIGN_WIDTH = 393;
const MAX_CONTENT_WIDTH = 520;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// ---------------- Helpers ----------------

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ---------------- Icons ----------------

function ArrowLeftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 10H15M9.16667 14.1667L5 10L9.16667 5.83334"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShuffleIcon() {
  return (
    <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
      <Path
        d="M18.2 10.1111L21.2333 7.07778L18.2 4.04444M21.2333 7.07778H17.1889C16.2493 7.07778 15.7794 7.07778 15.3887 7.15549C13.7844 7.47462 12.5302 8.7288 12.211 10.3332C12.1333 10.7239 12.1333 11.1937 12.1333 12.1333C12.1333 13.073 12.1333 13.5428 12.0556 13.9335C11.7365 15.5379 10.4823 16.792 8.87792 17.1112C8.48723 17.1889 8.01741 17.1889 7.07778 17.1889H3.03333M18.2 14.1556L21.2333 17.1889L18.2 20.2222M21.2333 17.1889H17.1889C16.2493 17.1889 15.7794 17.1889 15.3887 17.1112C15.3139 17.0963 15.2399 17.0794 15.1667 17.0605M3.03333 7.07778H7.07778C8.01741 7.07778 8.48723 7.07778 8.87792 7.15549C8.95273 7.17037 9.02678 7.18728 9.1 7.20617"
        stroke="#080A14"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={25} height={25} viewBox="0 0 25 25" fill="none">
      <Path
        d="M7.07777 10.1111H6.26888C5.13633 10.1111 4.57006 10.1111 4.13748 10.3315C3.75697 10.5254 3.44761 10.8348 3.25373 11.2153C3.03333 11.6478 3.03333 12.2141 3.03333 13.3467V16.9867C3.03333 18.1192 3.03333 18.6855 3.25373 19.1181C3.44761 19.4986 3.75697 19.8079 4.13748 20.0018C4.57006 20.2222 5.13633 20.2222 6.26888 20.2222H17.9978C19.1303 20.2222 19.6966 20.2222 20.1292 20.0018C20.5097 19.8079 20.819 19.4986 21.0129 19.1181C21.2333 18.6855 21.2333 18.1192 21.2333 16.9867V13.3467C21.2333 12.2141 21.2333 11.6478 21.0129 11.2153C20.819 10.8348 20.5097 10.5254 20.1292 10.3315C19.6966 10.1111 19.1303 10.1111 17.9978 10.1111H17.1889M12.1333 4.04444V16.1778M15.1667 7.07778L12.1333 4.04444L9.09999 7.07778"
        stroke="#080A14"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Path
        d="M11.7722 6.18353C12.732 6.78342 13.2119 7.08337 13.3765 7.46739C13.5202 7.80278 13.5202 8.18242 13.3765 8.51781C13.2119 8.90183 12.732 9.20177 11.7722 9.80166L7.264 12.6193C6.1987 13.2851 5.66605 13.618 5.22649 13.5826C4.84334 13.5518 4.49212 13.3572 4.26293 13.0486C4 12.6946 4 12.0665 4 10.8102V5.17499C4 3.91874 4 3.29062 4.26293 2.9366C4.49212 2.62801 4.84334 2.43335 5.22649 2.40255C5.66605 2.36721 6.1987 2.70012 7.264 3.36593L11.7722 6.18353Z"
        fill="#fff"
      />
    </Svg>
  );
}

// ---------------- Types ----------------

type Episode = {
  id?: number | string;
  title: string;
  author: string;
  cover?: string | null;
};

type PersonDetails = {
  id: number;
  name: string;
  icon?: string | null;
  background?: string | null;
  description?: string;
  storyCount?: number;
  stories?: Episode[];
  avatar?: string | null;
};

// ---------------- Screen ----------------
// Fully generic: this screen doesn't know or care whether it's showing
// an "author" or a "narrator". The PREVIOUS screen decides everything:
//   - method  -> the axios "method" field sent to backend (e.g. 'getAuthorDetails')
//   - id_key  -> the body key the id is sent under (e.g. 'author_id')
//   - id      -> the actual id value
//   - title   -> (optional) fallback header text while loading / on error
//
// Example navigation from a previous screen:
//   router.push({
//     pathname: '/author-details',
//     params: {
//       method: 'getAuthorDetails',
//       id_key: 'author_id',
//       id: author.id.toString(),
//       title: 'Author',
//     },
//   });

export default function AuthorDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [expanded, setExpanded] = useState(false);

  const scaleFactor = clamp(width / DESIGN_WIDTH, 0.85, 1.35);
  const scale = (value: number) => Math.round(value * scaleFactor);

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const isCompactHeight = height < 700;

  const horizontalPadding = width < 360 ? 16 : 24;

  const heroHeight = insets.top + 500;

  const coverSize = clamp(
    contentWidth * 0.417,
    120,
    isCompactHeight ? 150 : 200
  );

  // ---------------- Params ----------------
  // Previous screen sends: method, id_key, id (and optionally title)

  const { method, id_key, id, title, color } =
    useLocalSearchParams<{
      method: string;
      id_key: string;
      id: string;
      title?: string;
      color?: string;
    }>();

  // Falls back to a type-specific hero color if the previous screen didn't
  // pass one explicitly — narrator screens get their own tint, everything
  // else (author, or unknown) falls back to the author tint.
  const heroColorMap: Record<string, string> = {
    getAuthorDetails: '#86915079',
    getNarratorDetails: '#684a6a',
  };

  const heroColor =
    color || heroColorMap[method ?? ''] || '#86915079';

  // ---------------- State ----------------

  const [person, setPerson] =
    useState<PersonDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ---------------- Fetch ----------------

  const fetchDetails = useCallback(async () => {
    if (!id || !method || !id_key) return;

    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post('/', {
        method,           // e.g. 'getAuthorDetails' / 'getNarratorDetails'
        [id_key]: id,     // e.g. author_id: '123' / narrator_id: '123'
      });

      if (data.statusCode === 200) {
        setPerson(data.data);
      } else {
        setError(
          data.msg || 'Failed to load details'
        );
      }
    } catch (err: any) {
      console.log(
        'Details fetch error:',
        err?.response?.data || err?.message || err
      );

      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, method, id_key]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const episodes = person?.stories ?? [];

  // Random 10 stories to display on this screen.
  // Re-shuffled only when the underlying stories list changes,
  // so it doesn't re-randomize on every re-render (e.g. Read More toggle).
  const displayedEpisodes = React.useMemo(
    () => shuffleArray(episodes).slice(0, 10),
    [episodes]
  );

  // ---------------------------------------------------------------
  // FIX: "View All" -> /storyView param mapping
  // ---------------------------------------------------------------
  // useStoryData() (the hook that /storyView uses) expects:
  //    api_method, key_type, view_type, extraParams: { [id_key]: id }
  //
  // This screen was previously sending: method, id_key, id
  // -> storyView read `api_method`/`key_type` as undefined
  // -> useStoryData() hit its guard clause and set
  //    "Invalid story parameters." / rendered nothing useful.
  //
  // getAuthorDetails/getNarratorDetails (used on THIS screen) returns a
  // detail-page shape ({ id, name, description, stories: [...] }), not the
  // listing shape useStoryData expects ({ header: { chips }, stories,
  // heading, subheading }). So the "View All" listing screen must call a
  // dedicated *listing* method, not reuse `method` as-is.
  //
  // Adjust `listingMethod` below to whatever your backend's actual
  // "list all stories for this author/narrator" method is named
  // (confirm with backend — placeholder mapping shown here).
  // ---------------------------------------------------------------

  const listingMethodMap: Record<string, string> = {
    getAuthorDetails: 'getAuthorDetails',
    getNarratorDetails: 'getNarratorDetails',
  };

  const keyTypeMap: Record<string, string> = {
    getAuthorDetails: 'author',
    getNarratorDetails: 'narrator',
  };

  const handleViewAll = () => {
    if (!method || !id_key || !id) return;

    const listingMethod = listingMethodMap[method] ?? method;
    const keyType = keyTypeMap[method] ?? 'author';

    router.push({
      pathname: '/storyView',
      params: {
        title: person?.name ?? title ?? '',
        api_method: listingMethod, // was: method
        key_type: keyType,         // was: not sent at all
        view_type: 'grid',         // was: not sent at all
        [id_key]: id,              // was: sent as separate id_key/id
      },
    });
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#000000',
        }}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
        />

        <View
          style={{
            flex: 1,
            backgroundColor: '#000000',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator
            size="large"
            color="#ffffff"
          />
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // ERROR STATE
  // =====================================================

  if (error) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: '#000000',
          },
        ]}
        edges={['left', 'right']}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
        />

        <View
          style={[
            styles.centerFill,
            {
              backgroundColor: '#000000',
            },
          ]}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={fetchDetails}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['left', 'right']}
    >
      <StatusBar
        barStyle="light-content"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HERO BACKGROUND ================= */}

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: heroHeight,
          }}
        >
          {/* Background color */}

          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: heroColor,
              },
            ]}
          />

          {/* Bottom gradient */}

          <LinearGradient
            colors={[
              'transparent',
              '#00000079',
              '#000',
            ]}
            locations={[0.02, 0.63, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '50%',
            }}
          />
        </View>

        {/* ================= HEADER ================= */}

        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(
                insets.top,
                18
              ),
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <Pressable
            hitSlop={10}
            style={styles.headerButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {person?.name ?? title ?? 'Unknown'}
          </Text>

          <View
            style={styles.circleButtonPlaceholder}
          />
        </View>

        {/* ================= PAGE ================= */}

        <View
          style={[
            styles.page,
            {
              width: contentWidth,
              alignSelf: 'center',
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          {/* ================= COVER ================= */}

          <View style={styles.coverWrapper}>
            <Image
              source={{
                uri:
                  person?.avatar?.trim?.() ||
                  `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(
                    person?.name ?? 'User'
                  )}`,
              }}
              style={[
                styles.cover,
                {
                  width: coverSize,
                  height:
                    coverSize * (162 / 164),
                },
              ]}
              resizeMode="cover"
            />
          </View>

          {/* ================= DESCRIPTION ================= */}

          <View
            style={[
              styles.titleBlock,
              {
                marginTop:
                  isCompactHeight
                    ? 16
                    : 24,
              },
            ]}
          >
            {person?.description ? (
              <>
                <RenderHtml
                  contentWidth={width}
                  source={{
                    html: person.description,
                  }}
                  tagsStyles={{
                    body: {
                      color: '#ffffff',
                      fontSize: scale(16),
                      lineHeight: 26,
                    },
                    b: {
                      fontWeight: '800',
                    },
                    strong: {
                      fontWeight: '800',
                    },
                  }}
                />

                <TouchableOpacity
                  onPress={() =>
                    setExpanded(!expanded)
                  }
                >
                  <Text
                    style={styles.readMore}
                  >
                    {expanded
                      ? 'Read Less'
                      : 'Read More'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {/* ================= STORIES TITLE ================= */}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginTop: isCompactHeight ? 24 : 32,
            }}
          >
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
              Stories
              {person?.storyCount
                ? ` (${person.storyCount})`
                : ''}
            </Text>

            {episodes.length > 10 && (
              <TouchableOpacity onPress={handleViewAll}>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ================= STORIES ================= */}

          <View style={styles.storiesList}>
            {displayedEpisodes.length === 0 ? (
              <Text style={styles.emptyText}>
                No stories yet.
              </Text>
            ) : (
              displayedEpisodes.map(
                (episode, idx) => (
                  <View
                    key={
                      episode.id ?? idx
                    }
                    style={styles.storyRow}
                  >
                    {/* Story Cover */}

                    <Image
                      source={{
                        uri:
                          episode?.cover?.trim() ||
                          `https://placehold.co/300x450?text=${encodeURIComponent(
                            episode.title
                          )}`,
                      }}
                      style={styles.storyThumb}
                      resizeMode="cover"
                    />

                    {/* Story Information */}

                    <View
                      style={styles.storyInfo}
                    >
                      <Text
                        style={
                          styles.storyTitle
                        }
                        numberOfLines={1}
                      >
                        {episode.title}
                      </Text>

                      <Text
                        style={
                          styles.storyAuthor
                        }
                        numberOfLines={1}
                      >
                        {episode.author}
                      </Text>
                    </View>

                    {/* Play */}

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${episode.title}`}
                      hitSlop={{
                        top: 6,
                        bottom: 6,
                        left: 6,
                        right: 6,
                      }}
                      onPress={() =>
                        router.push({
                          pathname: '/storyEpisode',
                          params: {
                            storyId: episode.id,
                          },
                        })
                      }
                    >
                      <PlayIcon />
                    </TouchableOpacity>
                  </View>
                )
              )
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}