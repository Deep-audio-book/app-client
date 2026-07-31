import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 560;
const MINI_PLAYER_HEIGHT = 51;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type Track = {
  id: string;
  number: number;
  title: string;
  artist: string;
  explicit?: boolean;
  isNowPlaying?: boolean;
};

const TRACKS: Track[] = [
  { id: '1', number: 1, title: 'Burning', artist: 'Podval Caplella', explicit: true },
  { id: '2', number: 2, title: 'Flashbacks', artist: 'Emika' },
  { id: '3', number: 3, title: 'Renaissance', artist: 'Podval Caplella', isNowPlaying: true },
  { id: '4', number: 4, title: 'Ivar\u2019s Revenge', artist: 'Danheim' },
  { id: '5', number: 5, title: 'Urgent Siege', artist: 'Damned Anthem' },
  { id: '6', number: 6, title: 'Urgent Siege', artist: 'Damned Anthem' },
];

function TrackRow({ track }: { track: Track }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
      <View style={styles.trackNumberBadge}>
        <Text style={styles.trackNumberText}>{track.number}</Text>
      </View>

      <View style={styles.trackInfo}>
        <View style={styles.trackTitleRow}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          {track.explicit && (
            <View style={styles.explicitBadge}>
              <Text style={styles.explicitBadgeText}>E</Text>
            </View>
          )}
        </View>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {track.isNowPlaying && <Text style={styles.nowLabel}>NOW</Text>}

      <Pressable hitSlop={10} style={styles.trackMenuButton}>
        <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </Pressable>
  );
}

function MiniPlayer({ sideInset }: { sideInset: number }) {
  return (
    <View style={[styles.miniPlayer, { paddingHorizontal: Math.max(30, sideInset) }]}>
      <View style={styles.miniPlayerProgressTrack}>
        <View style={styles.miniPlayerProgressFill} />
      </View>

      <Pressable
        hitSlop={10}
        style={styles.miniPlayerChevron}
        accessibilityRole="button"
        accessibilityLabel="Expand player">
        <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
      </Pressable>

      <View style={styles.miniPlayerInfo}>
        <Text style={styles.miniPlayerTitle} numberOfLines={1}>
          Urgent Siege
        </Text>
        <Text style={styles.miniPlayerArtist} numberOfLines={1}>
          Damned Anthem
        </Text>
      </View>

      <Pressable
        hitSlop={10}
        style={styles.miniPlayerPause}
        accessibilityRole="button"
        accessibilityLabel="Pause">
        <Ionicons name="pause" size={16} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </View>
  );
}

function BottomTabBar({ bottomInset, sideInset }: { bottomInset: number; sideInset: number }) {
  const router = useRouter();

  return (
    <View
      style={[styles.tabBar, { paddingBottom: bottomInset + 12, paddingHorizontal: sideInset }]}>
      <Pressable
        style={styles.tabItem}
        onPress={() => router.push('/home')}
        accessibilityRole="button"
        accessibilityLabel="Home">
        <Ionicons name="home-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
          Home
        </Text>
      </Pressable>
      <Pressable style={styles.tabItem} accessibilityRole="button" accessibilityLabel="Top">
        <Ionicons name="disc-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
          Top
        </Text>
      </Pressable>
      <Pressable
        style={styles.tabItem}
        onPress={() => router.push('/favorites')}
        accessibilityRole="button"
        accessibilityLabel="Favorites">
        <Ionicons name="bookmark-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
          Favorites
        </Text>
      </Pressable>
      <Pressable style={styles.tabItem} accessibilityRole="button" accessibilityLabel="Search">
        <Ionicons name="search-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
          Search
        </Text>
      </Pressable>
    </View>
  );
}

