import axios from "@/axios.config";

/**
 * Chapter-level bookmarks (separate from Listen Later, which is per book).
 *
 * Backend methods (same single POST "/" gateway as everything else;
 * user_id + language_code are added by the axios interceptor):
 *
 *   toggleBookmark        { story_id, chapter_id, position_seconds? }
 *                          -> { statusCode: 200, data: { bookmarked: boolean, bookmark_id } }
 *   getBookmarkedChapters { key_type: "bookmark" }
 *                          -> { statusCode: 200, data: { heading, bookmarks: Bookmark[] } }
 *   getChapterBookmarkState { story_id }   (optional - used to pre-fill the icon)
 *                          -> { statusCode: 200, data: { chapter_ids: number[] } }
 */

export type Bookmark = {
  bookmark_id: number;
  story_id: number;
  story_title: string;
  story_cover: string | null;
  chapter_id: number;
  chapter_number: number;
  chapter_title: string;
  chapter_duration: string;
  position_seconds: number; // 0 = whole chapter
  created_at: string; // ISO date
  locked: boolean;
};

export async function toggleBookmark(
  storyId: number | string,
  chapterId: number | string,
  positionSeconds?: number
): Promise<boolean | undefined> {
  const { data } = await axios.post("/", {
    method: "toggleBookmark",
    story_id: Number(storyId),
    chapter_id: Number(chapterId),
    ...(positionSeconds != null ? { position_seconds: Math.floor(positionSeconds) } : {}),
  });

  if (data?.statusCode != null && data.statusCode !== 200) {
    throw new Error(data.msg || "toggleBookmark failed");
  }
  const payload = data?.data ?? data;
  return typeof payload?.bookmarked === "boolean" ? payload.bookmarked : undefined;
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  const { data } = await axios.post("/", {
    method: "getBookmarkedChapters",
    key_type: "bookmark",
  });
  if (data?.statusCode !== 200) throw new Error(data?.msg || "Couldn't load bookmarks");
  return data?.data?.bookmarks ?? [];
}

export async function fetchBookmarkedChapterIds(storyId: number | string): Promise<number[]> {
  const { data } = await axios.post("/", {
    method: "getChapterBookmarkState",
    story_id: Number(storyId),
  });
  if (data?.statusCode !== 200) return [];
  return (data?.data?.chapter_ids ?? []).map(Number);
}
