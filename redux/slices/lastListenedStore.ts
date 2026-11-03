import { create } from "zustand";

/**
 * Where the person last listened, per book, in THIS session.
 *
 * The server only knows the chapter after a listen was saved, and Home /
 * Library data is loaded earlier, so it can show an older chapter. The player
 * writes here every time an episode starts or pauses, and Home / Library read
 * it first: the highlighted chapter and the "Resume" position are always the
 * ones the person really stopped at.
 */
export type LastListened = {
  chapterNumber: number;
  chapterId: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
};

type State = {
  entries: Record<string, LastListened>;
  record: (storyId: string | number, entry: Omit<LastListened, "updatedAt">) => void;
  reset: () => void;
};

export const useLastListenedStore = create<State>((set) => ({
  entries: {},

  record: (storyId, entry) =>
    set((s) => ({
      entries: {
        ...s.entries,
        [String(storyId)]: { ...entry, updatedAt: Date.now() },
      },
    })),

  reset: () => set({ entries: {} }),
}));
