import { Ionicons } from '@expo/vector-icons';
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
import styles from './style';



function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, styles.MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / styles.BASE_WIDTH, 0.85, 1.25);
  const footerHeight = styles.MINI_PLAYER_HEIGHT + styles.TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const horizontalPadding = Math.round(clampValue(12 * scale, 12, 24));
  const avatarSize = Math.round(clampValue(97 * scale, 88, 120));
  const buttonMinHeight = Math.round(clampValue(58 * scale,styles. MIN_TOUCH_TARGET, 68));

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
        style={({ pressed }) => [
          styles.button,
          { minHeight: buttonMinHeight },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>Logout</Text>
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

          <Pressable style={styles.tabItem} onPress={() => router.push('/favorites')}>
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

