import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 560;
const CARD_HEIGHT = 181;

type Playlist = {
  id: string;
  title: string;
  tracks: number;
  hours: number;
  gradientColors: [string, string];
  image: any;
};

const PLAYLISTS: Playlist[] = [
  {
    id: 'renaissance-1',
    title: '',
    tracks: 843,
    hours: 23,
    gradientColors: ['#8BB400', '#0FD890'],
    image: require('../assets/images/top-playlist/1.jpeg'),

  },
  {
    id: 'renaissance-2',
    title: '',
    tracks: 843,
    hours: 23,
    gradientColors: ['#8BB400', '#0FD890'],
    image: require('../assets/images/top-playlist/2.jpg'),

  },
  {
    id: 'urgent-siege',
    title: '',
    tracks: 843,
    hours: 23,
    gradientColors: ['#FC000A', '#FD764C'],
    image: require('../assets/images/top-playlist/3.jpg'),

  },
  {
    id: 'ecstasy',
    title: '',
    tracks: 843,
    hours: 23,
    gradientColors: ['#7BADF1', '#F1C343'],
    image: require('../assets/images/top-playlist/4.jpg'),

  },
];

function PlaylistCard({
  playlist,
  height,
  onPress,
}: {
  playlist: Playlist;
  height: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <LinearGradient
  colors={playlist.gradientColors}
  style={[styles.card, { height }]}
>
  <Image
    source={playlist.image}
    style={styles.cardImage}
    resizeMode="cover"
  />

  <TouchableOpacity
    style={styles.bookmarkButton}
    activeOpacity={0.7}>
    <Ionicons name="bookmark" size={18} color="#000" />
  </TouchableOpacity>

  <View style={styles.cardInfo}>
    <Text style={styles.cardTitle}>{playlist.title}</Text>
    <View style={styles.cardMetaRow}>
      <Text style={styles.cardMetaText}>{playlist.tracks} tracks</Text>
      <View style={styles.metaDot} />
      <Text style={styles.cardMetaText}>{playlist.hours} hours</Text>
    </View>
  </View>

  <TouchableOpacity
    style={styles.playButton}
    onPress={onPress}>
    <Ionicons name="play" size={26} color="#000" />
  </TouchableOpacity>
</LinearGradient>
    </TouchableOpacity>
  );
}

function MiniPlayer() {
  return (
    <View style={styles.miniPlayer}>
      <View style={styles.miniPlayerProgress} />
      <View style={styles.miniPlayerContent}>
        <Ionicons
          name="chevron-up"
          size={19}
          color="#FFFFFF"
          style={styles.miniPlayerChevron}
        />
        <View style={styles.miniPlayerText}>
          <Text style={styles.miniPlayerTitle} numberOfLines={1}>
            Urgent Siege
          </Text>
          <Text style={styles.miniPlayerSubtitle} numberOfLines={1}>
            Damned Anthem
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="pause" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BottomTabBar({ bottomInset }: { bottomInset: number }) {
  const router = useRouter();

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 12 }]}>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/home")}>
        <Ionicons name="home-outline" size={24} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem}>
        <Ionicons name="disc-outline" size={24} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Top</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/favorites')}>
        <Ionicons name="bookmark-outline" size={24} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Favorites</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem}>
        <Ionicons name="search-outline" size={24} color="#8A8A8A" />
        <Text style={styles.tabLabel}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}
export default function TopPlaylistsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const cardHeight = (contentWidth / BASE_WIDTH) * CARD_HEIGHT;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <Text style={styles.headerTitle}>Top Playlists</Text>
          {PLAYLISTS.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              height={cardHeight}
              onPress={() => router.push('/playlist-detail')}
            />
          ))}
        </View>
      </ScrollView>
      <MiniPlayer />
      <BottomTabBar bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    gap: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  bookmarkButton: {
    position: 'absolute',
    left: 18,
    top: 21,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
  },
  card: {
  width: '100%',
  borderRadius: 8,
  overflow: 'hidden',
  justifyContent: 'flex-end',
  position: 'relative',
},

cardImage: {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
},
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.65,
  },
  playButton: {
    position: 'absolute',
    right: 17,
    bottom: 23,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 3,
  },
  miniPlayer: {
    height: 51,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  miniPlayerProgress: {
    height: 3,
    width: '44%',
    backgroundColor: '#FFFFFF',
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  miniPlayerChevron: {
    opacity: 0.5,
  },
  miniPlayerText: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  miniPlayerSubtitle: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 11,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    color: '#8A8A8A',
    fontSize: 11,
  },
});
