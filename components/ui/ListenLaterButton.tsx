import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity } from "react-native";

import { useFavouriteToggle } from "@/hooks/useFavouriteToggle";

interface Props {
  storyId: number | string | undefined | null;
  /** value from the story API (e.g. story.listen_later) before the user taps */
  initial?: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

/**
 * "Listen Later" for a whole audiobook. Deliberately a clock icon so it
 * is never confused with the heart (favourite) or a chapter bookmark.
 */
export default function ListenLaterButton({
  storyId,
  initial = false,
  size = 23,
  activeColor = "#F5B93C",
  inactiveColor = "#fff",
}: Props) {
  const { t } = useTranslation();
  const { active, toggle } = useFavouriteToggle("listenLater", storyId, initial);

  if (storyId == null) return null;

  return (
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.75}
      hitSlop={10}
      onPress={(e) => {
        e?.stopPropagation?.();
        toggle();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active ? t("favorites.removeListenLater") : t("favorites.addListenLater")
      }
    >
      <Ionicons
        name={active ? "time" : "time-outline"}
        size={size}
        color={active ? activeColor : inactiveColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
