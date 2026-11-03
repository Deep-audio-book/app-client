import { create } from "zustand";

import type { FavouriteKind } from "@/api/Favourites";

/**
 * One shared "is it saved?" flag per item, so a heart tapped on a list
 * card, a detail page or the Favourites screen is always in sync.
 * (Stories keep using wishlistStore.ts - this store covers authors,
 * narrators, genres and Listen Later.)
 */
const keyOf = (kind: FavouriteKind, id: number | string) => `${kind}:${id}`;

type FavouritesState = {
  flags: Record<string, boolean>;
  /** Sets a value only when nothing is stored yet (never overrides a fresh tap). */
  seed: (kind: FavouriteKind, id: number | string, value: boolean) => void;
  /** Forces a value (user tap / server answer). */
  set: (kind: FavouriteKind, id: number | string, value: boolean) => void;
  /** Forces many ids to the same value, e.g. the whole Listen Later list. */
  setMany: (kind: FavouriteKind, ids: (number | string)[], value: boolean) => void;
};

export const useFavouritesStore = create<FavouritesState>((set, get) => ({
  flags: {},

  seed: (kind, id, value) => {
    const key = keyOf(kind, id);
    if (get().flags[key] === undefined) {
      set((s) => ({ flags: { ...s.flags, [key]: value } }));
    }
  },

  set: (kind, id, value) =>
    set((s) => ({ flags: { ...s.flags, [keyOf(kind, id)]: value } })),

  setMany: (kind, ids, value) =>
    set((s) => {
      const next = { ...s.flags };
      for (const id of ids) next[keyOf(kind, id)] = value;
      return { flags: next };
    }),
}));

export const favouriteKey = keyOf;
