import { useEffect } from "react";
import { useState } from "react";

import { Story } from "@/type/story";
import axios from "../axios.config";
import { useFocusRefetch } from "./useFocusRefetch"; //  path if useStoryData isn't in the same folder as useFocusRefetch

interface UseStoryDataParams {
  api_method?: string;
  key_type?: string;
  view_type?: string;
  title?: string;
  extraParams?: Record<string, string | undefined>;
}

export function useStoryData({
  api_method,
  key_type,
  view_type,
  title,
  extraParams = {},
}: UseStoryDataParams) {
  const [chips, setChips] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState<string>("All");
  const [stories, setStories] = useState<Story[]>([]);
  const [heading, setHeading] = useState<string>(title ?? "");
  const [subheading, setSubheading] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  /* =====================================================
     extraParams object change aagum bodhu refetch
     re-run aaganum-na, primitive key ah stringify pannunga
  ===================================================== */

  const extraParamsKey = JSON.stringify(extraParams);

  // `loading` is handled by the hook — no manual useState for it.
  const {
    loading,
    refetch: getData,
  } = useFocusRefetch(async () => {
    if (!api_method || !key_type) {
      setError("Invalid story parameters.");
      setChips([]);
      setStories([]);
      setActiveChip("All");
      setSubheading("");
      return;
    }

    try {
      setError(null);
      setChips([]);
      setStories([]);
      setActiveChip("All");
      setSubheading("");

      // undefined values ah clean pannitu spread pannunga
      const cleanExtra = Object.fromEntries(
        Object.entries(extraParams).filter(([, v]) => v !== undefined)
      );

      const response = await axios.post("/", {
        method: api_method,
        key_type,
        view_type,
        ...cleanExtra, // genre_id, author_id, narrator_id — edhu vandhalum automatic ah pogum
      });

      // console.log("reponse form hook:", response);

      if (response.data?.statusCode !== 200) {
        throw new Error("Invalid API response");
      }

      const payload = response.data?.data;
      if (!payload) throw new Error("Invalid API response");

      const backendChips: string[] = payload.header?.chips ?? [];
      const uniqueChips = [
        ...new Set(
          backendChips.filter(
            (chip) => typeof chip === "string" && chip.trim().length > 0
          )
        ),
      ];

      setChips(uniqueChips);
      setStories(payload.stories ?? []);
      setHeading(payload.heading ?? title ?? "");
      setSubheading(payload.subheading ?? "");

      const hasAll = uniqueChips.some((c) => c.toLowerCase() === "all");
      if (hasAll) setActiveChip("All");
      else if (uniqueChips.length > 0) setActiveChip(uniqueChips[0]);
      else setActiveChip("All");
    } catch (err) {
      console.error("Story data API error:", err);
      setError("Couldn't load stories.");
    }
  });

  // Refetch whenever the identifying params change (e.g. a different
  // genre_id/author_id was passed in), same as the old useEffect deps.
  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api_method, key_type, view_type, extraParamsKey]);

  return {
    chips,
    activeChip,
    setActiveChip,
    stories,
    heading,
    subheading,
    loading,
    error,
  };
}