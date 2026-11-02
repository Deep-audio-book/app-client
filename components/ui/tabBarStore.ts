import { create } from 'zustand';

/**
 * Height of the custom bottom tab bar (including the safe-area inset).
 * The tab bar writes it on layout; MiniPlayer lives outside the tab
 * navigator (root layout), so it reads it here to sit exactly above the bar
 * on every device instead of using a hardcoded number.
 */
type TabBarState = {
  height: number;
  setHeight: (h: number) => void;
};

export const useTabBarStore = create<TabBarState>((set, get) => ({
  height: 0,
  setHeight: (h) => {
    if (Math.abs(get().height - h) > 0.5) set({ height: h });
  },
}));
