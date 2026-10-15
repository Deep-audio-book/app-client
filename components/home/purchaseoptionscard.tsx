/**
 * PurchaseOptionsCard
 * --------------------
 * Drop this into the book / story detail screen (e.g. storyEpisode.tsx).
 *
 *   1. The book's own price ("Buy this audiobook — ₹95").
 *   2. Below it, a box with two lighter-weight ways in:
 *        - "Listen to this book only" — one-time rental price (e.g. ₹9)
 *        - "Listen Unlimited" — subscribe and get every audiobook
 *
 * Usage:
 *
 *   import PurchaseOptionsCard from "./PurchaseOptionsCard";
 *
 *   <PurchaseOptionsCard
 *     bookPrice={95}
 *     rentalPrice={9}
 *     onBuy={() => addToCart(story.id)}
 *     onRentListen={() => rentStory(story.id)}
 *     onSubscribe={() => router.push("/subscribe")}
 *   />
 *
 * Pass `owned` if the person already owns the book, `isSubscribed` if they
 * already have an active unlimited subscription.
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "./style";

type Currency = "INR" | "USD";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
};

function formatPrice(price: number, currency: Currency = "INR"): string {
  return `${CURRENCY_SYMBOLS[currency]}${Math.round(price)}`;
}

const HeadphoneIcon = ({ size = 18, color = COLORS.lav }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 13a8 8 0 0116 0v5a2 2 0 01-2 2h-1a2 2 0 01-2-2v-2a2 2 0 012-2h3M4 13v3a2 2 0 002 2h1a2 2 0 002-2v-2a2 2 0 00-2-2H4" />
  </Svg>
);

const CrownIcon = ({ size = 18, color = "#241b2c" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = "#8fd19e" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 13l4 4 10-10" />
  </Svg>
);

interface PurchaseOptionsCardProps {
  /** Full price to own this one audiobook, e.g. 95. Omit/null to hide the buy row. */
  bookPrice?: number | null;
  /** One-time "listen to this book only" price, e.g. 9. Omit/null to hide that option. */
  rentalPrice?: number | null;
  currency?: Currency;
  /** Person already owns this book outright. */
  owned?: boolean;
  /** Person already has an active unlimited subscription. */
  isSubscribed?: boolean;
  onBuy?: () => void;
  onRentListen?: () => void;
  onSubscribe?: () => void;
}

const PurchaseOptionsCard: React.FC<PurchaseOptionsCardProps> = ({
  bookPrice,
  rentalPrice,
  currency = "INR",
  owned = false,
  isSubscribed = false,
  onBuy,
  onRentListen,
  onSubscribe,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      {/* ---------- own this book outright ---------- */}
      {owned ? (
        <View style={styles.ownedRow}>
          <CheckIcon />
          <Text style={styles.ownedText}>{t("purchase.youOwnThis")}</Text>
        </View>
      ) : (
        !!bookPrice && (
          <View style={styles.buyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.buyLabel}>{t("purchase.buyThisAudiobook")}</Text>
              <Text style={styles.buyPrice}>{formatPrice(bookPrice, currency)}</Text>
            </View>

            <TouchableOpacity
              style={styles.buyBtn}
              activeOpacity={0.85}
              onPress={onBuy}
              accessibilityRole="button"
              accessibilityLabel={t("purchase.buyNow")}
            >
              <Text style={styles.buyBtnText}>{t("purchase.buyNow")}</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ---------- lighter-weight options ---------- */}
      {(!!rentalPrice || !isSubscribed) && (
        <View style={styles.optionsBox}>
          <Text style={styles.optionsHeading}>{t("purchase.orChooseHowToListen")}</Text>

          {!!rentalPrice && (
            <View style={styles.optionRow}>
              <View style={styles.optionIconWrap}>
                <HeadphoneIcon size={18} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{t("purchase.listenThisBookOnly")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.oneTimeNoSubscription")}</Text>
              </View>

              <TouchableOpacity
                style={styles.optionBtnLight}
                activeOpacity={0.85}
                onPress={onRentListen}
                accessibilityRole="button"
                accessibilityLabel={t("purchase.listenPriceCta", { price: formatPrice(rentalPrice, currency) })}
              >
                <Text style={styles.optionBtnLightText}>
                  {formatPrice(rentalPrice, currency)} · {t("purchase.listenNow")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Divider only when both rows are visible */}
          {!!rentalPrice && <View style={styles.optionDivider} />}

          {isSubscribed ? (
            <View style={styles.optionRow}>
              <View style={[styles.optionIconWrap, styles.optionIconWrapActive]}>
                <CrownIcon size={18} color={COLORS.lav} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{t("purchase.unlimitedActive")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.unlimitedActiveSubtitle")}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.optionRow}>
              <View style={[styles.optionIconWrap, styles.optionIconWrapActive]}>
                <CrownIcon size={18} color={COLORS.lav} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{t("purchase.listenUnlimited")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.unlimitedSubtitle")}</Text>
              </View>

              <TouchableOpacity
                style={styles.optionBtnStrong}
                activeOpacity={0.85}
                onPress={onSubscribe}
                accessibilityRole="button"
                accessibilityLabel={t("purchase.subscribeNow")}
              >
                <Text style={styles.optionBtnStrongText}>{t("purchase.subscribeNow")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },

  /* ---------- outright buy row ---------- */
  buyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.hair,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  buyLabel: {
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 4,
  },
  buyPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text1,
  },
  buyBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buyBtnText: {
    color: "#241b2c",
    fontWeight: "700",
    fontSize: 15,
  },

  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(143,209,158,0.12)",
    borderWidth: 1,
    borderColor: "rgba(143,209,158,0.35)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  ownedText: {
    color: "#8fd19e",
    fontWeight: "600",
    fontSize: 14,
  },

  /* ---------- lighter-weight options box ---------- */
  optionsBox: {
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: "rgba(183,155,209,0.3)",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 4, // small gap so the divider doesn't get extra space above/below
  },
  optionsHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconWrapActive: {
    backgroundColor: COLORS.lavSoft,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text1,
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 12.5,
    color: COLORS.text3,
  },
  optionBtnLight: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: COLORS.hair,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  optionBtnLightText: {
    color: COLORS.text1,
    fontWeight: "600",
    fontSize: 13,
  },
  optionBtnStrong: {
    backgroundColor: COLORS.lav,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  optionBtnStrongText: {
    color: "#241b2c",
    fontWeight: "700",
    fontSize: 13.5,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 2,
  },
});

export default PurchaseOptionsCard;