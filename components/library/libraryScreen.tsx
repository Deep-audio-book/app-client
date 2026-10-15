import axios from "@/axios.config";
import {
  getDownloadedStorySummaries,
  withLocalMedia,
} from "../download/downloadService";
import { useDownloadStore, waitForHydration } from "../download/downloadStore";
import { getCurrentUserId } from "../download/currentUser";
import { usePlayer } from "../../providers/PlayerProvider";
import { setIsExpanded } from "../../redux/slices/playerReducer";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import ProfileDot from "../ui/ProfileDot";

/* ---------- icons ---------- */

interface IconProps {
  size?: number;
  color?: string;
}

const PlayIcon = ({ size = 15, color = "#000" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = "#3ba36a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={9} />
    <Polyline points="8 12.5 10.8 15 16 9.5" />
  </Svg>
);

const DownloadingIcon = ({ size = 16, color = "#D9A441" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 19h14" strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = 17, color = "rgba(255,255,255,0.35)" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="9 6 15 12 9 18" />
  </Svg>
);

/* ---------- types matching the backend response ---------- */

type LibraryCard = {
  story_id: number;
  title: string;
  cover: string | null;
  genre: string;
  current_chapter_number: number | null;
  total_chapters: number;
  resume_percentage: number | null;
};

/* Raw shape as returned by the backend for a single story inside
   last_played.story / recently_listened.stories[] */
type RawStory = {
  id: number;
  title: string;
  cover: string | null;
  genre?: string[] | string;
  chapters: number;
  current_chapter_number: number | null;
  resume_percentage: number | null;
};

const normalizeStory = (raw: RawStory): LibraryCard => ({
  story_id: raw.id,
  title: raw.title,
  cover: raw.cover ?? null,
  genre: Array.isArray(raw.genre) ? raw.genre.join(" · ") : raw.genre ?? "",
  current_chapter_number: raw.current_chapter_number ?? null,
  total_chapters: raw.chapters,
  resume_percentage: raw.resume_percentage ?? null,
});

type DownloadedRow = {
  storyId: string;
  title: string;
  genre: string;
  coverUri: string | null;
  episodesDownloaded: number;
  totalEpisodes: number;
  allDownloaded: boolean;
};

/* ---------- section header (title + optional "View all") ---------- */

const SectionHeader: React.FC<{ title: string; onViewAll?: () => void }> = ({
  title,
  onViewAll,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.viewAllText}>View all</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* ---------- Recently listened row (real backend data) ---------- */

const RecentRow: React.FC<{ item: LibraryCard }> = ({ item }) => (
  <TouchableOpacity
    style={styles.trackRow}
    activeOpacity={0.85}
    onPress={() =>
      router.push({ pathname: "/storyEpisode", params: { storyId: item.story_id } } as any)
    }
    accessibilityRole="button"
    accessibilityLabel={item.title}
  >
    <View style={styles.trackArt}>
      {item.cover ? (
        <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={["#e04a7a", "#8a2a4a"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </View>

    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.trackMeta} numberOfLines={1}>
        {item.current_chapter_number
          ? `Episode ${item.current_chapter_number}/${item.total_chapters}`
          : item.genre}
      </Text>
    </View>

    <ChevronRightIcon />
  </TouchableOpacity>
);

/* ---------- Downloaded row (local data) ---------- */

const DownloadedRowView: React.FC<{ item: DownloadedRow; onPress: () => void }> = ({
  item,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.trackRow}
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={item.title}
  >
    <View style={styles.trackArt}>
      {item.coverUri ? (
        <Image source={{ uri: item.coverUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={["#4ae0b0", "#2a6a8a"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </View>

    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.trackMeta} numberOfLines={1}>
        {item.allDownloaded
          ? `${item.episodesDownloaded} episode${item.episodesDownloaded === 1 ? "" : "s"} · Downloaded`
          : `${item.episodesDownloaded}/${item.totalEpisodes} episodes downloaded`}
      </Text>
    </View>

    {item.allDownloaded ? <CheckIcon /> : <DownloadingIcon />}
  </TouchableOpacity>
);

/* ---------- main component ---------- */

const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { playChapterAt, setChapters } = usePlayer();

  const netInfo = useNetInfo();
  const offline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const [lastPlayed, setLastPlayed] = useState<LibraryCard | null>(null);
  const [recentlyListened, setRecentlyListened] = useState<LibraryCard[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [downloaded, setDownloaded] = useState<DownloadedRow[]>([]);
  const [openingStoryId, setOpeningStoryId] = useState<string | null>(null);

  // ---- Last played / Recently listened: real backend data ----
  // Needs the network - if offline, we just skip the call and hide this
  // block; Downloaded (below) still works because it's local.
  const fetchLibraryData = useCallback(async () => {
    if (offline) {
      setLibraryLoading(false);
      return;
    }
    const userId = getCurrentUserId();
    if (!userId) {
      setLibraryLoading(false);
      return;
    }

    try {
      setLibraryLoading(true);
      const response = await axios.post("/", {
        method: "getLibraryData",
        user_id: userId,
      });

      if (response.data?.statusCode === 200) {
        const lastPlayedStory = response.data.data?.last_played?.story;
        setLastPlayed(lastPlayedStory ? normalizeStory(lastPlayedStory) : null);

        const recentStories: RawStory[] =
          response.data.data?.recently_listened?.stories ?? [];
        setRecentlyListened(recentStories.map(normalizeStory));
      } else {
        console.log(
          "getLibraryData non-200 statusCode:",
          response.data?.statusCode
        );
      }
    } catch (error) {
      console.log("getLibraryData failed:", error);
      // Silent - Downloaded section below still works fully offline.
    } finally {
      setLibraryLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // ---- Downloaded: local data, always works, online or offline ----
  const downloadSig = useDownloadStore((s) =>
    Object.values(s.files)
      .map((f) => `${f.storyId}:${f.chapterId}:${f.kind}:${f.status}`)
      .sort()
      .join("|")
  );

  useEffect(() => {
    waitForHydration().then(() => {
      setDownloaded(getDownloadedStorySummaries());
    });
  }, [downloadSig]);

  // ---- Tap a downloaded story ----
  // A single-episode story has nothing to choose between, so it plays
  // right away. A multi-episode story opens the chapter list (AlbumScreen)
  // so the person can pick which downloaded episode to resume.
  const handleOpenDownloaded = async (item: DownloadedRow) => {
    if (item.totalEpisodes > 1) {
      router.push({ pathname: "/storyEpisode", params: { storyId: item.storyId } } as any);
      return;
    }

    try {
      setOpeningStoryId(item.storyId);
      await waitForHydration();
      const story = useDownloadStore.getState().stories[item.storyId];
      if (!story) {
        router.push({ pathname: "/storyEpisode", params: { storyId: item.storyId } } as any);
        return;
      }

      const chapters = withLocalMedia(item.storyId, story.chapters ?? []).map((c) => ({
        ...c,
        story: story.title,
        storyId: story.id,
      }));

      setChapters(chapters);
      await playChapterAt(0, { autoPlay: true });
      dispatch(setIsExpanded(true));
      router.push("/player-standard");
    } catch (error) {
      console.error("Play downloaded story error:", error);
      router.push({ pathname: "/storyEpisode", params: { storyId: item.storyId } } as any);
    } finally {
      setOpeningStoryId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.bgFill} pointerEvents="none" />

      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000", "#000000"]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.wrapContent, { paddingBottom: insets.bottom + 12 }]}
      >
        {/* ---------- top bar ---------- */}

        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenTitle}>Library</Text>

           <ProfileDot dotStyle={styles.profileDot} textStyle={styles.profileDotText} />
        </View>

        {/* ---------- last played (needs network) ---------- */}

        {offline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              You're offline. Last played and recently listened need internet -
              your downloaded episodes below still work.
            </Text>
          </View>
        ) : libraryLoading ? (
          <View style={styles.section}>
            <ActivityIndicator size="small" color="#D9A441" />
          </View>
        ) : (
          lastPlayed && (
            <View style={styles.section}>
              <Text style={styles.eyebrow}>Last played</Text>

              <TouchableOpacity
                style={styles.lastPlayedCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/storyEpisode",
                    params: { storyId: lastPlayed.story_id },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel={`Resume ${lastPlayed.title}`}
              >
                <View style={styles.lastPlayedArt}>
                  {lastPlayed.cover ? (
                    <Image
                      source={{ uri: lastPlayed.cover }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={["#e0a94a", "#c05a2a"]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                </View>

                <View style={styles.lastPlayedInfo}>
                  <Text style={styles.lastPlayedTitle} numberOfLines={1}>
                    {lastPlayed.title}
                  </Text>
                  <Text style={styles.lastPlayedSubtitle} numberOfLines={1}>
                    {lastPlayed.current_chapter_number
                      ? `Episode ${lastPlayed.current_chapter_number}/${lastPlayed.total_chapters}`
                      : lastPlayed.genre}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${lastPlayed.resume_percentage ?? 0}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.resumeButton}>
                  <PlayIcon />
                </View>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* ---------- downloaded (local data, always works) ---------- */}
        {/* Shown before "Recently listened" to match the design. */}

        <View style={styles.section}>
          <SectionHeader
            title="Downloaded"
            onViewAll={downloaded.length > 0 ? () => router.push("/downloaded" as any) : undefined}
          />

          {downloaded.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {offline
                  ? "No downloaded episodes yet. Connect to the internet to download some for offline listening."
                  : "No downloaded episodes yet. Open a story and tap the download icon on an episode."}
              </Text>
            </View>
          ) : (
            <View style={styles.trackList}>
              {downloaded.map((item) => (
                <View key={item.storyId}>
                  {openingStoryId === item.storyId ? (
                    <View style={styles.trackRow}>
                      <ActivityIndicator size="small" color="#D9A441" />
                      <Text style={[styles.trackMeta, { marginLeft: 12 }]}>Opening…</Text>
                    </View>
                  ) : (
                    <DownloadedRowView item={item} onPress={() => handleOpenDownloaded(item)} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---------- recently listened (real data) ---------- */}

        {!offline && !libraryLoading && recentlyListened.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recently listened"
              onViewAll={() => router.push("/recentlyListened" as any)}
            />
            <View style={styles.trackList}>
              {recentlyListened.map((item) => (
                <RecentRow key={item.story_id} item={item} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default LibraryScreen;

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  wrapContent: {
    paddingBottom: 100,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2E635B",
  },
  bgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  profileDotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
  },
  profileDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  offlineBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.35)",
    backgroundColor: "rgba(217,164,65,0.08)",
  },
  offlineBannerText: {
    color: "#E8DFD0",
    fontSize: 12,
    lineHeight: 17,
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    color: "#8a8a8a",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  viewAllText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },

  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9a9a9a",
    lineHeight: 19,
  },

  /* last played card */
  lastPlayedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#151515",
    padding: 12,
    gap: 12,
    marginHorizontal: 16,
  },
  lastPlayedArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  lastPlayedInfo: {
    flex: 1,
  },
  lastPlayedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  lastPlayedSubtitle: {
    fontSize: 12,
    color: "#9a9a9a",
    marginTop: 2,
    marginBottom: 6,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2c2c2c",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#e0834a",
  },
  resumeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  trackList: {
    gap: 0,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingVertical: 9,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1c",
  },
  trackArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#151515",
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  trackMeta: {
    fontSize: 11,
    color: "#8a8a8a",
    marginTop: 1,
  },
});