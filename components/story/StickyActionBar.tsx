import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "./episodeStyle";

/**
 * Main action bar that stays at the bottom of the book page (About AND
 * Chapters tab), so the person never has to scroll to find it.
 *
 *   play      -> owner / renter / Premium:   [ Play ]
 *   rent      -> not unlocked, can rent:     [ Rent Now ₹9 ] [ Add to Cart ]
 *   subscribe -> nothing to rent or buy:     [ Get Premium ]
 */
export type StickyActionBarProps = {
  mode: "play" | "rent" | "subscribe";

  /** distance from the bottom (lifts the bar above the mini player) */
  bottomOffset?: number;
  horizontalPadding: number;
  onHeight?: (height: number) => void;

  // play
  playing?: boolean;
  onPlay?: () => void;

  // rent
  rentPriceLabel?: string;
  rentBusy?: boolean;
  onRent?: () => void;

  // cart (shown next to Rent Now; becomes the main button if there is no rent)
  showCart?: boolean;
  cartState?: "idle" | "loading" | "added";
  cartPriceLabel?: string;
  onAddToCart?: () => void;
  onGoToCart?: () => void;

  // subscribe
  onSubscribe?: () => void;
};

export default function StickyActionBar(props: StickyActionBarProps) {
  const { t } = useTranslation();
  const {
    mode,
    bottomOffset = 0,
    horizontalPadding,
    onHeight,
    playing,
    onPlay,
    rentPriceLabel,
    rentBusy,
    onRent,
    showCart,
    cartState = "idle",
    cartPriceLabel,
    onAddToCart,
    onGoToCart,
    onSubscribe,
  } = props;

  const handleLayout = (e: LayoutChangeEvent) =>
    onHeight?.(e.nativeEvent.layout.height);

  const cartDone = cartState === "added";
  const cartBusy = cartState === "loading";

  const cartButton = (primary: boolean) => (
    <Pressable
      onPress={cartDone ? onGoToCart : onAddToCart}
      disabled={cartBusy}
      style={({ pressed }) => [
        primary ? s.primary : s.secondary,
        { flex: 1 },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("album.cart.add")}
    >
      {cartBusy ? (
        <ActivityIndicator
          size="small"
          color={primary ? COLORS.bgDeep : COLORS.gold}
        />
      ) : (
        <>
          <Ionicons
            name={cartDone ? "checkmark-circle" : "cart-outline"}
            size={18}
            color={primary ? COLORS.bgDeep : COLORS.gold}
          />
          <Text style={primary ? s.primaryText : s.secondaryText} numberOfLines={1}>
            {cartDone
              ? t("album.sticky.goToCart")
              : `${t("album.cart.add")}${cartPriceLabel ? ` · ${cartPriceLabel}` : ""}`}
          </Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      onLayout={handleLayout}
      style={[s.wrap, { bottom: bottomOffset }]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(7,6,10,0)", "rgba(7,6,10,0.92)", "#07060A"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.row, { paddingHorizontal: horizontalPadding }]}>
        {mode === "play" && (
          <Pressable
            onPress={onPlay}
            style={({ pressed }) => [s.primary, { flex: 1 }, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t("album.playStory")}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={18}
              color={COLORS.bgDeep}
            />
            <Text style={s.primaryText}>
              {playing ? t("album.pause", "Pause") : t("album.play")}
            </Text>
          </Pressable>
        )}

        {mode === "rent" && (
          <>
            {!!onRent && (
              <Pressable
                onPress={onRent}
                disabled={rentBusy}
                style={({ pressed }) => [
                  s.primary,
                  { flex: 1.25 },
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("album.sticky.rentNow")}
              >
                {rentBusy ? (
                  <ActivityIndicator size="small" color={COLORS.bgDeep} />
                ) : (
                  <>
                    <Ionicons name="time-outline" size={18} color={COLORS.bgDeep} />
                    <Text style={s.primaryText} numberOfLines={1}>
                      {t("album.sticky.rentNow")}
                      {rentPriceLabel ? ` · ${rentPriceLabel}` : ""}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {showCart && cartButton(!onRent)}
          </>
        )}

        {mode === "subscribe" && (
          <Pressable
            onPress={onSubscribe}
            style={({ pressed }) => [s.primary, { flex: 1 }, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t("album.sticky.getPremium")}
          >
            <Ionicons name="diamond-outline" size={18} color={COLORS.bgDeep} />
            <Text style={s.primaryText}>{t("album.sticky.getPremium")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingTop: 26,
    paddingBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  primary: {
    minHeight: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gold,
  },
  primaryText: { color: COLORS.bgDeep, fontSize: 15, fontWeight: "700" },
  secondary: {
    minHeight: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: "rgba(7,6,10,0.7)",
  },
  secondaryText: { color: COLORS.gold, fontSize: 14.5, fontWeight: "700" },
});
