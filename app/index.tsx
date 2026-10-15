import { Redirect } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { loadUser } from "../redux/slices/authReducer";
import { useAppDispatch, useAppSelector } from "../utils/typedReduxHooks";

/**
 * App entry point (app/index.tsx).
 *
 * Your existing file just did `return <Redirect href="/sign-in" />` -
 * unconditionally, every single launch. That's the whole bug: it never
 * checked whether someone was already logged in before sending them to
 * the sign-in screen.
 *
 * Runs once, every time the app launches:
 *   1. Restores the saved login from AsyncStorage (authReducer.loadUser -
 *      this already exists, it just wasn't being called on launch).
 *   2. Not logged in            -> /sign-in
 *   3. Logged in + online       -> /home
 *   4. Logged in + offline      -> /library  (downloaded content works
 *      with no internet; Home needs the network to load its sections)
 */
export default function Index() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const netInfo = useNetInfo();

  // loadUser() reads AsyncStorage once on mount. We track that
  // separately from redux's isLoading so we don't redirect before it
  // has actually run.
  const [restoreChecked, setRestoreChecked] = useState(false);

  useEffect(() => {
    dispatch(loadUser()).finally(() => setRestoreChecked(true));
  }, [dispatch]);

  // netInfo.isConnected starts as `null` for a moment while it detects
  // the network - wait for a real answer so we don't flash the wrong
  // screen (e.g. briefly sending an online user to /library).
  const netInfoReady = netInfo.isConnected !== null;

  if (!restoreChecked || isLoading || !netInfoReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#D9A441" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
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
    backgroundColor: "#000",
  },
});
