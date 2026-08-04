import axios from '@/axios.config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { useAppSelector } from '../../utils/typedReduxHooks';
import styles, {
  BANNER_HEIGHT,
  BASE_WIDTH,
  MAX_CONTENT_WIDTH
} from './style';

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}


function isSvgUrl(url?: string | null) {
  return !!url && url.toLowerCase().endsWith('.svg');
}

// ---------- Backend response types ----------
type Story = {
  id: number;
  cover: string;
  title: string;
  author: string;
  genre: string | null;
  timeSec: string;
  listens: number;
  like: boolean;
  dislike: boolean;
  wishlisted: boolean;
};

type Genre = {
  id: number;
  name: string;
  icon?: string | null;
  background?: string | null;
};

type Author = {
  id: number;
  name: string;
  avatar: string;
  storyCount: number;
};

type Book = {
  story_id: number | null;
  image: string;
};

type Section =
  | { type: 'trending-genres'; data: { id: number; name: string }[] }
  | { type: 'featured-books'; title: string; data: Book[] }
  | { type: 'story-row'; title: string; data: Story[] }
  | { type: 'author-row'; title: string; data: Author[] }
  | { type: 'genre-grid'; title: string; data: Genre[] }
  | { type: 'connect-with-us'; data: Record<string, string> };

// ---------- Presentational pieces ----------
function CategoryChip({ label }: { label: string }) {
  return (
    <View style={styles.categoryChip}>
      <Text style={styles.categoryChipText} numberOfLines={1}>
        #{label}
      </Text>
    </View>
  );
}

function StoryCard({ item, variant = 'trending' }: { item: Story; variant?: 'trending' | 'release' }) {
  const cardStyle = variant === 'trending' ? styles.trendingCard : styles.ReleaseCard;
  const artworkStyle = variant === 'trending' ? styles.trendingArtwork : styles.ReleaseArtwork;
  return (
    <Pressable style={cardStyle}>
      <View style={artworkStyle}>
        <Image
          source={{ uri: item.cover }}
          style={{ width: '100%', height: '100%', borderRadius: 8 }}
          resizeMode="cover"
        />
        <Pressable hitSlop={6} style={styles.downloadBadge}>
          <Ionicons name="cloud-download-outline" size={15} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.trendingTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.trendingAuthor} numberOfLines={1}>
        {item.author}
      </Text>
    </Pressable>
  );
}

function AuthorAvatar({ item }: { item: Author }) {
  return (
    <Pressable style={styles.authorAvatar}>
      <Image
        source={{ uri: item.avatar }}
        style={{ width: '100%', height: '100%', borderRadius: 999 }}
        resizeMode="cover"
      />
    </Pressable>
  );
}


function GenreTile({ item }: { item: Genre }) {
  return (
    <Pressable style={styles.genreAvatar}>
      <View style={styles.genreIconBox}>
        {item.icon ? (
          isSvgUrl(item.icon) ? (
            <SvgUri width={100} height={100} uri={item.icon} />
          ) : (
            <Image
              source={{ uri: item.icon }}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          )
        ) : null}
      </View>

      <Text style={styles.genreName}>
        {item.name}
      </Text>
    </Pressable>
  );
}

