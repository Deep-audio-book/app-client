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
import ConnectivityToast from '../components/ui/ConnectivityToast';
import { MiniPlayer } from '../components/ui/MiniPlayer';
import { TRANSITION } from '../components/ui/transitions';
import ListenTracker from '../hooks/useListenTracker';
import { PlayerProvider } from '../providers/PlayerProvider';
import { loadUser } from '../redux/slices/authReducer';
import { store } from '../redux/store';
import { installOfflineLogFilter, startNetworkWatcher } from '../utils/network';
import { useAppDispatch } from '../utils/typedReduxHooks';

// No internet is not a crash: log it quietly, never as a red error pop-up.
installOfflineLogFilter();

// Android la direct "sign-in" route la open aagaama, eppovum "index" la irundhu start aaganum
export const unstable_settings = {
  initialRouteName: 'index',
};

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  // App open aagumbodhu AsyncStorage la irundhu saved login ah restore pannum
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // watches the connection; screens reload themselves when it comes back
  useEffect(() => {
    startNetworkWatcher();
  }, []);

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

                {/* Subtle, consistent transitions for the whole app:
                    - normal screens slide in from the right (native feel)
                    - entry / auth screens cross-fade
                    - player sheets slide up from the bottom */}
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: TRANSITION.screen,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                  }}
                >
                  <Stack.Screen name="index" options={{ animation: 'fade' }} />
                  <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                  <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
                  <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ animation: 'fade', animationDuration: TRANSITION.tab }}
                  />
                  <Stack.Screen
                    name="playlist-info"
                    options={{
                      presentation: 'transparentModal',
                      animation: 'slide_from_bottom',
                      animationDuration: TRANSITION.screen,
                    }}
                  />
                  <Stack.Screen
                    name="player-standard"
                    options={{
                      presentation: 'transparentModal',
                      animation: 'slide_from_bottom',
                      animationDuration: TRANSITION.screen,
                    }}
                  />
                </Stack>
                <MiniPlayer />
                <ConnectivityToast />
              </PlayerProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </GestureHandlerRootView>
        </AppInitializer>
      </Provider>
    </UserProvider>
  );
}