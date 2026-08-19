import axios from '@/axios.config';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styles from './style';





const DESIGN_WIDTH = 393;
const MAX_CONTENT_WIDTH = 520;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// ---------------- Icons (from design) ----------------
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

type AuthorDetails = {
  id: number;
  name: string;
  icon?: string | null;
  background?: string | null;
  description?: string;
  storyCount?: number;
  stories?: Episode[]; // backend can send this list, falls back to empty
  avatar?: string | null; // optional avatar URL
};


export default function AuthorDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
// const { width } = useWindowDimensions();


  const scaleFactor = clamp(width / DESIGN_WIDTH, 0.85, 1.35);
  const scale = (value: number) => Math.round(value * scaleFactor);
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const isCompactHeight = height < 700;
  const horizontalPadding = width < 360 ? 16 : 24;
   const heroHeight = insets.top + 500;
  const coverSize = clamp(contentWidth * 0.417, 120, isCompactHeight ? 150 : 200);

  // ---------------- Old axios / data fetching logic (unchanged) ----------------
  const { author_id } = useLocalSearchParams<{ author_id: string }>();

  const [author, setAuthor] = useState<AuthorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthorDetails = useCallback(async () => {
    if (!author_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post('/', {
        method: 'getAuthorDetails', // change to your actual backend method
        author_id: author_id,
      });

      if (data.statusCode === 200) {
        setAuthor(data.data);
      } else {
        setError(data.msg || 'Failed to load author details');
      }
    } catch (err: any) {
    
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [author_id]);

  useEffect(() => {
    fetchAuthorDetails();
  }, [fetchAuthorDetails]);

  const episodes = author?.stories ?? [];

  // ---------------- Loading state ----------------
  if (loading) {
    return (
      <SafeAreaView style={styles.loading} edges={['left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centerFill}>
          {/* <ActivityIndicartor color="#6c6c4732" size="large" /> */}
        </View>
      </SafeAreaView>
    );
  }

  // ---------------- Error state ----------------
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAuthorDetails} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------- Design UI wired to real data ----------------
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: heroHeight,
            }}
          >
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: '#86915079',
                },
              ]}
            />

            <LinearGradient
              colors={['transparent', '#00000079', '#000']}
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
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, 18), paddingHorizontal: horizontalPadding },
          ]}
        >
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.push('/author')}
            >
            <ArrowLeftIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}> {author?.name ?? 'Unknown Author'}</Text>
          <View style={styles.circleButtonPlaceholder} />
        </View>

        <View
          style={[styles.page, { width: contentWidth, alignSelf: 'center', paddingHorizontal: horizontalPadding }]}
        >
          <View style={styles.coverWrapper}>
            {/* <View style={[styles.cover, { width: coverSize, height: coverSize * (162 / 164) }]} /> */}
            <Image
                source={{
                  uri:
                    author?.avatar?.trim?.() ||
                    `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(
                      author?.name ?? 'Author',
                    )}`,
                }}
                style={[
                  styles.cover,
                  {
                    width: coverSize,
                    height: coverSize * (162 / 164),
                  },
                ]}
                resizeMode="cover"
              />
                          
          </View>

         <View style={[styles.titleBlock, { marginTop: isCompactHeight ? 16 : 24 }]}>
          {author?.description ? (
          <>
            <RenderHtml
              contentWidth={width}
              source={{ html: author.description }}
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

            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.readMore}>
                {expanded ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          </>
          ) : null}
          </View>

          

          <Text style={[styles.sectionTitle, { marginTop: isCompactHeight ? 24 : 32 }]}>
            Stories{author?.storyCount ? ` (${author.storyCount})` : ''}
          </Text>

          <View style={styles.storiesList}>
            {episodes.length === 0 ? (
              <Text style={styles.emptyText}>No stories yet.</Text>
            ) : (
              episodes.map((episode, idx) => (
                <View key={episode.id ?? idx} style={styles.storyRow}>
                  {/* <View style={styles.storyThumb} /> */}
                  <Image
                    source={{
                      uri:
                        episode?.cover?.trim() ||
                        `https://placehold.co/300x450?text=${encodeURIComponent(
                          episode.title,
                        )}`,
                    }}
                    style={styles.storyThumb}
                    resizeMode="cover"
                  />
                  
                  <View style={styles.storyInfo}>
                    <Text style={styles.storyTitle} numberOfLines={1}>
                      {episode.title}
                    </Text>
                    <Text style={styles.storyAuthor} numberOfLines={1}>
                      {episode.author}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${episode.title}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <PlayIcon />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
