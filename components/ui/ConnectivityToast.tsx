import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStore } from "../../utils/network";

/**
 * Small pill at the top of every screen:
 *   offline          -> "No internet connection" (stays while offline)
 *   back online      -> "Back online" for a moment, the screens reload
 * It never blocks touches.
 */
export default function ConnectivityToast() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const offline = useNetworkStore((s) => s.offline);
  const justReconnected = useNetworkStore((s) => s.justReconnected);

  const visible = offline || justReconnected;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          top: insets.top + 6,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.pill, offline ? styles.offline : styles.online]}>
        <Ionicons
          name={offline ? "cloud-offline-outline" : "checkmark-circle"}
          size={15}
          color={offline ? "#FFD28A" : "#8fd19e"}
        />
        <Text style={[styles.text, { color: offline ? "#FFE9C7" : "#D6F2DC" }]}>
          {offline
            ? t("common.noInternetShort", "No internet connection")
            : t("common.backOnline", "Back online")}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  offline: {
    backgroundColor: "rgba(40,30,10,0.94)",
    borderColor: "rgba(217,164,65,0.55)",
  },
  online: {
    backgroundColor: "rgba(14,34,22,0.94)",
    borderColor: "rgba(143,209,158,0.55)",
  },
  text: { fontSize: 12.5, fontWeight: "600" },
});
