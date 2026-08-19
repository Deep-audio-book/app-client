import axios from '@/axios.config';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styles from './style';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const DESIGN_WIDTH = 393;
const MAX_CONTENT_WIDTH = 520;
const ROW_HEIGHT = 78;

type Author = {
  id: number;
  name: string;
  avatar: string;
  storyCount: number;
};

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
function MoreIcon() {
  return (
    <Svg width={20} height={4} viewBox="0 0 20 4" fill="none">
      <Path
        opacity={0.5}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 0C0.89543 0 0 0.89543 0 2C0 3.10457 0.89543 4 2 4C3.10457 4 4 3.10457 4 2C4 0.89543 3.10457 0 2 0ZM8 2C8 0.89543 8.89543 0 10 0C11.1046 0 12 0.89543 12 2C12 3.10457 11.1046 4 10 4C8.89543 4 8 3.10457 8 2ZM16 2C16 0.89543 16.8954 0 18 0C19.1046 0 20 0.89543 20 2C20 3.10457 19.1046 4 18 4C16.8954 4 16 3.10457 16 2Z"
        fill="#FFF"
      />
    </Svg>
  );
}

function AuthorRow({
  author,
  avatarSize,
  onPress,
}: {
  author: Author;
  avatarSize: number;
  onPress: (author: Author) => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(author)}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
    >
      <Image
  source={{
    uri:
      author.avatar?.trim() ||
      `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(author.name)}`,
  }}
  style={{
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
  }}
/>

      <View style={styles.rowInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {author.name}
        </Text>

        <Text style={styles.metaText}>
          {author.storyCount} {author.storyCount === 1 ? 'Story' : 'Stories'}
        </Text>
      </View>

      <Pressable
        style={styles.moreButton}
        android_ripple={{
          color: 'rgba(255,255,255,0.15)',
          borderless: true,
        }}
        onPress={(e) => {
          e.stopPropagation();
          // your "more" action here
        }}
      >
        <MoreIcon />
      </Pressable>
    </Pressable>
  );
}

export default function AuthorScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scaleFactor = clamp(width / DESIGN_WIDTH, 0.85, 1.35);
  // const avatarSize = Math.round(clamp(62 * scaleFactor, 52, 78));
  const avatarSize = 68;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const horizontalPadding = width < 360 ? 16 : 24;
  const heroHeight = insets.top + 600;

  const [authors, setAuthors] = useState<Author[]>([]);
  const [title, setTitle] = useState('Authors');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post('/', {
        method: 'getAllAuthors',
      });

      if (data.statusCode === 200) {
        const section = data.data.find(
          (item: any) => item.type === 'all-authors'
        );

        setAuthors(section?.data ?? []);
        setTitle(section?.title || 'Authors');
      } else {
        setError(data.msg);
      }
    } catch (e) {
      console.log(e);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const handleAuthorPress = useCallback((author: Author) => {
    router.push({
      pathname: '/author-details', // adjust to match your actual route path
      params: { author_id: author.id.toString() },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Author>) => (
      <AuthorRow
        author={item}
        avatarSize={avatarSize}
        onPress={handleAuthorPress}
      />
    ),
    [avatarSize, handleAuthorPress]
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator color="#fff" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={authors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
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
                colors={['transparent', '#000', '#000']}
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

            {error && (
              <Text
                style={{
                  color: 'red',
                  textAlign: 'center',
                  marginVertical: 20,
                }}
              >
                {error}
              </Text>
            )}
          </>
        }
        contentContainerStyle={{
          width: contentWidth,
          alignSelf: 'center',
          paddingBottom: 30,
        }}
      />
    </SafeAreaView>
  );
}