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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_SHEET_WIDTH = 480;

const DESCRIPTION =
  'Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.';

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function PlaylistInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const sheetWidth = Math.min(width, MAX_SHEET_WIDTH);
  const scale = clampValue(sheetWidth / BASE_WIDTH, 0.85, 1.2);
  const horizontalPadding = Math.round(30 * scale);
  const avatarSize = Math.round(clampValue(72 * scale, 60, 84));
  const buttonSize = Math.round(clampValue(38 * scale, 34, 44));
  const maxSheetHeight = height * 0.85;

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close playlist info"
      />

      <View
        style={[
          styles.sheet,
          {
            width: sheetWidth,
            maxHeight: maxSheetHeight,
            alignSelf: 'center',
            paddingHorizontal: horizontalPadding,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>
        <View style={styles.glow} pointerEvents="none" />

        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}>
          <View style={styles.headerRow}>
            <Pressable
              hitSlop={8}
              style={[
                styles.bookmarkButton,
                { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
              ]}>
              <Ionicons name="bookmark" size={16} color="#000000" />
            </Pressable>

            <View
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            />

            <Pressable
              hitSlop={8}
              style={[
                styles.shareButton,
                { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
              ]}>
              <Ionicons name="arrow-redo" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            Renaissance
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>843 tracks</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>23 hours</Text>
          </View>

          <Text style={styles.description}>{DESCRIPTION}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  sheet: {
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    backgroundColor: '#000000',
    paddingTop: 14,
    overflow: 'hidden',
  },

  scrollContent: {
    flexGrow: 1,
  },

  glow: {
    position: 'absolute',
    top: -160,
    alignSelf: 'center',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#1C4F0D',
    opacity: 0.5,
  },

  handle: {
    alignSelf: 'center',
    width: 35,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginBottom: 33,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bookmarkButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1C4F0D',
  },

  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.297)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },

  metaText: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },

  description: {
    color: '#FFFFFF',
    opacity: 0.72,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 32,
    paddingBottom: 8,
  },
});
