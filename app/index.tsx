import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetInfo } from "@react-native-community/netinfo";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { theme } from "../components/ui/theme";
import { useAppSelector } from "../utils/typedReduxHooks";

/**
 * App entry point (app/index.tsx).
 * loadUser() is dispatched once in app/_layout.tsx (AppInitializer).
 * authReducer starts with isLoading = true, so we just wait here until
 * the saved login has been restored.
 *
 *   Not logged in, first launch  -> /onboarding
 *   Not logged in, seen before   -> /sign-in
 *   Logged in + online           -> /home
 *   Logged in + offline          -> /library
 */
export default function Index() {
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const netInfo = useNetInfo();

  // console.log('[INDEX] isLoading =', isLoading, 'user =', user);
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("hasSeenOnboarding")
      .then((v) => mounted && setSeenOnboarding(v === "true"))
      .catch(() => mounted && setSeenOnboarding(false));
    return () => {
      mounted = false;
    };
  }, []);

  // netInfo.isConnected is `null` while it detects the network.
  const netInfoReady = netInfo.isConnected !== null;

  if (isLoading || !netInfoReady || seenOnboarding === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={seenOnboarding ? "/sign-in" : "/onboarding"} />;
    // return <Redirect href={seenOnboarding ? "/onboarding" : "/onboarding"} />;
  }

  const offline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;

  return <Redirect href={offline ? "/library" : "/home"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});