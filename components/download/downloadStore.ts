import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MediaKind, StoryDetail } from "./types";

export type DownloadStatus = "downloading" | "downloaded" | "failed";

export type DownloadRecord = {
  key: string; // `${chapterId}:${kind}`
  chapterId: string;
  storyId: string;
  kind: MediaKind;
  // IMPORTANT: only the file NAME is stored, never the absolute path.
  // iOS changes the app folder path after app updates.
  fileName: string;
  status: DownloadStatus;
  progress: number; // 0..1
  sizeBytes?: number;
  coverFile?: string; // local copy of the chapter cover (for the offline player)
};

// Story snapshot saved locally so the screen can open with no internet.
export type OfflineStory = StoryDetail & { coverFile?: string | null };

export const fileKey = (
  storyId: string | number,
  chapterId: string | number,
  kind: MediaKind
) => `${storyId}:${chapterId}:${kind}`;

type State = {
  files: Record<string, DownloadRecord>;
  stories: Record<string, OfflineStory>;

  setFile: (record: DownloadRecord) => void;
  patchFile: (key: string, patch: Partial<DownloadRecord>) => void;
  removeFile: (key: string) => void;

  saveStory: (story: StoryDetail) => void;
  setCoverFile: (storyId: string, fileName: string | null) => void;
  removeStory: (storyId: string) => void;

  resetStuckDownloads: () => void;
};

export const useDownloadStore = create<State>()(
  persist(
    (set) => ({
      files: {},
      stories: {},

      setFile: (record) =>
        set((s) => ({ files: { ...s.files, [record.key]: record } })),

      patchFile: (key, patch) =>
        set((s) => {
          const existing = s.files[key];
          if (!existing) return s;
          return { files: { ...s.files, [key]: { ...existing, ...patch } } };
        }),

      removeFile: (key) =>
        set((s) => {
          const { [key]: _removed, ...rest } = s.files;
          return { files: rest };
        }),

      saveStory: (story) =>
        set((s) => {
          const id = String(story.id);
          return {
            stories: {
              ...s.stories,
              [id]: {
                ...story,
                // Signed URLs expire, so never keep them in the snapshot.
                chapters: (story.chapters ?? []).map((c) => ({
                  ...c,
                  audio_url: null,
                  video_url: null,
                })),
                coverFile: s.stories[id]?.coverFile ?? null,
              },
            },
          };
        }),

      setCoverFile: (storyId, fileName) =>
        set((s) => {
          const existing = s.stories[storyId];
          if (!existing) return s;
          return {
            stories: {
              ...s.stories,
              [storyId]: { ...existing, coverFile: fileName },
            },
          };
        }),

      removeStory: (storyId) =>
        set((s) => {
          const { [storyId]: _removed, ...rest } = s.stories;
          return { stories: rest };
        }),

      // App was killed mid-download -> mark as failed so the UI isn't stuck.
      resetStuckDownloads: () =>
        set((s) => {
          const files: Record<string, DownloadRecord> = {};
          for (const [key, rec] of Object.entries(s.files)) {
            files[key] =
              rec.status === "downloading"
                ? { ...rec, status: "failed", progress: 0 }
                : rec;
          }
          return { files };
        }),
    }),
    {
      name: "offline-downloads-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ files: s.files, stories: s.stories }),
      onRehydrateStorage: () => (state) => {
        state?.resetStuckDownloads();
      },
    }
  )
);

export async function waitForHydration() {
  if (useDownloadStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = useDownloadStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
