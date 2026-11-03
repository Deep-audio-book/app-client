import ProfileDot from "@/components/ui/ProfileDot";
import { changeAppLanguage } from "@/constants/locales";
import { HELP_CATEGORIES, HELP_ITEMS, HelpCategory } from "@/constants/helpContent";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from "./ProfileExtras";
import { COLORS, MAX_CONTENT_WIDTH } from "./style";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Filter = "all" | HelpCategory;

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // `useTranslation` re-renders this screen the moment the language changes,
  // and every text below is read with t(...) at render time - so the whole
  // Help Center switches language instantly (no reload, no stale text).
  const { t, i18n } = useTranslation();

  const lang = (i18n.language ?? "en").split("-")[0];
  const nextLang = lang === "ta" ? "en" : "ta";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  const switchLanguage = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await changeAppLanguage(nextLang);
  };

  // translated questions / answers, rebuilt whenever the language changes
  const items = useMemo(
    () =>
      HELP_ITEMS.map((item) => ({
        ...item,
        question: t(`help.faq.${item.id}.q`),
        answer: t(`help.faq.${item.id}.a`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== "all" && item.category !== filter) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[COLORS.glowTop, "transparent"]}
        style={s.glow}
        pointerEvents="none"
      />

      <SafeAreaView edges={["top"]}>
        <View style={s.header}>
          <Pressable
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile" as any))}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Back")}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.cream} />
          </Pressable>

          <Text style={s.headerTitle} numberOfLines={1} accessibilityRole="header">
            {t("help.title")}
          </Text>

          <ProfileDot dotStyle={s.profileDot} textStyle={s.profileDotText} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 40, maxWidth: MAX_CONTENT_WIDTH },
        ]}
      >
        {/* language switch: changes the whole app, Help Center included */}
        <Pressable
          onPress={switchLanguage}
          style={({ pressed }) => [s.langRow, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={t("help.switchLanguage")}
        >
          <Ionicons name="language-outline" size={18} color={COLORS.gold} />
          <Text style={s.langText}>{t("help.language")}</Text>
          <View style={s.langPill}>
            <Text style={s.langPillText}>{t("help.switchTo")}</Text>
          </View>
        </Pressable>

        <Text style={s.intro}>{t("help.intro")}</Text>

        {/* search */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("help.searchPlaceholder")}
            placeholderTextColor={COLORS.textFaint}
            style={s.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!query && (
            <Pressable hitSlop={10} onPress={() => setQuery("")} accessibilityLabel={t("common.clear", "Clear")}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        {/* categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {(["all", ...HELP_CATEGORIES] as Filter[]).map((c) => {
            const active = filter === c;
            return (
              <Pressable
                key={c}
                onPress={() => setFilter(c)}
                style={[s.chip, active && s.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {c === "all" ? t("help.all") : t(`help.categories.${c}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* questions */}
        {visible.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="help-circle-outline" size={34} color={COLORS.textFaint} />
            <Text style={s.emptyTitle}>{t("help.noResults")}</Text>
            <Text style={s.emptySub}>{t("help.noResultsSub")}</Text>
          </View>
        ) : (
          <View style={s.list}>
            {visible.map((item) => {
              const isOpen = openId === item.id;
              return (
                <View key={item.id} style={s.card}>
                  <Pressable
                    onPress={() => toggle(item.id)}
                    style={s.cardHead}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                  >
                    <Text style={s.question}>{item.question}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={COLORS.gold}
                    />
                  </Pressable>

                  {isOpen && <Text style={s.answer}>{item.answer}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* still need help? */}
        <View style={s.contact}>
          <Text style={s.contactTitle}>{t("help.stillNeedHelp")}</Text>
          <Text style={s.contactSub}>{t("help.stillNeedHelpSub")}</Text>

          <View style={s.contactRow}>
            <Pressable
              style={({ pressed }) => [s.contactBtn, pressed && { opacity: 0.85 }]}
              onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=Support%20request`)}
              accessibilityRole="button"
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.bgDeep} />
              <Text style={s.contactBtnText}>{t("profile.emailUs", "Email")}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.contactBtn, s.contactBtnAlt, pressed && { opacity: 0.85 }]}
              onPress={() => open(`https://wa.me/${WHATSAPP_NUMBER}`)}
              accessibilityRole="button"
            >
              <Ionicons name="logo-whatsapp" size={18} color={COLORS.gold} />
              <Text style={[s.contactBtnText, { color: COLORS.gold }]}>WhatsApp</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profileDotText: { color: COLORS.cream, fontSize: 13, fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: 12,
  },
  content: { alignSelf: "center", width: "100%", paddingHorizontal: 20, paddingTop: 8 },

  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.panel,
  },
  langText: { flex: 1, color: COLORS.cream, fontSize: 14, fontWeight: "600" },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(217,164,65,0.16)",
  },
  langPillText: { color: COLORS.gold, fontSize: 13, fontWeight: "700" },

  intro: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginTop: 14 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.panel,
  },
  searchInput: { flex: 1, color: COLORS.cream, fontSize: 14.5, paddingVertical: 0 },

  chips: { gap: 8, paddingVertical: 14 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.panel,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: COLORS.bgDeep },

  list: { gap: 10 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.panel,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  question: { flex: 1, color: COLORS.cream, fontSize: 14.5, fontWeight: "600", lineHeight: 20 },
  answer: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  empty: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyTitle: { color: COLORS.cream, fontSize: 15, fontWeight: "600", marginTop: 4 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: "center" },

  contact: {
    marginTop: 26,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.3)",
    backgroundColor: "rgba(217,164,65,0.06)",
  },
  contactTitle: { color: COLORS.cream, fontSize: 16, fontWeight: "700" },
  contactSub: { color: COLORS.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 4 },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  contactBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.gold,
  },
  contactBtnAlt: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.gold },
  contactBtnText: { color: COLORS.bgDeep, fontSize: 14.5, fontWeight: "700" },
});
