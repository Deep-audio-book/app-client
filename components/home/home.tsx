import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Pressable,
    ScrollView,
    Text,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const CATEGORIES = ['#Drama', '#Tv & Radio', '#Kids', '#Romance'];

type Title = {
  id: string;
  title: string;
  author: string;
};

const TRENDING: Title[] = [
  { id: 'band-of-brothers', title: 'Band of Brothers', author: 'Stephen E.Ambrose' },
  { id: 'the-pacific', title: 'The Pacific', author: 'Hugh Ambrose' },
  { id: 'strong-men-armed', title: 'Strong Men Armed', author: 'Robert Leckie' },
];

const FEATURED_AUTHORS = ['author-1', 'author-2', 'author-3', 'author-4', 'author-5','author-6'];

function CategoryChip({ label }: { label: string }) {
  return (
    <View style={styles.categoryChip}>
      <Text style={styles.categoryChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function TrendingCard({ item }: { item: Title }) {
  return (
    <View style={styles.trendingCard}>
      <View style={styles.trendingArtwork}>
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
    </View>
  );
}

function ReleaseCard({ item }: { item: Title }) {
  return (
    <View style={styles.ReleaseCard}>
      <View style={styles.ReleaseArtwork}>
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
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width,MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.2);
  const horizontalPadding = Math.round(24 * scale);
  const footerHeight = 62 + insets.bottom;

   const user = useAppSelector((state) => state.auth.user);
  
  return (
    <View style={styles.container}>
      {/* Fixed background layer: green photo fading to black, not a boxed banner */}
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
        <View
          style={[
            styles.header,
            { paddingHorizontal: horizontalPadding, paddingTop: insets.top + 20 },
          ]}
        >
          <Text style={styles.headerTitle}>Hi! {user?.username}</Text>
          <View style={styles.headerActions}>
            {/* <Pressable style={styles.iconButton} hitSlop={6}>
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            </Pressable> */}
            <Pressable style={styles.iconButton} hitSlop={6}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={[styles.categoriesContent, { paddingHorizontal: horizontalPadding }]}
        >
          {CATEGORIES.map((category) => (
            <CategoryChip key={category} label={category} />
          ))}
        </ScrollView>

        <View style={[styles.highlightsCard, { marginHorizontal: horizontalPadding }]}>
          <Text style={styles.highlightsTitle}>FEATURED BOOKS</Text>
          <View style={styles.highlightsStack}>
            <View style={[styles.highlightsThumb, { backgroundColor: '#929292', left: 0 }]} />
            <View style={[styles.highlightsThumb, { backgroundColor: '#A6A6A6', left: 42 }]} />
            <View style={[styles.highlightsThumb, { backgroundColor: '#D6D6D6', left: 93 }]} />
          </View>
        </View>

        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular & Trending</Text>
             <Pressable
                onPress={() => router.push('/top-playlists')}
                style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {TRENDING.map((item) => (
              <TrendingCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>

       <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Author</Text>
            <Pressable
            onPress={() => router.push('/top-playlists')}
            style={({ pressed }) => [ pressed && styles.pressed]}
            >
            <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
        </View>

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.authorsRow}
        >
            {FEATURED_AUTHORS.map((id) => (
            <View key={id} style={styles.authorAvatar} />
            ))}
        </ScrollView>
        </View>

        {/* This part is new release card session */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New releases</Text>
             <Pressable
                onPress={() => router.push('/top-playlists')}
                style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {TRENDING.map((item) => (
              <ReleaseCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>


        {/* Genre details*/}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Genres</Text>
                <Pressable
                onPress={() => router.push('/top-playlists')}
                style={({ pressed }) => [ pressed && styles.pressed]}
                >
                <Text style={styles.viewAllText}>View All</Text>
                </Pressable>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreRow}
            >
                {FEATURED_AUTHORS.map((id) => (
                <View key={id} style={styles.genreAvatar} />
                ))}
            </ScrollView>
        </View>

        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Listen</Text>
             <Pressable
                onPress={() => router.push('/top-playlists')}
                style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {TRENDING.map((item) => (
              <ReleaseCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>


        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connect With Us</Text>
            {/* <Pressable hitSlop={6}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable> */}
          </View>
          <View style={styles.recommendationCard} />
        </View>
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
