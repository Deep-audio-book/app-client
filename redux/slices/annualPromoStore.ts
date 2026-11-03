import { create } from "zustand";

/**
 * "Upgrade to Annual" prompt. The player only RAISES a request when a chapter
 * finishes; the AnnualPlanPromo component decides when it is safe to show
 * (never while audio is playing).
 */
type PromoState = {
  pending: boolean;
  shownThisSession: boolean;
  request: () => void;
  markShown: () => void;
};

export const useAnnualPromoStore = create<PromoState>((set, get) => ({
  pending: false,
  shownThisSession: false,
  request: () => {
    if (!get().shownThisSession) set({ pending: true });
  },
  markShown: () => set({ pending: false, shownThisSession: true }),
}));
