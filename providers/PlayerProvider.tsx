import {
  AudioPlayer,
  AudioStatus,
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";
import { useVideoPlayer, VideoPlayerStatus } from "expo-video";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "expo-router";
import { Animated, AppState } from "react-native";
import EpisodePaywallModal from "../components/story/EpisodePaywallModal";
import { useDispatch, useSelector } from "react-redux";
import { PLAYER_CONFIG } from "../constants/playerConfig";
import { useLiveWaveform } from "../hooks/useLiveWaveform";

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
  // true when the user has not rented / bought / subscribed and this is a paid episode
  locked?: boolean;
  // Chapters returned by the API don't carry a "story" field, only the
  // parent StoryDetail has a title. The player screen shows it as a small
  // label, so the caller (AlbumScreen) injects it before setChapters().
  story?: string;
  // Same reasoning: the "Music List" button needs the parent story's id.
  storyId?: string;
  // Story cover, used as fallback artwork when a chapter has no cover.
  storyCover?: string | null;
};

/** Shown when a free episode ends and the next one is locked. */
export type PaywallInfo = {
  storyId: string | null;
  storyTitle: string;
  nextChapterTitle: string;
  cover: string | null;
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

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* =========================================================
   CHECK AUDIO
========================================================= */

function hasPlayableAudio(chapter?: PlayerChapter | null) {
  return Boolean(chapter?.audio_url && chapter.audio_url.trim().length > 0);
}

/* =========================================================
   CHECK VIDEO
========================================================= */

function hasPlayableVideo(chapter?: PlayerChapter | null) {
  return Boolean(
    chapter?.video_status === 1 &&
      chapter?.video_url &&
      chapter.video_url.trim().length > 0
  );
}

/* =========================================================
   WAIT AUDIO READY
========================================================= */

function waitForAudioReady(player: AudioPlayer): Promise<void> {
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
    if (player.status === "readyToPlay") {
      resolve();
      return;
    }

    const sub = player.addListener(
      "statusChange",
      (payload: { status: VideoPlayerStatus }) => {
        if (payload.status === "readyToPlay" || payload.status === "error") {
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
   SEEK AUDIO + VERIFY
   seekTo() can resolve before the position is really applied
   (mp3 on iOS). We check the real currentTime and retry once.
========================================================= */

async function seekAudioAndWait(player: AudioPlayer, target: number) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await player.seekTo(target);

    const startedAt = Date.now();

    while (Date.now() - startedAt < 1200) {
      const now = (player as any).currentTime ?? 0;

      if (Math.abs(now - target) < 1.5) {
        return;
      }

      await sleep(100);
    }
  }
}

/* =========================================================
   SEEK VIDEO + VERIFY
   Seek while PAUSED, wait until the player really reached
   the position and is ready. Only then the caller presses play.
   This removes the "taku taku" stutter / fast-forward look.
========================================================= */

function seekVideoAndWait(
  player: ReturnType<typeof useVideoPlayer>,
  target: number
): Promise<void> {
  return new Promise((resolve) => {
    player.currentTime = target;

    const startedAt = Date.now();

    const timer = setInterval(() => {
      const near = Math.abs((player.currentTime ?? 0) - target) < 1;

      if (
        (near && player.status === "readyToPlay") ||
        Date.now() - startedAt > 4000
      ) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}

/* =========================================================
   CONTEXT TYPE
========================================================= */

type PlayerContextValue = {
  chapters: PlayerChapter[];

  currentChapter: PlayerChapter | null;

  videoPlayer: ReturnType<typeof useVideoPlayer>;

  chapterHasVideo: boolean;
  chapterHasAudio: boolean;
  bothAvailable: boolean;

  isSeeking: boolean;
  dragProgress: number;

  showVideoControls: boolean;

  setShowVideoControls: (value: boolean) => void;

  scheduleHideControls: () => void;

  setChapters: (chapters: PlayerChapter[]) => void;

  playChapterAt: (
    index: number,
    opts?: {
      autoPlay?: boolean;
      // optional: start (audio) at this second, e.g. resume position
      startAt?: number;
    }
  ) => Promise<void>;

  handlePlayPause: () => Promise<void>;

  handleToggleVideoMode: () => Promise<void>;

  handlePreviousChapter: () => void;

  handleNextChapter: () => void;

  seekToTime: (target: number) => Promise<void>;

  skip: (delta: number) => void;

  beginSeek: (fraction: number) => void;

  updateSeekDrag: (fraction: number) => void;

  endSeek: (fraction: number) => void;

  expandPlayer: () => void;

  collapsePlayer: () => void;

  closePlayer: () => void;

  /** Hard stop: pause + release audio/video and clear the queue (used on logout). */
  stopAndReset: () => void;

  // ---- free episode ended -> rent / Premium prompt ----
  paywall: PaywallInfo | null;
  dismissPaywall: () => void;

  /** Opens the full player screen (once - never stacks a second copy). */
  openPlayerScreen: () => void;

  // ---- playback speed ----
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // ---- sleep timer ----
  /** Minutes the timer was set to, or null when it is off. */
  sleepTimerMinutes: number | null;
  /** Seconds left on the timer, or 0 when off. */
  sleepTimerRemaining: number;
  setSleepTimer: (minutes: number | null) => void;
  /** Cycles Off -> 15 -> 30 -> 45 -> 60 -> Off. */
  toggleSleepTimer: () => void;

  // ---- live waveform (real audio loudness) ----
  audioLevel: Animated.Value;
  liveLevelAvailable: boolean;
  getWaveLevels: (chapterId: string) => number[] | undefined;
  subscribeWaveLevels: (listener: () => void) => () => void;
};

/* =========================================================
   CONTEXT
========================================================= */

const PlayerContext = createContext<PlayerContextValue | null>(null);

/* =========================================================
   HOOK
========================================================= */

export function usePlayer() {
  const ctx = useContext(PlayerContext);

  if (!ctx) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }

  return ctx;
}

/* =========================================================
   PROVIDER
========================================================= */

export function PlayerProvider({ children }: { children: React.ReactNode }) {
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
  } = useSelector((s: RootState) => s.player);

  /* =======================================================
     CHAPTER STATE
  ======================================================= */

  const [chapters, setChaptersState] = useState<PlayerChapter[]>([]);

  /*
   * IMPORTANT:
   *
   * React state is asynchronous.
   *
   * So we keep chapters inside a ref also.
   */
  const chaptersRef = useRef<PlayerChapter[]>([]);

  const setChapters = (newChapters: PlayerChapter[]) => {
    chaptersRef.current = newChapters;

    setChaptersState(newChapters);
  };

  /* =======================================================
     CURRENT CHAPTER
  ======================================================= */

  const currentChapter = chapters[chapterIndex] ?? null;

  const chapterHasVideo = hasPlayableVideo(currentChapter);

  const chapterHasAudio = hasPlayableAudio(currentChapter);

  const bothAvailable = chapterHasVideo && chapterHasAudio;

  const wantsVideo = chapterHasVideo && (!chapterHasAudio || videoEnabled);

  /* =======================================================
     LOCAL STATE
  ======================================================= */

  const [isSeeking, setIsSeeking] = useState(false);

  const [dragProgress, setDragProgress] = useState(0);

  const [showVideoControls, setShowVideoControls] = useState(true);

  // playback speed (applies to audio and video, survives chapter changes)
  const [playbackRate, setPlaybackRateState] = useState(1);
  const playbackRateRef = useRef(1);

  // sleep timer
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
  const sleepTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepEndsAtRef = useRef(0);

  // who is logged in (used to stop playback on logout)
  const authUser = useSelector((s: RootState) => s.auth.user);
  const prevAuthUserRef = useRef(authUser);

  /* =======================================================
     REFS
  ======================================================= */

  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const autoPlayNextRef = useRef(false);

  const wantsVideoRef = useRef(wantsVideo);

  const modeRef = useRef(mode);

  const isPlayingRef = useRef(isPlaying);

  const videoEnabledRef = useRef(videoEnabled);

  const elapsedRef = useRef(elapsed);

  const durationRef = useRef(duration);

  const busyRef = useRef(false);

  // latest chapter index for listeners that were created earlier
  const chapterIndexRef = useRef(chapterIndex);
  chapterIndexRef.current = chapterIndex;

  // end-of-episode handling
  const lastEndAtRef = useRef(0);
  const oneShotRef = useRef<AudioPlayer | null>(null);
  const [paywall, setPaywall] = useState<PaywallInfo | null>(null);
  const playerScreenOpen = useSelector((st: RootState) => st.player.isExpanded);
  const router = useRouter();

  // true only while audio <-> video toggle is running.
  // The video status listener must NOT set mode / auto-play during that time,
  // the toggle handler controls the order itself.
  const togglingRef = useRef(false);

  // mirrors `isSeeking` so the audio status listener (which lives as long as
  // the player, not as long as one render) always reads the latest value
  const isSeekingRef = useRef(false);

  const pendingSeekRef = useRef<{
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
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    videoEnabledRef.current = videoEnabled;
  }, [videoEnabled]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    wantsVideoRef.current = wantsVideo;
  }, [wantsVideo]);

  /* =======================================================
     LIVE WAVEFORM (real audio loudness)
  ======================================================= */

  const currentChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentChapterIdRef.current = currentChapter?.id
      ? String(currentChapter.id)
      : null;
  }, [currentChapter?.id]);

  const waveform = useLiveWaveform({
    getChapterId: () => currentChapterIdRef.current,
    getDuration: () => durationRef.current,
    isPlaying,
  });

  /* =======================================================
     VIDEO PLAYER
  ======================================================= */

  // PERFORMANCE: the video is NOT loaded together with the chapter any more.
  // Before, every chapter that had a video also started downloading/decoding
  // it while the person was only listening to the audio, which slowed down
  // loading and made the player hang. The video is now loaded
  //   - when the person switches to video, or
  //   - quietly ~3s after the audio is playing (so switching stays fast).
  const videoLoadedForRef = useRef<string | null>(null);

  const videoPlayer = useVideoPlayer(
    null,
    (player) => {
      player.loop = false;
      player.volume = 1.0;
    }
  );

  /* =======================================================
     AUDIO PLAYER
  ======================================================= */

  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // the listener that feeds elapsed / duration / isPlaying into redux
  const audioStatusSubRef = useRef<{ remove: () => void } | null>(null);

  /*
   * The listener is attached right when a player is created, so it always
   * follows the CURRENT player.
   */
  const attachAudioStatus = (player: AudioPlayer) => {
    audioStatusSubRef.current?.remove();

    audioStatusSubRef.current = player.addListener(
      "playbackStatusUpdate",
      (status: AudioStatus) => {
        // an old player must never write into redux
        if (audioPlayerRef.current !== player) {
          return;
        }

        // the episode reached its end.
        // `didJustFinish` is not sent on every device / file type, so also
        // treat "stopped within the last 0.7s of a known duration while we
        // were playing" as finished.
        const endDuration = status.duration ?? 0;
        const endTime = status.currentTime ?? 0;

        const reachedEnd =
          endDuration > 1 &&
          endTime >= endDuration - 0.7 &&
          !status.playing &&
          !(status as any).isBuffering &&
          isPlayingRef.current;

        if ((status as any).didJustFinish || reachedEnd) {
          // show the bar as completed, then move on
          dispatch(setElapsed(endDuration > 0 ? endDuration : endTime));
          handleChapterEnded();
          return;
        }

        // while dragging the seek bar the UI shows the drag position
        if (isSeekingRef.current) {
          return;
        }

        // video mode: the video interval owns elapsed / duration
        if (modeRef.current !== "audio") {
          return;
        }

        dispatch(setElapsed(status.currentTime ?? 0));

        // don't wipe a known duration with 0 while the file is still loading
        const nextDuration = status.duration ?? 0;

        if (nextDuration > 0) {
          dispatch(setDuration(nextDuration));
        }

        // while buffering, `playing` can flicker to false even though the user
        // pressed play: keep showing "playing" in that case
        const playing =
          !!status.playing ||
          (isPlayingRef.current && !!(status as any).isBuffering);

        dispatch(setIsPlaying(playing));
      }
    );
  };

  /* =======================================================
     PLAYBACK SPEED
  ======================================================= */

  const applyRateToAudio = (player: AudioPlayer) => {
    try {
      player.setPlaybackRate(playbackRateRef.current);
    } catch (e) {
      console.log("setPlaybackRate (audio) failed:", e);
    }
  };

  const applyRateToVideo = () => {
    try {
      (videoPlayer as any).playbackRate = playbackRateRef.current;
    } catch (e) {
      console.log("playbackRate (video) failed:", e);
    }
  };

  const setPlaybackRate = (rate: number) => {
    playbackRateRef.current = rate;
    setPlaybackRateState(rate);

    if (audioPlayerRef.current) applyRateToAudio(audioPlayerRef.current);
    applyRateToVideo();
  };

  /* =======================================================
     PAUSE EVERYTHING (shared by sleep timer + stop)
  ======================================================= */

  const pauseAll = () => {
    try {
      videoPlayer.pause();
    } catch {}

    try {
      audioPlayerRef.current?.pause();
    } catch {}

    dispatch(setIsPlaying(false));
  };

  /* =======================================================
     SLEEP TIMER
  ======================================================= */

  const clearSleepTimer = () => {
    if (sleepTimeoutRef.current) {
      clearInterval(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }

    sleepEndsAtRef.current = 0;
    setSleepTimerMinutes(null);
    setSleepTimerRemaining(0);
  };

  const setSleepTimer = (minutes: number | null) => {
    if (sleepTimeoutRef.current) {
      clearInterval(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }

    if (!minutes || minutes <= 0) {
      clearSleepTimer();
      return;
    }

    sleepEndsAtRef.current = Date.now() + minutes * 60 * 1000;
    setSleepTimerMinutes(minutes);
    setSleepTimerRemaining(minutes * 60);

    // one-second tick: updates the countdown and pauses when it reaches 0
    sleepTimeoutRef.current = setInterval(() => {
      const left = Math.max(
        0,
        Math.round((sleepEndsAtRef.current - Date.now()) / 1000)
      );

      setSleepTimerRemaining(left);

      if (left <= 0) {
        pauseAll();
        clearSleepTimer();
      }
    }, 1000);
  };

  const SLEEP_OPTIONS: (number | null)[] = [null, 15, 30, 45, 60];

  const toggleSleepTimer = () => {
    const idx = SLEEP_OPTIONS.indexOf(sleepTimerMinutes);
    setSleepTimer(SLEEP_OPTIONS[(idx + 1) % SLEEP_OPTIONS.length]);
  };

  /* =======================================================
     END OF EPISODE
       - next episode unlocked  -> play it (AUTO_PLAY_NEXT)
       - next episode locked    -> pause + rent / Premium prompt
                                   (+ optional paywall voice message)
       - last episode           -> optional customised voice-over ending
  ======================================================= */

  const stopOneShot = () => {
    if (oneShotRef.current) {
      try {
        oneShotRef.current.pause();
        oneShotRef.current.remove();
      } catch {}

      oneShotRef.current = null;
    }
  };

  // plays a short voice clip (paywall message / ending) once
  const playOneShot = (url: string) => {
    if (!url) return;

    stopOneShot();

    try {
      const clip = createAudioPlayer(url);
      oneShotRef.current = clip;
      clip.volume = 1.0;

      const sub = clip.addListener(
        "playbackStatusUpdate",
        (status: AudioStatus) => {
          if ((status as any).didJustFinish) {
            sub.remove();

            if (oneShotRef.current === clip) {
              try {
                clip.remove();
              } catch {}

              oneShotRef.current = null;
            }
          }
        }
      );

      clip.play();
    } catch (error) {
      console.log("Voice clip failed:", error);
    }
  };

  const isChapterLocked = (chapter?: PlayerChapter | null) => {
    if (!chapter) return false;
    if (typeof chapter.locked === "boolean") return chapter.locked;

    // fallback: a paid episode without any playable file
    return (
      !chapter.free &&
      !hasPlayableAudio(chapter) &&
      !hasPlayableVideo(chapter)
    );
  };

  const showPaywallFor = (next: PlayerChapter) => {
    pauseAll();

    setPaywall({
      storyId: next.storyId ?? null,
      storyTitle: next.story ?? "",
      nextChapterTitle: next.title,
      cover: next.storyCover ?? next.cover ?? null,
    });

    playOneShot(PLAYER_CONFIG.PAYWALL_AUDIO_URL);
  };

  // One entry point to open the full player. `navigate` (not `push`) goes
  // back to the player screen if it is already in the stack instead of
  // stacking a second hidden copy. `isExpanded` is set by the player screen
  // itself when it gets focus (see player-standard-screen), so it can never
  // stay "true" while the screen is closed.
  const openPlayerScreen = () => {
    router.navigate("/player-standard" as any);
  };

  const dismissPaywall = () => {
    stopOneShot();
    setPaywall(null);
  };

  function handleChapterEnded() {
    // audio + video can both report "finished": handle it once
    const now = Date.now();
    if (now - lastEndAtRef.current < 1500) return;
    lastEndAtRef.current = now;

    const list = chaptersRef.current;
    const index = chapterIndexRef.current;
    const next = list[index + 1];

    if (__DEV__) {
      console.log(
        "[player] episode ended:",
        index + 1,
        "/",
        list.length,
        "| next:",
        next ? next.title : "none",
        "| locked:",
        next ? isChapterLocked(next) : "-"
      );
    }

    // last episode of the book
    if (!next) {
      dispatch(setIsPlaying(false));
      playOneShot(PLAYER_CONFIG.CUSTOM_ENDING_AUDIO_URL);
      return;
    }

    // next episode is paid and not unlocked -> rent / Premium prompt
    if (isChapterLocked(next)) {
      showPaywallFor(next);
      return;
    }

    if (PLAYER_CONFIG.AUTO_PLAY_NEXT) {
      playChapterAt(index + 1, { autoPlay: true });
    } else {
      dispatch(setIsPlaying(false));
    }
  }

  /* =======================================================
     LOCK SCREEN / NOTIFICATION PLAYER
     Shows title, cover and play / pause (+ 15s back / forward) on the lock
     screen, Control Centre and the Android notification, so the person can
     control the audio without opening the app. Needs the background-audio
     setup in app.json (see BACKGROUND_AUDIO_SETUP.md) and a development /
     production build (Expo Go has no native media session).
  ======================================================= */

  const activateLockScreen = (player: AudioPlayer, chapter?: PlayerChapter | null) => {
    if (!chapter) return;

    try {
      const artwork = chapter.cover || chapter.storyCover || undefined;

      player.setActiveForLockScreen(
        true,
        {
          title: chapter.title,
          artist: chapter.story ?? "",
          albumTitle: chapter.story ?? "",
          artworkUrl: artwork ?? undefined,
        },
        { showSeekBackward: true, showSeekForward: true }
      );
    } catch (error) {
      console.log("Lock screen controls failed:", error);
    }
  };

  const clearLockScreen = () => {
    try {
      audioPlayerRef.current?.clearLockScreenControls();
    } catch {}
  };

  /* =======================================================
     GET AUDIO PLAYER
  ======================================================= */

  const getAudioPlayer = () => {
    if (!audioPlayerRef.current) {
      if (!currentChapter?.audio_url) {
        throw new Error("Audio URL is missing");
      }

      const player = createAudioPlayer(currentChapter.audio_url);

      audioPlayerRef.current = player;

      // On Android, a freshly created AudioPlayer can start at a volume
      // lower than 1.0 (especially right after a duckOthers session), which
      // made playback sound very quiet. Force full volume explicitly.
      player.volume = 1.0;
      applyRateToAudio(player);
      activateLockScreen(player, currentChapter);

      // start reading real audio levels for the waveform
      waveform.attach(player);

      // feed progress into redux (mini player + player screen)
      attachAudioStatus(player);
    }

    return audioPlayerRef.current;
  };

  /* =======================================================
     GET READY AUDIO PLAYER
  ======================================================= */

  const getReadyAudioPlayer = async () => {
    const player = getAudioPlayer();

    await waitForAudioReady(player);

    return player;
  };

  /* =======================================================
     AUDIO MODE
  ======================================================= */

  useEffect(() => {
    // "duckOthers" tells the OS to LOWER OUR OWN volume whenever another
    // app/notification plays sound, and on Android that ducked level can
    // persist. "mixWithOthers" avoids Android silently keeping playback at
    // reduced volume.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      // iOS only shows the lock-screen / Control Centre player for an audio
      // session that does not mix with others (like Spotify / Audible).
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch((error) => {
      console.log("Audio mode config failed:", error);
    });
  }, []);

  /* =======================================================
     VIDEO STATUS
  ======================================================= */

  useEffect(() => {
    const sub = videoPlayer.addListener(
      "statusChange",
      (payload: { status: VideoPlayerStatus; error?: { message: string } }) => {
        // audio <-> video toggle is running: the toggle handler
        // sets mode, seeks and plays in the correct order by itself.
        if (togglingRef.current) {
          return;
        }

        if (!wantsVideoRef.current) {
          return;
        }

        if (payload.status === "readyToPlay") {
          dispatch(setMode("video"));

          const readyDuration = videoPlayer.duration ?? 0;

          if (readyDuration > 0) {
            dispatch(setDuration(readyDuration));
          }

          if (autoPlayNextRef.current) {
            videoPlayer.play();

            dispatch(setIsPlaying(true));

            autoPlayNextRef.current = false;
          }
        }

        if (payload.status === "error") {
          console.log("Video unavailable:", payload.error?.message);

          if (busyRef.current) {
            return;
          }

          dispatch(setMode("audio"));

          if (autoPlayNextRef.current && chapterHasAudio) {
            getReadyAudioPlayer()
              .then((player) => {
                player.play();

                dispatch(setIsPlaying(true));

                autoPlayNextRef.current = false;
              })
              .catch((error) => {
                console.log("Audio fallback failed:", error);
              });
          }
        }
      }
    );

    return () => sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPlayer]);

  /* =======================================================
     MODE WHEN CHAPTER CHANGES

     `wantsVideo` is NOT a dependency.
     Before: toggling video -> audio changed `wantsVideo`, this effect
     instantly set mode = "audio" while the audio player was still at its
     OLD position, so the stale position was written into redux before the
     seek happened. Now only a real chapter change runs this effect; the
     toggle handler sets the mode itself, after the seek.
  ======================================================= */

  useEffect(() => {
    if (!currentChapter) {
      return;
    }

    if (!wantsVideo) {
      dispatch(setMode("audio"));
    } else {
      dispatch(setMode("checking"));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, chapterHasVideo, chapterHasAudio]);

  /* =======================================================
     QUIET VIDEO PRE-LOAD
     Chapter has audio AND video: a few seconds after the audio is
     playing, load the video in the background so switching is instant.
  ======================================================= */

  useEffect(() => {
    if (!currentChapter?.video_url) return;
    if (!chapterHasVideo || !chapterHasAudio) return;
    if (mode !== "audio" || !isPlaying) return;

    const id = String(currentChapter.id);

    if (videoLoadedForRef.current === id) return;

    const timer = setTimeout(async () => {
      if (busyRef.current || togglingRef.current) return;
      if (videoLoadedForRef.current === id) return;

      try {
        videoLoadedForRef.current = id;

        await videoPlayer.replaceAsync(currentChapter.video_url as string);

        // loaded only to be ready: it must not start by itself
        if (modeRef.current === "audio") {
          videoPlayer.pause();
        }
      } catch {
        videoLoadedForRef.current = null;
      }
    }, 3000);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter?.id, chapterHasVideo, chapterHasAudio, mode, isPlaying]);

  /* =======================================================
     VIDEO ENDED
  ======================================================= */

  useEffect(() => {
    const sub = videoPlayer.addListener("playToEnd", () => {
      if (modeRef.current === "video") {
        handleChapterEnded();
      }
    });

    return () => sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPlayer]);

  /* =======================================================
     VIDEO PROGRESS
  ======================================================= */

  useEffect(() => {
    if (mode !== "video" || isSeeking) {
      return;
    }

    const interval = setInterval(() => {
      const nativeTime = videoPlayer.currentTime ?? 0;

      const pending = pendingSeekRef.current;

      if (pending) {
        const closeEnough = Math.abs(nativeTime - pending.target) < 1.2;

        const timedOut = Date.now() - pending.requestedAt > 2000;

        if (closeEnough || timedOut) {
          pendingSeekRef.current = null;

          dispatch(setElapsed(nativeTime));
        }
      } else {
        dispatch(setElapsed(nativeTime));
      }

      const nextDuration = videoPlayer.duration ?? 0;

      if (nextDuration > 0) {
        dispatch(setDuration(nextDuration));
      }

      dispatch(setIsPlaying(videoPlayer.playing));
    }, 250);

    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, videoPlayer, isSeeking]);

  /* =======================================================
     AUDIO PROGRESS
     (handled by attachAudioStatus, which is attached
      whenever an AudioPlayer is created - see above)
  ======================================================= */

  /* =======================================================
     VIDEO CONTROLS
  ======================================================= */

  const scheduleHideControls = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }

    hideControlsTimerRef.current = setTimeout(() => {
      setShowVideoControls(false);
    }, 2800);
  };

  useEffect(() => {
    if (mode !== "video") {
      return;
    }

    if (isPlaying) {
      scheduleHideControls();
    } else {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }

      setShowVideoControls(true);
    }

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, mode]);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const handlePlayPause = async () => {
    if (busyRef.current) {
      console.log("Play/pause ignored - player busy");

      return;
    }

    if (!currentChapter) {
      console.log("No current chapter");

      return;
    }

    /* VIDEO */

    if (mode === "video") {
      if (isPlaying) {
        videoPlayer.pause();

        dispatch(setIsPlaying(false));
      } else {
        await waitForVideoReady(videoPlayer);

        videoPlayer.play();

        dispatch(setIsPlaying(true));
      }

      return;
    }

    /* AUDIO */

    if (mode === "audio" && chapterHasAudio) {
      if (isPlaying) {
        audioPlayerRef.current?.pause();

        dispatch(setIsPlaying(false));
      } else {
        try {
          const player = await getReadyAudioPlayer();

          player.play();

          dispatch(setIsPlaying(true));
        } catch (error) {
          console.log("Audio play failed:", error);
        }
      }
    }
  };

  /* =======================================================
     TOGGLE VIDEO / AUDIO

     Order (both directions):
       1. read the REAL position of the player we are leaving
       2. pause both
       3. get the other player ready
       4. seek (while paused) and WAIT until the position is applied
       5. set mode + elapsed + duration
       6. only now play (if it was playing)
  ======================================================= */

  const handleToggleVideoMode = async () => {
    if (!bothAvailable) {
      return;
    }

    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    togglingRef.current = true;

    try {
      const goingToVideo = !videoEnabledRef.current;

      const wasPlaying = isPlayingRef.current;

      /* REAL position of the player we are leaving
         (redux `elapsed` can be ~250ms old) */

      let carryOverElapsed = elapsedRef.current;

      try {
        const real = goingToVideo
          ? (audioPlayerRef.current as any)?.currentTime
          : videoPlayer.currentTime;

        if (typeof real === "number" && isFinite(real) && real > 0) {
          carryOverElapsed = real;
        }
      } catch {}

      if (durationRef.current > 0) {
        carryOverElapsed = clampValue(
          carryOverElapsed,
          0,
          durationRef.current
        );
      }

      /* STOP CURRENT */

      try {
        videoPlayer.pause();
      } catch {}

      try {
        audioPlayerRef.current?.pause();
      } catch {}

      dispatch(setIsPlaying(false));

      pendingSeekRef.current = null;

      // the toggle handler plays by itself, listener must not
      autoPlayNextRef.current = false;

      dispatch(setVideoEnabled(goingToVideo));

      wantsVideoRef.current =
        chapterHasVideo && (!chapterHasAudio || goingToVideo);

      /* ================================================
         AUDIO -> VIDEO
      ================================================= */

      if (goingToVideo) {
        dispatch(setMode("checking"));

        try {
          if (!currentChapter?.video_url) {
            throw new Error("Video URL missing");
          }

          // already pre-loaded for THIS chapter? then reuse it (instant),
          // otherwise load it now.
          if (
            videoLoadedForRef.current !== String(currentChapter.id) ||
            videoPlayer.status === "error" ||
            videoPlayer.status === "idle"
          ) {
            videoLoadedForRef.current = String(currentChapter.id);
            await videoPlayer.replaceAsync(currentChapter.video_url);
          }

          await waitForVideoReady(videoPlayer);

          if (videoPlayer.status !== "readyToPlay") {
            throw new Error("Video not ready");
          }

          // seek while PAUSED, wait until the position is really there
          if (carryOverElapsed > 0) {
            await seekVideoAndWait(videoPlayer, carryOverElapsed);
          }

          dispatch(setElapsed(carryOverElapsed));

          const videoDuration = videoPlayer.duration ?? 0;

          if (videoDuration > 0) {
            dispatch(setDuration(videoDuration));
          }

          dispatch(setMode("video"));

          // play AFTER the seek is finished -> no stutter
          if (wasPlaying) {
            videoPlayer.play();

            dispatch(setIsPlaying(true));
          }
        } catch (error) {
          console.log("Video toggle failed:", error);

          dispatch(setVideoEnabled(false));

          wantsVideoRef.current = false;

          if (chapterHasAudio) {
            try {
              const player = await getReadyAudioPlayer();

              await seekAudioAndWait(player, carryOverElapsed);

              dispatch(setElapsed(carryOverElapsed));

              dispatch(setMode("audio"));

              if (wasPlaying) {
                player.play();

                dispatch(setIsPlaying(true));
              }
            } catch (audioError) {
              console.log("Audio fallback failed:", audioError);

              dispatch(setMode("audio"));
            }
          } else {
            dispatch(setMode("audio"));
          }
        }

        return;
      }

      /* ================================================
         VIDEO -> AUDIO
      ================================================= */

      try {
        const player = await getReadyAudioPlayer();

        // mode is still "video" here, so the audio status listener cannot
        // write the OLD audio position into redux while we seek.
        await seekAudioAndWait(player, carryOverElapsed);

        dispatch(setElapsed(carryOverElapsed));

        const audioDuration = player.duration ?? 0;

        if (audioDuration > 0) {
          dispatch(setDuration(audioDuration));
        }

        dispatch(setMode("audio"));

        if (wasPlaying) {
          player.play();

          dispatch(setIsPlaying(true));
        }
      } catch (error) {
        console.log("Audio switch failed:", error);

        dispatch(setMode("audio"));
      }
    } finally {
      busyRef.current = false;
      togglingRef.current = false;
    }
  };

  /* =======================================================
     PLAY CHAPTER
  ======================================================= */

  const playChapterAt = async (
    nextIndex: number,
    opts?: {
      autoPlay?: boolean;
      startAt?: number;
    }
  ) => {
    const availableChapters = chaptersRef.current;

    if (!availableChapters.length) {
      console.log("No chapters available");

      return;
    }

    while (busyRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    busyRef.current = true;

    // a new episode starts: a seek that never finished (old player) must not
    // keep blocking the progress updates of the new one
    isSeekingRef.current = false;
    setIsSeeking(false);
    pendingSeekRef.current = null;

    // close the prompt / stop any voice clip
    lastEndAtRef.current = 0;
    stopOneShot();
    setPaywall(null);

    try {
      const clamped = clampValue(nextIndex, 0, availableChapters.length - 1);

      const nextChapter = availableChapters[clamped];

      // the waveform records loudness per chapter: tell it which one is next
      currentChapterIdRef.current = String(nextChapter.id);

      const nextHasAudio = hasPlayableAudio(nextChapter);

      const nextHasVideo = hasPlayableVideo(nextChapter);

      /*
       * If both audio + video: start with audio.
       * If video only: start video.
       */
      const nextWantsVideo = nextHasVideo && !nextHasAudio;

      const shouldAutoPlay = opts?.autoPlay ?? isPlayingRef.current;

      autoPlayNextRef.current = shouldAutoPlay;

      pendingSeekRef.current = null;

      /* STOP OLD VIDEO (and release it, so it stops buffering) */

      try {
        videoPlayer.pause();
      } catch {}

      if (videoLoadedForRef.current) {
        videoLoadedForRef.current = null;

        try {
          videoPlayer.replaceAsync(null as any).catch(() => {});
        } catch {}
      }

      /* STOP OLD AUDIO */

      try {
        audioPlayerRef.current?.pause();
      } catch {}

      dispatch(setIsPlaying(false));

      dispatch(resetPlaybackTiming());

      dispatch(setVideoEnabled(false));

      dispatch(setChapterIndex(clamped));

      dispatch(setIsActive(true));

      wantsVideoRef.current = nextWantsVideo;

      /* REMOVE OLD AUDIO */

      waveform.detach();

      // stop the old player's status listener first
      audioStatusSubRef.current?.remove();
      audioStatusSubRef.current = null;

      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.remove();
        } catch {}

        audioPlayerRef.current = null;
      }

      /* ================================================
         VIDEO ONLY
      ================================================= */

      if (nextWantsVideo) {
        dispatch(setMode("checking"));

        try {
          if (!nextChapter.video_url) {
            throw new Error("Video URL missing");
          }

          videoLoadedForRef.current = String(nextChapter.id);
          await videoPlayer.replaceAsync(nextChapter.video_url);

          await waitForVideoReady(videoPlayer);

          if (videoPlayer.status === "readyToPlay") {
            dispatch(setMode("video"));
            applyRateToVideo();

            const videoDuration = videoPlayer.duration ?? 0;

            if (videoDuration > 0) {
              dispatch(setDuration(videoDuration));
            } else {
              dispatch(setDuration(nextChapter.duration_in_seconds));
            }

            if (shouldAutoPlay) {
              videoPlayer.play();

              dispatch(setIsPlaying(true));
            }
          } else {
            dispatch(setMode("audio"));
          }
        } catch (error) {
          console.log("Video load failed:", error);

          dispatch(setMode("audio"));
        }

        return;
      }

      /* ================================================
         AUDIO
      ================================================= */

      if (nextHasAudio) {
        dispatch(setMode("audio"));

        try {
          if (!nextChapter.audio_url) {
            throw new Error("Audio URL missing");
          }

          console.log("Loading audio:", nextChapter.audio_url);

          const player = createAudioPlayer(nextChapter.audio_url);

          player.volume = 1.0;
          applyRateToAudio(player);
          activateLockScreen(player, nextChapter);

          audioPlayerRef.current = player;

          // start reading real audio levels for the waveform
          waveform.attach(player);

          // feed progress into redux (mini player + player screen)
          attachAudioStatus(player);

          // PERFORMANCE: when there is no resume position, do not wait for
          // the file to finish loading - start immediately, the player
          // begins as soon as the first data arrives and the status listener
          // corrects the duration. (A resume position needs the file loaded.)
          const needsSeek = !!(opts?.startAt && opts.startAt > 5);

          if (!needsSeek) {
            // placeholder until the file reports its real duration; ignore
            // a missing / wrong value so the bar can never start "full"
            const knownDuration = Number(nextChapter.duration_in_seconds);

            dispatch(setDuration(knownDuration > 0 ? knownDuration : 0));

            if (shouldAutoPlay) {
              player.play();

              dispatch(setIsPlaying(true));
            }

            return;
          }

          await waitForAudioReady(player);

          // optional resume position
          if (opts?.startAt && opts.startAt > 5) {
            try {
              await player.seekTo(opts.startAt);

              dispatch(setElapsed(opts.startAt));
            } catch (seekError) {
              console.log("Start position seek failed:", seekError);
            }
          }

          const audioDuration = player.duration ?? 0;

          if (audioDuration > 0) {
            dispatch(setDuration(audioDuration));
          } else {
            dispatch(setDuration(nextChapter.duration_in_seconds));
          }

          if (shouldAutoPlay) {
            player.play();

            dispatch(setIsPlaying(true));
          }
        } catch (error) {
          console.log("Audio load failed:", error);
        }

        return;
      }

      console.log("Chapter has no playable source");

      dispatch(setMode("audio"));
    } finally {
      busyRef.current = false;
    }
  };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const handlePreviousChapter = () => {
    if (chapterIndex <= 0) {
      return;
    }

    playChapterAt(chapterIndex - 1, { autoPlay: true });
  };

  /* =======================================================
     NEXT
  ======================================================= */

  const handleNextChapter = () => {
    if (chapterIndex >= chaptersRef.current.length - 1) {
      return;
    }

    const next = chaptersRef.current[chapterIndex + 1];

    // locked episode: show the rent / Premium prompt instead of failing
    if (isChapterLocked(next)) {
      showPaywallFor(next);
      return;
    }

    playChapterAt(chapterIndex + 1, { autoPlay: true });
  };

  /* =======================================================
     SEEK
  ======================================================= */

  const seekToTime = async (targetSeconds: number) => {
    const target = clampValue(
      targetSeconds,
      0,
      durationRef.current || targetSeconds
    );

    if (modeRef.current === "video") {
      await waitForVideoReady(videoPlayer);

      pendingSeekRef.current = {
        target,
        requestedAt: Date.now(),
      };

      videoPlayer.currentTime = target;
    }

    if (modeRef.current === "audio" && chapterHasAudio) {
      try {
        const player = await getReadyAudioPlayer();

        await player.seekTo(target);
      } catch (error) {
        console.log("Audio seek failed:", error);
      }
    }

    dispatch(setElapsed(target));
  };

  /* =======================================================
     SKIP
     (works in audio mode AND video mode)
  ======================================================= */

  const skip = (deltaSeconds: number) => {
    // controls overlay only exists in video mode
    if (modeRef.current === "video") {
      setShowVideoControls(true);

      if (isPlayingRef.current) {
        scheduleHideControls();
      }
    }

    const target = clampValue(
      elapsedRef.current + deltaSeconds,
      0,
      durationRef.current || elapsedRef.current + deltaSeconds
    );

    seekToTime(target);
  };

  /* =======================================================
     SEEK DRAG
  ======================================================= */

  const beginSeek = (fraction: number) => {
    isSeekingRef.current = true;
    setIsSeeking(true);
    setDragProgress(fraction);
  };

  const updateSeekDrag = (fraction: number) => {
    setDragProgress(fraction);
  };

  const endSeek = (fraction: number) => {
    setDragProgress(fraction);

    const target = fraction * (durationRef.current || 0);

    seekToTime(target).finally(() => {
      isSeekingRef.current = false;
      setIsSeeking(false);
    });
  };

  /* =======================================================
     EXPAND
  ======================================================= */

  const expandPlayer = () => {
    dispatch(setIsExpanded(true));
  };

  /* =======================================================
     COLLAPSE
  ======================================================= */

  const collapsePlayer = () => {
    dispatch(setIsExpanded(false));

    if (modeRef.current === "video" && videoEnabledRef.current) {
      handleToggleVideoMode();
    }
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const closePlayer = () => {
    pendingSeekRef.current = null;

    // remove the lock-screen / notification player
    clearLockScreen();

    try {
      videoPlayer.pause();
    } catch {}

    try {
      audioPlayerRef.current?.pause();
    } catch {}

    dispatch(setIsPlaying(false));

    dispatch(setIsExpanded(false));

    dispatch(setIsActive(false));
  };

  /* =======================================================
     STOP AND RESET (logout)
     Pauses, releases the audio player and clears the queue so
     nothing can keep playing after the user signs out.
  ======================================================= */

  const stopAndReset = () => {
    pendingSeekRef.current = null;
    autoPlayNextRef.current = false;

    clearSleepTimer();
    stopOneShot();
    setPaywall(null);

    try {
      videoPlayer.pause();
    } catch {}

    waveform.detach();

    audioStatusSubRef.current?.remove();
    audioStatusSubRef.current = null;

    clearLockScreen();

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
      } catch {}

      audioPlayerRef.current = null;
    }

    setChapters([]);

    dispatch(setIsPlaying(false));
    dispatch(resetPlaybackTiming());
    dispatch(setVideoEnabled(false));
    dispatch(setChapterIndex(0));
    dispatch(setMode("checking"));
    dispatch(setIsExpanded(false));
    dispatch(setIsActive(false));
  };

  // Any logout path (profile button, token expiry, ...) ends up here:
  // the moment `auth.user` goes from a user to null, playback is stopped.
  useEffect(() => {
    if (prevAuthUserRef.current && !authUser) {
      stopAndReset();
    }

    prevAuthUserRef.current = authUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // clear the sleep-timer interval if the provider ever unmounts
  useEffect(() => {
    return () => {
      if (sleepTimeoutRef.current) clearInterval(sleepTimeoutRef.current);
    };
  }, []);

  /* =======================================================
     BACKGROUND
  ======================================================= */

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (
        (state === "background" || state === "inactive") &&
        modeRef.current === "video" &&
        videoEnabledRef.current
      ) {
        handleToggleVideoMode();
      }
    });

    return () => sub.remove();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      waveform.detach();

      audioStatusSubRef.current?.remove();
      audioStatusSubRef.current = null;

      try {
        videoPlayer.pause();
      } catch {}

      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.remove();
        } catch {}
      }

      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value: PlayerContextValue = {
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

    stopAndReset,

    paywall,

    dismissPaywall,

    openPlayerScreen,

    playbackRate,

    setPlaybackRate,

    sleepTimerMinutes,

    sleepTimerRemaining,

    setSleepTimer,

    toggleSleepTimer,

    audioLevel: waveform.audioLevel,

    liveLevelAvailable: waveform.liveLevelAvailable,

    getWaveLevels: waveform.getWaveLevels,

    subscribeWaveLevels: waveform.subscribeWaveLevels,
  };

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* the player screen draws its own copy of this prompt */}
      {!playerScreenOpen && (
        <EpisodePaywallModal
          paywall={paywall}
          onDismiss={dismissPaywall}
          onCollapse={() => dispatch(setIsExpanded(false))}
        />
      )}
    </PlayerContext.Provider>
  );
}