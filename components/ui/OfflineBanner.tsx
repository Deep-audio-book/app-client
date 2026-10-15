import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Drop this at the top of any screen/tab that needs the network
 * (Home, Search, Favorites, etc). Downloaded content itself never
 * needs this - it's stored on the phone and works offline.
 *
 * Usage:
 *   const netInfo = useNetInfo();
 *   const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
 *   {offline && <OfflineBanner />}
 */
export default function OfflineBanner({
  message = "You're offline. Connect to the internet to see this.",
}: {
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={15} color="#D9A441" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.35)",
    backgroundColor: "rgba(217,164,65,0.08)",
  },
  text: {
    flex: 1,
    color: "#E8DFD0",
    fontSize: 12,
    lineHeight: 16,
  },
});
