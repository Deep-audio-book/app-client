import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import type { PaywallInfo } from "../../providers/PlayerProvider";
import { COLORS } from "./episodeStyle";

/**
 * Shown when a FREE episode has ended and the next episode is locked.
 * Mounted once inside PlayerProvider, so it appears on any screen
 * (full player, mini player, book page ...).
 *
 *   [ Rent / Get this book ]  -> book page (About) with Rent Now / Add to Cart
 *   [ Get Premium ]           -> plans
 *   [ Maybe later ]           -> close
 */
type Props = {
  paywall: PaywallInfo | null;
  onDismiss: () => void;
  /** closes the full-screen player before leaving it */
  onCollapse: () => void;
};

export default function EpisodePaywallModal({
  paywall,
  onDismiss,
  onCollapse,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  // Android back button closes the prompt
  useEffect(() => {
    if (!paywall) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onDismiss();
      return true;
    });

    return () => sub.remove();
  }, [paywall, onDismiss]);

  if (!paywall) return null;

  const openBook = () => {
    onDismiss();
    onCollapse();

    if (paywall.storyId) {
      router.push({
        pathname: "/storyEpisode",
        params: { storyId: paywall.storyId, tab: "about" },
      } as any);
    }
  };

  const openPlans = () => {
    onDismiss();
    onCollapse();
    router.push("/plans" as any);
  };

  return (
    // NOT a react-native <Modal>: the player is a native transparent modal
    // screen and iOS cannot present a second Modal above it (nothing showed).
    // This is a normal full-screen overlay; it is mounted inside the player
    // screen AND at the app root (for every other screen).
    <View style={s.overlay} accessibilityViewIsModal>
      <View style={s.backdrop}>
        <View style={s.card}>
          {!!paywall.cover && (
            <Image
              source={{ uri: paywall.cover }}
              style={s.cover}
              contentFit="cover"
            />
          )}

          <View style={s.lockBadge}>
            <Ionicons name="lock-closed" size={16} color={COLORS.bgDeep} />
          </View>

          <Text style={s.title}>
            {t("player.paywall.title", "Enjoying the story?")}
          </Text>

          <Text style={s.message}>
            {t(
              "player.paywall.message",
              "The free episode has ended. Rent this book or get Premium to keep listening."
            )}
          </Text>

          {!!paywall.storyTitle && (
            <Text style={s.storyTitle} numberOfLines={2}>
              {paywall.storyTitle}
            </Text>
          )}

          {!!paywall.nextChapterTitle && (
            <Text style={s.next} numberOfLines={1}>
              {t("player.paywall.next", "Next")}: {paywall.nextChapterTitle}
            </Text>
          )}

          <Pressable
            onPress={openBook}
            style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={18} color={COLORS.bgDeep} />
            <Text style={s.primaryText}>
              {t("player.paywall.rent", "Rent / Get this book")}
            </Text>
          </Pressable>

          <Pressable
            onPress={openPlans}
            style={({ pressed }) => [s.secondary, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="diamond-outline" size={18} color={COLORS.gold} />
            <Text style={s.secondaryText}>
              {t("player.paywall.premium", "Get Premium")}
            </Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            style={s.later}
            accessibilityRole="button"
          >
            <Text style={s.laterText}>
              {t("player.paywall.later", "Maybe later")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "#14110F",
  },
  cover: { width: 96, height: 96, borderRadius: 18, marginBottom: 6 },
  lockBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
    marginTop: -16,
    marginBottom: 12,
  },
  title: { color: COLORS.cream, fontSize: 20, fontWeight: "700", textAlign: "center" },
  message: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  storyTitle: {
    color: COLORS.goldLight,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  next: { color: COLORS.textFaint, fontSize: 12.5, marginTop: 4 },
  primary: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: COLORS.gold,
  },
  primaryText: { color: COLORS.bgDeep, fontSize: 15, fontWeight: "700" },
  secondary: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  secondaryText: { color: COLORS.gold, fontSize: 15, fontWeight: "700" },
  later: { paddingVertical: 12 },
  laterText: { color: COLORS.textMutedDeep, fontSize: 14 },
});
