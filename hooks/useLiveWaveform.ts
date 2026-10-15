import {
  AudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";

/*
 * Real audio-driven waveform for expo-audio.
 *
 * What it does
 *  - Turns on expo-audio's audio sampling for the player that is playing.
 *  - `audioLevel`      : Animated.Value (0..1), the live loudness right now.
 *                        It is updated without re-rendering React.
 *  - `getWaveLevels()` : the REAL loudness of each part of the chapter that
 *                        has already been played (a bar is -1 until played).
 *  - `subscribeWaveLevels()` : tells the UI when those bars changed.
 *
 * Notes
 *  - Android needs the RECORD_AUDIO permission for audio sampling (OS limit
 *    of the Visualizer API). Set ASK_MIC_PERMISSION_ON_ANDROID to false if you
 *    don't want to show that permission prompt; the waveform then falls back
 *    to the generated animation.
 *  - If sampling isn't supported / allowed, `liveLevelAvailable` stays false.
 */

// keep in sync with WAVE_BARS in PlayerStandardScreen
export const WAVE_BARS = 56;

const ENABLE_LIVE_WAVEFORM = true;
const ASK_MIC_PERMISSION_ON_ANDROID = true;

const LEVEL_GAIN = 3.2; // speech RMS is small, this lifts it to 0..1
const EMIT_EVERY_MS = 33; // live level ~30 fps
const NOTIFY_EVERY_MS = 400; // bars refresh ~2.5x per second

type Recorded = {
  sum: number[];
  count: number[];
  peak: number[];
};

export type LiveWaveformOptions = {
  getChapterId: () => string | null;
  getDuration: () => number;
  isPlaying: boolean;
};

export function useLiveWaveform(options: LiveWaveformOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const audioLevel = useRef(new Animated.Value(0)).current;

  const [liveLevelAvailable, setLiveLevelAvailable] = useState(false);
  const availableRef = useRef(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const permissionRef = useRef<boolean | null>(null);

  const liveLevelRef = useRef(0);
  const lastEmitRef = useRef(0);
  const lastNotifyRef = useRef(0);

  const recordedRef = useRef<Record<string, Recorded>>({});
  const listenersRef = useRef<Set<() => void>>(new Set());

  /* ------------------------------------------------------------------ */

  const notify = () => {
    listenersRef.current.forEach((listener) => listener());
  };

  const subscribeWaveLevels = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // real loudness (0..1, raw RMS) for every bar; -1 = not played yet
  const getWaveLevels = useCallback((chapterId: string) => {
    const rec = recordedRef.current[chapterId];

    if (!rec) return undefined;

    return Array.from({ length: WAVE_BARS }, (_, i) => {
      if (!rec.count[i]) return -1;

      const mean = rec.sum[i] / rec.count[i];
      return mean * 0.5 + rec.peak[i] * 0.5;
    });
  }, []);

  /* ------------------------------------------------------------------ */

  const handleSample = (sample: any) => {
    const frames: number[] | undefined = sample?.channels?.[0]?.frames;

    if (!frames || frames.length === 0) return;

    // loudness of this chunk (RMS)
    let sum = 0;
    for (let i = 0; i < frames.length; i++) {
      const v = frames[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / frames.length);

    // fast attack, slow release -> bars jump up quickly and fall smoothly
    liveLevelRef.current = Math.max(rms, liveLevelRef.current * 0.8);

    // remember the loudness of this position of the chapter
    const chapterId = optionsRef.current.getChapterId();
    const duration = optionsRef.current.getDuration();
    const timestamp = sample?.timestamp;

    if (chapterId && duration > 0 && typeof timestamp === "number") {
      const index = Math.min(
        WAVE_BARS - 1,
        Math.max(0, Math.floor((timestamp / duration) * WAVE_BARS))
      );

      let rec = recordedRef.current[chapterId];

      if (!rec) {
        rec = recordedRef.current[chapterId] = {
          sum: new Array(WAVE_BARS).fill(0),
          count: new Array(WAVE_BARS).fill(0),
          peak: new Array(WAVE_BARS).fill(0),
        };
      }

      rec.sum[index] += rms;
      rec.count[index] += 1;
      if (rms > rec.peak[index]) rec.peak[index] = rms;
    }

    const now = Date.now();

    if (now - lastEmitRef.current >= EMIT_EVERY_MS) {
      lastEmitRef.current = now;
      audioLevel.setValue(Math.min(1, liveLevelRef.current * LEVEL_GAIN));

      if (!availableRef.current) {
        availableRef.current = true;
        setLiveLevelAvailable(true);
      }
    }

    if (now - lastNotifyRef.current >= NOTIFY_EVERY_MS) {
      lastNotifyRef.current = now;
      notify();
    }
  };

  /* ------------------------------------------------------------------ */

  const ensurePermission = async () => {
    if (Platform.OS !== "android") return true;
    if (!ASK_MIC_PERMISSION_ON_ANDROID) return false;
    if (permissionRef.current !== null) return permissionRef.current;

    try {
      const current = await getRecordingPermissionsAsync();

      if (current.granted) {
        permissionRef.current = true;
      } else if (!current.canAskAgain) {
        permissionRef.current = false;
      } else {
        const asked = await requestRecordingPermissionsAsync();
        permissionRef.current = asked.granted;
      }
    } catch {
      permissionRef.current = false;
    }

    return permissionRef.current;
  };

  const detach = useCallback(() => {
    try {
      subRef.current?.remove();
    } catch {}
    subRef.current = null;

    try {
      (playerRef.current as any)?.setAudioSamplingEnabled?.(false);
    } catch {}
    playerRef.current = null;

    liveLevelRef.current = 0;
    audioLevel.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // call this right after an audio player is created
  const attach = useCallback(async (player: AudioPlayer) => {
    if (!ENABLE_LIVE_WAVEFORM) return;

    try {
      if (playerRef.current && playerRef.current !== player) {
        detach();
      }

      playerRef.current = player;

      if (!(player as any).isAudioSamplingSupported) return;

      const allowed = await ensurePermission();

      // the player may have been replaced while we were asking
      if (!allowed || playerRef.current !== player) return;

      (player as any).setAudioSamplingEnabled?.(true);

      subRef.current?.remove();
      subRef.current = (player as any).addListener(
        "audioSampleUpdate",
        handleSample
      );
    } catch (error) {
      console.log("Live waveform unavailable:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ */

  // paused / stopped -> level falls to zero
  useEffect(() => {
    if (!options.isPlaying) {
      liveLevelRef.current = 0;
      audioLevel.setValue(0);
    }
  }, [options.isPlaying, audioLevel]);

  useEffect(() => {
    return () => {
      detach();
    };
  }, [detach]);

  return {
    audioLevel,
    liveLevelAvailable,
    getWaveLevels,
    subscribeWaveLevels,
    attach,
    detach,
  };
}
