import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";

import { toggleFavourite, type FavouriteKind } from "@/api/Favourites";
import { favouriteKey, useFavouritesStore } from "@/redux/slices/favouritesStore";

/**
 * Toggle for authors, narrators, genres and Listen Later.
 * Optimistic: the UI flips instantly and rolls back if the request fails.
 */
export function useFavouriteToggle(
  kind: FavouriteKind,
  id: number | string | undefined | null,
  initial?: boolean
) {
  const key = id == null ? "" : favouriteKey(kind, id);
  const busy = useRef(false);

  const active = useFavouritesStore((s) => (key ? s.flags[key] ?? !!initial : false));
  const setFlag = useFavouritesStore((s) => s.set);

  const toggle = useCallback(async () => {
    if (id == null || busy.current) return;
    busy.current = true;

    const next = !active;
    setFlag(kind, id, next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const serverValue = await toggleFavourite(kind, id);
      if (typeof serverValue === "boolean") setFlag(kind, id, serverValue);
    } catch {
      setFlag(kind, id, !next); // roll back
    } finally {
      busy.current = false;
    }
  }, [active, id, kind, setFlag]);

  return { active, toggle };
}
