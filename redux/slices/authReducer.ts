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
  isLoading: true, // app open aagumbodhu restore mudiyara varaikum true
};

const STORAGE_KEY = '@audiobooks_user_data';

// App open time: async storage la user data irukka nu paathu, irundha state la set pannum
export const loadUser = createAsyncThunk<UserData | null>(
  'auth/loadUser',
  async () => {
    const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
  //  console.log('[AUTH] loadUser storage =', storedUser);

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as UserData;
    } catch {
      // Corrupt data na clear pannidu
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
);

// Login: user data async storage la save panni return pannum
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (userData: UserData) => {
      // console.log('[AUTH] user saved');

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return userData;
  }
  
);

// Logout: storage la irundhu remove pannum
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  // console.log('[AUTH] logoutUser called');

  await AsyncStorage.removeItem(STORAGE_KEY);
});

const authReducer = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // loadUser
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        loadUser.fulfilled,
        (state, action: PayloadAction<UserData | null>) => {
          state.user = action.payload;
          state.isLoading = false;
        }
      )
      .addCase(loadUser.rejected, (state) => {
        // Error vandhaalum isLoading false aaganum, illana spinner la stuck aagidum
        state.isLoading = false;
      })

      // loginUser
      .addCase(
        loginUser.fulfilled,
        (state, action: PayloadAction<UserData>) => {
          state.user = action.payload;
          state.isLoading = false;
        }
      )

      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isLoading = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Storage remove fail aanaalum user ah logout pannidu
        state.user = null;
        state.isLoading = false;
      });
  },
});

export default authReducer.reducer;