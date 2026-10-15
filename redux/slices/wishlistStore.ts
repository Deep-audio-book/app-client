import { create } from "zustand";

// API story la "wishlisted" (toggleWishlist) dhaan source. Illana "like" ku fallback.
export const storyWishlisted = (s: any): boolean => !!(s?.wishlisted ?? s?.like);

type WishlistState = {
  // storyId -> liked (true/false)
  liked: Record<string, boolean>;

  // API la irundhu varra initial value ah store la seed panna
  seed: (storyId: number | string, value: boolean) => void;
  seedMany: (items: { id: number | string; wishlisted?: boolean; like?: boolean }[]) => void;
  set: (storyId: number | string, value: boolean) => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  liked: {},

  // Already store la value irundha overwrite panna maatom
  // (user just like panna, stale API data override aaga koodadhu)
  seed: (id, value) => {
    const key = String(id);
    if (get().liked[key] === undefined) {
      set((s) => ({ liked: { ...s.liked, [key]: value } }));
    }
  },

  seedMany: (items) => {
    const current = get().liked;
    const next = { ...current };
    let changed = false;
    for (const it of items) {
      if (!it || it.id == null) continue;
      const key = String(it.id);
      if (next[key] === undefined) {
        next[key] = storyWishlisted(it);
        changed = true;
      }
    }
    if (changed) set({ liked: next });
  },

  set: (id, value) =>
    set((s) => ({ liked: { ...s.liked, [String(id)]: value } })),
}));