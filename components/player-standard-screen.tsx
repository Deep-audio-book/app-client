import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, AudioStatus, createAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useVideoPlayer, VideoPlayerStatus, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* =========================================================================
   CHAPTER / STORY LIST
   ========================================================================= */
type Chapter = {
  id: string;
  title: string;
  artist: string;
  video: number | { uri: string } | null;
  audio: number | { uri: string } | null;
};

const CHAPTERS: Chapter[] = [
  {
    id: 'chapter-1',
    title: 'Chapter 1',
    artist: 'Indra Soundarrajan',
    video: require('../assets/video/sample.mp4'),
    audio: require('../assets/audio/song.mp3'),
  },
  {
    id: 'chapter-2',
    title: 'Chapter 2',
    artist: 'Indra Soundarrajan',
    video: "",
    audio: require('../assets/audio/song.mp3'),
  },
  {
    id: 'chapter-3',
    title: 'Chapter 3 — Placeholder',
    artist: 'Podval Caplella',
    video: {
      uri: 'https://lorem.video/720p',
    },
    audio: null,
  },
];

/* ========================================================================= */

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const MAX_CONTENT_WIDTH = 480;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  'worklet';
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
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

  const [chapterIndex, setChapterIndex] = useState(0);
  const currentChapter = CHAPTERS[chapterIndex];

  const [mode, setMode] = useState<'checking' | 'video' | 'audio'>('checking');
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const autoPlayNextRef = useRef(false);

  const videoPlayer = useVideoPlayer(currentChapter.video, (player) => {
    player.loop = false;
  });

  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  const getAudioPlayer = () => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = createAudioPlayer(currentChapter.audio);
    }
    return audioPlayerRef.current;
  };

  /* -----------------------------------------------------------------------
     FIX: subscribe to the video player's statusChange ONCE for the whole
     lifetime of `videoPlayer` (dependency = [videoPlayer] only, NOT [mode]).

     Previously this effect depended on `mode`, so it re-subscribed every
     time mode changed. On chapter switch we call setMode('checking') and
     then videoPlayer.replace(newSource) in the same tick. For a small
     bundled local asset, the native 'readyToPlay' event can fire almost
     immediately — often BEFORE React has re-rendered and this effect has
     re-subscribed with the updated closure. The OLD listener (still
     holding the stale `mode === 'video'` from before the switch) would
     then run the `if (mode !== 'video')` check, find it false, and skip
     setMode('video') entirely. Result: mode got stuck on 'checking'
     forever, so the Play button silently did nothing after switching
     chapters. This was timing-sensitive, which is why it showed up
     consistently on iOS (faster local asset load) more than elsewhere.

     Fix: never read `mode` inside this listener. Always set it
     unconditionally when a status arrives — setState calls with an
     unchanged value are cheap/no-op re-renders, so this is safe.
     ----------------------------------------------------------------------- */
  useEffect(() => {
    const sub = videoPlayer.addListener(
      'statusChange',
      (payload: { status: VideoPlayerStatus; error?: { message: string } }) => {
        if (payload.status === 'readyToPlay') {
          setMode('video');
          setDuration(videoPlayer.duration ?? 0);
          if (autoPlayNextRef.current) {
            videoPlayer.play();
            setIsPlaying(true);
            autoPlayNextRef.current = false;
          }
        } else if (payload.status === 'error') {
          console.log('Video unavailable, falling back to audio:', payload.error?.message);
          setMode('audio');
          if (autoPlayNextRef.current) {
            const player = getAudioPlayer();
            player.play();
            setIsPlaying(true);
            autoPlayNextRef.current = false;
          }
        }
      }
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPlayer]);

  useEffect(() => {
    if (mode !== 'video' || isSeeking) return;
    const interval = setInterval(() => {
      setElapsed(videoPlayer.currentTime ?? 0);
      setDuration(videoPlayer.duration ?? 0);
      setIsPlaying(videoPlayer.playing);
    }, 500);
    return () => clearInterval(interval);
  }, [mode, videoPlayer, isSeeking]);

  useEffect(() => {
    if (mode !== 'audio') return;
    const player = getAudioPlayer();

    const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (isSeeking) return;
      setElapsed(status.currentTime ?? 0);
      setDuration(status.duration ?? 0);
      setIsPlaying(status.playing ?? false);
    });

    return () => sub.remove();
  }, [mode, isSeeking]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          videoPlayer.pause();
        } catch {}
        audioPlayerRef.current?.pause();
        setIsPlaying(false);
      };
    }, [videoPlayer])
  );

  useEffect(() => {
    return () => {
      try {
        videoPlayer.pause();
      } catch {}
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (mode === 'video') {
      if (isPlaying) {
        videoPlayer.pause();
        setIsPlaying(false);
      } else {
        videoPlayer.play();
        setIsPlaying(true);
      }
    } else if (mode === 'audio') {
      const player = getAudioPlayer();
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  };

  const loadChapter = async (nextIndex: number) => {
    const clamped = clampValue(nextIndex, 0, CHAPTERS.length - 1);
    if (clamped === chapterIndex) return;

    const wasPlaying = isPlaying;
    autoPlayNextRef.current = wasPlaying;

    try {
      videoPlayer.pause();
    } catch {}
    audioPlayerRef.current?.pause();

    setIsPlaying(false);
    setElapsed(0);
    setDuration(0);
    setMode('checking');
    setChapterIndex(clamped);

    const nextChapter = CHAPTERS[clamped];

    try {
      // replaceAsync loads off the main thread — avoids the UI freeze
      // warning from the deprecated sync `replace`, and also avoids the
      // synchronous 'readyToPlay' race we hit earlier since the load is
      // now genuinely asynchronous.
      await videoPlayer.replaceAsync(nextChapter.video);
    } catch (e) {
      console.log('Video replace failed:', e);
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.remove();
      audioPlayerRef.current = null;
    }
  };

  const handlePreviousChapter = () => loadChapter(chapterIndex - 1);
  const handleNextChapter = () => loadChapter(chapterIndex + 1);

  const seekToTime = async (targetSeconds: number) => {
    const target = clampValue(targetSeconds, 0, duration || targetSeconds);
    if (mode === 'video') {
      videoPlayer.currentTime = target;
    } else if (mode === 'audio') {
      const player = getAudioPlayer();
      try {
        await player.seekTo(target);
      } catch (e) {
        console.log('Seek failed:', e);
      }
    }
    setElapsed(target);
  };

  const trackRef = useRef<View>(null);
  const trackLayout = useRef({ pageX: 0, width: 0 });

  const measureTrack = () => {
    trackRef.current?.measureInWindow((x, y, width) => {
      trackLayout.current = { pageX: x, width };
    });
  };

  const fractionFromAbsoluteX = (absoluteX: number) => {
    const { pageX, width } = trackLayout.current;
    if (width <= 0) return 0;
    return clampValue((absoluteX - pageX) / width, 0, 1);
  };

  const seekGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onBegin((e) => {
      measureTrack();
      setIsSeeking(true);
      setDragProgress(fractionFromAbsoluteX(e.absoluteX));
    })
    .onUpdate((e) => {
      setDragProgress(fractionFromAbsoluteX(e.absoluteX));
    })
    .onEnd((e) => {
      const fraction = fractionFromAbsoluteX(e.absoluteX);
      setDragProgress(fraction);
      const target = fraction * (duration || 0);
      seekToTime(target).finally(() => setIsSeeking(false));
    })
    .onFinalize(() => {
      setIsSeeking(false);
    });

  const tapGesture = Gesture.Tap().runOnJS(true).onEnd((e) => {
    measureTrack();
    const fraction = fractionFromAbsoluteX(e.absoluteX);
    const target = fraction * (duration || 0);
    seekToTime(target);
  });

  const seekBarGesture = Gesture.Race(seekGesture, tapGesture);

  const handleClose = () => {
    try {
      videoPlayer.pause();
    } catch {}
    audioPlayerRef.current?.pause();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const liveProgress = duration > 0 ? clampValue(elapsed / duration, 0, 1) : 0;
  const progress = isSeeking ? dragProgress : liveProgress;
  const displayElapsed = isSeeking ? dragProgress * duration : elapsed;

  return (
    <View style={styles.container}>
      {mode === 'video' ? (
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={videoPlayer}
          nativeControls={false}
          contentFit="cover"
        />
      ) : null}

      <LinearGradient
        colors={['#D7B385', '#AE7E55', '#000000']}
        locations={[0, 0.55, 1]}
        style={[
          StyleSheet.absoluteFillObject,
          mode === 'video' ? { opacity: 0.35 } : { opacity: 1 },
        ]}
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
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={[
              styles.backButton,
              { top: insets.top + 8 * scale, left: horizontalPadding },
            ]}>
            <Ionicons name="chevron-down" size={22 * scale} color="#FFFFFF" />
          </Pressable>

          <View style={[styles.swipeIndicator, { marginBottom: 16 * scale }]} />
          <Text
            style={[styles.playNowLabel, { fontSize: 16 * scale }]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {mode === 'video'
              ? `Play Now: Video «Mysterious» (${chapterIndex + 1}/${CHAPTERS.length})`
              : `Play Now: Playlist «Mysterious» (${chapterIndex + 1}/${CHAPTERS.length})`}
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
            {currentChapter.title}
          </Text>
          <Text style={[styles.trackArtist, { fontSize: 14 * scale }]} numberOfLines={1}>
            {currentChapter.artist}
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

            <Pressable
              style={styles.sideIcon}
              hitSlop={10}
              onPress={handlePreviousChapter}
              disabled={chapterIndex === 0}>
              <Ionicons
                name="play-skip-back"
                size={23 * scale}
                color={chapterIndex === 0 ? 'rgba(255,255,255,0.35)' : '#FFFFFF'}
              />
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
              onPress={handlePlayPause}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={26 * scale}
                color="#000"
              />
            </Pressable>

            <Pressable
              style={styles.sideIcon}
              hitSlop={10}
              onPress={handleNextChapter}
              disabled={chapterIndex === CHAPTERS.length - 1}>
              <Ionicons
                name="play-skip-forward"
                size={23 * scale}
                color={chapterIndex === CHAPTERS.length - 1 ? 'rgba(255,255,255,0.35)' : '#FFFFFF'}
              />
            </Pressable>

            <Pressable hitSlop={10} style={styles.sideIcon}>
              <Ionicons name="ellipsis-horizontal" size={20 * scale} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>

          <GestureDetector gesture={seekBarGesture}>
            <View
              ref={trackRef}
              style={[styles.progressRow, { marginTop: (isCompactHeight ? 18 : 30) * scale }]}
              onLayout={measureTrack}
              collapsable={false}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progress * 100}%` },
                    isSeeking && styles.progressThumbActive,
                  ]}
                />
              </View>
            </View>
          </GestureDetector>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(displayElapsed)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <Pressable
            style={[
              styles.musicListButton,
              {
                marginTop: (isCompactHeight ? 14 : 24) * scale,
              },
            ]}
            onPress={() => {
              try {
                videoPlayer.pause();
              } catch {}
              audioPlayerRef.current?.pause();
              router.push('/albums');
            }}>
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
  backButton: {
    position: 'absolute',
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    paddingVertical: 14,
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
  progressThumbActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
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
