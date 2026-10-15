import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

type UserData = {
  username: string;
  email: string;
  userId: number;
};

type AuthState = {
  user: UserData | null;
  isLoading: boolean;
};

const initialState: AuthState = {
  user: null,
  isLoading: true,
};

const STORAGE_KEY = '@audiobooks_user_data';

// App open time check if user data is present in async storage or not, if present then set the user data in state
export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
});

// when login that time store user data in async storage and return the user data
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (userData: UserData) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return userData;
  }
);

// Logout
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
});

const authReducer = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.fulfilled, (state, action: PayloadAction<UserData | null>) => {
        state.user = action.payload;
        state.isLoading = false;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<UserData>) => {
        state.user = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authReducer.reducer;