import { useEffect, useState } from "react";

import { Story } from "@/type/story";
import axios from "../axios.config";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /* =====================================================
     extraParams object change aagum bodhu useEffect
     re-run aaganum-na, primitive key ah stringify pannunga
  ===================================================== */

  const extraParamsKey = JSON.stringify(extraParams);

  useEffect(() => {
    let isMounted = true;

    const getData = async () => {
      try {
        setLoading(true);
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
          ...cleanExtra, //  genre_id, author_id, narrator_id — edhu vandhalum automatic ah pogum
        });

        // console.log("reponse form hook:",response);

        if (!isMounted) return;

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
        if (isMounted) setError("Couldn't load stories.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (api_method && key_type) {
      getData();
    } else {
      setLoading(false);
      setError("Invalid story parameters.");
    }

    return () => {
      isMounted = false;
    };
  }, [api_method, key_type, extraParamsKey]);

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