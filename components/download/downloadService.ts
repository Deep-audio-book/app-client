import axios from "@/axios.config";
// Expo SDK 54+: the classic API lives in "expo-file-system/legacy".
// On SDK 53 or older, change this import to "expo-file-system".
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import {
  DownloadRecord,
  fileKey,
  useDownloadStore,
  waitForHydration,
} from "./downloadStore";
import { getCurrentUserId } from "./currentUser";
import { getDeviceId } from "./deviceId";
import type { Chapter, MediaKind, StoryDetail } from "./types";

const ROOT = `${FileSystem.documentDirectory}downloads/`;

/** Build the absolute path at runtime from the saved file name. */
export const localUri = (fileName: string) => `${ROOT}${fileName}`;

const jobs = new Map<string, FileSystem.DownloadResumable>();
const cancelledKeys = new Set<string>();
const stoppedStories = new Set<string>();

// ---------------------------------------------------------
// URL helpers
// ---------------------------------------------------------

type UrlInfo = {
  url: string;
  ext: string;
  size_bytes?: number;
  direct?: boolean; // true = taken from chapter.audio_url / video_url
};

function extFromUrl(url: string, kind: MediaKind) {
  const last = url.split("?")[0].split("/").pop() ?? "";
  const ext = last.includes(".") ? last.split(".").pop() : undefined;
  if (ext && ext.length <= 5) return ext.toLowerCase();
  return kind === "audio" ? "mp3" : "mp4";
}

/** The URL that getStoryDetail already returned for this chapter. */
function directSource(chapter: Chapter, kind: MediaKind): UrlInfo | null {
  const url = kind === "audio" ? chapter.audio_url : chapter.video_url;
  if (!url || !url.startsWith("http")) return null;
  return { url, ext: extFromUrl(url, kind), direct: true };
}

/** Asks the Lambda (getDownloadUrl) for a brand-new pre-signed URL. */
async function fetchFreshUrl(
  storyId: string,
  chapterId: string,
  kind: MediaKind
): Promise<UrlInfo> {
  const response = await axios.post("/", {
    method: "getDownloadUrl",
    story_id: Number(storyId),
    chapter_id: chapterId,
    media_type: kind,
  });

  const body = response.data;
  if (body?.statusCode === 200 && body.data?.url) {
    return {
      url: body.data.url,
      ext: body.data.ext || extFromUrl(body.data.url, kind),
      size_bytes: body.data.size_bytes,
    };
  }
  throw new Error(body?.message || "Could not get the download link.");
}

// ---------------------------------------------------------
// Files / cover helpers
// ---------------------------------------------------------

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
  }
}

async function ensureCover(story: StoryDetail) {
  const storyId = String(story.id);
  const existing = useDownloadStore.getState().stories[storyId]?.coverFile;

  if (existing) {
    const info = await FileSystem.getInfoAsync(localUri(existing));
    if (info.exists) return;
  }
  if (!story.cover) return;

  try {
    const ext = extFromUrl(story.cover, "audio");
    const fileName = `cover_${storyId}.${ext === "mp3" ? "jpg" : ext}`;
    const res = await FileSystem.downloadAsync(story.cover, localUri(fileName));
    if (res.status === 200) {
      useDownloadStore.getState().setCoverFile(storyId, fileName);
    } else {
      await FileSystem.deleteAsync(localUri(fileName), { idempotent: true });
    }
  } catch {
    // Cover is optional - ignore failures.
  }
}

async function ensureChapterCover(chapter: Chapter, key: string) {
  if (!chapter.cover) return;

  try {
    const ext = extFromUrl(chapter.cover, "audio");
    const fileName = `chaptercover_${chapter.id}.${ext === "mp3" ? "jpg" : ext}`;
    const res = await FileSystem.downloadAsync(chapter.cover, localUri(fileName));

    if (res.status === 200) {
      useDownloadStore.getState().patchFile(key, { coverFile: fileName });
    } else {
      await FileSystem.deleteAsync(localUri(fileName), { idempotent: true });
    }
  } catch {
    // Cover is optional - ignore failures.
  }
}

async function cleanupStoryIfEmpty(storyId: string) {
  const { files, stories, removeStory } = useDownloadStore.getState();
  const stillHasFiles = Object.values(files).some((f) => f.storyId === storyId);
  if (stillHasFiles) return;

  const coverFile = stories[storyId]?.coverFile;
  if (coverFile) {
    await FileSystem.deleteAsync(localUri(coverFile), { idempotent: true });
  }
  removeStory(storyId);
}

