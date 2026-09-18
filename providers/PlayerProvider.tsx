import {
  AudioPlayer,
  AudioStatus,
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";
import {
  useVideoPlayer,
  VideoPlayerStatus,
} from "expo-video";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import {
  resetPlaybackTiming,
  setChapterIndex,
  setDuration,
  setElapsed,
  setIsActive,
  setIsExpanded,
  setIsPlaying,
  setMode,
  setVideoEnabled,
} from "../redux/slices/playerReducer";

import { RootState } from "../redux/store";

/* =========================================================
   TYPES
========================================================= */

export type PlayerChapter = {
  id: string;
  number: number;
  title: string;
  description: string;
  artist: string;
  duration: string;
  duration_in_seconds: number;
  audio_url: string | null;
  video_url: string | null;
  video_status: number;
  cover: string | null;
  free: boolean;
  // FIX: chapters returned by the API don't carry a "story" field —
  // only the parent StoryDetail has a title. player-standard-screen.tsx
  // displays this as a small label above the chapter title, so it's
  // accepted here as optional; the caller (e.g. AlbumScreen) injects the
  // parent story's title onto each chapter before calling setChapters().
  story?: string;
  // FIX: same reasoning — the "Music List" button on the player screen
  // needs to route back to /storyEpisode?storyId=..., but chapters don't
  // carry their parent story's id either. Injected alongside `story`.
  storyId?: string;
};

export type PlayerStory = {
  id: string;
  title: string;
  description: string;
  cover: string | null;
  genre: string;
  credits: string;
  chapters: PlayerChapter[];
};

/* =========================================================
   HELPERS
========================================================= */

function clampValue(
  value: number,
  min: number,
  max: number
) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/* =========================================================
   CHECK AUDIO
========================================================= */

function hasPlayableAudio(
  chapter?: PlayerChapter | null
) {
  return Boolean(
    chapter?.audio_url &&
      chapter.audio_url.trim().length > 0
  );
}

/* =========================================================
   CHECK VIDEO
========================================================= */

function hasPlayableVideo(
  chapter?: PlayerChapter | null
) {
  return Boolean(
    chapter?.video_status === 1 &&
      chapter?.video_url &&
      chapter.video_url.trim().length > 0
  );
}

/* =========================================================
   WAIT AUDIO READY
========================================================= */

function waitForAudioReady(
  player: AudioPlayer
): Promise<void> {
  return new Promise((resolve) => {
    if ((player as any).isLoaded) {
      resolve();
      return;
    }

    const sub = player.addListener(
      "playbackStatusUpdate",
      (status: AudioStatus) => {
        if (status.isLoaded) {
          sub.remove();
          resolve();
        }
      }
    );

    setTimeout(() => {
      sub.remove();
      resolve();
    }, 12000);
  });
}

/* =========================================================
   WAIT VIDEO READY
========================================================= */

function waitForVideoReady(
  player: ReturnType<typeof useVideoPlayer>
): Promise<void> {
  return new Promise((resolve) => {
    if (
      player.status === "readyToPlay"
    ) {
      resolve();
      return;
    }

    const sub = player.addListener(
      "statusChange",
      (payload: {
        status: VideoPlayerStatus;
      }) => {
        if (
          payload.status ===
            "readyToPlay" ||
          payload.status === "error"
        ) {
          sub.remove();
          resolve();
        }
      }
    );

    setTimeout(() => {
      sub.remove();
      resolve();
    }, 12000);
  });
}

/* =========================================================
   CONTEXT TYPE
========================================================= */

type PlayerContextValue = {
  chapters: PlayerChapter[];

  currentChapter:
    | PlayerChapter
    | null;

  videoPlayer:
    ReturnType<typeof useVideoPlayer>;

  chapterHasVideo: boolean;
  chapterHasAudio: boolean;
  bothAvailable: boolean;

  isSeeking: boolean;
  dragProgress: number;

  showVideoControls: boolean;

  setShowVideoControls: (
    value: boolean
  ) => void;

  scheduleHideControls: () => void;

  setChapters: (
    chapters: PlayerChapter[]
  ) => void;

  playChapterAt: (
    index: number,
    opts?: {
      autoPlay?: boolean;
    }
  ) => Promise<void>;

  handlePlayPause: () => Promise<void>;

  handleToggleVideoMode: () => Promise<void>;

  handlePreviousChapter: () => void;

  handleNextChapter: () => void;

  seekToTime: (
    target: number
  ) => Promise<void>;

  skip: (
    delta: number
  ) => void;

  beginSeek: (
    fraction: number
  ) => void;

  updateSeekDrag: (
    fraction: number
  ) => void;

  endSeek: (
    fraction: number
  ) => void;

  expandPlayer: () => void;

  collapsePlayer: () => void;

  closePlayer: () => void;
};

/* =========================================================
   CONTEXT
========================================================= */

const PlayerContext =
  createContext<PlayerContextValue | null>(
    null
  );

/* =========================================================
   HOOK
========================================================= */

export function usePlayer() {
  const ctx = useContext(
    PlayerContext
  );

  if (!ctx) {
    throw new Error(
      "usePlayer must be used inside PlayerProvider"
    );
  }

  return ctx;
}

/* =========================================================
   PROVIDER
========================================================= */

export function PlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();

  /* =======================================================
     REDUX
  ======================================================= */

  const {
    chapterIndex,
    mode,
    isPlaying,
    videoEnabled,
    isActive,
    elapsed,
    duration,
  } = useSelector(
    (s: RootState) => s.player
  );

  /* =======================================================
     CHAPTER STATE
  ======================================================= */

  const [chapters, setChaptersState] =
    useState<PlayerChapter[]>([]);

  /*
   * IMPORTANT:
   *
   * React state is asynchronous.
   *
   * So we keep chapters inside a ref also.
   */
  const chaptersRef =
    useRef<PlayerChapter[]>([]);

  const setChapters = (
    newChapters: PlayerChapter[]
  ) => {
    // console.log(
    //   "PlayerProvider setChapters:",
    //   newChapters.length
    // );

    chaptersRef.current =
      newChapters;

    setChaptersState(
      newChapters
    );
  };

  /* =======================================================
     CURRENT CHAPTER
  ======================================================= */

  const currentChapter =
    chapters[chapterIndex] ?? null;

  const chapterHasVideo =
    hasPlayableVideo(
      currentChapter
    );

  const chapterHasAudio =
    hasPlayableAudio(
      currentChapter
    );

  const bothAvailable =
    chapterHasVideo &&
    chapterHasAudio;

  const wantsVideo =
    chapterHasVideo &&
    (!chapterHasAudio ||
      videoEnabled);

  /* =======================================================
     LOCAL STATE
  ======================================================= */

  const [
    isSeeking,
    setIsSeeking,
  ] = useState(false);

  const [
    dragProgress,
    setDragProgress,
  ] = useState(0);

  const [
    showVideoControls,
    setShowVideoControls,
  ] = useState(true);

  /* =======================================================
     REFS
  ======================================================= */

  const hideControlsTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const autoPlayNextRef =
    useRef(false);

  const wantsVideoRef =
    useRef(wantsVideo);

  const modeRef =
    useRef(mode);

  const isPlayingRef =
    useRef(isPlaying);

  const videoEnabledRef =
    useRef(videoEnabled);

  const elapsedRef =
    useRef(elapsed);

  const durationRef =
    useRef(duration);

  const busyRef =
    useRef(false);

  const pendingSeekRef =
    useRef<{
      target: number;
      requestedAt: number;
    } | null>(null);

  /* =======================================================
     SYNC REFS
  ======================================================= */

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isPlayingRef.current =
      isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    videoEnabledRef.current =
      videoEnabled;
  }, [videoEnabled]);

  useEffect(() => {
    elapsedRef.current =
      elapsed;
  }, [elapsed]);

  useEffect(() => {
    durationRef.current =
      duration;
  }, [duration]);

  useEffect(() => {
    wantsVideoRef.current =
      wantsVideo;
  }, [wantsVideo]);

  /* =======================================================
     VIDEO PLAYER
  ======================================================= */

  const videoPlayer =
    useVideoPlayer(
      currentChapter?.video_url ??
        null,
      (player) => {
        player.loop = false;
        player.volume = 1.0;
      }
    );

  /* =======================================================
     AUDIO PLAYER
  ======================================================= */

  const audioPlayerRef =
    useRef<AudioPlayer | null>(
      null
    );

  /* =======================================================
     GET AUDIO PLAYER
  ======================================================= */

  const getAudioPlayer = () => {
    if (
      !audioPlayerRef.current
    ) {
      if (
        !currentChapter?.audio_url
      ) {
        throw new Error(
          "Audio URL is missing"
        );
      }

      audioPlayerRef.current =
        createAudioPlayer(
          currentChapter.audio_url
        );

      // FIX: on Android, a freshly created AudioPlayer can start at a
      // volume lower than 1.0 (especially right after a duckOthers
      // session), which is what made playback sound very quiet. Force
      // full volume explicitly every time a player is created.
      audioPlayerRef.current.volume = 1.0;
    }

    return audioPlayerRef.current;
  };

  /* =======================================================
     GET READY AUDIO PLAYER
  ======================================================= */

  const getReadyAudioPlayer =
    async () => {
      const player =
        getAudioPlayer();

      await waitForAudioReady(
        player
      );

      return player;
    };

  /* =======================================================
     AUDIO MODE
  ======================================================= */

  useEffect(() => {
    // FIX: "duckOthers" tells the OS to LOWER OUR OWN volume whenever
    // another app/notification plays sound, and on Android this ducked
    // level can persist / feel much quieter than expected even after
    // the interruption ends. Since this app isn't meant to duck under
    // anything, "mixWithOthers" (or simply not requesting ducking)
    // avoids Android silently keeping playback at reduced volume.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode:
        "mixWithOthers",
    }).catch((error) => {
      console.log(
        "Audio mode config failed:",
        error
      );
    });
  }, []);

  /* =======================================================
     VIDEO STATUS
  ======================================================= */

  useEffect(() => {
    const sub =
      videoPlayer.addListener(
        "statusChange",
        (payload: {
          status: VideoPlayerStatus;
          error?: {
            message: string;
          };
        }) => {
          if (
            !wantsVideoRef.current
          ) {
            return;
          }

          if (
            payload.status ===
            "readyToPlay"
          ) {
            dispatch(
              setMode("video")
            );

            const readyDuration =
              videoPlayer.duration ??
              0;

            if (
              readyDuration > 0
            ) {
              dispatch(
                setDuration(
                  readyDuration
                )
              );
            }

            if (
              autoPlayNextRef.current
            ) {
              videoPlayer.play();

              dispatch(
                setIsPlaying(true)
              );

              autoPlayNextRef.current =
                false;
            }
          }

          if (
            payload.status ===
            "error"
          ) {
            console.log(
              "Video unavailable:",
              payload.error?.message
            );

            if (
              busyRef.current
            ) {
              return;
            }

            dispatch(
              setMode("audio")
            );

            if (
              autoPlayNextRef.current &&
              chapterHasAudio
            ) {
              getReadyAudioPlayer()
                .then((player) => {
                  player.play();

                  dispatch(
                    setIsPlaying(true)
                  );

                  autoPlayNextRef.current =
                    false;
                })
                .catch((error) => {
                  console.log(
                    "Audio fallback failed:",
                    error
                  );
                });
            }
          }
        }
      );

    return () =>
      sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPlayer]);

  /* =======================================================
     MODE WHEN CHAPTER CHANGES
  ======================================================= */

  useEffect(() => {
    if (!currentChapter) {
      return;
    }

    if (!wantsVideo) {
      dispatch(
        setMode("audio")
      );
    } else {
      dispatch(
        setMode("checking")
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chapterIndex,
    chapterHasVideo,
    chapterHasAudio,
    wantsVideo,
  ]);

  /* =======================================================
     VIDEO PROGRESS
  ======================================================= */

  useEffect(() => {
    if (
      mode !== "video" ||
      isSeeking
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        const nativeTime =
          videoPlayer.currentTime ??
          0;

        const pending =
          pendingSeekRef.current;

        if (pending) {
          const closeEnough =
            Math.abs(
              nativeTime -
                pending.target
            ) < 1.2;

          const timedOut =
            Date.now() -
              pending.requestedAt >
            2000;

          if (
            closeEnough ||
            timedOut
          ) {
            pendingSeekRef.current =
              null;

            dispatch(
              setElapsed(
                nativeTime
              )
            );
          }
        } else {
          dispatch(
            setElapsed(
              nativeTime
            )
          );
        }

        const nextDuration =
          videoPlayer.duration ??
          0;

        if (
          nextDuration > 0
        ) {
          dispatch(
            setDuration(
              nextDuration
            )
          );
        }

        dispatch(
          setIsPlaying(
            videoPlayer.playing
          )
        );
      }, 250);

    return () =>
      clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    videoPlayer,
    isSeeking,
  ]);

  /* =======================================================
     AUDIO PROGRESS
  ======================================================= */

  useEffect(() => {
    if (
      mode !== "audio" ||
      !chapterHasAudio
    ) {
      return;
    }

    let player: AudioPlayer;

    try {
      player =
        getAudioPlayer();
    } catch {
      return;
    }

    const sub =
      player.addListener(
        "playbackStatusUpdate",
        (status: AudioStatus) => {
          if (isSeeking) {
            return;
          }

          dispatch(
            setElapsed(
              status.currentTime ??
                0
            )
          );

          dispatch(
            setDuration(
              status.duration ??
                0
            )
          );

          dispatch(
            setIsPlaying(
              status.playing ??
                false
            )
          );
        }
      );

    return () =>
      sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    isSeeking,
    chapterHasAudio,
    chapterIndex,
  ]);

  /* =======================================================
     VIDEO CONTROLS
  ======================================================= */

  const scheduleHideControls =
    () => {
      if (
        hideControlsTimerRef.current
      ) {
        clearTimeout(
          hideControlsTimerRef.current
        );
      }

      hideControlsTimerRef.current =
        setTimeout(() => {
          setShowVideoControls(
            false
          );
        }, 2800);
    };

  useEffect(() => {
    if (mode !== "video") {
      return;
    }

    if (isPlaying) {
      scheduleHideControls();
    } else {
      if (
        hideControlsTimerRef.current
      ) {
        clearTimeout(
          hideControlsTimerRef.current
        );
      }

      setShowVideoControls(
        true
      );
    }

    return () => {
      if (
        hideControlsTimerRef.current
      ) {
        clearTimeout(
          hideControlsTimerRef.current
        );
      }
    };
  }, [
    isPlaying,
    mode,
  ]);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const handlePlayPause =
    async () => {
      if (busyRef.current) {
        console.log(
          "Play/pause ignored - player busy"
        );

        return;
      }

      if (!currentChapter) {
        console.log(
          "No current chapter"
        );

        return;
      }

      /* VIDEO */

      if (mode === "video") {
        if (isPlaying) {
          videoPlayer.pause();

          dispatch(
            setIsPlaying(false)
          );
        } else {
          await waitForVideoReady(
            videoPlayer
          );

          videoPlayer.play();

          dispatch(
            setIsPlaying(true)
          );
        }

        return;
      }

      /* AUDIO */

      if (
        mode === "audio" &&
        chapterHasAudio
      ) {
        if (isPlaying) {
          audioPlayerRef.current?.pause();

          dispatch(
            setIsPlaying(false)
          );
        } else {
          try {
            const player =
              await getReadyAudioPlayer();

            player.play();

            dispatch(
              setIsPlaying(true)
            );
          } catch (error) {
            console.log(
              "Audio play failed:",
              error
            );
          }
        }
      }
    };

  /* =======================================================
     TOGGLE VIDEO / AUDIO
  ======================================================= */

  const handleToggleVideoMode =
    async () => {
      if (!bothAvailable) {
        return;
      }

      if (busyRef.current) {
        return;
      }

      busyRef.current = true;

      try {
        const goingToVideo =
          !videoEnabledRef.current;

        const wasPlaying =
          isPlayingRef.current;

        const carryOverElapsed =
          elapsedRef.current;

        /* STOP CURRENT */

        try {
          videoPlayer.pause();
        } catch {}

        try {
          audioPlayerRef.current?.pause();
        } catch {}

        dispatch(
          setIsPlaying(false)
        );

        dispatch(
          setVideoEnabled(
            goingToVideo
          )
        );

        wantsVideoRef.current =
          chapterHasVideo &&
          (!chapterHasAudio ||
            goingToVideo);

        /* ================================================
           AUDIO -> VIDEO
        ================================================= */

        if (goingToVideo) {
          dispatch(
            setMode("checking")
          );

          autoPlayNextRef.current =
            wasPlaying;

          try {
            if (
              !currentChapter?.video_url
            ) {
              throw new Error(
                "Video URL missing"
              );
            }

            await videoPlayer.replaceAsync(
              currentChapter.video_url
            );

            await waitForVideoReady(
              videoPlayer
            );

            if (
              videoPlayer.status ===
              "readyToPlay"
            ) {
              dispatch(
                setMode("video")
              );

              pendingSeekRef.current =
                {
                  target:
                    carryOverElapsed,
                  requestedAt:
                    Date.now(),
                };

              videoPlayer.currentTime =
                carryOverElapsed;

              dispatch(
                setElapsed(
                  carryOverElapsed
                )
              );

              const videoDuration =
                videoPlayer.duration ??
                0;

              if (
                videoDuration > 0
              ) {
                dispatch(
                  setDuration(
                    videoDuration
                  )
                );
              }

              if (wasPlaying) {
                videoPlayer.play();

                dispatch(
                  setIsPlaying(
                    true
                  )
                );
              }
            } else {
              throw new Error(
                "Video not ready"
              );
            }
          } catch (error) {
            console.log(
              "Video toggle failed:",
              error
            );

            dispatch(
              setVideoEnabled(false)
            );

            wantsVideoRef.current =
              false;

            dispatch(
              setMode("audio")
            );

            if (
              chapterHasAudio
            ) {
              try {
                const player =
                  await getReadyAudioPlayer();

                await player.seekTo(
                  carryOverElapsed
                );

                dispatch(
                  setElapsed(
                    carryOverElapsed
                  )
                );

                if (
                  wasPlaying
                ) {
                  player.play();

                  dispatch(
                    setIsPlaying(
                      true
                    )
                  );
                }
              } catch (
                audioError
              ) {
                console.log(
                  "Audio fallback failed:",
                  audioError
                );
              }
            }
          }

          return;
        }

        /* ================================================
           VIDEO -> AUDIO
        ================================================= */

        try {
          const player =
            await getReadyAudioPlayer();

          await player.seekTo(
            carryOverElapsed
          );

          dispatch(
            setElapsed(
              carryOverElapsed
            )
          );

          const audioDuration =
            player.duration ??
            0;

          if (
            audioDuration > 0
          ) {
            dispatch(
              setDuration(
                audioDuration
              )
            );
          }

          dispatch(
            setMode("audio")
          );

          if (wasPlaying) {
            player.play();

            dispatch(
              setIsPlaying(true)
            );
          }
        } catch (error) {
          console.log(
            "Audio switch failed:",
            error
          );

          dispatch(
            setMode("audio")
          );
        }
      } finally {
        busyRef.current = false;
      }
    };

  /* =======================================================
     PLAY CHAPTER
  ======================================================= */

  const playChapterAt =
    async (
      nextIndex: number,
      opts?: {
        autoPlay?: boolean;
      }
    ) => {
      const availableChapters =
        chaptersRef.current;

      if (
        !availableChapters.length
      ) {
        console.log(
          "No chapters available"
        );

        return;
      }

      while (busyRef.current) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              50
            )
        );
      }

      busyRef.current = true;

      try {
        const clamped =
          clampValue(
            nextIndex,
            0,
            availableChapters.length -
              1
          );

        const nextChapter =
          availableChapters[
            clamped
          ];

        // console.log(
        //   "Playing chapter:",
        //   nextChapter.title
        // );

        const nextHasAudio =
          hasPlayableAudio(
            nextChapter
          );

        const nextHasVideo =
          hasPlayableVideo(
            nextChapter
          );

        /*
         * If both audio + video:
         * start with audio.
         *
         * If video only:
         * start video.
         */
        const nextWantsVideo =
          nextHasVideo &&
          !nextHasAudio;

        const shouldAutoPlay =
          opts?.autoPlay ??
          isPlayingRef.current;

        autoPlayNextRef.current =
          shouldAutoPlay;

        pendingSeekRef.current =
          null;

        /* STOP OLD VIDEO */

        try {
          videoPlayer.pause();
        } catch {}

        /* STOP OLD AUDIO */

        try {
          audioPlayerRef.current?.pause();
        } catch {}

        dispatch(
          setIsPlaying(false)
        );

        dispatch(
          resetPlaybackTiming()
        );

        dispatch(
          setVideoEnabled(false)
        );

        dispatch(
          setChapterIndex(
            clamped
          )
        );

        dispatch(
          setIsActive(true)
        );

        wantsVideoRef.current =
          nextWantsVideo;

        /* REMOVE OLD AUDIO */

        if (
          audioPlayerRef.current
        ) {
          try {
            audioPlayerRef.current.remove();
          } catch {}

          audioPlayerRef.current =
            null;
        }

        /* ================================================
           VIDEO ONLY
        ================================================= */

        if (nextWantsVideo) {
          dispatch(
            setMode("checking")
          );

          try {
            if (
              !nextChapter.video_url
            ) {
              throw new Error(
                "Video URL missing"
              );
            }

            await videoPlayer.replaceAsync(
              nextChapter.video_url
            );

            await waitForVideoReady(
              videoPlayer
            );

            if (
              videoPlayer.status ===
              "readyToPlay"
            ) {
              dispatch(
                setMode("video")
              );

              const videoDuration =
                videoPlayer.duration ??
                0;

              if (
                videoDuration > 0
              ) {
                dispatch(
                  setDuration(
                    videoDuration
                  )
                );
              } else {
                dispatch(
                  setDuration(
                    nextChapter.duration_in_seconds
                  )
                );
              }

              if (
                shouldAutoPlay
              ) {
                videoPlayer.play();

                dispatch(
                  setIsPlaying(
                    true
                  )
                );
              }
            } else {
              dispatch(
                setMode("audio")
              );
            }
          } catch (error) {
            console.log(
              "Video load failed:",
              error
            );

            dispatch(
              setMode("audio")
            );
          }

          return;
        }

        /* ================================================
           AUDIO
        ================================================= */

        if (nextHasAudio) {
          dispatch(
            setMode("audio")
          );

          try {
            if (
              !nextChapter.audio_url
            ) {
              throw new Error(
                "Audio URL missing"
              );
            }

            console.log(
              "Loading audio:",
              nextChapter.audio_url
            );

            const player =
              createAudioPlayer(
                nextChapter.audio_url
              );

            player.volume = 1.0;

            audioPlayerRef.current =
              player;

            await waitForAudioReady(
              player
            );

            const audioDuration =
              player.duration ??
              0;

            if (
              audioDuration > 0
            ) {
              dispatch(
                setDuration(
                  audioDuration
                )
              );
            } else {
              dispatch(
                setDuration(
                  nextChapter.duration_in_seconds
                )
              );
            }

            if (
              shouldAutoPlay
            ) {
              player.play();

              dispatch(
                setIsPlaying(
                  true
                )
              );
            }
          } catch (error) {
            console.log(
              "Audio load failed:",
              error
            );
          }

          return;
        }

        console.log(
          "Chapter has no playable source"
        );

        dispatch(
          setMode("audio")
        );
      } finally {
        busyRef.current = false;
      }
    };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const handlePreviousChapter =
    () => {
      if (
        chapterIndex <= 0
      ) {
        return;
      }

      playChapterAt(
        chapterIndex - 1
      );
    };

  /* =======================================================
     NEXT
  ======================================================= */

  const handleNextChapter =
    () => {
      if (
        chapterIndex >=
        chaptersRef.current.length -
          1
      ) {
        return;
      }

      playChapterAt(
        chapterIndex + 1
      );
    };

  /* =======================================================
     SEEK
  ======================================================= */

  const seekToTime =
    async (
      targetSeconds: number
    ) => {
      const target =
        clampValue(
          targetSeconds,
          0,
          durationRef.current ||
            targetSeconds
        );

      if (
        modeRef.current ===
        "video"
      ) {
        await waitForVideoReady(
          videoPlayer
        );

        pendingSeekRef.current =
          {
            target,
            requestedAt:
              Date.now(),
          };

        videoPlayer.currentTime =
          target;
      }

      if (
        modeRef.current ===
          "audio" &&
        chapterHasAudio
      ) {
        try {
          const player =
            await getReadyAudioPlayer();

          await player.seekTo(
            target
          );
        } catch (error) {
          console.log(
            "Audio seek failed:",
            error
          );
        }
      }

      dispatch(
        setElapsed(target)
      );
    };

  /* =======================================================
     SKIP
  ======================================================= */

  const skip = (
    deltaSeconds: number
  ) => {
    if (
      modeRef.current !==
      "video"
    ) {
      return;
    }

    setShowVideoControls(
      true
    );

    if (
      isPlayingRef.current
    ) {
      scheduleHideControls();
    }

    const target =
      clampValue(
        elapsedRef.current +
          deltaSeconds,
        0,
        durationRef.current ||
          elapsedRef.current +
            deltaSeconds
      );

    seekToTime(target);
  };

  /* =======================================================
     SEEK DRAG
  ======================================================= */

  const beginSeek = (
    fraction: number
  ) => {
    setIsSeeking(true);
    setDragProgress(fraction);
  };

  const updateSeekDrag = (
    fraction: number
  ) => {
    setDragProgress(fraction);
  };

  const endSeek = (
    fraction: number
  ) => {
    setDragProgress(
      fraction
    );

    const target =
      fraction *
      (durationRef.current ||
        0);

    seekToTime(target).finally(
      () => {
        setIsSeeking(false);
      }
    );
  };

  /* =======================================================
     EXPAND
  ======================================================= */

  const expandPlayer =
    () => {
      dispatch(
        setIsExpanded(true)
      );
    };

  /* =======================================================
     COLLAPSE
  ======================================================= */

  const collapsePlayer =
    () => {
      dispatch(
        setIsExpanded(false)
      );

      if (
        modeRef.current ===
          "video" &&
        videoEnabledRef.current
      ) {
        handleToggleVideoMode();
      }
    };

  /* =======================================================
     CLOSE
  ======================================================= */

  const closePlayer =
    () => {
      pendingSeekRef.current =
        null;

      try {
        videoPlayer.pause();
      } catch {}

      try {
        audioPlayerRef.current?.pause();
      } catch {}

      dispatch(
        setIsPlaying(false)
      );

      dispatch(
        setIsExpanded(false)
      );

      dispatch(
        setIsActive(false)
      );
    };

  /* =======================================================
     BACKGROUND
  ======================================================= */

  useEffect(() => {
    const sub =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            (state ===
              "background" ||
              state ===
                "inactive") &&
            modeRef.current ===
              "video" &&
            videoEnabledRef.current
          ) {
            handleToggleVideoMode();
          }
        }
      );

    return () =>
      sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      try {
        videoPlayer.pause();
      } catch {}

      if (
        audioPlayerRef.current
      ) {
        try {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.remove();
        } catch {}
      }

      if (
        hideControlsTimerRef.current
      ) {
        clearTimeout(
          hideControlsTimerRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value: PlayerContextValue =
    {
      chapters,

      currentChapter,

      videoPlayer,

      chapterHasVideo,

      chapterHasAudio,

      bothAvailable,

      isSeeking,

      dragProgress,

      showVideoControls,

      setShowVideoControls,

      scheduleHideControls,

      setChapters,

      playChapterAt,

      handlePlayPause,

      handleToggleVideoMode,

      handlePreviousChapter,

      handleNextChapter,

      seekToTime,

      skip,

      beginSeek,

      updateSeekDrag,

      endSeek,

      expandPlayer,

      collapsePlayer,

      closePlayer,
    };

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <PlayerContext.Provider
      value={value}
    >
      {children}
    </PlayerContext.Provider>
  );
}
