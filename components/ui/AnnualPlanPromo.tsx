import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";

import { fetchPlans, type Plan } from "@/api/Plans";
import { useMembership } from "@/hooks/useMembership";
import { useAnnualPromoStore } from "@/redux/slices/annualPromoStore";
import type { RootState } from "@/redux/store";

/** Longest paid plan = "Annual". Shown only to Monthly / Quarterly subscribers. */
export default function AnnualPlanPromo() {
  const { t } = useTranslation();
  const { currentPlan } = useMembership();
  const { pending, markShown } = useAnnualPromoStore();
  const isPlaying = useSelector((s: RootState) => s.player.isPlaying);
  const isExpanded = useSelector((s: RootState) => s.player.isExpanded);
  const [annual, setAnnual] = useState<Plan | null>(null);
  const [visible, setVisible] = useState(false);

  // never interrupt active listening: wait until audio has stopped
  useEffect(() => {
    if (!pending || isPlaying) return;
    let cancelled = false;
    (async () => {
      try {
        const { plans } = await fetchPlans();
        const longest = plans[plans.length - 1]; // sorted shortest -> longest
        const cur = plans.find((p) => p.id === currentPlan?.id);
        if (!cancelled && longest && cur && longest.durationDays > cur.durationDays) {
          setAnnual(longest);
          setVisible(true);
        }
      } finally {
        if (!cancelled) markShown(); // free users / annual users: just clear the flag
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, isPlaying, isExpanded, currentPlan?.id, markShown]);

  if (!annual) return null;
  const close = () => setVisible(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>{t("plans.annualPromo.title", "Enjoying your audiobooks?")}</Text>
          <Text style={s.body}>
            {t("plans.annualPromo.body", "Switch to the {{name}} plan and save more.", { name: annual.title })}
          </Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{annual.price}</Text>
            {annual.origPrice > annual.price && <Text style={s.orig}>₹{annual.origPrice}</Text>}
          </View>
          <Pressable
            style={s.cta}
            onPress={() => {
              close();
              router.push("/plans");
            }}
          >
            <Text style={s.ctaText}>{t("plans.annualPromo.cta", "See annual plan")}</Text>
          </Pressable>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={s.later}>{t("plans.annualPromo.later", "Maybe later")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#161616", borderRadius: 20, padding: 22, alignItems: "center", gap: 10 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  body: { color: "#bbb", fontSize: 14, textAlign: "center" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  price: { color: "#fff", fontSize: 28, fontWeight: "700" },
  orig: { color: "#8A8A8A", fontSize: 15, textDecorationLine: "line-through" },
  cta: { alignSelf: "stretch", height: 50, borderRadius: 25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 6 },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "600" },
  later: { color: "#8A8A8A", fontSize: 14, marginTop: 6 },
});
