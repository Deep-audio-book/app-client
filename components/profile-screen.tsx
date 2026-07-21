import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 480;
const MINI_PLAYER_HEIGHT = 51;
const TAB_BAR_CONTENT_HEIGHT = 62;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const footerHeight = MINI_PLAYER_HEIGHT + TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const horizontalPadding = Math.round(clampValue(12 * scale, 12, 24));
  const avatarSize = Math.round(clampValue(97 * scale, 88, 120));
  const buttonMinHeight = Math.round(clampValue(58 * scale, MIN_TOUCH_TARGET, 68));

  return (
    <View style={styles.container}>
      <View style={styles.glow} pointerEvents="none" />

      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable
            hitSlop={12}
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close profile">
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: footerHeight,
            paddingHorizontal: horizontalPadding,
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
            width: '100%',
          },
        ]}>
        <View
          style={[
            styles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />

        <Text style={styles.name}>Erlik Bachman</Text>
        <Text style={styles.email}>Bachman@mail.com</Text>

        <View style={[styles.subscriptionCard, { paddingHorizontal: Math.round(24 * scale) }]}>
          <Text style={styles.subscriptionTitle}>My subscription</Text>
          <Text style={styles.subscriptionSubtitle}>Valid until May 23, 2021</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, { minHeight: buttonMinHeight }, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Restore purchases</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, { minHeight: buttonMinHeight }, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Enter promo code</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, { minHeight: buttonMinHeight }, pressed && styles.pressed]}
          accessibilityRole="button"
          onPress={() => router.back()}>
          <Text style={styles.buttonText}>Quit</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.miniPlayer}>
          <Pressable hitSlop={10} style={styles.miniPlayerExpand}>
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle}>Urgent Siege</Text>
            <Text style={styles.miniPlayerArtist}>Damned Anthem</Text>
          </View>

          <Pressable hitSlop={10} style={styles.miniPlayerPause}>
            <Ionicons name="pause" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={styles.miniPlayerProgressTrack}>
            <View style={styles.miniPlayerProgressFill} />
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          <Pressable style={styles.tabItem} onPress={() => router.push('/home')}>
            <Ionicons name="home" size={22} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Home</Text>
          </Pressable>

          <Pressable style={styles.tabItem} onPress={() => router.push('/top-playlists')}>
            <Ionicons name="stats-chart" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Top</Text>
          </Pressable>

          <Pressable style={styles.tabItem}>
            <Ionicons name="bookmark" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Favorites</Text>
          </Pressable>

          <Pressable style={styles.tabItem}>
            <Ionicons name="search" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Search</Text>
          </Pressable>
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

  glow: {
    position: 'absolute',
    top: -180,
    alignSelf: 'center',
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: '#D6875D',
    opacity: 0.4,
  },

  headerSafeArea: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
  },

  closeButton: {
    position: 'absolute',
    right: 12,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {},

  avatar: {
    backgroundColor: '#FECBA8',
    alignSelf: 'center',
    marginTop: 24,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },

  email: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },

  subscriptionCard: {
    minHeight: 82,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },

  subscriptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  subscriptionSubtitle: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    marginTop: 4,
  },

  button: {
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  pressed: {
    opacity: 0.7,
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

  miniPlayerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  miniPlayerProgressFill: {
    width: '44%',
    height: 3,
    backgroundColor: '#FFFFFF',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingTop: 12,
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
