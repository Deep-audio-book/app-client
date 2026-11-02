/**
 * Helpers for the player waveform (moved out of the player screen so the
 * waveform can live in its own memoised component).
 */

/*
 * Placeholder waveform (used until real loudness is known). The bar heights
 * are generated from the chapter id: every chapter gets its own shape and it
 * never changes between renders.
 */
export function makeWaveform(seed: string, count: number): number[] {
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
export function parsePeaks(input: unknown): number[] | null {
  let arr: unknown = input;

  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = (arr as string)
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => isFinite(v));
    }
  }

  if (!Array.isArray(arr)) return null;

  const nums = arr.map((v) => Math.abs(Number(v))).filter((v) => isFinite(v));
  return nums.length >= 8 ? nums : null;
}

// any number of peaks -> `count` bars (max of each bucket, normalised 0..1)
export function resamplePeaks(peaks: number[], count: number): number[] {
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

// tiny deterministic random in 0..1
export function noise(i: number, k: number) {
  const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Loudness envelope that depends ONLY on the playback time (and the chapter),
 * so the animation is tied to the audio position: the same second of a
 * chapter always moves the same way, it freezes when paused and follows
 * seeking / speed changes. Used when real audio samples are not available.
 * Returns 0..1.
 */
export function envelopeAt(timeSeconds: number, seed: number): number {
  const a = Math.abs(Math.sin(timeSeconds * 7.3 + seed * 1.7));
  const b = Math.abs(Math.sin(timeSeconds * 3.1 + seed * 0.9));
  const c = Math.abs(Math.sin(timeSeconds * 11.9 + seed * 2.3));
  return Math.min(1, 0.12 + 0.88 * (a * 0.5 + b * 0.3 + c * 0.2));
}
