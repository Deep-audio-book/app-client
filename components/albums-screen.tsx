import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 560;
const HEADER_HEIGHT = 86;
const MINI_PLAYER_HEIGHT = 51;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type Album = {
  id: string;
  title: string;
  artist: string;
  year: string;
  color: string;
  explicit?: boolean;
  image:any;
};

const ALBUMS: Album[] = [
  { id: 'danheim-1', title: 'Danheim', artist: 'Podval Caplella', year: '2018', color: '#DCC646', explicit: true ,image:require('../assets/images/album/1-1.png')},
  { id: 'flower-power', title: 'Flower Power', artist: 'Ray Charles', year: '2018', color: '#447B77',image:"" },
  { id: 'this-is-not-a-test', title: 'This Is Not A Test', artist: 'TobyMac', year: '2018', color: '#A05624', explicit: true,image:"" },
  { id: 'she-is-coming', title: 'SHE IS COMING', artist: 'Miley Cyrus', year: '2018', color: '#A62900',image:"" },
  { id: 'danheim-2', title: 'Danheim', artist: 'Podval Caplella', year: '2018', color: '#437C00',image:"" },
  { id: 'wunder-king', title: 'Wunder King', artist: '\u042d\u043b\u0434\u0436\u0435\u0439', year: '2018', color: '#ED90C9', explicit: true,image:"" },
  { id: 'velvet-side-a', title: 'VELVET: Side A', artist: 'Adam Lambert', year: '2018', color: '#A69C92', explicit: true,image:"" },
  { id: 'danheim-3', title: 'Danheim', artist: 'Podval Caplella', year: '2018', color: '#A03E50', explicit: true,image:"" },
];

function AlbumRow({ album, artworkSize }: { album: Album; artworkSize: number }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}>
      {/* <View
        style={[
          styles.artwork,
          { width: artworkSize, height: artworkSize, backgroundColor: album.color },
        ]}
      /> */}
      <Image
  source={album.image}
  style={[
    styles.artwork,
    {
      width: artworkSize,
      height: artworkSize,
    },
  ]}
  resizeMode="cover"
/>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.6}>
          {album.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1} maxFontSizeMultiplier={1.6}>
          {album.artist}
        </Text>
        <Text style={styles.year} maxFontSizeMultiplier={1.6}>
          {album.year}
        </Text>
      </View>

      {album.explicit && (
        <View style={styles.explicitBadge}>
          <Text style={styles.explicitBadgeText} maxFontSizeMultiplier={1.2}>
            E
          </Text>
        </View>
      )}

      <Pressable hitSlop={10} style={styles.menuButton}>
        <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </Pressable>
  );
}

function Header({ topInset, horizontalPadding }: { topInset: number; horizontalPadding: number }) {
  const router = useRouter();

  return (
    <View style={[styles.header, { height: HEADER_HEIGHT + topInset, paddingTop: topInset }]}>
      <View
        style={[
          styles.headerContent,
          { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: horizontalPadding },
        ]}>
        <Pressable hitSlop={10} style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          Albums
        </Text>
        <Pressable hitSlop={10} style={styles.headerButton}>
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function MiniPlayer({ sideInset }: { sideInset: number }) {
  return (
    <View style={styles.miniPlayer}>
      <View style={styles.miniPlayerProgressTrack}>
        <View style={styles.miniPlayerProgressFill} />
      </View>

      <View
        style={[
          styles.miniPlayerContent,
          { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: Math.max(30, sideInset) },
        ]}>
        <Pressable hitSlop={10} style={styles.miniPlayerChevron}>
          <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <View style={styles.miniPlayerInfo}>
          <Text style={styles.miniPlayerTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            Urgent Siege
          </Text>
          <Text style={styles.miniPlayerArtist} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            Damned Anthem
          </Text>
        </View>

        <Pressable hitSlop={10} style={styles.miniPlayerPause}>
          <Ionicons name="pause" size={16} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
    </View>
  );
}

function BottomTabBar({ bottomInset, sideInset }: { bottomInset: number; sideInset: number }) {
    const router = useRouter();

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 12 }]}>
      <View style={[styles.tabBarContent, { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: sideInset }]}>
        <Pressable style={styles.tabItem}
        onPress={() => router.push("/home")}>
          <Ionicons name="home-outline" size={22} color="#8A8A8A" />
          <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
            Home
          </Text>
        </Pressable>
        <Pressable style={styles.tabItem}>
          <Ionicons name="stats-chart-outline" size={20} color="#8A8A8A" />
          <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
            Top
          </Text>
        </Pressable>
        <Pressable style={styles.tabItem}onPress={() => router.push('/favorites')}>
          <Ionicons name="bookmark" size={20} color="#8A8A8A" />
          <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
            Favorites
          </Text>
        </Pressable>
        <Pressable style={styles.tabItem}>
          <Ionicons name="search-outline" size={20} color="#8A8A8A" />
          <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
            Search
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AlbumsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(30 * scale), sideInset);
  const artworkSize = Math.round(clampValue(78 * scale, 64, 90));

  const headerHeight = HEADER_HEIGHT + insets.top;
  const footerHeight = MINI_PLAYER_HEIGHT + 62 + insets.bottom;

  return (
    <View style={styles.container}>
      <FlatList
        data={ALBUMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlbumRow album={item} artworkSize={artworkSize} />}
        contentContainerStyle={{
          maxWidth: MAX_CONTENT_WIDTH,
          width: contentWidth,
          alignSelf: 'center',
          paddingHorizontal: horizontalPadding,
          paddingTop: headerHeight + 20,
          paddingBottom: footerHeight,
        }}
        showsVerticalScrollIndicator={false}
      />

      <Header topInset={insets.top} horizontalPadding={horizontalPadding} />

      <View style={styles.footer}>
        <MiniPlayer sideInset={sideInset} />
        <SafeAreaView edges={['bottom']}>
          <BottomTabBar bottomInset={0} sideInset={sideInset} />
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
//   artwork: {
//   borderRadius: 12,
//   overflow: 'hidden',
// },

artwork: {
    borderRadius: 14,
  },

  headerContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 12,
    gap: 12,
  },

  pressed: {
    opacity: 0.6,
  },

  info: {
    flex: 1,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },

  artist: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
    marginTop: 6,
  },

  year: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
    marginTop: 6,
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

  menuButton: {
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
  },

  miniPlayerContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#000000',
    paddingTop: 12,
  },

  tabBarContent: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
  },

  tabItem: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tabLabel: {
    color: '#8A8A8A',
    fontSize: 11,
  },
});
