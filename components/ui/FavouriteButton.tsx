import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { FavouriteKind } from "@/api/Favourites";
import { useFavouriteToggle } from "@/hooks/useFavouriteToggle";

interface Props {
  /** "author" | "narrator" | "genre" */
  kind: Exclude<FavouriteKind, "listenLater">;
  id: number | string | undefined | null;
  /** value from the API (e.g. person.favourited) before the user taps */
  initial?: boolean;
  size?: number;
  /** true = dark circle behind the heart, false = plain icon */
  withBackground?: boolean;
  inactiveColor?: string;
}

const HeartIcon = ({
  size,
  color,
  filled,
}: {
  size: number;
  color: string;
  filled: boolean;
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : "none"}
    stroke={color}
    strokeWidth={filled ? 0 : 2}
  >
    <Path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.4 4.5 6 4.5c2 0 3.4 1 6 3.4 2.6-2.4 4-3.4 6-3.4 3.6 0 5.5 3.3 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
  </Svg>
);

/** Heart for favouriting an author, narrator or genre. */
export default function FavouriteButton({
  kind,
  id,
  initial = false,
  size = 18,
  withBackground = true,
  inactiveColor = "#fff",
}: Props) {
  const { t } = useTranslation();
  const { active, toggle } = useFavouriteToggle(kind, id, initial);

  if (id == null) return null;

  return (
    <TouchableOpacity
      style={withBackground ? styles.circle : styles.plain}
      activeOpacity={0.75}
      hitSlop={10}
      onPress={(e) => {
        e?.stopPropagation?.(); // never trigger the card underneath
        toggle();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active
          ? t("favorites.removeFromFavorites")
          : t("favorites.addToFavorites")
      }
    >
      <HeartIcon
        size={size}
        filled={active}
        color={active ? "#e85c7a" : inactiveColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  plain: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