export default function AlbumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(26 * scale), sideInset);

  const heroHeight = Math.min(clampValue(height * 0.41, 260, 420), height * 0.6);
  const coverSize = Math.round(clampValue(136 * scale, 100, 160));
  const coverRadius = Math.round(coverSize * 0.1);
  const titleSize = Math.round(clampValue(28 * scale, 22, 32));
  const playButtonSize = Math.round(clampValue(69 * scale, 58, 80));
  const smallButtonSize = Math.round(clampValue(38 * scale, 34, 44));
  const footerHeight = MINI_PLAYER_HEIGHT + 62 + insets.bottom;

  const header = (
    <View style={[styles.hero, { height: heroHeight, marginHorizontal: -horizontalPadding }]}>
      <View style={styles.heroGlow} />
      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000']}
        locations={[0.3, 1]}
        style={styles.heroShadow}
      />

      <SafeAreaView
        edges={['top']}
        style={[styles.heroNav, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="More options">
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </SafeAreaView>

      <View style={styles.heroBody}>
        <View
          style={[
            styles.cover,
            { width: coverSize, height: coverSize, borderRadius: coverRadius },
          ]}
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Wunder King album cover"
        />
        <Text
          style={[styles.heroTitle, { fontSize: titleSize }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
          accessibilityRole="header">
          Wunder King
        </Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMetaText} maxFontSizeMultiplier={1.5}>
            Элджей
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.heroMetaText} maxFontSizeMultiplier={1.5}>
            2018
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.circleButtonSmall,
              {
                width: smallButtonSize,
                height: smallButtonSize,
                borderRadius: smallButtonSize / 2,
              },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share">
            <Ionicons name="arrow-redo" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[
              styles.playButton,
              {
                width: playButtonSize,
                height: playButtonSize,
                borderRadius: playButtonSize / 2,
              },
            ]}
            onPress={() => router.push('/player-standard')}
            accessibilityRole="button"
            accessibilityLabel="Play album">
            <Ionicons name="play" size={26} color="#000000" style={styles.playIcon} />
          </Pressable>
          <Pressable
            style={[
              styles.circleButtonSmall,
              {
                width: smallButtonSize,
                height: smallButtonSize,
                borderRadius: smallButtonSize / 2,
              },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add to favorites">
            <Ionicons name="bookmark" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={TRACKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push('/player-standard')}>
            <TrackRow track={item} />
          </Pressable>
        )}
        ListHeaderComponent={header}
        contentContainerStyle={[
          {
            maxWidth: MAX_CONTENT_WIDTH,
            width: contentWidth,
            alignSelf: 'center',
            paddingHorizontal: horizontalPadding,
            paddingBottom: footerHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <MiniPlayer sideInset={sideInset} />
        <BottomTabBar bottomInset={insets.bottom} sideInset={sideInset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  hero: {
    overflow: 'hidden',
  },

  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#806881',
  },

  heroShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },

  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },

  heroBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },

  cover: {
    width: 136,
    height: 136,
    borderRadius: 14,
    backgroundColor: '#FC6BAB',
    marginBottom: 21,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
  },

  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },

  heroMetaText: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.65,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginTop: 28,
  },

  circleButtonSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.297)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButton: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playIcon: {
    marginLeft: 3,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 10,
    gap: 16,
  },

  pressed: {
    opacity: 0.6,
  },

  trackNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.296)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trackNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  trackInfo: {
    flex: 1,
  },

  trackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  trackTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    flexShrink: 1,
  },

  explicitBadge: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  explicitBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
  },

  trackArtist: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    marginTop: 2,
  },

  nowLabel: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 12,
  },

  trackMenuButton: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  miniPlayer: {
    height: 51,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  miniPlayerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  miniPlayerProgressFill: {
    width: '44%',
    height: 3,
    backgroundColor: '#FFFFFF',
  },

  miniPlayerChevron: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniPlayerInfo: {
    flex: 1,
    alignItems: 'center',
  },

  miniPlayerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  miniPlayerArtist: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 11,
    marginTop: 2,
  },

  miniPlayerPause: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingTop: 12,
  },

  tabItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tabLabel: {
    color: '#8A8A8A',
    fontSize: 11,
  },
});
