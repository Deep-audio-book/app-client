/**
 * useListenTracker  (+ <ListenTracker /> wrapper component)
 *
 * SEND RULES (keeps API cost low):
 *   - every N seconds while playing (N from backend `getListenConfig`, default 20)
 *   - on PAUSE
 *   - when the chapter ENDS
 *   - when the chapter CHANGES
 *   - on seek / skip (old run closed, new session starts)
 *   - on audio <-> video switch (old run closed, new session starts)
 *   - when the app goes to BACKGROUND / is closed
 *
 * SAFETY: listened seconds can never exceed real (wall-clock) play time
 * x 2.1, so a position jump (resume / bar drag / media switch) can never be
 * counted as "listened" seconds.
 *
 * BACKEND CONTRACT
 * ----------------
 * method: "getListenConfig"
 *   returns data: { heartbeat_sec }            (optional, default 20)
 *
 * method: "saveListen"
 *   body: client_session_id, story_id, chapter_id, media_type,
 *         start_position_sec, end_position_sec, position_sec,
 *         seconds_listened (CUMULATIVE for this session), duration_sec,
 *         completed, platform, started_at, ended_at|null
 *   user_id / access_type NOT sent (server decides).
 *   server: UPSERT by (user_id, client_session_id)
 *           seconds_listened = GREATEST(old, new)
 *           ended_at = COALESCE(new, old)
 *   response (optional): data: { heartbeat_sec }
 *
 * method: "getListenProgress"   body: story_id, chapter_id
 *   returns data: { last_position_sec, completed }
 *
 * MOUNT ONCE inside <PlayerProvider>:
 *   <PlayerProvider>
 *     <ListenTracker />
 *     <Stack />
 *   </PlayerProvider>
 */

import axios from "@/axios.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useSelector } from "react-redux";

import { usePlayer } from "../providers/PlayerProvider";
import { RootState } from "../redux/store";

const DEBUG = __DEV__ && true;
const log = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

const DEFAULT_HEARTBEAT_SEC = 20; // used until backend config arrives
const MIN_HEARTBEAT_SEC = 10;
const MAX_HEARTBEAT_SEC = 60;
const QUEUE_KEY = "listen_queue_v1";
const CONFIG_KEY = "listen_config_v1";
const COMPLETE_AT = 0.95; // 95% listened = completed
const COMPLETE_TAIL_SEC = 3; // or last 3 seconds reached = completed
const CHAPTER_END_SEC = 1; // position within 1s of duration = chapter ended
const DEAD_TICKS = 3; // elapsed frozen this many ticks while playing -> fallback
const MAX_SPEED = 2.1; // fastest playback speed (2x) + small tolerance
const RESUME_WINDOW_MS = 5000; // jump right after resume / media switch is NOT a user seek

type Session = {
  id: string;
  storyId: number;
  chapterId: number;
  mediaType: "audio" | "video";
  startedAt: Date;
  startPos: number;
  seconds: number; // content seconds counted as listened (cumulative)
  playWall: number; // real wall-clock seconds spent in "playing" state
  lastPos: number; // last REAL player position (redux elapsed)
  deadSec: number; // seconds counted by wall clock while elapsed was frozen
  frozenTicks: number; // consecutive ticks where elapsed did not move
  lastWall: number; // Date.now() at last tick
  lastSent: number; // Date.now() at last send attempt
  fresh: boolean; // first tick after start only syncs the position
};

type Payload = Record<string, any>;

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const progressKey = (storyId: number | string, chapterId: number | string) =>
  `listen_pos:${storyId}:${chapterId}`;

const clampHeartbeat = (sec: any) => {
  const n = Number(sec);
  if (!isFinite(n) || n <= 0) return DEFAULT_HEARTBEAT_SEC;
  return Math.min(MAX_HEARTBEAT_SEC, Math.max(MIN_HEARTBEAT_SEC, n));
};

/* ------------------------------------------------------------------ */
/* Offline queue: keep only the LATEST payload per session id          */
/* ------------------------------------------------------------------ */

let syncing = false;

async function readQueue(): Promise<Record<string, Payload>> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeQueue(q: Record<string, Payload>) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)).catch(() => {});
}

async function enqueue(payload: Payload) {
  const q = await readQueue();
  q[payload.client_session_id] = payload;
  await writeQueue(q);
  log("[saveListen] QUEUED (offline)", payload.client_session_id);
}

