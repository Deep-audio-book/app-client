import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";

import { fetchBookmarkedChapterIds, toggleBookmark } from "@/api/Bookmarks";

/** chapterId -> bookmarked? One flag per chapter so every screen stays in sync. */
type State = {
  flags: Record<string, boolean>;
  set: (chapterId: string | number, v: boolean) => void;
  setMany: (ids: (string | number)[], v: boolean) => void;
};
export const useBookmarkStore = create<State>((set) => ({
  flags: {},
  set: (id, v) => set((s) => ({ flags: { ...s.flags, [String(id)]: v } })),
  setMany: (ids, v) =>
    set((s) => {
      const next = { ...s.flags };
      ids.forEach((id) => (next[String(id)] = v));
      return { flags: next };
    }),
}));

/**
 * Bookmark toggle for the chapter that is playing.
 * Optimistic, rolls back on failure. Loads the book's bookmarked chapter ids once.
 */
export function useBookmark(
  storyId: string | number | null | undefined,
  chapterId: string | number | null | undefined,
  getPosition?: () => number
) {
  const busy = useRef(false);
  const key = chapterId == null ? "" : String(chapterId);
  const active = useBookmarkStore((s) => (key ? !!s.flags[key] : false));
  const setFlag = useBookmarkStore((s) => s.set);

  // pre-fill the icon for this book (only once per story)
  useEffect(() => {
    if (storyId == null) return;
    let cancelled = false;
    fetchBookmarkedChapterIds(storyId)
      .then((ids) => !cancelled && useBookmarkStore.getState().setMany(ids, true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const toggle = useCallback(async () => {
    if (storyId == null || chapterId == null || busy.current) return;
    busy.current = true;
    const next = !active;
    setFlag(chapterId, next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const server = await toggleBookmark(storyId, chapterId, getPosition?.());
      if (typeof server === "boolean") setFlag(chapterId, server);
    } catch {
      setFlag(chapterId, !next);
    } finally {
      busy.current = false;
    }
  }, [active, chapterId, getPosition, setFlag, storyId]);

  return { active, toggle };
}
