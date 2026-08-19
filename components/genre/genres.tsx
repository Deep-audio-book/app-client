import axios from '@/axios.config';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, SvgUri } from 'react-native-svg';
import styles from './style';

const DESIGN_WIDTH = 393;
const MAX_CONTENT_WIDTH = 520;
const NUM_COLUMNS = 3;
const GRID_GAP = 12;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

function isSvgUrl(url?: string | null) {
  return !!url && url.toLowerCase().endsWith('.svg');
}

type Genre = {
  id: number;
  name: string;
  icon?: string | null;
  background?: string | null;
};

type GenreScreenProps = {
  onBack?: () => void;
};

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21L16.65 16.65"
        stroke="#FFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z"
        stroke="#FFF"
        strokeWidth={2}
      />
    </Svg>
  );
}


export default function GenreScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scaleFactor = clamp(width / DESIGN_WIDTH, 0.85, 1.35);
  const scale = (value: number) => Math.round(value * scaleFactor);
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const isCompactHeight = height < 700;
  const horizontalPadding = width < 360 ? 16 : 24;
  const heroHeight = insets.top + 600;

  const tileWidth =
    (contentWidth -
      horizontalPadding * 2 -
      GRID_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [title, setTitle] = useState('Genres');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post('/', {
        method: 'getAllGenre',
      });

      if (data.statusCode === 200) {
        const sections = data.data;

        const genreSection = sections.find(
          (section: any) => section.type === 'all-genres'
        );

        setTitle(genreSection?.title || 'Genres');
        setGenres(genreSection?.data || []);
      } else {
        setError(data.msg || 'Failed to load genres');
      }
    } catch (err: any) {
      console.log(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Background */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: heroHeight,
          }}
        >
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: '#f4987774',
            }}
          />

          <LinearGradient
            colors={['rgba(0,0,0,0)', '#000000', '#000000']}
            locations={[0.026, 0.6377, 1]}
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
                {
                  paddingTop: Math.max(insets.top, 12),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => router.back()}
              >
                <ArrowLeftIcon />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                 {title}
              </Text>

              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => {
                  // Search action
                }}
              >
                <SearchIcon />
              </TouchableOpacity>
            </View>

        <View
          style={[
            styles.page,
            {
              width: contentWidth,
              alignSelf: 'center',
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          

          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              style={{ marginTop: 40 }}
            />
          ) : error ? (
            <Text
              style={{
                color: '#FFFFFF',
                textAlign: 'center',
                marginTop: 40,
              }}
            >
              {error}
            </Text>
          ) : genres.length === 0 ? (
            <Text
              style={{
                color: '#fcf7f7',
                textAlign: 'center',
                marginTop: 40,
              }}
            >
              No genres found.
            </Text>
          ) : (
            <View style={styles.genreGrid}>
              {genres.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.genreTile,
                    {
                      width: tileWidth,
                      aspectRatio: 1,
                      backgroundColor:
                        item.background || '#d9d6d6f0',
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.genreIconWrap}>
                    {item.icon &&
                      (isSvgUrl(item.icon) ? (
                        <SvgUri
                          width={tileWidth * 0.4}
                          height={tileWidth * 0.4}
                          uri={item.icon}
                        />
                      ) : (
                        <Image
                          source={{ uri: item.icon }}
                          style={{
                            width: tileWidth * 0.8,
                            height: tileWidth * 0.8,
                          }}
                          resizeMode="contain"
                        />
                      ))}
                  </View>

                  <Text
                    style={[
                      styles.genreName,
                      { fontSize: scale(13) },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}