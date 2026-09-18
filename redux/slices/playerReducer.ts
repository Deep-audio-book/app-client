import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PlayerMode = 'checking' | 'video' | 'audio';

type PlayerState = {
  chapterIndex: number;
  mode: PlayerMode;
  isPlaying: boolean;
  videoEnabled: boolean;
  isExpanded: boolean;
  isActive: boolean;
  elapsed: number;
  duration: number;
};

const initialState: PlayerState = {
  chapterIndex: 0,
  mode: 'checking',
  isPlaying: false,
  videoEnabled: false,
  isExpanded: false,
  isActive: false,
  elapsed: 0,
  duration: 0,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setChapterIndex: (state, action: PayloadAction<number>) => {
      state.chapterIndex = action.payload;
    },
    setMode: (state, action: PayloadAction<PlayerMode>) => {
      state.mode = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setVideoEnabled: (state, action: PayloadAction<boolean>) => {
      state.videoEnabled = action.payload;
    },
    setIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload;
    },
    setIsActive: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload;
    },
    setElapsed: (state, action: PayloadAction<number>) => {
      state.elapsed = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    resetPlaybackTiming: (state) => {
      state.elapsed = 0;
      state.duration = 0;
    },
  },
});

export const {
  setChapterIndex,
  setMode,
  setIsPlaying,
  setVideoEnabled,
  setIsExpanded,
  setIsActive,
  setElapsed,
  setDuration,
  resetPlaybackTiming,
} = playerSlice.actions;

export default playerSlice.reducer;