// ---------- Section renderers ----------
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StoryRowSection({
  section,
  horizontalPadding,
  variant = 'trending',
}: {
  section: { title: string; data: Story[] };
  horizontalPadding: number;
  variant?: 'trending' | 'release';
}) {
  const router = useRouter();
  if (!section.data?.length) return null; // empty data -> section hide
  return (
    <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
      <SectionHeader title={section.title} onViewAll={() => router.push('/top-playlists')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
        {section.data.map((item) => (
          <StoryCard key={item.id} item={item} variant={variant} />
        ))}
      </ScrollView>
    </View>
  );
}

function AuthorRowSection({
  section,
  horizontalPadding,
}: {
  section: { title: string; data: Author[] };
  horizontalPadding: number;
}) {
  const router = useRouter();
  if (!section.data?.length) return null;
  return (
    <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
      <SectionHeader title={section.title} onViewAll={() => router.push('/top-playlists')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.authorsRow}>
        {section.data.map((item) => (
          <AuthorAvatar key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function GenreGridSection({
  section,
  horizontalPadding,
}: {
  section: { title: string; data: Genre[] };
  horizontalPadding: number;
}) {
  const router = useRouter();
  if (!section.data?.length) return null;

  return (
    <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
      <SectionHeader title={section.title} onViewAll={() => router.push('/top-playlists')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
        {section.data.map((item) => (
          <GenreTile key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------- Featured Books (matches requested tile-offset pattern) ----------
const HIGHLIGHT_TILE_COLORS = ['#929292', '#A6A6A6', '#D6D6D6'];

function FeaturedBooksSection({
  section,
  horizontalPadding,
}: {
  section: { title: string; data: Book[] };
  horizontalPadding: number;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryScrollRef = useRef<ScrollView>(null);

  if (!section.data?.length) return null;

  const books = section.data.slice(0, 3);

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const highlightCardHorizontalPadding = 20;
  const highlightStackGap = 16;
  const cardWidth = contentWidth - horizontalPadding * 2;

  // computed sizes — matches home.tsx (2nd file) Featured Books sizing
  const highlightInnerWidth = cardWidth - highlightCardHorizontalPadding * 2;
  const highlightTitleWidth = clampValue(highlightInnerWidth * 0.34, 92, 120);
  const highlightStackWidth = Math.max(highlightInnerWidth - highlightTitleWidth - highlightStackGap, 96);
  const highlightTileScale = highlightStackWidth / 201;
  const highlightTileSize = 108 * highlightTileScale;
  const highlightTileOffsets = [0, 42 * highlightTileScale, 93 * highlightTileScale];

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setActiveIndex(index);
    setGalleryVisible(true);
  };

  const closeGallery = () => setGalleryVisible(false);

  const handleGalleryScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / contentWidth);
    if (index !== activeIndex) setActiveIndex(index);
  };

  const goToStory = (book: Book) => {
    if (!book.story_id) return; // banner-only image, no linked story
    setGalleryVisible(false);
    // TODO: confirm this matches your actual story detail route
    router.push(`/story/${book.story_id}` as any);
  };

  return (
    <>
      <View
        style={[
          styles.highlightsCard,
          styles.highlightCard,
          {
            marginHorizontal: horizontalPadding,
            paddingHorizontal: highlightCardHorizontalPadding,
          },
        ]}
      >
        <Text
          style={[styles.highlightsTitle, styles.highlightTitle, { width: highlightTitleWidth }]}
          numberOfLines={2}
        >
          {section.title}
        </Text>

        <Pressable
          onPress={() => openGallery(0)}
          style={{ width: highlightStackWidth, height: highlightTileSize }}
        >
          {books.map((book, index) => (
            <Pressable
              key={`featured-book-${index}-${book.story_id ?? 'banner'}`}
              onPress={() => openGallery(index)}
              style={[
                styles.highlightTile,
                {
                  left: highlightTileOffsets[index],
                  width: highlightTileSize,
                  height: highlightTileSize,
                  backgroundColor: HIGHLIGHT_TILE_COLORS[index],
                  zIndex: books.length - index,
                },
                index > 0 && styles.highlightTileShadow,
              ]}
            >
              {book.image ? (
                <Image
                  source={{ uri: book.image }}
                  style={{ width: '100%', height: '100%', borderRadius: 10.5 }}
                  resizeMode="cover"
                />
              ) : null}
            </Pressable>
          ))}
        </Pressable>
      </View>

      {/* Fullscreen horizontal swipeable gallery */}
      <Modal
        visible={galleryVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGallery}
        statusBarTranslucent
      >
        <View style={styles.previewOverlay}>
          <Pressable onPress={closeGallery} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScrollEnd}
            contentOffset={{ x: galleryIndex * contentWidth, y: 0 }}
            style={{ width: contentWidth }}
          >
            {books.map((book, index) => (
              <Pressable
                key={`gallery-${index}-${book.story_id ?? 'banner'}`}
                style={[styles.gallerySlide, { width: contentWidth }]}
                onPress={() => goToStory(book)}
              >
                {book.image ? (
                  <Image
                    source={{ uri: book.image }}
                    style={{ width: '92%', height: '70%' }}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={{
                      width: '80%',
                      height: '60%',
                      borderRadius: 16,
                      backgroundColor: HIGHLIGHT_TILE_COLORS[index] ?? '#D6D6D6',
                    }}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {books.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>

          {books[activeIndex]?.story_id ? (
            <Text style={styles.galleryHint}>Tap the image to open this story</Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

function TrendingGenresRow({
  section,
  horizontalPadding,
}: {
  section: { data: { id: number; name: string }[] };
  horizontalPadding: number;
}) {
  if (!section.data?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesScroll}
      contentContainerStyle={[styles.categoriesContent, { paddingHorizontal: horizontalPadding }]}
    >
      {section.data.map((genre) => (
        <CategoryChip key={genre.id} label={genre.name} />
      ))}
    </ScrollView>
  );
}

// key -> Ionicons name mapping
const SOCIAL_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  youtube: 'logo-youtube',
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  twitter: 'logo-twitter',
  website: 'globe-outline',
  linkedin: 'logo-linkedin',
  whatsapp: 'logo-whatsapp',
};

// key -> background brand color (icon white/dark, contrast ku match)
const SOCIAL_BG_MAP: Record<string, string> = {
  youtube: '#FF0000',
  facebook: '#1877F2',
  instagram: '#C13584',
  twitter: '#1DA1F2',
  website: '#F5C518',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
};

function ConnectWithUsSection({
  section,
  horizontalPadding,
}: {
  section: { data: Record<string, string> };
  horizontalPadding: number;
}) {
  const links = Object.entries(section.data ?? {}).filter(([, url]) => !!url);
  if (!links.length) return null;

  const handlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.log('Failed to open link:', err);
    }
  };

  return (
    <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connect With Us</Text>
      </View>
      <View style={styles.recommendationCard}>
        <View style={styles.socialRow}>
          {links.map(([key, url]) => {
            const iconName = SOCIAL_ICON_MAP[key] ?? 'link-outline';
            const bgColor = SOCIAL_BG_MAP[key] ?? '#F5C518';
            const iconColor = key === 'website' ? '#1A1A1A' : '#FFFFFF';
            return (
              <Pressable
                key={key}
                onPress={() => handlePress(url)}
                style={({ pressed }) => [
                  styles.socialIconButton,
                  { backgroundColor: bgColor },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={iconName} size={24} color={iconColor} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------- Main screen ----------
export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAppSelector((state) => state.auth.user);

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.2);
  const horizontalPadding = Math.round(24 * scale);
  const footerHeight = 62 + insets.bottom;

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscoverData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.post('/', {
        method: 'getHomepageData',
      });

      if (data.statusCode === 200) {
        setSections(data.data ?? []);
      } else {
        setError(data.msg || 'Failed to load discover data');
      }
    } catch (error: any) {
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error response:', error.response);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscoverData();
  }, [fetchDiscoverData]);

  const renderSection = (section: Section, index: number) => {
    switch (section.type) {
      case 'trending-genres':
        return <TrendingGenresRow key={index} section={section} horizontalPadding={horizontalPadding} />;
      case 'featured-books':
        return <FeaturedBooksSection key={index} section={section} horizontalPadding={horizontalPadding} />;
      case 'story-row':
        return (
          <StoryRowSection
            key={index}
            section={section}
            horizontalPadding={horizontalPadding}
            variant={section.title === 'Popular & Trending' ? 'trending' : 'release'}
          />
        );
      case 'author-row':
        return <AuthorRowSection key={index} section={section} horizontalPadding={horizontalPadding} />;
      case 'genre-grid':
        return <GenreGridSection key={index} section={section} horizontalPadding={horizontalPadding} />;
      case 'connect-with-us':
        return <ConnectWithUsSection key={index} section={section} horizontalPadding={horizontalPadding} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.backgroundLayer, { height: BANNER_HEIGHT + insets.top }]} pointerEvents="none">
        <View style={styles.photo} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000', '#000000']}
          locations={[0.026, 0.6377, 1]}
          style={styles.shadow}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: MAX_CONTENT_WIDTH,
            width: contentWidth,
            alignSelf: 'center',
            paddingBottom: footerHeight + 24,
          },
        ]}
      >
        <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Hi! {user?.username}</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} hitSlop={6}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 40 }}>{error}</Text>
        ) : (
          sections.map(renderSection)
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        <Pressable style={styles.tabItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>
        <Pressable style={styles.tabItem}>
          <Ionicons name="search" size={20} color="#8A8A8A" />
          <Text style={styles.tabLabel}>Search</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => router.push('/favorites')}>
          <Ionicons name="bookmark" size={18} color="#8A8A8A" />
          <Text style={styles.tabLabel}>Favorites</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={22} color="#8A8A8A" />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}


