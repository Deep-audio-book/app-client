import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CartItem } from "../../api/Cart";
import { theme } from "../ui/theme";

const c = theme.colors;

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/*  Rental row                                                         */
/* ------------------------------------------------------------------ */
type RowProps = {
  item: CartItem;
  busy: boolean;
  onRemove: (item: CartItem) => void;
};

function CartRow({ item, busy, onRemove }: RowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.cover}>
        {!!item.coverUrl && (
          <Image
            source={{ uri: item.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
          />
        )}
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.author && (
          <Text style={styles.itemAuthor} numberOfLines={1}>
            {t("cart.by", { author: item.author })}
          </Text>
        )}

        <View style={styles.bottomRow}>
          {item.rentalDays > 0 && (
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={14} color={c.textSecondary} />
              <Text style={styles.chipText}>
                {t("cart.rentalDays", { count: item.rentalDays })}
              </Text>
            </View>
          )}
          <Text style={styles.itemPrice}>{money(item.price)}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => onRemove(item)}
        disabled={busy}
        hitSlop={10}
        accessibilityLabel={t("profile.removeItem")}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
      >
        <Ionicons name="trash-outline" size={20} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
type Props = {
  items: CartItem[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  loadError: string | null;
  actionError: string | null;
  busyIds: ReadonlySet<string>;
  onRefresh: () => void;
  onRetry: () => void;
  onRemove: (item: CartItem) => void;
  onCheckout: () => void;
  onBrowse: () => void;
  onClose: () => void;
};

export default function CartScreen({
  items,
  total,
  loading,
  refreshing,
  loadError,
  actionError,
  busyIds,
  onRefresh,
  onRetry,
  onRemove,
  onCheckout,
  onBrowse,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const hasItems = items.length > 0;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  } else if (loadError && !hasItems) {
    body = (
      <View style={styles.state}>
        <Text style={styles.stateText}>{loadError}</Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t("cart.tryAgain")}</Text>
        </Pressable>
      </View>
    );
  } else if (!hasItems) {
    body = (
      <View style={styles.state}>
        <View style={styles.emptyIcon}>
          <Ionicons name="cart-outline" size={40} color={c.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>{t("profile.cartEmpty")}</Text>
        <Text style={styles.stateText}>{t("profile.cartEmptySub")}</Text>
        <Pressable
          onPress={onBrowse}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t("cart.browse")}</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <CartRow item={item} busy={busyIds.has(item.id)} onRemove={onRemove} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[c.backgroundTop, c.background]}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel={t("cart.back")}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("profile.myCart")}</Text>
          {hasItems && (
            <Text style={styles.count}>{t("cart.itemsCount", { count: items.length })}</Text>
          )}
        </View>
        <View style={styles.iconBtnSpacer} />
      </View>

      <View style={styles.flex}>{body}</View>

      {hasItems && !loading && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {actionError && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {actionError}
            </Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("profile.total")}</Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>
          <Pressable
            onPress={onCheckout}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>{t("profile.checkout")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSpacer: { width: 38 },
  headerText: { flex: 1, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: c.textPrimary },
  count: { marginTop: 2, fontSize: 13, color: c.textSecondary },

  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    gap: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  cover: {
    width: 72,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: c.tileB,
  },
  rowBody: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
  itemAuthor: { marginTop: 2, fontSize: 13, color: c.textSecondary },
  bottomRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: c.surfaceRaised,
  },
  chipText: { fontSize: 12, color: c.textSecondary },
  itemPrice: { fontSize: 17, fontWeight: "700", color: c.accent },
  removeBtn: { alignSelf: "flex-start", padding: 4 },

  state: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  stateText: { fontSize: 15, lineHeight: 22, color: c.textSecondary, textAlign: "center" },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: c.textPrimary, textAlign: "center" },
  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "500", color: c.textPrimary },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.background,
  },
  error: { marginBottom: 10, fontSize: 14, color: c.error, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: { fontSize: 16, color: c.textSecondary },
  totalValue: { fontSize: 24, fontWeight: "700", color: c.textPrimary },
  cta: {
    height: 58,
    borderRadius: 29,
    backgroundColor: c.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 18, fontWeight: "600", color: c.onAccent },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});