// ---------------------------------------------------------
// Download one chapter (audio or video)
// ---------------------------------------------------------

export async function downloadChapterMedia(
  story: StoryDetail,
  chapter: Chapter,
  kind: MediaKind
) {
  await waitForHydration();

  const key = fileKey(story.id, chapter.id, kind);
  const storyId = String(story.id);
  const store = useDownloadStore.getState();

  const existing = store.files[key];
  if (existing?.status === "downloading" || existing?.status === "downloaded") {
    return;
  }

  cancelledKeys.delete(key);
  await ensureDir();

  store.saveStory(story); // offline snapshot of the story
  store.setFile({
    key,
    chapterId: String(chapter.id),
    storyId,
    kind,
    fileName: "",
    status: "downloading",
    progress: 0,
  });

  const tmpUri = `${ROOT}${chapter.id}_${kind}.part`;

  // Downloads into the .part file and reports progress
  const runJob = async (url: string) => {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });

    let lastReported = 0;
    const job = FileSystem.createDownloadResumable(
      url,
      tmpUri,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (!totalBytesExpectedToWrite) return;
        const progress = totalBytesWritten / totalBytesExpectedToWrite;
        // Update the store every 2% only (avoids re-render spam)
        if (progress - lastReported >= 0.02) {
          lastReported = progress;
          useDownloadStore.getState().patchFile(key, { progress });
        }
      }
    );
    jobs.set(key, job);
    return job.downloadAsync();
  };

  try {
    // 1. Use the URL the story API already gave us; otherwise ask the Lambda.
    let source: UrlInfo =
      directSource(chapter, kind) ??
      (await fetchFreshUrl(storyId, String(chapter.id), kind));
    if (cancelledKeys.has(key)) throw new Error("cancelled");

    // 2. Free-space check (only when the size is known)
    if (source.size_bytes) {
      const free = await FileSystem.getFreeDiskStorageAsync();
      if (free < source.size_bytes * 1.1) {
        throw new Error("Not enough storage space on your phone.");
      }
    }

    // 3. Download
    let result = await runJob(source.url);
    if (cancelledKeys.has(key)) throw new Error("cancelled");

    // Signed URL expired (screen was open for a long time) -> get a fresh one
    if (source.direct && result && (result.status === 403 || result.status === 401)) {
      source = await fetchFreshUrl(storyId, String(chapter.id), kind);
      result = await runJob(source.url);
      if (cancelledKeys.has(key)) throw new Error("cancelled");
    }

    if (!result || result.status !== 200) {
      throw new Error(`Download failed (HTTP ${result?.status ?? "?"})`);
    }

    // 4. Complete -> rename .part to the final file
    const fileName = `${chapter.id}_${kind}.${source.ext}`;
    const finalUri = localUri(fileName);

    await FileSystem.deleteAsync(finalUri, { idempotent: true });
    await FileSystem.moveAsync({ from: tmpUri, to: finalUri });

    const info = await FileSystem.getInfoAsync(finalUri);
    if (!info.exists || (info as any).size === 0) {
      throw new Error("Downloaded file is empty.");
    }

    useDownloadStore.getState().patchFile(key, {
      fileName,
      status: "downloaded",
      progress: 1,
      sizeBytes: (info as any).size,
    });

    scheduleSync(); // tell the backend (DB) about this download

    if (kind === "audio") {
      // fire and forget - covers for the offline screens
      ensureCover(story);
      ensureChapterCover(chapter, key);
    }
  } catch (error: any) {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});

    if (cancelledKeys.has(key)) {
      cancelledKeys.delete(key);
      useDownloadStore.getState().removeFile(key);
      await cleanupStoryIfEmpty(storyId);
      return;
    }

    useDownloadStore.getState().patchFile(key, {
      status: "failed",
      progress: 0,
    });
    throw new Error(
      error?.response?.data?.message || error?.message || "Download failed."
    );
  } finally {
    jobs.delete(key);
  }
}

/** Download many chapters one after another (audio by default). */
export async function downloadStoryChapters(
  story: StoryDetail,
  chapters: Chapter[],
  kind: MediaKind = "audio"
) {
  const storyId = String(story.id);
  stoppedStories.delete(storyId);

  for (const chapter of chapters) {
    if (stoppedStories.has(storyId)) break;
    await downloadChapterMedia(story, chapter, kind);
  }
}

// ---------------------------------------------------------
// Cancel / delete
// ---------------------------------------------------------

