/**
 * useResumeLastPlayed
 * -------------------
 * "Now Playing" tapped while nothing is loaded in the player:
 *   1. load the last played book,
 *   2. pick the episode the person was on,
 *   3. read where they stopped (getListenProgress),
 *   4. open the real player and continue from that second.
 *
 * Falls back to the book page when the episode cannot be played
 * (locked / no file / any error), so the tap never ends in nothing.
 */
import axios from "@/axios.config";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  localUri,
  withLocalMedia,
} from "../components/download/downloadService";
import {
  useDownloadStore,
  waitForHydration,
} from "../components/download/downloadStore";
import { usePlayer } from "../providers/PlayerProvider";
import { setIsExpanded } from "../redux/slices/playerReducer";

function isFree(chapter?: { free?: unknown } | null) {
  const v = chapter?.free;
  return v === true || v === 1 || v === "1" || v === "true";
}

const flag = (...values: unknown[]) =>
  Boolean(values.find((v) => v !== undefined && v !== null));

export function useResumeLastPlayed() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { playChapterAt, setChapters, openPlayerScreen } = usePlayer();

  const busyRef = useRef(false);
  const [resuming, setResuming] = useState(false);

  const openBookPage = (storyId: string) =>
    router.push({ pathname: "/storyEpisode", params: { storyId } } as any);

  const resume = async (
    storyId: string,
    chapterNumber?: number | null
  ): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setResuming(true);

    try {
      /* ---- 1. the book (server, or the offline copy) ---- */

      let story: any = null;
      let hasAccess = false;
      let offline = false;

      try {
        const res = await axios.post("/", {
          method: "getStoryDetail",
          story_id: Number(storyId),
        });

        if (res.data?.statusCode === 200 && res.data?.data) {
          story = res.data.data;
          const root: any = res.data;

          hasAccess =
            flag(story.is_purchased, root.is_purchased, root.purchase?.is_active) ||
            flag(root.is_rented, root.rental?.is_active, story.is_rented) ||
            flag(root.is_subscribed, root.subscription?.is_active, story.is_subscribed);
        }
      } catch {
        // no network -> offline copy below
      }

      if (!story) {
        await waitForHydration();
        story = useDownloadStore.getState().stories[String(storyId)] ?? null;
        offline = true;
        hasAccess = true; // downloaded = already unlocked
      }

      if (!story) {
        openBookPage(storyId);
        return;
      }

      /* ---- 2. episode list in the same shape the book page uses ---- */

      const savedCover = useDownloadStore.getState().stories[String(story.id)]
        ?.coverFile;
      const storyCover = savedCover ? localUri(savedCover) : story.cover;

      let list: any[] = withLocalMedia(story.id, story.chapters ?? []).map(
        (chapter: any) => ({
          ...chapter,
          cover: chapter.cover || storyCover,
          locked: !hasAccess && !isFree(chapter),
          story: story.title,
          storyId: story.id,
          storyCover,
        })
      );

      if (offline) {
        list = list.filter((c) => !!c.audio_url?.startsWith("file://"));
      }

      if (list.length === 0) {
        openBookPage(storyId);
        return;
      }

      /* ---- 3. which episode: the one the person was on ---- */

      let index = chapterNumber
        ? list.findIndex((c) => Number(c.number) === Number(chapterNumber))
        : -1;

      if (index < 0) index = 0;

      if (list[index].locked) {
        openBookPage(storyId);
        return;
      }

      /* ---- 4. where they stopped ---- */

      let startAt = 0;

      if (!offline) {
        try {
          const res = await axios.post("/", {
            method: "getListenProgress",
            story_id: Number(story.id),
            chapter_id: Number(list[index].id),
          });

          const pos = Number(res.data?.data?.last_position_sec ?? 0);
          const dur = Number(list[index].duration_in_seconds ?? 0);
          const nearEnd = dur > 0 && pos >= dur - 10;

          startAt = pos > 5 && !nearEnd ? pos : 0;
        } catch {
          // keep 0: the listen tracker also tries to resume on its own
        }
      }

      /* ---- 5. open the player and continue ---- */

      setChapters(list);
      await playChapterAt(index, { autoPlay: true, startAt });
      openPlayerScreen();
    } catch (error) {
      console.log("Resume last played failed:", error);
      openBookPage(storyId);
    } finally {
      busyRef.current = false;
      setResuming(false);
    }
  };

  return { resume, resuming };
}
