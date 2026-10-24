import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { usePlayer } from '../../providers/PlayerProvider';
import { setIsExpanded } from '../../redux/slices/playerReducer';
import { RootState } from '../../redux/store';

/* ========================================================================= */

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const MAX_CONTENT_WIDTH = 480;
const MIN_TOUCH_TARGET = 44;
const VIDEO_ASPECT_RATIO = 16 / 9;

// skip buttons (same as the design: back 15s, forward 30s)
const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 30;
// the video overlay keeps its own 10s buttons
const VIDEO_SKIP_SECONDS = 10;

const ACCENT = '#FF9A3D';
const ACCENT_SOFT = '#FFC078';
const BG_BASE = '#07060A';

// cover is shown as a portrait 3:4 card (width : height)
const COVER_ASPECT = 3 / 4;

const WAVE_BARS = 56;
const WAVE_HEIGHT = 54;
// bars use 80% of the row, the rest is headroom for the live bounce
const BAR_FILL = 0.8;
const SPEEDS = [1, 1.15, 1.25, 1.5, 2, 0.75];

/* ========================================================================= */

function clampValue(value: number, min: number, max: number) {
  'worklet';

  if (value < min) return min;
  if (value > max) return max;

  return value;
}

/* ========================================================================= */

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs}`;
  }

  return `${mins}:${secs}`;
}

/* ========================================================================= */
/*
 * Placeholder waveform (used until real loudness is known). The bar heights
 * are generated from the chapter id: every chapter gets its own shape, and it
 * never changes between renders. Real data replaces it as the audio plays.
 */

function makeWaveform(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const raw = Array.from({ length: count }, () => rand());

  // smooth a little so it looks like speech, not noise
  return raw.map((v, i) => {
    const prev = raw[i - 1] ?? v;
    const next = raw[i + 1] ?? v;
    const smooth = (prev + v * 2 + next) / 4;
    return 0.22 + smooth * 0.78;
  });
}

/*
 * REAL waveform support: if the backend sends peaks for the chapter
 * (array of numbers, or a JSON / comma separated string), we use them.
 */
function parsePeaks(input: unknown): number[] | null {
  let arr: unknown = input;

  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = (arr as string)
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => isFinite(v));
    }
  }

  if (!Array.isArray(arr)) return null;

  const nums = arr.map((v) => Math.abs(Number(v))).filter((v) => isFinite(v));
  return nums.length >= 8 ? nums : null;
}

// any number of peaks -> `count` bars (max of each bucket, normalised 0..1)
function resamplePeaks(peaks: number[], count: number): number[] {
  const max = Math.max(...peaks, 0.0001);
  const bucket = peaks.length / count;

  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));

    let peak = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      if (peaks[j] > peak) peak = peaks[j];
    }

    return 0.16 + (peak / max) * 0.84;
  });
}

// tiny deterministic random in 0..1 (for per-bar motion)
function noise(i: number, k: number) {
  const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ========================================================================= */
/*
 * Background: the blurred artwork of the current chapter. If the chapter has
 * no cover of its own, the story cover is used (chosen by the caller).
 */

function PlayerBackground({
  uri,
  dark,
  onError,
}: {
  uri?: string | null;
  dark: boolean;
  onError?: () => void;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG_BASE }]} />

      {uri ? (
        <Image
          key={uri}
          source={{ uri }}
          style={styles.bgImage}
          contentFit="cover"
          blurRadius={Platform.OS === 'android' ? 26 : 45}
          transition={500}
          cachePolicy="memory-disk"
          onError={onError}
        />
      ) : (
        <LinearGradient
          colors={['#D7B385', '#AE7E55', '#000000']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* one long smooth fade: colour at the top, nearly black at the bottom */}
      <LinearGradient
        colors={
          dark
            ? [
                'rgba(7,6,10,0.55)',
                'rgba(7,6,10,0.78)',
                'rgba(7,6,10,0.92)',
                'rgba(7,6,10,0.98)',
              ]
            : [
                'rgba(7,6,10,0.10)',
                'rgba(7,6,10,0.35)',
                'rgba(7,6,10,0.78)',
                'rgba(7,6,10,0.97)',
              ]
        }
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/* ========================================================================= */

export default function PlayerStandardScreen() {
  const router = useRouter();

  const { t } = useTranslation();

  const dispatch = useDispatch();

  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();

  /* =======================================================================
     REDUX
  ======================================================================= */

  const {
    chapterIndex,
    mode,
    isPlaying,
    elapsed,
    duration,
  } = useSelector(
    (s: RootState) => s.player
  );

  /* =======================================================================
     FIX MINI PLAYER WHEN SCREEN LOSES FOCUS
  ======================================================================= */

  useFocusEffect(
    useCallback(() => {
      return () => {
        dispatch(setIsExpanded(false));
      };
    }, [dispatch])
  );

  /* =======================================================================
     PLAYER PROVIDER
  ======================================================================= */

  const player = usePlayer();

  const {
    chapters,
    videoPlayer,
    currentChapter,
    bothAvailable,
    isSeeking,
    dragProgress,
    showVideoControls,
    setShowVideoControls,
    scheduleHideControls,
    handlePlayPause,
    handleToggleVideoMode,
    handlePreviousChapter,
    handleNextChapter,
    seekToTime,
    skip,
    beginSeek,
    updateSeekDrag,
    endSeek,
    collapsePlayer,
  } = player;

  // Optional features. The buttons only show up if your PlayerProvider
  // exposes these functions (add them there when you want the feature).
  const extras = player as any;
  const setPlaybackRate: ((rate: number) => void) | undefined =
    extras.setPlaybackRate;
  const toggleSleepTimer: (() => void) | undefined =
    extras.toggleSleepTimer ?? extras.setSleepTimer;

  // Real audio loudness (from useLiveWaveform inside PlayerProvider).
  // All optional: if the provider doesn't expose them, we fall back to the
  // generated animation.
  const audioLevel: Animated.Value | undefined = extras.audioLevel;
  const liveLevelAvailable: boolean = !!extras.liveLevelAvailable;
  const getWaveLevels:
    | ((chapterId: string) => number[] | undefined)
    | undefined = extras.getWaveLevels;
  const subscribeWaveLevels:
    | ((listener: () => void) => () => void)
    | undefined = extras.subscribeWaveLevels;

  const [rate, setRate] = useState(1);

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    setRate(next);
    setPlaybackRate?.(next);
  };

  /* =======================================================================
     EPISODE COUNT
  ======================================================================= */

  const totalEpisodes = chapters.length;

  const isFirstEpisode =
    totalEpisodes > 0 &&
    chapterIndex === 0;

  const isLastEpisode =
    totalEpisodes > 0 &&
    chapterIndex === totalEpisodes - 1;

  /* =======================================================================
     SEEK REFS
  ======================================================================= */

  const trackRef = useRef<View>(null);

  const trackLayout = useRef({
    pageX: 0,
    width: 0,
  });

  /* =======================================================================
     ARTWORK  (chapter cover  ->  else story cover)
  ======================================================================= */

  const chapterAny = currentChapter as any;

  // Chapter cover first. No chapter cover (empty / missing) -> story cover.
  // If the chapter cover URL fails to load (404, bad link) we also fall back
  // to the story cover. This ONE uri drives the cover AND the background.
  const chapterCover: string | null = chapterAny?.cover || null;
  const storyCover: string | null = chapterAny?.storyCover || null;

  const [failedUri, setFailedUri] = useState<string | null>(null);

  const artUri: string | null =
    chapterCover && chapterCover !== failedUri ? chapterCover : storyCover;

  const handleArtError = () => {
    if (artUri && artUri === chapterCover) {
      setFailedUri(artUri);
    }
  };

  const coverSource = artUri ? { uri: artUri } : null;

  /* =======================================================================
     WAVEFORM (per chapter, stable)
  ======================================================================= */

  // Shape priority:
  //  1) real peaks from the backend (chapter.waveform / peaks)
  //  2) REAL loudness measured from the audio while it plays (live)
  //  3) a stable generated shape for that chapter (placeholder)
  const rawPeaks =
    chapterAny?.waveform ?? chapterAny?.peaks ?? chapterAny?.waveform_data;

  const backendPeaks = useMemo(() => parsePeaks(rawPeaks), [rawPeaks]);

  const baseWave = useMemo(
    () =>
      backendPeaks
        ? resamplePeaks(backendPeaks, WAVE_BARS)
        : makeWaveform(String(currentChapter?.id ?? 'x'), WAVE_BARS),
    [currentChapter?.id, backendPeaks]
  );

  // re-render when new real loudness has been measured (~2-3 times / second)
  const [, setWaveTick] = useState(0);

  useEffect(() => {
    if (!subscribeWaveLevels) return;

    return subscribeWaveLevels(() => setWaveTick((t) => t + 1));
  }, [subscribeWaveLevels]);

  /*
   * FIX (wave not animating):
   * `liveLevelAvailable` can be true while `audioLevel` never actually
   * changes (e.g. iOS gives no metering). The old code then switched OFF the
   * generated animation AND the live bars stayed frozen -> a dead waveform.
   *
   * Now "live" only counts when audioLevel really moves. If it is silent for
   * 1.5s, we fall back to the generated animation automatically.
   */
  const [liveAlive, setLiveAlive] = useState(false);

  useEffect(() => {
    if (!audioLevel || !liveLevelAvailable || !isPlaying) {
      setLiveAlive(false);
      return;
    }

    let last = -1;
    let lastChange = 0;

    const id = audioLevel.addListener(({ value }) => {
      if (Math.abs(value - last) > 0.01) {
        last = value;
        lastChange = Date.now();
        setLiveAlive((prev) => (prev ? prev : true));
      }
    });

    const timer = setInterval(() => {
      if (Date.now() - lastChange > 1500) {
        setLiveAlive(false);
      }
    }, 1000);

    return () => {
      audioLevel.removeListener(id);
      clearInterval(timer);
    };
  }, [audioLevel, liveLevelAvailable, isPlaying]);

  const isVideoNow = mode === 'video' || mode === 'checking';

  // live mode = real audio samples are really arriving (audio mode only)
  const liveMode = liveAlive && !!audioLevel && !isVideoNow;

  // bars that were already played show their REAL loudness
  let displayWave = baseWave;

  if (!backendPeaks && currentChapter && getWaveLevels) {
    const recorded = getWaveLevels(String(currentChapter.id));

    if (recorded) {
      const known = recorded.filter((v) => v >= 0);

      if (known.length) {
        const max = Math.max(...known, 0.03);

        displayWave = baseWave.map((base, i) =>
          recorded[i] >= 0
            ? 0.18 + 0.82 * Math.min(1, recorded[i] / max)
            : base
        );
      }
    }
  }

  /* =======================================================================
     WAVEFORM MOTION
     - live mode: bars around the playhead jump with the real audio level
     - otherwise (video, or sampling not available): generated animation,
       only while audio is playing
  ======================================================================= */

  const phase = useRef(new Animated.Value(0)).current;

  const shouldAnimate = isPlaying && !isSeeking && !liveMode;

  useEffect(() => {
    if (!shouldAnimate) {
      phase.stopAnimation();
      phase.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [shouldAnimate, phase]);

  // generated per-bar motion (scaleY wobble, anchored to the bar bottom)
  const barMotion = useMemo(
    () =>
      baseWave.map((h, i) => {
        const barH = WAVE_HEIGHT * BAR_FILL * h;

        const scales = [
          1,
          1 + 0.05 + noise(i, 1) * 0.3,
          1 - (0.05 + noise(i, 2) * 0.3),
          1 + 0.05 + noise(i, 3) * 0.3,
          1,
        ];

        const input = [0, 0.25, 0.5, 0.75, 1];

        return {
          scaleY: phase.interpolate({
            inputRange: input,
            outputRange: scales,
          }),
          translateY: phase.interpolate({
            inputRange: input,
            outputRange: scales.map((sc) => (-barH * (sc - 1)) / 2),
          }),
        };
      }),
    [baseWave, phase]
  );

  /* =======================================================================
     LOADING
  ======================================================================= */

  if (!currentChapter) {
    return (
      <View
        style={[
          styles.container,
          {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#fff"
        />

        <Text
          style={{
            color: '#fff',
            marginTop: 12,
          }}
        >
          {t('player.loadingChapter')}
        </Text>
      </View>
    );
  }

  /* =======================================================================
     RESPONSIVE
  ======================================================================= */

  const contentWidth = Math.min(
    width,
    MAX_CONTENT_WIDTH
  );

  const availableHeight =
    height -
    insets.top -
    insets.bottom;

  const scale = clampValue(
    Math.min(
      contentWidth / BASE_WIDTH,
      availableHeight / BASE_HEIGHT
    ),
    0.75,
    1.15
  );

  const sideInset = Math.max(
    insets.left,
    insets.right
  );

  const horizontalPadding = Math.max(
    Math.round(26 * scale),
    sideInset,
    16
  );

  const isCompactHeight =
    availableHeight < 600;

  /* =======================================================================
     VIDEO MODE
  ======================================================================= */

  const videoEnabled =
    mode === 'video' ||
    mode === 'checking';

  const handleVideoSurfaceTap = () => {
    setShowVideoControls(
      !showVideoControls
    );

    if (
      !showVideoControls &&
      isPlaying
    ) {
      scheduleHideControls();
    }
  };

  /* =======================================================================
     PROGRESS TRACK
  ======================================================================= */

  const measureTrack = () => {
    trackRef.current?.measureInWindow(
      (x, _y, w) => {
        trackLayout.current = {
          pageX: x,
          width: w,
        };
      }
    );
  };

  const fractionFromAbsoluteX = (
    absoluteX: number
  ) => {
    const {
      pageX,
      width: trackWidth,
    } = trackLayout.current;

    if (trackWidth <= 0) {
      return 0;
    }

    return clampValue(
      (absoluteX - pageX) /
        trackWidth,
      0,
      1
    );
  };

  /* =======================================================================
     SEEK GESTURE
  ======================================================================= */

  const seekGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onBegin((e) => {
      measureTrack();

      beginSeek(
        fractionFromAbsoluteX(
          e.absoluteX
        )
      );
    })
    .onUpdate((e) => {
      updateSeekDrag(
        fractionFromAbsoluteX(
          e.absoluteX
        )
      );
    })
    .onEnd((e) => {
      endSeek(
        fractionFromAbsoluteX(
          e.absoluteX
        )
      );
    })
    .onFinalize(() => {});

  /* =======================================================================
     TAP SEEK
  ======================================================================= */

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      measureTrack();

      const fraction =
        fractionFromAbsoluteX(
          e.absoluteX
        );

      seekToTime(
        fraction * (duration || 0)
      );
    });

  const seekBarGesture =
    Gesture.Race(
      seekGesture,
      tapGesture
    );

  /* =======================================================================
     VIDEO TAP
  ======================================================================= */

  const videoSurfaceTapGesture =
    Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        handleVideoSurfaceTap();
      });

  /* =======================================================================
     CLOSE / COLLAPSE
  ======================================================================= */

  const handleClose = () => {
    collapsePlayer();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  /* =======================================================================
     MUSIC LIST
  ======================================================================= */

  const handleOpenMusicList = () => {
    collapsePlayer();

    if (currentChapter?.storyId) {
      router.push({
        pathname: '/storyEpisode',
        params: {
          storyId:
            currentChapter.storyId,
        },
      });
    } else {
      console.log(
        'handleOpenMusicList: missing storyId on currentChapter'
      );

      router.back();
    }
  };

  /* =======================================================================
     PROGRESS
  ======================================================================= */

  const liveProgress =
    duration > 0
      ? clampValue(
          elapsed / duration,
          0,
          1
        )
      : 0;

  const progress = isSeeking
    ? dragProgress
    : liveProgress;

  const displayElapsed =
    isSeeking
      ? dragProgress * duration
      : elapsed;

  /* =======================================================================
     VIDEO STATUS
  ======================================================================= */

  const isVideoMode =
    mode === 'video';

  const isCheckingVideo =
    mode === 'checking';

  const isVideoLayout =
    isVideoMode ||
    isCheckingVideo;

  const topBarStatusLabel =
    isVideoMode
      ? t('player.statusPlayingVideo')
      : isCheckingVideo
      ? t('player.statusLoadingVideo')
      : t('player.statusPlaying');

  /* =======================================================================
     COVER SIZE
  ======================================================================= */

  // 3:4 portrait card. Width is limited by the screen width AND by the
  // height we can spare, so it never pushes the controls off small phones.
  const coverWidth = Math.min(
    contentWidth * 0.78,
    availableHeight * 0.4 * COVER_ASPECT,
    300
  );

  const coverHeight = coverWidth / COVER_ASPECT;

  const chapterLabel = t('player.chapterLabel', {
    number: currentChapter.number ?? chapterIndex + 1,
    title: currentChapter.title ?? '',
  });

  const playSize = Math.max(
    72 * scale,
    MIN_TOUCH_TARGET + 12
  );

  /* =======================================================================
     RENDER
  ======================================================================= */

  return (
    <View style={styles.container}>
      {/* ================================================================
          BACKGROUND  (depends on chapter cover, else story cover)
      ================================================================ */}

      <PlayerBackground
        uri={artUri}
        dark={isVideoLayout}
        onError={handleArtError}
      />

      <View
        style={[
          styles.content,
          {
            maxWidth:
              MAX_CONTENT_WIDTH,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        {/* ==============================================================
            TOP BAR
        ============================================================== */}

        <View
          style={[
            styles.topBar,
            {
              paddingTop:
                insets.top +
                12 * scale,
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={[
              styles.backButton,
              {
                top:
                  insets.top +
                  8 * scale,
                left:
                  horizontalPadding,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.close')}
          >
            <Ionicons
              name="chevron-down"
              size={24 * scale}
              color="#FFFFFF"
            />
          </Pressable>

          {bothAvailable ? (
            <View
              style={[
                styles.modeToggle,
                {
                  position:
                    'absolute',
                  top:
                    insets.top +
                    6 * scale,
                  right:
                    horizontalPadding,
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  !videoEnabled &&
                  handleToggleVideoMode()
                }
                style={[
                  styles.modeToggleOption,
                  videoEnabled &&
                    styles.modeToggleOptionActive,
                ]}
              >
                <Ionicons
                  name="videocam"
                  size={14}
                  color={
                    videoEnabled
                      ? '#000000'
                      : 'rgba(255,255,255,0.7)'
                  }
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  videoEnabled &&
                  handleToggleVideoMode()
                }
                style={[
                  styles.modeToggleOption,
                  !videoEnabled &&
                    styles.modeToggleOptionActive,
                ]}
              >
                <Ionicons
                  name="headset"
                  size={14}
                  color={
                    !videoEnabled
                      ? '#000000'
                      : 'rgba(255,255,255,0.7)'
                  }
                />
              </Pressable>
            </View>
          ) : null}

          <Text
            style={[
              styles.playNowLabel,
              {
                fontSize:
                  12 * scale,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t('player.topLabel', {
              status: topBarStatusLabel,
              current: chapterIndex + 1,
              total: totalEpisodes,
            })}
          </Text>
        </View>

        {/* ==============================================================
            VIDEO LAYOUT
        ============================================================== */}

        {isVideoLayout ? (
          <View style={styles.videoCenterWrap}>
            <View style={styles.videoFrameFull}>
              {isVideoMode ? (
                <View style={StyleSheet.absoluteFillObject}>
                  <GestureDetector gesture={videoSurfaceTapGesture}>
                    <View style={StyleSheet.absoluteFillObject}>
                      <VideoView
                        style={StyleSheet.absoluteFillObject}
                        player={videoPlayer}
                        nativeControls={false}
                        contentFit="cover"
                      />
                    </View>
                  </GestureDetector>

                  {showVideoControls ? (
                    <>
                      <LinearGradient
                        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
                        style={styles.videoScrimTop}
                        pointerEvents="none"
                      />

                      <LinearGradient
                        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
                        style={styles.videoScrimBottom}
                        pointerEvents="none"
                      />

                      <View
                        style={styles.videoCenterControls}
                        pointerEvents="box-none"
                      >
                        <Pressable
                          onPress={() => skip(-VIDEO_SKIP_SECONDS)}
                          hitSlop={10}
                          style={styles.videoSkipButton}
                        >
                          <Ionicons name="play-back" size={22} color="#FFFFFF" />
                          <Text style={styles.videoSkipLabel}>
                            {VIDEO_SKIP_SECONDS}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handlePlayPause}
                          hitSlop={10}
                          style={styles.videoPlayButton}
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={30}
                            color="#FFFFFF"
                            style={!isPlaying ? { marginLeft: 3 } : undefined}
                          />
                        </Pressable>

                        <Pressable
                          onPress={() => skip(VIDEO_SKIP_SECONDS)}
                          hitSlop={10}
                          style={styles.videoSkipButton}
                        >
                          <Ionicons name="play-forward" size={22} color="#FFFFFF" />
                          <Text style={styles.videoSkipLabel}>
                            {VIDEO_SKIP_SECONDS}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <View style={styles.videoLoadingWrap}>
                  {coverSource ? (
                    <Image
                      source={coverSource}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      blurRadius={2}
                      cachePolicy="memory-disk"
                    />
                  ) : null}

                  <View style={styles.videoLoadingScrim} />

                  <ActivityIndicator size="small" color="#FFFFFF" />

                  <Text style={styles.videoLoadingText}>
                    {t('player.loadingVideo')}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.body,
                styles.bodyVideoMode,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              <View style={styles.titleBlockVideoMode}>
                <Text
                  style={[styles.storyLabel, styles.storyLabelVideoMode]}
                  numberOfLines={1}
                >
                  {currentChapter.story ?? ''}
                </Text>

                <Text
                  style={[
                    styles.trackTitle,
                    styles.trackTitleVideoMode,
                    { fontSize: isCompactHeight ? 20 : 24 * scale },
                  ]}
                  numberOfLines={2}
                >
                  {currentChapter.title}
                </Text>

                <Text
                  style={[
                    styles.trackArtist,
                    styles.trackArtistVideoMode,
                    { fontSize: 13.5 * scale },
                  ]}
                  numberOfLines={1}
                >
                  {currentChapter.artist}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ==============================================================
             AUDIO LAYOUT
          ============================================================== */

          <View
            style={[
              styles.body,
              styles.bodyAudioMode,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            {/* COVER */}
            <View
              style={[
                styles.coverArt,
                {
                  width: coverWidth,
                  height: coverHeight,
                  borderRadius: 22 * scale,
                  marginBottom: 26 * scale,
                },
              ]}
            >
              {coverSource ? (
                <Image
                  key={artUri ?? 'cover'}
                  source={coverSource}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { borderRadius: 22 * scale },
                  ]}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                  priority="high"
                  onError={handleArtError}
                />
              ) : (
                <Ionicons
                  name="book"
                  size={coverWidth * 0.32}
                  color="rgba(255,255,255,0.85)"
                />
              )}

              {bothAvailable && !videoEnabled ? (
                <Pressable
                  onPress={handleToggleVideoMode}
                  hitSlop={6}
                  style={styles.watchVideoPill}
                >
                  <Ionicons name="play" size={12} color="#000000" />

                  <Text style={styles.watchVideoPillText}>
                    {t('player.watchVideo')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* TITLE BLOCK */}
            <View style={styles.titleBlockAudioMode}>
              <Text
                style={[
                  styles.storyTitle,
                  { fontSize: (isCompactHeight ? 22 : 28) * scale },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {currentChapter.story ?? currentChapter.title}
              </Text>

              {!!currentChapter.artist && (
                <Text
                  style={[styles.narrator, { fontSize: 13.5 * scale }]}
                  numberOfLines={1}
                >
                  {currentChapter.artist}
                </Text>
              )}

              <Text
                style={[styles.chapterLabel, { fontSize: 13 * scale }]}
                numberOfLines={1}
              >
                {chapterLabel}
              </Text>
            </View>
          </View>
        )}

        {/* ==============================================================
            FOOTER
        ============================================================== */}

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom:
                insets.bottom + (isCompactHeight ? 8 : 14),
            },
          ]}
        >
          {/* ---------- WAVEFORM + PROGRESS (seekable) ---------- */}

          <GestureDetector gesture={seekBarGesture}>
            <View
              ref={trackRef}
              style={styles.progressRow}
              onLayout={measureTrack}
              collapsable={false}
            >
              <View style={styles.waveRow} pointerEvents="none">
                {displayWave.map((h, i) => {
                  const played = (i + 0.5) / displayWave.length <= progress;
                  const barH = WAVE_HEIGHT * BAR_FILL * h;

                  // bars next to the playhead react to the real audio level
                  const playIndex = Math.min(
                    displayWave.length - 1,
                    Math.floor(progress * displayWave.length)
                  );
                  const distance = Math.abs(i - playIndex);
                  const reactive =
                    liveMode &&
                    isPlaying &&
                    !isSeeking &&
                    !!audioLevel &&
                    distance <= 3;
                  const weight = reactive ? 1 - distance / 4 : 0;

                  const transform: any = reactive
                    ? [
                        {
                          translateY: audioLevel!.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -(barH * 0.55 * weight) / 2],
                          }),
                        },
                        {
                          scaleY: audioLevel!.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1 + 0.55 * weight],
                          }),
                        },
                      ]
                    : [
                        { translateY: barMotion[i].translateY },
                        { scaleY: barMotion[i].scaleY },
                      ];

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: barH,
                          backgroundColor: played
                            ? ACCENT_SOFT
                            : 'rgba(255,190,120,0.30)',
                          transform,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.progressTrack} pointerEvents="none">
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />

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

          {/* ---------- TIME ---------- */}

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(displayElapsed)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* ---------- CONTROLS ---------- */}

          <View
            style={[
              styles.controlsRow,
              { marginTop: (isCompactHeight ? 10 : 18) * scale },
            ]}
          >
            {/* previous episode (hidden on first) */}
            {isFirstEpisode ? (
              <View style={styles.sideIcon} />
            ) : (
              <Pressable
                style={styles.sideIcon}
                hitSlop={10}
                onPress={handlePreviousChapter}
                accessibilityRole="button"
                accessibilityLabel={t('player.previous')}
              >
                <Ionicons
                  name="play-skip-back"
                  size={24 * scale}
                  color={ACCENT_SOFT}
                />
              </Pressable>
            )}

            {/* back 15 */}
            <Pressable
              style={styles.skipCircle}
              hitSlop={8}
              onPress={() => skip(-SKIP_BACK_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel={t('player.skipBack', { seconds: SKIP_BACK_SECONDS })}
            >
              <Ionicons
                name="reload-outline"
                size={44 * scale}
                color="rgba(255,255,255,0.85)"
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Text style={styles.skipCircleText}>{SKIP_BACK_SECONDS}</Text>
            </Pressable>

            {/* play / pause */}
            <Pressable
              onPress={handlePlayPause}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? t('player.pause') : t('player.play')}
              style={[
                styles.playButtonShadow,
                {
                  width: playSize,
                  height: playSize,
                  borderRadius: playSize / 2,
                },
              ]}
            >
              <LinearGradient
                colors={['#FFB347', '#FF7A18']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={[
                  styles.playButton,
                  { borderRadius: playSize / 2 },
                ]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={30 * scale}
                  color="#FFFFFF"
                  style={!isPlaying ? { marginLeft: 3 } : undefined}
                />
              </LinearGradient>
            </Pressable>

            {/* forward 30 */}
            <Pressable
              style={styles.skipCircle}
              hitSlop={8}
              onPress={() => skip(SKIP_FORWARD_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel={t('player.skipForward', {
                seconds: SKIP_FORWARD_SECONDS,
              })}
            >
              <Ionicons
                name="reload-outline"
                size={44 * scale}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.skipCircleText}>{SKIP_FORWARD_SECONDS}</Text>
            </Pressable>

            {/* next episode (hidden on last) */}
            {isLastEpisode ? (
              <View style={styles.sideIcon} />
            ) : (
              <Pressable
                style={styles.sideIcon}
                hitSlop={10}
                onPress={handleNextChapter}
                accessibilityRole="button"
                accessibilityLabel={t('player.next')}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={24 * scale}
                  color={ACCENT_SOFT}
                />
              </Pressable>
            )}
          </View>

          {/* ---------- BOTTOM GLASS BAR ---------- */}

          <View
            style={[
              styles.bottomBar,
              { marginTop: (isCompactHeight ? 12 : 20) * scale },
            ]}
          >
            {setPlaybackRate ? (
              <Pressable
                onPress={cycleSpeed}
                hitSlop={6}
                style={styles.speedPill}
                accessibilityRole="button"
                accessibilityLabel={t('player.speed')}
              >
                <Text style={styles.speedText}>{rate}x</Text>
              </Pressable>
            ) : null}

            {toggleSleepTimer ? (
              <Pressable
                onPress={toggleSleepTimer}
                hitSlop={8}
                style={styles.barIcon}
                accessibilityRole="button"
                accessibilityLabel={t('player.sleepTimer')}
              >
                <Ionicons
                  name="moon-outline"
                  size={22}
                  color="rgba(255,255,255,0.8)"
                />
              </Pressable>
            ) : null}

            <Pressable
              hitSlop={8}
              style={styles.barIcon}
              accessibilityRole="button"
              accessibilityLabel={t('player.bookmark')}
            >
              <Ionicons
                name="bookmark-outline"
                size={22}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>

            <Pressable
              onPress={handleOpenMusicList}
              hitSlop={8}
              style={styles.barIcon}
              accessibilityRole="button"
              accessibilityLabel={t('player.episodeList')}
            >
              <Ionicons
                name="list"
                size={24}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/* =========================================================================
   STYLES
========================================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_BASE,
  },

  // a little bigger than the screen so the blur edges never show
  bgImage: {
    position: 'absolute',
    top: -60,
    left: -60,
    right: -60,
    bottom: -60,
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

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    padding: 3,
    zIndex: 10,
  },

  modeToggleOption: {
    width: 30,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeToggleOptionActive: {
    backgroundColor: '#FFFFFF',
  },

  playNowLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.1,
  },

  body: {
    flexGrow: 1,
  },

  bodyAudioMode: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },

  bodyVideoMode: {
    flexGrow: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 18,
  },

  videoCenterWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },

  videoFrameFull: {
    width: '100%',
    aspectRatio: VIDEO_ASPECT_RATIO,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },

  videoLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
  },

  videoLoadingScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  videoLoadingText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    opacity: 0.85,
  },

  videoScrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },

  videoScrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
  },

  videoCenterControls: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },

  videoPlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoSkipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
  },

  videoSkipLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  coverArt: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',

    // soft glow in the accent colour
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },

    elevation: 14,
  },

  watchVideoPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },

    elevation: 4,
  },

  watchVideoPillText: {
    color: '#000000',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* ---- titles (audio) ---- */

  titleBlockAudioMode: {
    width: '100%',
    alignItems: 'center',
  },

  storyTitle: {
    color: '#FFF4E6',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  narrator: {
    color: ACCENT,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  chapterLabel: {
    color: 'rgba(255,255,255,0.88)',
    marginTop: 18,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  /* ---- titles (video) ---- */

  storyLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },

  storyLabelVideoMode: {
    textAlign: 'left',
  },

  titleBlockVideoMode: {
    width: '100%',
  },

  trackTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  trackTitleVideoMode: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
  },

  trackArtist: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },

  trackArtistVideoMode: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'left',
  },

  /* ---- footer ---- */

  footer: {
    paddingTop: 8,
  },

  progressRow: {
    paddingTop: 6,
    paddingBottom: 10,
  },

  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: WAVE_HEIGHT,
    marginBottom: 8,
  },

  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },

  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
  },

  progressFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ACCENT_SOFT,
    position: 'absolute',
    left: 0,
  },

  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFE2B8',
    marginLeft: -6,

    shadowColor: ACCENT,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },

    elevation: 4,
  },

  progressThumbActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  timeText: {
    color: '#FFFFFF',
    opacity: 0.55,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },

  /* ---- controls ---- */

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

  skipCircle: {
    minWidth: MIN_TOUCH_TARGET + 8,
    minHeight: MIN_TOUCH_TARGET + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skipCircleText: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },

  playButtonShadow: {
    shadowColor: ACCENT,
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  playButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- bottom glass bar ---- */

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  speedPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  speedText: {
    color: '#FFF4E6',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  barIcon: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});