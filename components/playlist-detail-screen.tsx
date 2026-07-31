import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

type Playlist = {
  id: string;
  title: string;
  trackCount: number;
  duration: string;
  tracks: Track[];
};

// ---- Mock data source, keyed by playlist id ----
// Replace this with a real API/DB call when ready (see fetch example at bottom of file).
const PLAYLISTS: Record<string, Playlist> = {
  '1': {
    id: '1',
    title: 'Ezhavathu Jenmam',
    trackCount: 843,
    duration: '23 hours',
    tracks: [
      { id: '1', number: 1, title: 'chapter 1', artist: 'Indra Soundarrajan', explicit: true },
      { id: '2', number: 2, title: 'chapter 2', artist: 'Indra Soundarrajan' },
      { id: '3', number: 3, title: 'chapter 3', artist: 'Indra Soundarrajan' },
    ],
  },
  '2': {
    id: '2',
    title: 'Chill Vibes',
    trackCount: 210,
    duration: '9 hours',
    tracks: [
      { id: '1', number: 1, title: 'Sunset Drive', artist: 'Nightcall' },
      { id: '2', number: 2, title: 'Slow Motion', artist: 'Emika' },
      { id: '3', number: 3, title: 'Golden Hour', artist: 'Kiasmos', isNowPlaying: true },
    ],
  },
  '3': {
    id: '3',
    title: 'Workout Mix',
    trackCount: 95,
    duration: '5 hours',
    tracks: [
      { id: '1', number: 1, title: 'Pump It Up', artist: 'DJ Force', explicit: true },
      { id: '2', number: 2, title: 'Run Faster', artist: 'Cardio King' },
    ],
  },
};

const DEFAULT_PLAYLIST_ID = '1';

type TrackRowProps = {
  track: Track;
  onPress?: () => void;
};

function TrackRow({ track, onPress }: TrackRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trackRow,
        pressed && styles.pressed,
      ]}
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

      {track.isNowPlaying && (
        <Text style={styles.nowLabel}>NOW</Text>
      )}

      <Pressable
        hitSlop={10}
        style={styles.trackMenuButton}
        onPress={() => {
          // menu action
        }}>
        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color="rgba(255,255,255,0.5)"
        />
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

      <Pressable hitSlop={10} style={styles.miniPlayerChevron}>
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

      <Pressable hitSlop={10} style={styles.miniPlayerPause}>
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
      <Pressable style={styles.tabItem} onPress={() => router.push("/home")}>
        <Ionicons name="home-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Home</Text>
      </Pressable>
      <Pressable style={styles.tabItem}>
        <Ionicons name="disc-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Top</Text>
      </Pressable>
      <Pressable style={styles.tabItem} onPress={() => router.push('/favorites')}>
        <Ionicons name="bookmark-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Favorites</Text>
      </Pressable>
      <Pressable style={styles.tabItem}>
        <Ionicons name="search-outline" size={22} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Search</Text>
      </Pressable>
    </View>
  );
}

export default function PlaylistDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  // id can arrive as a string or string[] depending on route matching — normalize it
  const playlistId = Array.isArray(id) ? id[0] : id;

  // Look up the playlist for this id, falling back to a default if not found
  const playlist =
    PLAYLISTS[playlistId ?? ''] ?? PLAYLISTS[DEFAULT_PLAYLIST_ID];

  // console.log('Selected Playlist ID:', playlistId, '-> loaded:', playlist.title);

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(26 * scale), sideInset);

  const heroHeight = Math.min(
    clampValue(height * 0.41, 260, 420),
    height * 0.6
  );
  const avatarSize = Math.round(clampValue(136 * scale, 100, 160));
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
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => router.push('/playlist-info')}>
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </SafeAreaView>

      <View style={styles.heroBody}>
        <View
          style={[
            styles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
        <Text style={[styles.heroTitle, { fontSize: titleSize }]} numberOfLines={1}>
          {playlist.title}
        </Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMetaText}>{playlist.trackCount} tracks</Text>
          <View style={styles.metaDot} />
          <Text style={styles.heroMetaText}>{playlist.duration}</Text>
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
            hitSlop={8}>
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
            onPress={() => router.push('/player-standard')}>
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
            hitSlop={8}>
            <Ionicons name="bookmark" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
     <View style={styles.container}>
    <FlatList
      data={playlist.tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TrackRow
          track={item}
          onPress={() => router.push('/player-standard')}
        />
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
      {/* <MiniPlayer sideInset={sideInset} /> */}
      <BottomTabBar
        bottomInset={insets.bottom}
        sideInset={sideInset}
      />
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
    backgroundColor: '#5C0A17',
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

  avatar: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#F74A53',
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