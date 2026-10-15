import axios from "@/axios.config";
import { getCurrentUserId } from "../download/currentUser";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/* Raw shape returned inside data.last_played.story by getLibraryData */
type RawLastPlayedStory = {
  id: number;
  cover: string | null;
  title: string;
  author?: string;
  narrator?: string;
  genre?: string[] | string;
  story_duration?: string;
  chapters: number;
  current_chapter_number: number | null;
  resume_percentage: number | null;
};

type LastPlayedStory = {
  storyId: number;
  cover: string | null;
  title: string;
  author: string;
  narrator: string;
  chapters: number;
  duration: string;
};

const normalizeLastPlayed = (raw: RawLastPlayedStory): LastPlayedStory => ({
  storyId: raw.id,
  cover: raw.cover ?? null,
  title: raw.title,
  author: raw.author ?? "",
  narrator: raw.narrator ?? "",
  chapters: raw.chapters,
  duration: raw.story_duration ?? "",
});

export default function PlaylistInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [story, setStory] = useState<LastPlayedStory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLastPlayed = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post("/", {
          method: "getLibraryData",
          user_id: userId,
        });

        const rawStory: RawLastPlayedStory | undefined =
          response.data?.data?.last_played?.story;

        if (!cancelled) {
          setStory(rawStory ? normalizeLastPlayed(rawStory) : null);
        }
      } catch (error) {
        console.log("getLibraryData (last played) failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLastPlayed();
    return () => {
      cancelled = true;
    };
  }, []);

  const sheetWidth = Math.min(width, MAX_SHEET_WIDTH);
  const scale = clampValue(sheetWidth / BASE_WIDTH, 0.85, 1.2);
  const horizontalPadding = Math.round(30 * scale);
  const avatarSize = Math.round(clampValue(72 * scale, 60, 84));
  const buttonSize = Math.round(clampValue(38 * scale, 34, 44));
  const maxSheetHeight = height * 0.85;

  const openStoryEpisode = () => {
    if (!story) return;
    router.push({ pathname: "/storyEpisode", params: { storyId: story.storyId } } as any);
  };

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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : !story ? (
          <View style={styles.loadingBox}>
            <Text style={styles.emptyText}>No story played yet.</Text>
          </View>
        ) : (
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

              <Pressable
                onPress={openStoryEpisode}
                accessibilityRole="button"
                accessibilityLabel={`Open ${story.title}`}
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}>
                {story.cover && (
                  <Image
                    source={{ uri: story.cover }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                )}
              </Pressable>

              <Pressable
                hitSlop={8}
                style={[
                  styles.shareButton,
                  { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
                ]}>
                <Ionicons name="arrow-redo" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            <Pressable onPress={openStoryEpisode} accessibilityRole="button">
              <Text style={styles.title} numberOfLines={2}>
                {story.title}
              </Text>
            </Pressable>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {story.chapters} {story.chapters === 1 ? "chapter" : "chapters"}
              </Text>
              {!!story.duration && (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.metaText}>{story.duration}</Text>
                </>
              )}
            </View>

            <Text style={styles.description}>
              {[story.author && `By ${story.author}`, story.narrator && `Narrated by ${story.narrator}`]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </ScrollView>
        )}
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

  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    color: '#FFFFFF',
    opacity: 0.6,
    fontSize: 14,
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
    overflow: 'hidden',
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