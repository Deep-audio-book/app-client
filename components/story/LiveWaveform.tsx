import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import {
  envelopeAt,
  makeWaveform,
  parsePeaks,
  resamplePeaks,
} from "./waveformUtils";

/**
 * Player waveform.
 *
 * Why it is a separate, memoised component:
 *  - Before, the whole 1800-line player screen re-rendered every time the
 *    waveform data / live level changed (several times per second) and
 *    re-created ~56 Animated interpolations on each render. That is what made
 *    the player feel heavy / hang. Now only this component updates, and only
 *    the ~9 bars next to the playhead are animated.
 *
 * Sync with playback:
 *  - Real audio samples available (expo-audio sampling): bars follow the real
 *    loudness of the audio.
 *  - Otherwise: the motion is calculated from the PLAYBACK TIME (and speed),
 *    so it is tied to the audio position, freezes on pause and follows seek.
 */

export const WAVE_BARS = 56;
export const WAVE_HEIGHT = 54;
const BAR_FILL = 0.8;
const REACT_DISTANCE = 4; // bars on each side of the playhead that move
const SYNC_TICK_MS = 70;

const ACCENT_SOFT = "#FFC078";
const BAR_IDLE = "rgba(255,190,120,0.30)";

type Props = {
  chapterId: string;
  rawPeaks?: unknown;
  /** 0..1 */
  progress: number;
  /** seconds, from the player */
  elapsed: number;
  playbackRate: number;
  isPlaying: boolean;
  isSeeking: boolean;
  isVideoNow: boolean;
  audioLevel?: Animated.Value;
  liveLevelAvailable: boolean;
  getWaveLevels?: (chapterId: string) => number[] | undefined;
  subscribeWaveLevels?: (listener: () => void) => () => void;
};

/* ---------------------------------------------------------------------- */

type BarProps = {
  height: number;
  played: boolean;
  /** 0 = not animated, 0..1 = how strongly it reacts to the level */
  weight: number;
  level: Animated.Value;
};

const WaveBar = memo(function WaveBar({
  height,
  played,
  weight,
  level,
}: BarProps) {
  const transform = useMemo(() => {
    // Animated validates `transform` and crashes ("forEach of null") when it
    // is undefined / null, so a bar that is not animated gets a plain
    // identity transform instead.
    if (weight <= 0) return [{ translateY: 0 }, { scaleY: 1 }];

    return [
      {
        translateY: level.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(height * 0.6 * weight) / 2],
        }),
      },
      {
        scaleY: level.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1 + 0.6 * weight],
        }),
      },
    ];
  }, [weight, height, level]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height,
          backgroundColor: played ? ACCENT_SOFT : BAR_IDLE,
          transform,
        } as any,
      ]}
    />
  );
});

/* ---------------------------------------------------------------------- */

function LiveWaveformBase({
  chapterId,
  rawPeaks,
  progress,
  elapsed,
  playbackRate,
  isPlaying,
  isSeeking,
  isVideoNow,
  audioLevel,
  liveLevelAvailable,
  getWaveLevels,
  subscribeWaveLevels,
}: Props) {
  /* ---- bar shape: backend peaks -> generated placeholder ---- */

  const backendPeaks = useMemo(() => parsePeaks(rawPeaks), [rawPeaks]);

  const baseWave = useMemo(
    () =>
      backendPeaks
        ? resamplePeaks(backendPeaks, WAVE_BARS)
        : makeWaveform(chapterId, WAVE_BARS),
    [chapterId, backendPeaks]
  );

  /* ---- re-render only this component when new real loudness arrives ---- */

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!subscribeWaveLevels) return;
    return subscribeWaveLevels(() => setTick((t) => t + 1));
  }, [subscribeWaveLevels]);

  /* ---- is real live sampling actually moving? ---- */

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
      if (Date.now() - lastChange > 1500) setLiveAlive(false);
    }, 1000);

    return () => {
      audioLevel.removeListener(id);
      clearInterval(timer);
    };
  }, [audioLevel, liveLevelAvailable, isPlaying]);

  const liveMode = liveAlive && !!audioLevel && !isVideoNow;

  /* ---- played bars show the REAL loudness that was measured ---- */

  let wave = baseWave;

  if (!backendPeaks && getWaveLevels) {
    const recorded = getWaveLevels(chapterId);

    if (recorded) {
      const known = recorded.filter((v) => v >= 0);

      if (known.length) {
        const max = Math.max(...known, 0.03);

        wave = baseWave.map((base, i) =>
          recorded[i] >= 0
            ? 0.18 + 0.82 * Math.min(1, recorded[i] / max)
            : base
        );
      }
    }
  }

  /* ---- playback-time driven level (used when no real samples) ---- */

  const syncLevel = useRef(new Animated.Value(0)).current;
  const anchorRef = useRef({ elapsed, at: Date.now() });

  // every position update from the player re-anchors our clock
  useEffect(() => {
    anchorRef.current = { elapsed, at: Date.now() };
  }, [elapsed]);

  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < chapterId.length; i++) {
      h = (h * 31 + chapterId.charCodeAt(i)) % 9973;
    }
    return h;
  }, [chapterId]);

  const useSync = isPlaying && !isSeeking && !liveMode;

  useEffect(() => {
    if (!useSync) {
      syncLevel.stopAnimation();
      Animated.timing(syncLevel, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    const timer = setInterval(() => {
      const { elapsed: base, at } = anchorRef.current;
      const t = base + ((Date.now() - at) / 1000) * playbackRate;

      Animated.timing(syncLevel, {
        toValue: envelopeAt(t, seed),
        duration: SYNC_TICK_MS,
        easing: Easing.linear,
        useNativeDriver: true, // runs on the UI thread
      }).start();
    }, SYNC_TICK_MS);

    return () => clearInterval(timer);
  }, [useSync, playbackRate, seed, syncLevel]);

  const level = liveMode && audioLevel ? audioLevel : syncLevel;

  /* ---- render ---- */

  const playIndex = Math.min(
    wave.length - 1,
    Math.max(0, Math.floor(progress * wave.length))
  );

  const animateBars = isPlaying && !isSeeking;

  return (
    <View style={styles.row} pointerEvents="none">
      {wave.map((h, i) => {
        const distance = Math.abs(i - playIndex);
        const weight =
          animateBars && distance <= REACT_DISTANCE
            ? 1 - distance / (REACT_DISTANCE + 1)
            : 0;

        return (
          <WaveBar
            key={i}
            height={WAVE_HEIGHT * BAR_FILL * h}
            played={(i + 0.5) / wave.length <= progress}
            weight={weight}
            level={level}
          />
        );
      })}
    </View>
  );
}

export default memo(LiveWaveformBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: WAVE_HEIGHT,
    marginBottom: 8,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