async function cancelKey(key: string) {
  const job = jobs.get(key);
  if (!job) return;
  cancelledKeys.add(key);
  try {
    await job.cancelAsync();
  } catch {
    // ignore
  }
}

export async function cancelChapterDownloads(storyId: string, chapterId: string) {
  await cancelKey(fileKey(storyId, chapterId, "audio"));
  await cancelKey(fileKey(storyId, chapterId, "video"));
}

export async function cancelStoryDownloads(storyId: string) {
  stoppedStories.add(String(storyId));
  const { files } = useDownloadStore.getState();
  for (const rec of Object.values(files)) {
    if (rec.storyId === String(storyId) && rec.status === "downloading") {
      await cancelKey(rec.key);
    }
  }
}

async function deleteRecord(rec: DownloadRecord) {
  if (rec.fileName) {
    await FileSystem.deleteAsync(localUri(rec.fileName), { idempotent: true });
  }
  if (rec.coverFile) {
    await FileSystem.deleteAsync(localUri(rec.coverFile), { idempotent: true });
  }
  useDownloadStore.getState().removeFile(rec.key);
}

export async function deleteChapterDownloads(storyId: string, chapterId: string) {
  const { files } = useDownloadStore.getState();

  for (const kind of ["audio", "video"] as const) {
    const rec = files[fileKey(storyId, chapterId, kind)];
    if (!rec) continue;
    await deleteRecord(rec);
  }
  await cleanupStoryIfEmpty(storyId);
  scheduleSync();
}

export async function deleteStoryDownloads(storyId: string) {
  const id = String(storyId);
  const { files } = useDownloadStore.getState();

  for (const rec of Object.values(files)) {
    if (rec.storyId === id) await deleteRecord(rec);
  }
  await cleanupStoryIfEmpty(id);
  scheduleSync();
}

// ---------------------------------------------------------
// Startup check + player helper
// ---------------------------------------------------------

/** Removes records whose file was deleted by the OS / user. */
export async function verifyDownloads() {
  await waitForHydration();
  const { files, removeFile } = useDownloadStore.getState();

  for (const rec of Object.values(files)) {
    if (rec.status !== "downloaded") continue;
    const info = await FileSystem.getInfoAsync(localUri(rec.fileName));
    if (!info.exists) removeFile(rec.key);
  }

  // Also retries any sync that failed earlier (e.g. phone was offline)
  scheduleSync();
}

/**
 * Replaces audio_url / video_url with the local file:// path when the
 * chapter is downloaded. The player then plays offline automatically.
 */
export function withLocalMedia(storyId: string | number, chapters: Chapter[]): Chapter[] {
  const { files } = useDownloadStore.getState();

  return chapters.map((chapter) => {
    const audio = files[fileKey(storyId, chapter.id, "audio")];
    const video = files[fileKey(storyId, chapter.id, "video")];

    return {
      ...chapter,
      audio_url:
        audio?.status === "downloaded" ? localUri(audio.fileName) : chapter.audio_url,
      video_url:
        video?.status === "downloaded" ? localUri(video.fileName) : chapter.video_url,
      cover:
        audio?.status === "downloaded" && audio.coverFile
          ? localUri(audio.coverFile)
          : chapter.cover,
    };
  });
}

// ---------------------------------------------------------
// Tell the backend which files this phone has downloaded
// ---------------------------------------------------------

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced: many quick changes = one backend call. */
export function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncDownloadsToServer().catch((e) =>
      console.log("syncDownloads failed (will retry later):", e?.message)
    );
  }, 1500);
}

/**
 * Sends the FULL list of downloaded files of this phone.
 * The backend adds new rows and removes rows that no longer exist,
 * so it is always correct - even if the phone was offline for a while.
 */
export async function syncDownloadsToServer() {
  await waitForHydration();

  const userId = getCurrentUserId();
  if (!userId) return; // not logged in - nothing to sync yet

  const items = Object.values(useDownloadStore.getState().files)
    .filter((f) => f.status === "downloaded")
    .map((f) => ({
      story_id: Number(f.storyId),
      chapter_id: f.chapterId,
      media_type: f.kind,
      size_bytes: f.sizeBytes ?? null,
    }));

  await axios.post("/", {
    method: "syncDownloads",
    user_id: userId,
    device_id: await getDeviceId(),
    platform: Platform.OS,
    items,
  });
}

// ---------------------------------------------------------
// Downloaded stories summary (for the Library "Downloaded" tab)
// ---------------------------------------------------------

