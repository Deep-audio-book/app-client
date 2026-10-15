// Reads the logged-in user's id from the Redux auth slice you already have
// (redux/slices/authReducer.ts -> state.auth.user.userId).
//
// If your root reducer key for this slice is not "auth", change
// store.getState().auth below to match (e.g. store.getState().authReducer).

import { store } from "@/redux/store"; // adjust this path if your store lives elsewhere

export function getCurrentUserId(): number | null {
  const state: any = store.getState();
  return state?.auth?.user?.userId ?? null;
}
