/**
 * PurchaseOptionsCard
 * --------------------
 * Used in the book / story detail (Album) screen.
 *
 *   1. The book's own price ("Buy this audiobook — ₹95").
 *   2. Below it, a box with two lighter-weight ways in:
 *        - "Listen to this book only" — one-time rental price (e.g. ₹9)
 *        - "Listen Unlimited" — subscribe and get every audiobook
 *
 * Self-contained: palette is defined below (gold, matches the Album screen),
 * so there is no dependency on any ./style file.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

/* ---------- palette (Album gold theme) ---------- */

const C = {
  gold: "#C89B4C",
  goldSoft: "rgba(200,155,76,0.16)",
  goldBorder: "rgba(200,155,76,0.30)",
  cream: "#F0E6D2",
  textMuted: "rgba(240,230,210,0.70)",
  textFaint: "rgba(240,230,210,0.50)",
  panel: "rgba(20,16,12,0.72)",
  panel2: "rgba(255,255,255,0.05)",
  hair: "rgba(240,230,210,0.12)",
  dark: "#241b0c",
  green: "#8fd19e",
};

type Currency = "INR" | "USD";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
};

function formatPrice(price: number, currency: Currency = "INR"): string {
  // INR: whole rupees. USD: keep cents (e.g. $1.99), don't round to $2.
  const isWhole = Number.isInteger(price);
  const value = currency === "INR" || isWhole ? Math.round(price) : price.toFixed(2);
  return `${CURRENCY_SYMBOLS[currency]}${value}`;
}

/* ---------- icons ---------- */

const HeadphoneIcon = ({ size = 18, color = C.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 13a8 8 0 0116 0v5a2 2 0 01-2 2h-1a2 2 0 01-2-2v-2a2 2 0 012-2h3M4 13v3a2 2 0 002 2h1a2 2 0 002-2v-2a2 2 0 00-2-2H4" />
  </Svg>
);

const CrownIcon = ({ size = 18, color = C.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 13l4 4 10-10" />
  </Svg>
);

/* ---------- props ---------- */

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
  /** Buy request is running (shows spinner). */
  buyBusy?: boolean;
  /** Book is already added to cart (shows "Added"). */
  buyDone?: boolean;
  /** Rental request is running (shows spinner). */
  rentBusy?: boolean;
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
  buyBusy = false,
  buyDone = false,
  rentBusy = false,
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.buyLabel}>{t("purchase.buyThisAudiobook")}</Text>
              <Text style={styles.buyPrice}>{formatPrice(bookPrice, currency)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.buyBtn, buyDone && styles.buyBtnDone]}
              activeOpacity={0.85}
              onPress={onBuy}
              disabled={buyBusy || buyDone}
              accessibilityRole="button"
              accessibilityLabel={t("purchase.buyNow")}
            >
              {buyBusy ? (
                <ActivityIndicator size="small" color={C.dark} />
              ) : (
                <Text style={styles.buyBtnText}>
                  {buyDone ? t("purchase.addedToCart") : t("purchase.buyNow")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ---------- lighter-weight options ---------- */}
      <View style={styles.optionsBox}>
        <Text style={styles.optionsHeading}>{t("purchase.orChooseHowToListen")}</Text>

        {!!rentalPrice && (
          <View style={styles.optionBlock}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconWrap}>
                <HeadphoneIcon size={18} />
              </View>

              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{t("purchase.listenThisBookOnly")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.oneTimeNoSubscription")}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.optionBtnLight}
              activeOpacity={0.85}
              onPress={onRentListen}
              disabled={rentBusy}
              accessibilityRole="button"
              accessibilityLabel={t("purchase.listenPriceCta", {
                price: formatPrice(rentalPrice, currency),
              })}
            >
              {rentBusy ? (
                <ActivityIndicator size="small" color={C.cream} />
              ) : (
                <Text style={styles.optionBtnLightText}>
                  {formatPrice(rentalPrice, currency)} · {t("purchase.listenNow")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Divider only when both rows are visible */}
        {!!rentalPrice && <View style={styles.optionDivider} />}

        {isSubscribed ? (
          <View style={styles.optionBlock}>
            <View style={styles.optionRow}>
              <View style={[styles.optionIconWrap, styles.optionIconWrapActive]}>
                <CrownIcon size={18} />
              </View>

              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{t("purchase.unlimitedActive")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.unlimitedActiveSubtitle")}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.optionBlock}>
            <View style={styles.optionRow}>
              <View style={[styles.optionIconWrap, styles.optionIconWrapActive]}>
                <CrownIcon size={18} />
              </View>

              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{t("purchase.listenUnlimited")}</Text>
                <Text style={styles.optionSubtitle}>{t("purchase.unlimitedSubtitle")}</Text>
              </View>
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
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  buyLabel: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 4,
  },
  buyPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: C.cream,
  },
  buyBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 24,
    minWidth: 112,
    maxWidth: "52%",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnDone: {
    backgroundColor: C.green,
  },
  buyBtnText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
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
    color: C.green,
    fontWeight: "600",
    fontSize: 14,
  },

  /* ---------- lighter-weight options box ---------- */
  optionsBox: {
    backgroundColor: C.panel2,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 4,
  },
  optionsHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optionBlock: {
    gap: 12,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionTextCol: {
    flex: 1,
    minWidth: 0,
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
    backgroundColor: C.goldSoft,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 12.5,
    color: C.textFaint,
  },
  optionBtnLight: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: C.hair,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBtnLightText: {
    color: C.cream,
    fontWeight: "600",
    fontSize: 13,
  },
  optionBtnStrong: {
    backgroundColor: C.gold,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBtnStrongText: {
    color: C.dark,
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