export type DownloadedStorySummary = {
  storyId: string;
  title: string;
  genre: string;
  coverUri: string | null;
  episodesDownloaded: number;
  totalEpisodes: number;
  allDownloaded: boolean;
};

/** One row per story that has at least one downloaded episode. */
export function getDownloadedStorySummaries(): DownloadedStorySummary[] {
  const { files, stories } = useDownloadStore.getState();

  const downloadedCountByStory = new Map<string, number>();
  for (const rec of Object.values(files)) {
    if (rec.status !== "downloaded" || rec.kind !== "audio") continue;
    downloadedCountByStory.set(
      rec.storyId,
      (downloadedCountByStory.get(rec.storyId) ?? 0) + 1
    );
  }

  const summaries: DownloadedStorySummary[] = [];
  for (const [storyId, count] of downloadedCountByStory) {
    if (count === 0) continue;
    const story = stories[storyId];
    if (!story) continue;

    summaries.push({
      storyId,
      title: story.title,
      genre: story.genre,
      coverUri: story.coverFile ? localUri(story.coverFile) : null,
      episodesDownloaded: count,
      totalEpisodes: story.chapters?.length ?? count,
      allDownloaded: count >= (story.chapters?.length ?? count),
    });
  }

  return summaries;
}

// ---------------------------------------------------------
// Restore downloads from the backend (after reinstall / new device)
// ---------------------------------------------------------

type BackendDownloadRow = {
  story_id: string;
  title: string;
  genre: string;
  cover: string | null;
  episodes_downloaded: number;
  total_episodes: number;
  chapters: { chapter_id: string; media_type: MediaKind; size_bytes: number | null }[];
};

/**
 * Call this ONCE, right after login / when the app starts. It does NOT
 * re-download any files - it just tells the Library screen "these were
 * downloaded on some device", shown as re-downloadable placeholders
 * until the person taps download again on THIS phone.
 *
 * Safe to call repeatedly: it never overwrites a chapter that is already
 * "downloaded" on this phone (a real local file always wins).
 */
export async function restoreDownloadsFromServer() {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const response = await axios.post("/", {
      method: "getUserDownloads",
      user_id: userId,
    });

    const rows: BackendDownloadRow[] = response.data?.data ?? [];
    if (rows.length === 0) return;

    await waitForHydration();
    const store = useDownloadStore.getState();

    for (const row of rows) {
      // Keep the story snapshot so the Library card has a title/cover
      // even before any file is re-downloaded on this phone.
      if (!store.stories[row.story_id]) {
        store.saveStory({
          id: row.story_id,
          title: row.title,
          description: "",
          cover: row.cover ?? "",
          genre: row.genre,
          credits: "",
          chapters: Array.from({ length: row.total_episodes }, (_, i) => ({
            id: String(i + 1),
            number: i + 1,
            title: "",
            description: "",
            artist: "",
            duration: "",
            duration_in_seconds: 0,
            audio_url: null,
            video_url: null,
            video_status: 0,
            cover: null,
            free: true,
          })),
        } as StoryDetail);
      }

      for (const chapter of row.chapters) {
        const key = fileKey(row.story_id, chapter.chapter_id, chapter.media_type);
        const existing = store.files[key];
        if (existing?.status === "downloaded") continue; // real local file wins

        store.setFile({
          key,
          chapterId: chapter.chapter_id,
          storyId: row.story_id,
          kind: chapter.media_type,
          fileName: "", // no local file yet on this phone
          status: "failed", // shows as "tap to download" rather than a spinner
          progress: 0,
          sizeBytes: chapter.size_bytes ?? undefined,
        });
      }
    }
  } catch (error) {
    console.log("restoreDownloadsFromServer failed:", error);
    // Silent failure is fine here - it only affects the "downloaded
    // elsewhere" hint, never blocks the app.
  }
}



export async function debugDownloads() {
  const { files } = useDownloadStore.getState();

  const onDisk = await FileSystem.readDirectoryAsync(ROOT).catch(
    () => [] as string[]
  );
  // console.log("📁 Files on disk:", onDisk);

  for (const rec of Object.values(files)) {
    const info = rec.fileName
      ? await FileSystem.getInfoAsync(localUri(rec.fileName))
      : null;
    const mb = info?.exists ? ((info as any).size / 1024 / 1024).toFixed(2) : "0";
    // console.log(
    //   `⬇️ ${rec.key} | ${rec.status} | ${rec.fileName || "-"} | exists=${
    //     info?.exists ?? false
    //   } | ${mb} MB`
    // );
  }
}