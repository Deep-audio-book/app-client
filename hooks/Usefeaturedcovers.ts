import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useEffect, useState } from "react";

import { FeaturedResponse, fetchFeatured } from "../api/books";

const CACHE_KEY = "featuredCovers:v1";

/**
 * 1. Shows the covers saved from the last launch instantly (works offline).
 * 2. Fetches fresh ones, saves them, and pre-downloads the images.
 * On any failure the screen just keeps its placeholder tiles.
 */
export function useFeaturedCovers() {
  const [data, setData] = useState<FeaturedResponse | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && alive) setData(JSON.parse(cached));
      } catch {}

      try {
        const fresh = await fetchFeatured();
        if (!alive || !fresh.items?.length) return;
        setData(fresh);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
        Image.prefetch(fresh.items.map((i) => i.coverUrl)).catch(() => {});
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  return data;
}