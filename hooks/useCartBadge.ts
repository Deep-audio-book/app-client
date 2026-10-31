import { create } from "zustand";

import { addToCart as addToCartApi, fetchCart } from "../api/Cart";

/**
 * Shared cart state for the cart-count badge and every "+" (add to cart)
 * button. It is the single source of truth, so the Home screen, the book
 * page and the Cart screen all show the same count and the same
 * "already in cart" check mark.
 *
 * Usage:
 *   const count  = useCartBadge((s) => s.count);
 *   const inCart = useCartBadge((s) => !!s.ids[String(storyId)]);
 *   const ok     = await useCartBadge.getState().add(storyId);
 */
type CartLike = { bookId: string };
type StoryLike = { id: number | string; in_cart?: boolean };

type CartBadgeState = {
  /** book ids currently in the cart */
  ids: Record<string, true>;
  count: number;
  /** Re-read the cart from the server (silent - never throws). */
  refresh: () => Promise<void>;
  /** Called by useCart after it loads / changes the cart. */
  setFromItems: (items: CartLike[]) => void;
  /** Home API sends `in_cart` per story - remember it. */
  seedFromStories: (stories: StoryLike[]) => void;
  /** Optimistic add. Resolves true when the book is in the cart afterwards. */
  add: (bookId: string | number) => Promise<boolean>;
  reset: () => void;
};

export const useCartBadge = create<CartBadgeState>((set, get) => ({
  ids: {},
  count: 0,

  setFromItems: (items) => {
    const ids: Record<string, true> = {};
    items.forEach((i) => {
      ids[String(i.bookId)] = true;
    });
    set({ ids, count: items.length });
  },

  seedFromStories: (stories) => {
    const flagged = stories.filter((s) => s?.in_cart);
    if (!flagged.length) return;
    set((s) => {
      const ids = { ...s.ids };
      flagged.forEach((st) => {
        ids[String(st.id)] = true;
      });
      return { ids };
    });
  },

  refresh: async () => {
    try {
      get().setFromItems(await fetchCart());
    } catch {
      // badge is optional - keep the last known value
    }
  },

  add: async (bookId) => {
    const id = String(bookId);
    if (get().ids[id]) return true;

    // optimistic: check mark + count update immediately
    set((s) => ({ ids: { ...s.ids, [id]: true }, count: s.count + 1 }));

    try {
      await addToCartApi(bookId);
      get().refresh(); // sync the real count in the background
      return true;
    } catch {
      // The backend answers with an error when the book is already in the
      // cart, so reconcile with the server before rolling anything back.
      try {
        get().setFromItems(await fetchCart());
        if (get().ids[id]) return true;
      } catch {
        /* fall through to rollback */
      }
      set((s) => {
        const { [id]: _removed, ...rest } = s.ids;
        return { ids: rest, count: Math.max(0, s.count - 1) };
      });
      return false;
    }
  },

  reset: () => set({ ids: {}, count: 0 }),
}));