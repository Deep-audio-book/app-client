import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const MAX_CONTENT_WIDTH = 480;
const MIN_TOUCH_TARGET = 44;
const DURATION_SECONDS = 163;
const ELAPSED_SECONDS = 36;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function PlayerStandardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const availableHeight = height - insets.top - insets.bottom;
  const scale = clampValue(
    Math.min(contentWidth / BASE_WIDTH, availableHeight / BASE_HEIGHT),
    0.75,
    1.15
  );
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(30 * scale), sideInset, 16);
  const isCompactHeight = availableHeight < 600;

  const progress = ELAPSED_SECONDS / DURATION_SECONDS;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#D7B385', '#AE7E55', '#000000']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View
        style={[
          styles.content,
          { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' },
        ]}>
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + 12 * scale, paddingHorizontal: horizontalPadding },
          ]}>
          <View style={[styles.swipeIndicator, { marginBottom: 16 * scale }]} />
          <Text
            style={[styles.playNowLabel, { fontSize: 16 * scale }]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            Play Now: Playlist «Mysterious»
          </Text>
        </View>

        <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
          <Pressable
            style={[
              styles.favoriteButton,
              {
                width: Math.max(38 * scale, MIN_TOUCH_TARGET),
                height: Math.max(38 * scale, MIN_TOUCH_TARGET),
                borderRadius: Math.max(38 * scale, MIN_TOUCH_TARGET) / 2,
                marginBottom: 22 * scale,
              },
            ]}
            hitSlop={8}>
            <Ionicons name="bookmark-outline" size={18 * scale} color="#FFFFFF" />
          </Pressable>

          <Text
            style={[styles.trackTitle, { fontSize: isCompactHeight ? 22 : 26 * scale }]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            Burning
          </Text>
          <Text style={[styles.trackArtist, { fontSize: 14 * scale }]} numberOfLines={1}>
            Podval Caplella
          </Text>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + (isCompactHeight ? 12 : 20),
            },
          ]}>
          <View style={styles.controlsRow}>
            <Pressable hitSlop={10} style={styles.sideIcon}>
              <Ionicons name="shuffle" size={20 * scale} color="rgba(255,255,255,0.55)" />
            </Pressable>

            <Pressable style={styles.sideIcon} hitSlop={10}>
              <Ionicons name="play-skip-back" size={23 * scale} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[
                styles.playButton,
                {
                  width: Math.max(69 * scale, MIN_TOUCH_TARGET + 8),
                  height: Math.max(69 * scale, MIN_TOUCH_TARGET + 8),
                  borderRadius: Math.max(69 * scale, MIN_TOUCH_TARGET + 8) / 2,
                },
              ]}
              onPress={() => router.back()}>
              <Ionicons name="pause" size={26 * scale} color="#000000" />
            </Pressable>

            <Pressable style={styles.sideIcon} hitSlop={10}>
              <Ionicons name="play-skip-forward" size={23 * scale} color="#FFFFFF" />
            </Pressable>

            <Pressable hitSlop={10} style={styles.sideIcon}>
              <Ionicons name="ellipsis-horizontal" size={20 * scale} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>

          <View style={[styles.progressRow, { marginTop: (isCompactHeight ? 18 : 30) * scale }]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(ELAPSED_SECONDS)}</Text>
            <Text style={styles.timeText}>{formatTime(DURATION_SECONDS)}</Text>
          </View>

         <Pressable
            style={[
              styles.musicListButton,
              {
                marginTop: (isCompactHeight ? 14 : 24) * scale,
              },
            ]}
            onPress={() => router.push("/albums")}
          >
            <Ionicons name="chevron-up" size={13} color="#000000" />
            <Text style={styles.musicListText}>Music List</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  content: {
    flex: 1,
  },

  topBar: {
    alignItems: 'center',
  },

  swipeIndicator: {
    width: 35,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.445)',
    marginBottom: 16,
  },

  playNowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },

  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.297)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  trackTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },

  trackArtist: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },

  footer: {
    paddingTop: 8,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sideIcon: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
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

  progressRow: {
    marginTop: 30,
  },

  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.291)',
    justifyContent: 'center',
  },

  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 0,
  },

  progressThumb: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginLeft: -4,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  timeText: {
    color: '#FFFFFF',
    opacity: 0.503,
    fontSize: 14,
  },

  musicListButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 25,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12.5,
    backgroundColor: '#FFFFFF',
  },

  musicListText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '400',
  },
});
