import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authReducer';
import playerReducer from './slices/playerReducer';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    player: playerReducer, 

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;