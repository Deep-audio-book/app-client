import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import CartScreen from "@/components/profile/CartScreen";
import { useCart } from "@/hooks/useCart";

export default function Cart() {
  const router = useRouter();
  const { t } = useTranslation();
  const cart = useCart();
  const { reload } = cart;

  // loads on open and refreshes whenever you come back to this screen
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleCheckout = () => {
    // TODO: start payment for these rentals. The server must price the cart
    // itself and only grant access after it has verified the payment.
    Alert.alert(t("profile.checkout"), `${t("profile.total")}: ₹${cart.total}`);
  };

  return (
    <CartScreen
      items={cart.items}
      total={cart.total}
      loading={cart.loading}
      refreshing={cart.refreshing}
      loadError={cart.loadError}
      actionError={cart.actionError}
      busyIds={cart.busyIds}
      onRefresh={cart.refresh}
      onRetry={cart.retry}
      onRemove={cart.remove}
      onCheckout={handleCheckout}
      onBrowse={() => router.replace("/home")}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
    />
  );
}