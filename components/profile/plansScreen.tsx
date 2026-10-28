import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Plan } from "../../api/Plans";
import { theme } from "../ui/theme";

const c = theme.colors;

const FEATURE_KEYS = [
  "plans.features.unlimited",
  "plans.features.offline",
  "plans.features.perks",
] as const;

const daily = (p: Plan) => p.price / p.durationDays;

/* ------------------------------------------------------------------ */
/*  Plan card                                                          */
/* ------------------------------------------------------------------ */
type PlanCardProps = {
  plan: Plan;
  base: Plan; // shortest paid plan, used to work out the saving
  isBest: boolean;
  isCurrent: boolean;
  selected: boolean;
  onPress: () => void;
};

function PlanCard({ plan, base, isBest, isCurrent, selected, onPress }: PlanCardProps) {
  const perMonth = Math.round(daily(plan) * 30);
  const saving =
    plan.id === base.id ? 0 : Math.round((1 - daily(plan) / daily(base)) * 100);

  const { t, i18n } = useTranslation();

  const subtitle =
    plan.durationDays <= 31
      ? t("plans.flexible")
      : `${t("plans.perMonth", { price: perMonth })}${
          saving > 0 ? ` · ${t("plans.save", { percent: saving })}` : ""
        }`;

  // plan_name from the backend ("Monthly") -> translated, falls back to the backend name
  const title = t(`plans.planName.${plan.title.toLowerCase()}`, {
    defaultValue: plan.title,
  });

  // plan_description from the backend is an i18n key; show it only if translated
  const description =
    plan.description && i18n.exists(plan.description) ? t(plan.description) : "";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <View style={styles.radioDot} />}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.planTitle}>{title}</Text>
          {isCurrent && (
            <View style={styles.badgeOutline}>
              <Text style={styles.badgeOutlineText}>{t("plans.badge.current")}</Text>
            </View>
          )}
          {isBest && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("plans.badge.best")}</Text>
            </View>
          )}
        </View>
        <Text style={styles.planSub}>{subtitle}</Text>
        {!!description && <Text style={styles.planDesc}>{description}</Text>}
      </View>

      <View style={styles.priceCol}>
        <Text style={styles.price}>₹{plan.price}</Text>
        {plan.origPrice > plan.price && (
          <Text style={styles.origPrice}>₹{plan.origPrice}</Text>
        )}
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
type Props = {
  plans: Plan[];
  currentPlanId?: string;
  currentPlanName?: string;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  /** Throw an Error(message) to show it above the button. */
  onSubscribe: (plan: Plan) => Promise<void>;
  onClose: () => void;
};

export default function PlansScreen({
  plans,
  currentPlanId,
  currentPlanName,
  loading = false,
  loadError = null,
  onRetry,
  onSubscribe,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = plans[0]; // plans are sorted shortest duration first
  const best =
    plans.length > 1
      ? plans.reduce((a, b) => (daily(b) < daily(a) ? b : a))
      : undefined;

  // nothing tapped yet -> pre-select the best value plan
  const selected = plans.find((p) => p.id === selectedId) ?? best ?? base;
  const selectedIsCurrent = !!selected && selected.id === currentPlanId;
  const canSubmit = !!selected && !selectedIsCurrent && !submitting;

  const submit = async () => {
    if (!selected || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubscribe(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("plans.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[c.backgroundTop, c.background]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel={t("plans.close")}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={c.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.title}>{t("plans.title")}</Text>
        <Text style={styles.subtitle}>
          {currentPlanName
            ? t("plans.currentlyOn", { name: currentPlanName })
            : t("plans.subtitle")}
        </Text>

        <View style={styles.features}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={c.accent} />
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={c.accent} />
          </View>
        ) : loadError ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{loadError}</Text>
            {onRetry && (
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>{t("plans.tryAgain")}</Text>
              </Pressable>
            )}
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{t("plans.noPlans")}</Text>
          </View>
        ) : (
          <View accessibilityRole="radiogroup" style={styles.list}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                base={base}
                isBest={plan.id === best?.id}
                isCurrent={plan.id === currentPlanId}
                selected={plan.id === selected?.id}
                onPress={() => setSelectedId(plan.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && !submitting && styles.ctaDisabled,
            pressed && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <Text style={styles.ctaText}>
              {selectedIsCurrent
                ? t("plans.currentPlan")
                : selected
                  ? t("plans.continuePrice", { price: selected.price })
                  : t("plans.continue")}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },

  header: { paddingHorizontal: 20, alignItems: "flex-end" },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: "700", color: c.textPrimary },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, color: c.textSecondary },

  features: { marginTop: 24, gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { flex: 1, fontSize: 15, color: c.textPrimary },

  state: { marginTop: 40, alignItems: "center", gap: 16 },
  stateText: { fontSize: 15, color: c.textSecondary, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { fontSize: 15, fontWeight: "500", color: c.textPrimary },

  list: { marginTop: 28, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  cardSelected: { borderColor: c.accent },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#6B6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: c.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planTitle: { fontSize: 17, fontWeight: "600", color: c.textPrimary },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: c.accent,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: c.onAccent },
  badgeOutline: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.textSecondary,
  },
  badgeOutlineText: { fontSize: 11, fontWeight: "600", color: c.textSecondary },
  planSub: { marginTop: 4, fontSize: 13, color: c.textSecondary },
  planDesc: { marginTop: 4, fontSize: 12, lineHeight: 17, color: c.textSecondary },
  priceCol: { alignItems: "flex-end" },
  price: { fontSize: 22, fontWeight: "700", color: c.textPrimary },
  origPrice: {
    fontSize: 13,
    color: c.textSecondary,
    textDecorationLine: "line-through",
  },

  footer: { paddingHorizontal: 24, paddingTop: 12 },
  error: { marginBottom: 10, fontSize: 14, color: c.error, textAlign: "center" },
  cta: {
    height: 58,
    borderRadius: 29,
    backgroundColor: c.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: 18, fontWeight: "600", color: c.onAccent },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});