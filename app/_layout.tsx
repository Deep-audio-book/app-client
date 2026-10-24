import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Provider } from 'react-redux';

import initI18n from '@/constants/locales';
import { UserProvider } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MiniPlayer } from '../components/ui/MiniPlayer';
import ListenTracker from '../hooks/useListenTracker';
import { PlayerProvider } from '../providers/PlayerProvider';
import { loadUser } from '../redux/slices/authReducer';
import { store } from '../redux/store';
import { useAppDispatch } from '../utils/typedReduxHooks';


function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // i18next must finish initialising before ANY screen calls
  // useTranslation(), otherwise t() returns the raw key strings
  // ("common.appLanguage" instead of "App language").
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((err) => {
        console.error('i18n init failed:', err);
        // Render anyway so the app doesn't hang on a blank screen.
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0814',
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <UserProvider>
      <Provider store={store}>
        <AppInitializer>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <PlayerProvider>
                {/* Tracks listening (sessions, heartbeat, resume). Draws nothing.
                    Must stay INSIDE PlayerProvider + redux Provider. */}
                <ListenTracker />

                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="sign-in" />
                  <Stack.Screen
                    name="playlist-info"
                    options={{
                      presentation: 'transparentModal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="player-standard"
                    options={{
                      presentation: 'transparentModal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="profile"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                </Stack>
                <MiniPlayer />
              </PlayerProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </GestureHandlerRootView>
        </AppInitializer>
      </Provider>
    </UserProvider>
  );
}