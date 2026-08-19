import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 560;
const MINI_PLAYER_HEIGHT = 51;
const TAB_BAR_CONTENT_HEIGHT = 62;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'tracks', label: 'Tracks', icon: 'musical-notes-outline' },
  { id: 'artist', label: 'Artist', icon: 'person-outline' },
  { id: 'album', label: 'Album', icon: 'disc-outline' },
  { id: 'playlists', label: 'Playlists', icon: 'list-outline' },
  { id: 'download', label: 'Download', icon: 'download-outline' },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.82, 1.25);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(12 * scale), sideInset);
  const footerHeight = MINI_PLAYER_HEIGHT + TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const cardHeight = Math.round(clampValue(181 * scale, 140, 220));
  const menuItemHeight = Math.max(Math.round(58 * scale), MIN_TOUCH_TARGET);
  const avatarSize = Math.round(clampValue(44 * scale, 38, 52));

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerHeight }]}>
        <View
          style={[
            styles.content,
            { maxWidth: MAX_CONTENT_WIDTH, width: contentWidth, alignSelf: 'center' },
          ]}>
          <View
            style={[
              styles.header,
              { paddingTop: insets.top + 16, paddingHorizontal: Math.round(30 * scale) },
            ]}>
            <Text
              style={[styles.headerTitle, { fontSize: Math.round(33 * scale) }]}
              maxFontSizeMultiplier={1.4}
              numberOfLines={1}>
              Favorites
            </Text>
            <Pressable
              style={styles.avatarWrapper}
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile">
              <View
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.playlistStack, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.stackCardBack, { top: Math.round(16 * scale), height: cardHeight }]} />

            <View style={[styles.stackCardFront, { height: cardHeight, padding: Math.round(18 * scale) }]}>
              <LinearGradient
                colors={['#FDF04F', '#F21300']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text
                style={[styles.playlistTitle, { fontSize: Math.round(28 * scale) }]}
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                adjustsFontSizeToFit>
                Did you like it
              </Text>
              <Text
                style={[styles.playlistSubtitle, { fontSize: Math.round(16 * scale) }]}
                maxFontSizeMultiplier={1.3}>
                843 tracks
              </Text>

              <Pressable
                style={[
                  styles.playButton,
                  {
                    right: Math.round(18 * scale),
                    top: Math.round(18 * scale),
                    width: Math.round(60 * scale),
                    height: Math.round(60 * scale),
                    borderRadius: Math.round(30 * scale),
                  },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Play favorites">
                <Ionicons
                  name="play"
                  size={Math.round(22 * scale)}
                  color="#000000"
                  style={styles.playIcon}
                />
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.menuList,
              { paddingHorizontal: horizontalPadding, gap: Math.round(12 * scale) },
            ]}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    minHeight: menuItemHeight,
                    paddingHorizontal: Math.round(18 * scale),
                    gap: Math.round(24 * scale),
                  },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name={item.icon} size={Math.round(22 * scale)} color="#FFFFFF" />
                </View>
                <Text
                  style={[styles.menuLabel, { fontSize: Math.round(16 * scale) }]}
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.miniPlayer}>
          <View style={styles.miniPlayerProgressTrack}>
            <View style={styles.miniPlayerProgressFill} />
          </View>

          <View
            style={[
              styles.miniPlayerContent,
              { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: Math.max(30, sideInset) },
            ]}>
            <Pressable hitSlop={10} style={styles.miniPlayerExpand}>
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

        {/* <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          <View
            style={[
              styles.tabBarContent,
              { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: sideInset },
            ]}>
            <Pressable style={styles.tabItem} onPress={() => router.push('/home')}>
              <Ionicons name="home-outline" size={22} color="#8A8A8A" />
              <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
                Home
              </Text>
            </Pressable>

            <Pressable style={styles.tabItem} onPress={() => router.push('/top-playlists')}>
              <Ionicons name="stats-chart-outline" size={20} color="#8A8A8A" />
              <Text style={styles.tabLabel} maxFontSizeMultiplier={1.3}>
                Top
              </Text>
            </Pressable>

            <Pressable style={styles.tabItem}>
              <Ionicons name="bookmark" size={20} color="#FFFFFF" />
              <Text style={[styles.tabLabel, styles.tabLabelActive]} maxFontSizeMultiplier={1.3}>
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
        </SafeAreaView> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    width: '100%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 12,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '700',
  },

  avatarWrapper: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FED2B0',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },

  playlistStack: {
    marginTop: 8,
    marginBottom: 16,
  },

  stackCardBack: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    height: 181,
    borderRadius: 8,
    backgroundColor: '#000000',
  },

  stackCardFront: {
    height: 181,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 18,
    justifyContent: 'flex-end',
  },

  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
  },

  playlistSubtitle: {
    color: '#FFFFFF',
    opacity: 0.648,
    fontSize: 16,
    marginTop: 6,
  },

  playButton: {
    position: 'absolute',
    right: 18,
    top: 18,
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

  menuList: {
    gap: 12,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 18,
    gap: 24,
  },

  pressed: {
    opacity: 0.6,
  },

  menuIconWrapper: {
    width: 24,
    alignItems: 'center',
  },

  menuLabel: {
    color: '#FFFFFF',
    fontSize: 16,
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

  miniPlayerExpand: {
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

  tabLabelActive: {
    color: '#FFFFFF',
  },
});