async function dequeue(sessionId: string) {
  const q = await readQueue();
  if (q[sessionId]) {
    delete q[sessionId];
    await writeQueue(q);
  }
}

async function syncQueue() {
  if (syncing) return;
  syncing = true;

  try {
    const q = await readQueue();
    const ids = Object.keys(q);
    if (!ids.length) return;

    log("[saveListen] SYNC queue, items:", ids.length);

    for (const id of ids) {
      try {
        const res = await axios.post("/", { method: "saveListen", ...q[id] });
        log("[saveListen] SYNC OK", id, res.status, JSON.stringify(res.data));
        delete q[id];
      } catch (e: any) {
        log(
          "[saveListen] SYNC ERROR",
          id,
          e?.response?.status,
          JSON.stringify(e?.response?.data),
          e?.message
        );
        if (!e?.response) break; // still offline, try later
        delete q[id]; // server rejected it -> don't retry forever
      }
    }
    await writeQueue(q);
  } finally {
    syncing = false;
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useListenTracker() {
  const player = usePlayer() as any;
  const currentChapter = player.currentChapter as any;
  const seekToTime: ((s: number) => void) | undefined = player.seekToTime;

  const { isPlaying, elapsed, duration, mode } = useSelector(
    (s: RootState) => s.player
  );
  const netInfo = useNetInfo();

  // always-fresh values for timers / listeners (no stale closures)
  const live = useRef({
    elapsed: 0,
    duration: 0,
    isPlaying: false,
    mode: "audio" as string,
  });
  live.current = { elapsed, duration, isPlaying, mode };

  const chapterRef = useRef<any>(currentChapter);
  chapterRef.current = currentChapter;

  const session = useRef<Session | null>(null);

  // heartbeat interval (seconds) - comes from the backend
  const heartbeatSec = useRef<number>(DEFAULT_HEARTBEAT_SEC);

  // until this time, a position jump is a resume / media-switch re-sync
  // (NOT a user seek)
  const resumeUntil = useRef(0);

  /* ---------- backend config: heartbeat seconds ---------- */

  const loadConfig = async () => {
    try {
      const res = await axios.post("/", { method: "getListenConfig" });
      const sec = res.data?.data?.heartbeat_sec;
      if (sec != null) {
        heartbeatSec.current = clampHeartbeat(sec);
        AsyncStorage.setItem(CONFIG_KEY, String(heartbeatSec.current)).catch(
          () => {}
        );
      }
      log("[config] heartbeat_sec =", heartbeatSec.current);
    } catch {
      // backend not ready / offline -> last saved value, else default
      const saved = await AsyncStorage.getItem(CONFIG_KEY).catch(() => null);
      if (saved) heartbeatSec.current = clampHeartbeat(saved);
      log("[config] fallback heartbeat_sec =", heartbeatSec.current);
    }
  };

  useEffect(() => {
    loadConfig();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadConfig();
    });
    return () => sub.remove();
  }, []);

  /* ---------- debug ---------- */

  useEffect(() => {
    log("[tracker] MOUNTED");
    return () => log("[tracker] UNMOUNTED");
  }, []);

  useEffect(() => {
    log(
      "[tracker] state -> isPlaying:",
      isPlaying,
      "| chapterId:",
      currentChapter?.id,
      "| storyId:",
      currentChapter?.storyId,
      "| mode:",
      mode
    );
  }, [isPlaying, currentChapter?.id, mode]);

  /* ---------- build + send ---------- */

  const flush = async (ended: boolean) => {
    const s = session.current;
    if (!s) return;

    s.lastSent = Date.now(); // even when skipped -> no 1s retry spam

    const dur = live.current.duration || 0;

    // listened seconds can never be more than real play time (x2 speed max)
    const listened = Math.min(s.seconds, s.playWall * MAX_SPEED + 1);

    // real position + frozen-time estimate, capped so a jump can't inflate it
    const posExact = s.lastPos + s.deadSec;
    const pos = Math.floor(
      Math.min(posExact, s.startPos + listened * MAX_SPEED + 1)
    );

    // nothing was listened -> no junk row
    if (listened < 1) {
      log("[saveListen] SKIPPED (listened < 1s)");
      if (ended) session.current = null;
      return;
    }

    const completed =
      dur > 0 && (pos / dur >= COMPLETE_AT || dur - pos <= COMPLETE_TAIL_SEC);

    const payload: Payload = {
      client_session_id: s.id,
      story_id: s.storyId,
      chapter_id: s.chapterId,
      media_type: s.mediaType,
      start_position_sec: s.startPos,
      end_position_sec: pos,
      position_sec: pos,
      seconds_listened: Math.floor(listened),
      duration_sec: dur ? Math.floor(dur) : null,
      completed,
      platform: Platform.OS,
      started_at: s.startedAt.toISOString(),
      ended_at: ended ? new Date().toISOString() : null,
    };

    if (ended) session.current = null; // close synchronously

    // local copy -> resume works even fully offline
    AsyncStorage.setItem(
      progressKey(s.storyId, s.chapterId),
      String(completed ? 0 : pos)
    ).catch(() => {});

    try {
      log("[saveListen] SEND", JSON.stringify({ method: "saveListen", ...payload }));

      const res = await axios.post("/", { method: "saveListen", ...payload });

      log("[saveListen] RESPONSE", res.status, JSON.stringify(res.data));

      // backend can change the interval on the fly
      const sec = res.data?.data?.heartbeat_sec;
      if (sec != null) heartbeatSec.current = clampHeartbeat(sec);

      dequeue(payload.client_session_id);
    } catch (e: any) {
      log(
        "[saveListen] ERROR",
        e?.response?.status,
        JSON.stringify(e?.response?.data),
        e?.message
      );
      if (!e?.response) await enqueue(payload);
    }
  };

  const startSession = (ch: any) => {
    if (!ch || ch.id == null || ch.storyId == null) {
      log(
        "[tracker] session NOT started -> chapter has no id/storyId:",
        JSON.stringify({ id: ch?.id, storyId: ch?.storyId })
      );
      return;
    }

    const now = Date.now();
    session.current = {
      id: makeId(),
      storyId: Number(ch.storyId),
      chapterId: Number(ch.id),
      mediaType: live.current.mode === "video" ? "video" : "audio",
      startedAt: new Date(),
      startPos: Math.floor(live.current.elapsed),
      seconds: 0,
      playWall: 0,
      lastPos: live.current.elapsed,
      deadSec: 0,
      frozenTicks: 0,
      lastWall: now,
      lastSent: now,
      fresh: true,
    };

    log(
      "[tracker] session START",
      session.current.id,
      "story:",
      session.current.storyId,
      "chapter:",
      session.current.chapterId
    );
  };

  /* ---------- 1s tick: count listening, detect seek / end / heartbeat ---------- */

  useEffect(() => {
    const id = setInterval(() => {
      const s = session.current;
      if (!s) return;

      const now = Date.now();
      const { elapsed: pos, duration: dur, isPlaying: playing } = live.current;

      if (s.fresh) {
        // elapsed can still hold the previous chapter's value for a moment
        s.startPos = Math.floor(pos);
        s.lastPos = pos;
        s.lastWall = now;
        s.fresh = false;
        return;
      }

      // chapter is changing -> the effect below closes this session
      if (String(chapterRef.current?.id) !== String(s.chapterId)) return;

      const wallSec = Math.min((now - s.lastWall) / 1000, 3);
      const moved = pos - s.lastPos;
      s.lastWall = now;

      if (!playing) {
        s.lastPos = pos;
        return;
      }

      // real time spent in "playing" state (used as a safety cap in flush)
      s.playWall += wallSec;

      // ---- resume / media switch just seeked: re-sync only, not a user seek ----
      if (now < resumeUntil.current && Math.abs(moved) > 2) {
        s.startPos = Math.floor(pos);
        s.lastPos = pos;
        s.deadSec = 0;
        s.frozenTicks = 0;
        log("[tracker] resume jump ignored, startPos =", s.startPos);
        return;
      }

      // ---- elapsed is NOT moving while playing (redux not updating) ----
      if (Math.abs(moved) < 0.01) {
        s.frozenTicks += 1;

        if (s.frozenTicks >= DEAD_TICKS) {
          // fallback: count by wall clock
          s.seconds += wallSec;
          s.deadSec += wallSec;
        }
      } else {
        // elapsed moved
        if (s.deadSec > 0) {
          // it was frozen before and just woke up -> re-sync, don't treat as seek
          log("[tracker] elapsed alive again");
          s.deadSec = 0;
          s.frozenTicks = 0;
          s.lastPos = pos;
          return;
        }

        s.frozenTicks = 0;

        // Natural playback moves forward at most ~2x real time. Anything else
        // (bar drag, +15 / +30 skip, back skip) is a SEEK.
        const jumped = moved < -1 || moved > wallSec * MAX_SPEED + 1;

        if (jumped) {
          log("[tracker] seek detected, moved:", moved.toFixed(1), "s");
          flush(true);
          startSession(chapterRef.current);
          return;
        }

        if (moved > 0) s.seconds += moved;
        s.lastPos = pos;
      }

      // CHAPTER ENDED -> send now and close the session
      if (dur > 0 && s.lastPos + s.deadSec >= dur - CHAPTER_END_SEC) {
        log("[tracker] chapter ENDED");
        flush(true);
        return;
      }

      // HEARTBEAT every N seconds (N from backend)
      if (now - s.lastSent >= heartbeatSec.current * 1000) {
        log(
          "[tracker] heartbeat, seconds so far:",
          Math.floor(s.seconds),
          "| playWall:",
          Math.floor(s.playWall),
          "| deadSec:",
          Math.floor(s.deadSec)
        );
        flush(false);
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* ---------- start / end sessions on play, pause, chapter change ---------- */

  useEffect(() => {
    const ch = chapterRef.current;
    const open = session.current;

    // PAUSE, or CHAPTER CHANGED -> send now and close the session
    if (open && (!isPlaying || String(open.chapterId) !== String(ch?.id))) {
      log("[tracker] session END (pause / chapter change)", open.id);
      flush(true);
    }

    if (isPlaying && !session.current) {
      startSession(ch);
    }
  }, [isPlaying, currentChapter?.id]);

  /* ---------- audio <-> video switch -> new session ---------- */

  useEffect(() => {
    const open = session.current;
    if (!open) return;

    const nextType = mode === "video" ? "video" : "audio";
    if (mode !== "checking" && open.mediaType !== nextType) {
      log("[tracker] media type switched ->", nextType);
      flush(true);

      // position re-sync after the switch is NOT a user seek
      resumeUntil.current = Date.now() + RESUME_WINDOW_MS;

      if (live.current.isPlaying) startSession(chapterRef.current);
    }
  }, [mode]);

  /* ---------- BACKGROUND / app close: send right now ---------- */

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      log("[tracker] AppState ->", state);
      if (state !== "active") flush(false);
    });
    return () => {
      sub.remove();
      flush(true);
    };
  }, []);

  /* ---------- back online -> send queued sessions ---------- */

  useEffect(() => {
    if (netInfo.isConnected && netInfo.isInternetReachable !== false) {
      syncQueue();
    }
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  /* ---------- RESUME: jump to last saved position when a chapter loads ---------- */

  useEffect(() => {
    const ch = currentChapter;
    if (!ch?.id || ch?.storyId == null) return;

    let cancelled = false;

    (async () => {
      let pos = 0;
      try {
        const res = await axios.post("/", {
          method: "getListenProgress",
          story_id: Number(ch.storyId),
          chapter_id: Number(ch.id),
        });
        log("[resume] RESPONSE", res.status, JSON.stringify(res.data));
        pos = Number(res.data?.data?.last_position_sec ?? 0);
      } catch (e: any) {
        log(
          "[resume] ERROR",
          e?.response?.status,
          JSON.stringify(e?.response?.data),
          e?.message
        );
        const saved = await AsyncStorage.getItem(progressKey(ch.storyId, ch.id));
        pos = Number(saved ?? 0);
      }

      if (cancelled || !seekToTime) return;

      const { elapsed: now, duration: dur } = live.current;
      const nearEnd = dur > 0 && pos >= dur - 10;

      // only if user hasn't already moved the slider
      if (pos > 5 && now < 3 && !nearEnd) {
        log("[resume] seeking to", pos);

        // the jump that follows is NOT a user seek -> re-sync the session
        resumeUntil.current = Date.now() + RESUME_WINDOW_MS;
        if (session.current) session.current.fresh = true;

        seekToTime(pos);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id]);
}

/** Render once inside <PlayerProvider>. Draws nothing. */
export default function ListenTracker() {
  useListenTracker();
  return null;
}