import { create } from 'zustand';

export type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  cover?: string; // remote image url (optional)
};

export type CartItem = Book & { qty: number };

type CartState = {
  items: Record<string, CartItem>;
  add: (book: Book) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

// Call useCartStore.getState().add(book) from your books / story screen
// to put a book in the cart. Profile only shows the cart.
export const useCartStore = create<CartState>((set) => ({
  items: {},
  add: (book) =>
    set((s) => {
      const existing = s.items[book.id];
      return {
        items: {
          ...s.items,
          [book.id]: existing ? { ...existing, qty: existing.qty + 1 } : { ...book, qty: 1 },
        },
      };
    }),
  inc: (id) =>
    set((s) =>
      s.items[id]
        ? { items: { ...s.items, [id]: { ...s.items[id], qty: s.items[id].qty + 1 } } }
        : s
    ),
  dec: (id) =>
    set((s) => {
      const item = s.items[id];
      if (!item) return s;
      const next = { ...s.items };
      if (item.qty <= 1) delete next[id];
      else next[id] = { ...item, qty: item.qty - 1 };
      return { items: next };
    }),
  remove: (id) =>
    set((s) => {
      const next = { ...s.items };
      delete next[id];
      return { items: next };
    }),
  clear: () => set({ items: {} }),
}));

export const selectCount = (s: CartState) =>
  Object.values(s.items).reduce((n, i) => n + i.qty, 0);
export const selectTotal = (s: CartState) =>
  Object.values(s.items).reduce((n, i) => n + i.qty * i.price, 0);