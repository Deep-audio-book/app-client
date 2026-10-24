/**
 * useListenTracker  (+ <ListenTracker /> wrapper component)
 *
 * Does 3 things, all from the redux player state (same source the player
 * screen already uses), so it works from ANY screen:
 *
 *  1. LISTEN SESSION   -> one row in `listen_sessions` per continuous play run
 *  2. HEARTBEAT        -> every 20s while playing + on pause / background /
 *                         chapter change (saves "last pause position")
 *  3. RESUME           -> when a chapter loads, jump to last saved position
 *
 * BACKEND CONTRACT (same `axios.post("/", { method, ... })` style as the app)
 * -----------------------------------------------------------------------
 * method: "saveListen"
 *   body: client_session_id, story_id, chapter_id, media_type,
 *         start_position_sec, end_position_sec, position_sec,
 *         seconds_listened (CUMULATIVE for this session, not a delta),
 *         duration_sec, completed (bool), platform, started_at, ended_at|null
 *   server: UPSERT listen_sessions by (user_id, client_session_id)
 *           + UPSERT user_chapter_progress by (user_id, story_id, chapter_id)
 *           + decide access_type SERVER SIDE (purchased -> free -> subscription)
 *   Because seconds_listened is cumulative and the row is upserted,
 *   retries / offline sync are safe (no double counting).
 *
 * method: "getListenProgress"   body: story_id, chapter_id
 *   returns data: { last_position_sec }   (0 if completed or no row)
 *
 * SQL change needed on listen_sessions:
 *   ALTER TABLE listen_sessions
 *     ADD COLUMN client_session_id VARCHAR(40) NOT NULL,
 *     ADD UNIQUE KEY uq_client_session (user_id, client_session_id);
 *
 * MOUNT ONCE inside <PlayerProvider> (e.g. app/_layout.tsx):
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

const HEARTBEAT_MS = 20_000;
const QUEUE_KEY = "listen_queue_v1";
const COMPLETE_AT = 0.95;

type Session = {
  id: string;
  storyId: number;
  chapterId: number;
  mediaType: "audio" | "video";
  startedAt: Date;
  startPos: number;
  seconds: number; // content seconds actually listened (cumulative)
  lastPos: number; // player position at last tick
  lastWall: number; // Date.now() at last tick
  lastSent: number; // Date.now() at last heartbeat
  fresh: boolean; // first tick after start only syncs the position
};

type Payload = Record<string, any>;

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const progressKey = (storyId: number | string, chapterId: number | string) =>
  `listen_pos:${storyId}:${chapterId}`;

/* ------------------------------------------------------------------ */
/* Offline queue: keep only the LATEST payload per session id          */
/* ------------------------------------------------------------------ */

async function readQueue(): Promise<Record<string, Payload>> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function enqueue(payload: Payload) {
  const q = await readQueue();
  q[payload.client_session_id] = payload;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)).catch(() => {});
}

async function syncQueue() {
  const q = await readQueue();
  const ids = Object.keys(q);
  if (!ids.length) return;

  for (const id of ids) {
    try {
      await axios.post("/", { method: "saveListen", ...q[id] });
      delete q[id];
    } catch (e: any) {
      if (!e?.response) break; // still offline, try later
      delete q[id]; // server rejected it (4xx) -> don't retry forever
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)).catch(() => {});
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
  const live = useRef({ elapsed: 0, duration: 0, isPlaying: false, mode: "audio" as string });
  live.current = { elapsed, duration, isPlaying, mode };

  const chapterRef = useRef<any>(currentChapter);
  chapterRef.current = currentChapter;

  const session = useRef<Session | null>(null);

  /* ---------- build + send ---------- */

  const flush = async (ended: boolean) => {
    const s = session.current;
    if (!s) return;

    const dur = live.current.duration || 0;
    const pos = Math.floor(s.lastPos);

    const payload: Payload = {
      client_session_id: s.id,
      story_id: s.storyId,
      chapter_id: s.chapterId,
      media_type: s.mediaType,
      start_position_sec: s.startPos,
      end_position_sec: pos,
      position_sec: pos,
      seconds_listened: Math.floor(s.seconds),
      duration_sec: dur ? Math.floor(dur) : null,
      completed: dur > 0 && s.lastPos / dur >= COMPLETE_AT,
      platform: Platform.OS,
      started_at: s.startedAt.toISOString(),
      ended_at: ended ? new Date().toISOString() : null,
    };

    s.lastSent = Date.now();
    if (ended) session.current = null; // close synchronously

    // local copy -> resume works even fully offline
    AsyncStorage.setItem(
      progressKey(s.storyId, s.chapterId),
      String(payload.completed ? 0 : pos)
    ).catch(() => {});

    try {
      await axios.post("/", { method: "saveListen", ...payload });
    } catch (e: any) {
      if (!e?.response) await enqueue(payload); // network problem -> sync later
    }
  };

  const startSession = (ch: any) => {
    const now = Date.now();
    session.current = {
      id: makeId(),
      storyId: Number(ch.storyId),
      chapterId: Number(ch.id),
      mediaType: live.current.mode === "video" ? "video" : "audio",
      startedAt: new Date(),
      startPos: Math.floor(live.current.elapsed),
      seconds: 0,
      lastPos: live.current.elapsed,
      lastWall: now,
      lastSent: now,
      fresh: true,
    };
  };

  /* ---------- 1s tick: count REAL listening, ignore seeks/skips ---------- */

  useEffect(() => {
    const id = setInterval(() => {
      const s = session.current;
      if (!s) return;

      const now = Date.now();
      const { elapsed: pos, isPlaying: playing } = live.current;

      if (s.fresh) {
        // elapsed can still hold the previous chapter's value for a moment
        s.startPos = Math.floor(pos);
        s.lastPos = pos;
        s.lastWall = now;
        s.fresh = false;
        return;
      }

      const wallSec = (now - s.lastWall) / 1000;
      const moved = pos - s.lastPos;

      // Natural playback moves at most ~2x real time. A seek / skip (+15, +30,
      // drag on the bar) jumps far more than that, so it is NOT counted.
      if (playing && moved > 0 && moved <= wallSec * 2.1 + 1) {
        s.seconds += moved;
      }

      s.lastPos = pos;
      s.lastWall = now;

      if (playing && now - s.lastSent >= HEARTBEAT_MS) {
        flush(false);
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* ---------- start / end sessions on play, pause, chapter change ---------- */

  useEffect(() => {
    const ch = chapterRef.current;
    const open = session.current;

    // paused, or the chapter changed -> close the running session
    if (open && (!isPlaying || String(open.chapterId) !== String(ch?.id))) {
      flush(true);
    }

    if (isPlaying && ch?.id != null && ch?.storyId != null && !session.current) {
      startSession(ch);
    }
  }, [isPlaying, currentChapter?.id]);

  /* ---------- background / app close: save right now ---------- */

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
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
        pos = Number(res.data?.data?.last_position_sec ?? 0);
      } catch {
        const saved = await AsyncStorage.getItem(progressKey(ch.storyId, ch.id));
        pos = Number(saved ?? 0);
      }

      if (cancelled || !seekToTime) return;

      const { elapsed: now, duration: dur } = live.current;
      const nearEnd = dur > 0 && pos >= dur - 10;

      // only if user hasn't already moved the slider
      if (pos > 5 && now < 3 && !nearEnd) seekToTime(pos);
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