import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { VideoView } from 'expo-video';
import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
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
const SKIP_SECONDS = 10;

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

  const mins = Math.floor(seconds / 60);

  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');

  return `${mins}:${secs}`;
}

/* ========================================================================= */

export default function PlayerStandardScreen() {
  const router = useRouter();

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

  const {
    chapters,
    videoPlayer,
    currentChapter,
    chapterHasVideo,
    chapterHasAudio,
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
  } = usePlayer();

  /* =======================================================================
     EPISODE COUNT
  ======================================================================= */

  /*
   * REAL EPISODE COUNT
   *
   * chapters comes directly from PlayerProvider.
   *
   * Example:
   *
   * chapters = [
   *   Episode 1,
   *   Episode 2,
   *   Episode 3,
   *   Episode 4
   * ]
   *
   * chapters.length = 4
   */

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
     COVER
  ======================================================================= */

  const coverSource = currentChapter?.cover
    ? {
        uri: currentChapter.cover,
      }
    : null;

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
          Loading chapter...
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
    Math.round(30 * scale),
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
    } = {
      pageX: trackLayout.current.pageX,
      width: trackLayout.current.width,
    };

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
      ? 'PLAYING VIDEO'
      : isCheckingVideo
      ? 'LOADING VIDEO'
      : 'PLAYING';

  /* =======================================================================
     COVER SIZE
  ======================================================================= */

  const coverSize = Math.min(
    contentWidth * 0.72,
    320
  );

  /* =======================================================================
     RENDER
  ======================================================================= */

  return (
    <View style={styles.container}>
      {/* ================================================================
          BACKGROUND
      ================================================================ */}

      <LinearGradient
        colors={
          isVideoLayout
            ? [
                '#141414',
                '#0A0A0A',
                '#000000',
              ]
            : [
                '#D7B385',
                '#AE7E55',
                '#000000',
              ]
        }
        locations={
          isVideoLayout
            ? [0, 0.5, 1]
            : [0, 0.55, 1]
        }
        style={
          StyleSheet.absoluteFillObject
        }
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
          {/* ============================================================
              CLOSE / DOWN BUTTON
          ============================================================ */}

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
          >
            <Ionicons
              name="chevron-down"
              size={22 * scale}
              color="#FFFFFF"
            />
          </Pressable>

          {/* ============================================================
              AUDIO / VIDEO TOGGLE
          ============================================================ */}

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

          {/* ============================================================
              EPISODE COUNT
          ============================================================ */}

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
            {topBarStatusLabel} ·{' '}
            {chapterIndex + 1}/
            {totalEpisodes}
          </Text>
        </View>

        {/* ==============================================================
            VIDEO LAYOUT
        ============================================================== */}

        {isVideoLayout ? (
          <View
            style={
              styles.videoCenterWrap
            }
          >
            {/* ==========================================================
                VIDEO FRAME
            ========================================================== */}

            <View
              style={
                styles.videoFrameFull
              }
            >
              {isVideoMode ? (
                <View
                  style={
                    StyleSheet.absoluteFillObject
                  }
                >
                  {/* ====================================================
                      VIDEO SURFACE
                  ==================================================== */}

                  <GestureDetector
                    gesture={
                      videoSurfaceTapGesture
                    }
                  >
                    <View
                      style={
                        StyleSheet.absoluteFillObject
                      }
                    >
                      <VideoView
                        style={
                          StyleSheet.absoluteFillObject
                        }
                        player={
                          videoPlayer
                        }
                        nativeControls={
                          false
                        }
                        contentFit="cover"
                      />
                    </View>
                  </GestureDetector>

                  {/* ====================================================
                      VIDEO CONTROLS
                  ==================================================== */}

                  {showVideoControls ? (
                    <>
                      <LinearGradient
                        colors={[
                          'rgba(0,0,0,0.55)',
                          'rgba(0,0,0,0)',
                        ]}
                        style={
                          styles.videoScrimTop
                        }
                        pointerEvents="none"
                      />

                      <LinearGradient
                        colors={[
                          'rgba(0,0,0,0)',
                          'rgba(0,0,0,0.65)',
                        ]}
                        style={
                          styles.videoScrimBottom
                        }
                        pointerEvents="none"
                      />

                      <View
                        style={
                          styles.videoCenterControls
                        }
                        pointerEvents="box-none"
                      >
                        {/* Previous 10 sec */}
                        <Pressable
                          onPress={() =>
                            skip(
                              -SKIP_SECONDS
                            )
                          }
                          hitSlop={10}
                          style={
                            styles.videoSkipButton
                          }
                        >
                          <Ionicons
                            name="play-back"
                            size={22}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.videoSkipLabel
                            }
                          >
                            {SKIP_SECONDS}
                          </Text>
                        </Pressable>

                        {/* Play / Pause */}
                        <Pressable
                          onPress={
                            handlePlayPause
                          }
                          hitSlop={10}
                          style={
                            styles.videoPlayButton
                          }
                        >
                          <Ionicons
                            name={
                              isPlaying
                                ? 'pause'
                                : 'play'
                            }
                            size={30}
                            color="#FFFFFF"
                            style={
                              !isPlaying
                                ? {
                                    marginLeft: 3,
                                  }
                                : undefined
                            }
                          />
                        </Pressable>

                        {/* Next 10 sec */}
                        <Pressable
                          onPress={() =>
                            skip(
                              SKIP_SECONDS
                            )
                          }
                          hitSlop={10}
                          style={
                            styles.videoSkipButton
                          }
                        >
                          <Ionicons
                            name="play-forward"
                            size={22}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.videoSkipLabel
                            }
                          >
                            {SKIP_SECONDS}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                /* ========================================================
                   VIDEO LOADING
                ======================================================== */

                <View
                  style={
                    styles.videoLoadingWrap
                  }
                >
                  {coverSource ? (
                    <Image
                      source={
                        coverSource
                      }
                      style={
                        StyleSheet.absoluteFillObject
                      }
                      resizeMode="cover"
                      blurRadius={2}
                    />
                  ) : null}

                  <View
                    style={
                      styles.videoLoadingScrim
                    }
                  />

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.videoLoadingText
                    }
                  >
                    Loading video…
                  </Text>
                </View>
              )}
            </View>

            {/* ==========================================================
                VIDEO TITLE
            ========================================================== */}

            <View
              style={[
                styles.body,
                styles.bodyVideoMode,
                {
                  paddingHorizontal:
                    horizontalPadding,
                },
              ]}
            >
              <View
                style={
                  styles.titleBlockVideoMode
                }
              >
                <Text
                  style={[
                    styles.storyLabel,
                    styles.storyLabelVideoMode,
                  ]}
                  numberOfLines={1}
                >
                  {currentChapter.story ??
                    ''}
                </Text>

                <View
                  style={
                    styles.titleRowVideoMode
                  }
                >
                  <Text
                    style={[
                      styles.trackTitle,
                      styles.trackTitleVideoMode,
                      {
                        fontSize:
                          isCompactHeight
                            ? 20
                            : 24 * scale,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {
                      currentChapter.title
                    }
                  </Text>
                </View>

                <Text
                  style={[
                    styles.trackArtist,
                    styles.trackArtistVideoMode,
                    {
                      fontSize:
                        13.5 * scale,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {
                    currentChapter.artist
                  }
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
              {
                paddingHorizontal:
                  horizontalPadding,
              },
            ]}
          >
            {/* ==========================================================
                COVER
            ========================================================== */}

            <View
              style={[
                styles.coverArt,
                {
                  width: coverSize,
                  height: coverSize,
                  borderRadius:
                    12 * scale,
                  marginBottom:
                    28 * scale,
                },
              ]}
            >
              {coverSource ? (
                <Image
                  source={
                    coverSource
                  }
                  style={
                    StyleSheet.absoluteFillObject
                  }
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="book"
                  size={
                    coverSize * 0.32
                  }
                  color="rgba(255,255,255,0.85)"
                />
              )}

              {/* ========================================================
                  WATCH VIDEO
              ======================================================== */}

              {bothAvailable &&
              !videoEnabled ? (
                <Pressable
                  onPress={
                    handleToggleVideoMode
                  }
                  hitSlop={6}
                  style={
                    styles.watchVideoPill
                  }
                >
                  <Ionicons
                    name="play"
                    size={12}
                    color="#000000"
                  />

                  <Text
                    style={
                      styles.watchVideoPillText
                    }
                  >
                    Watch video
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ==========================================================
                AUDIO TITLE
            ========================================================== */}

            <View
              style={
                styles.titleBlockAudioMode
              }
            >
              <Text
                style={
                  styles.storyLabel
                }
                numberOfLines={1}
              >
                {currentChapter.story ??
                  ''}
              </Text>

              <View
                style={
                  styles.titleRowAudioMode
                }
              >
                <Text
                  style={[
                    styles.trackTitle,
                    {
                      fontSize:
                        isCompactHeight
                          ? 20
                          : 24 * scale,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {
                    currentChapter.title
                  }
                </Text>

                <Pressable
                  style={[
                    styles.favoriteButton,
                    {
                      width: Math.max(
                        36 * scale,
                        MIN_TOUCH_TARGET -
                          6
                      ),
                      height: Math.max(
                        36 * scale,
                        MIN_TOUCH_TARGET -
                          6
                      ),
                      borderRadius:
                        Math.max(
                          36 * scale,
                          MIN_TOUCH_TARGET -
                            6
                        ) / 2,
                    },
                  ]}
                  hitSlop={8}
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={
                      17 * scale
                    }
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>

              <Text
                style={[
                  styles.trackArtist,
                  {
                    fontSize:
                      13.5 * scale,
                  },
                ]}
                numberOfLines={1}
              >
                {
                  currentChapter.artist
                }
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
              paddingHorizontal:
                horizontalPadding,
              paddingBottom:
                insets.bottom +
                (isCompactHeight
                  ? 10
                  : 16),
            },
          ]}
        >
          <View
            style={
              styles.footerCard
            }
          >
            {/* ========================================================
                PROGRESS BAR
            ======================================================== */}

            <GestureDetector
              gesture={
                seekBarGesture
              }
            >
              <View
                ref={trackRef}
                style={
                  styles.progressRow
                }
                onLayout={
                  measureTrack
                }
                collapsable={false}
              >
                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          progress * 100
                        }%`,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.progressThumb,
                      {
                        left: `${
                          progress * 100
                        }%`,
                      },
                      isSeeking &&
                        styles.progressThumbActive,
                    ]}
                  />
                </View>
              </View>
            </GestureDetector>

            {/* ========================================================
                TIME
            ======================================================== */}

            <View
              style={
                styles.timeRow
              }
            >
              <Text
                style={
                  styles.timeText
                }
              >
                {formatTime(
                  displayElapsed
                )}
              </Text>

              <Text
                style={
                  styles.timeText
                }
              >
                {formatTime(
                  duration
                )}
              </Text>
            </View>

            {/* ========================================================
                PLAYER CONTROLS
            ======================================================== */}

            <View
              style={[
                styles.controlsRow,
                {
                  marginTop:
                    (isCompactHeight
                      ? 14
                      : 20) * scale,
                },
              ]}
            >
              {/* ======================================================
                  SHUFFLE
              ====================================================== */}

              <Pressable
                hitSlop={10}
                style={
                  styles.sideIcon
                }
              >
                <Ionicons
                  name="shuffle"
                  size={
                    19 * scale
                  }
                  color="rgba(255,255,255,0.55)"
                />
              </Pressable>

              {/* ======================================================
                  PREVIOUS
                  
                  HIDDEN ON FIRST EPISODE
              ====================================================== */}

              {isFirstEpisode ? (
                <View
                  style={
                    styles.sideIcon
                  }
                />
              ) : (
                <Pressable
                  style={
                    styles.sideIcon
                  }
                  hitSlop={10}
                  onPress={
                    handlePreviousChapter
                  }
                >
                  <Ionicons
                    name="play-skip-back"
                    size={
                      22 * scale
                    }
                    color="#FFFFFF"
                  />
                </Pressable>
              )}

              {/* ======================================================
                  PLAY / PAUSE
              ====================================================== */}

              <Pressable
                style={[
                  styles.playButton,
                  {
                    width: Math.max(
                      66 * scale,
                      MIN_TOUCH_TARGET +
                        8
                    ),
                    height: Math.max(
                      66 * scale,
                      MIN_TOUCH_TARGET +
                        8
                    ),
                    borderRadius:
                      Math.max(
                        66 * scale,
                        MIN_TOUCH_TARGET +
                          8
                      ) / 2,
                  },
                ]}
                onPress={
                  handlePlayPause
                }
              >
                <Ionicons
                  name={
                    isPlaying
                      ? 'pause'
                      : 'play'
                  }
                  size={
                    25 * scale
                  }
                  color="#000"
                  style={
                    !isPlaying
                      ? {
                          marginLeft: 2,
                        }
                      : undefined
                  }
                />
              </Pressable>

              {/* ======================================================
                  NEXT
                  
                  HIDDEN ON LAST EPISODE
              ====================================================== */}

              {isLastEpisode ? (
                <View
                  style={
                    styles.sideIcon
                  }
                />
              ) : (
                <Pressable
                  style={
                    styles.sideIcon
                  }
                  hitSlop={10}
                  onPress={
                    handleNextChapter
                  }
                >
                  <Ionicons
                    name="play-skip-forward"
                    size={
                      22 * scale
                    }
                    color="#FFFFFF"
                  />
                </Pressable>
              )}

              {/* ======================================================
                  MORE
              ====================================================== */}

              <Pressable
                hitSlop={10}
                style={
                  styles.sideIcon
                }
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={
                    19 * scale
                  }
                  color="rgba(255,255,255,0.55)"
                />
              </Pressable>
            </View>
          </View>

          {/* ============================================================
              MUSIC LIST
          ============================================================ */}

          <Pressable
            style={[
              styles.musicListButton,
              {
                marginTop:
                  (isCompactHeight
                    ? 14
                    : 20) * scale,
              },
            ]}
            onPress={
              handleOpenMusicList
            }
          >
            <Ionicons
              name="chevron-up"
              size={13}
              color="#000000"
            />

            <Text
              style={
                styles.musicListText
              }
            >
              Music List
            </Text>
          </Pressable>
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

  modeToggle: {
    flexDirection: 'row',
    backgroundColor:
      'rgba(255,255,255,0.16)',
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
    color:
      'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.1,
  },

  body: {
    flexGrow: 1,
  },

  bodyAudioMode: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
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
    aspectRatio:
      VIDEO_ASPECT_RATIO,
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
    backgroundColor:
      'rgba(0,0,0,0.55)',
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
    backgroundColor:
      'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.35)',
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
    backgroundColor:
      'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 10,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 4,
  },

  watchVideoPillText: {
    color: '#000000',
    fontSize: 11.5,
    fontWeight: '700',
  },

  storyLabel: {
    color:
      'rgba(255,255,255,0.6)',
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

  titleBlockAudioMode: {
    width: '100%',
    alignItems: 'center',
  },

  titleBlockVideoMode: {
    width: '100%',
  },

  titleRowAudioMode: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  titleRowVideoMode: {
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

  favoriteButton: {
    backgroundColor:
      'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trackArtist: {
    color:
      'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },

  trackArtistVideoMode: {
    color:
      'rgba(255,255,255,0.6)',
    textAlign: 'left',
  },

  footer: {
    paddingTop: 8,
  },

  footerCard: {
    backgroundColor:
      'rgba(0,0,0,0.22)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },

  progressRow: {
    paddingVertical: 10,
  },

  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor:
      'rgba(255,255,255,0.25)',
    justifyContent: 'center',
  },

  progressFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 0,
  },

  progressThumb: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
    marginLeft: -4.5,

    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,

    elevation: 3,
  },

  progressThumbActive: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginLeft: -7.5,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  timeText: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },

  /* =======================================================================
     MAIN PLAYER CONTROLS
  ======================================================================= */

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
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  /* =======================================================================
     MUSIC LIST
  ======================================================================= */

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