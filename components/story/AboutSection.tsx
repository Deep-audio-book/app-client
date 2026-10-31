import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Chapter, StoryDetail } from "../download/types";
import { COLORS } from "./episodeStyle";
import {
  CreditItem,
  StoryMeta,
  formatCount,
  getExtraCredits,
  getRawCredits,
} from "./storyMeta";

const PREVIEW_CHAPTERS = 4;

type Props = {
  story: StoryDetail;
  meta: StoryMeta;
  /** true when the user owns / rented the book or has Premium */
  hasAccess: boolean;
  isFree: (chapter?: Chapter | null) => boolean;
  /** tap on author / narrator / production house */
  onOpenCredit: (credit: CreditItem) => void;
  /** "See all chapters" -> switches to the Chapters tab */
  onSeeAllChapters: () => void;
  /** "Play free episode" (only passed when a free episode exists and is useful) */
  onPlayFree?: () => void;
  onLockedPress: () => void;
  /** purchase card, recommended list, ... rendered below */
  children?: React.ReactNode;
};

export default function AboutSection({
  story,
  meta,
  hasAccess,
  isFree,
  onOpenCredit,
  onSeeAllChapters,
  onPlayFree,
  onLockedPress,
  children,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // If no author / narrator / production house could be recognised, show the
  // credits exactly as the backend sent them (never leave the section empty).
  const rawCredits = getRawCredits(story);
  const showRawOnly = meta.credits.length === 0 && rawCredits.length > 0;
  const extraCredits = showRawOnly ? [] : getExtraCredits(story);
  // "View more" reveals the full description AND the credits, so it is shown
  // whenever there is a description or any credit to reveal.
  const hasMore =
    !!(meta.fullDescription || meta.shortDescription) ||
    meta.credits.length > 0 ||
    rawCredits.length > 0;

  const chapters = story.chapters ?? [];
  const preview = chapters.slice(0, PREVIEW_CHAPTERS);

  const hasStats = meta.rating !== null || meta.views !== null;

  const creditLabel = (kind: CreditItem["kind"]) =>
    kind === "author"
      ? t("album.about.author")
      : kind === "narrator"
      ? t("album.about.narrator")
      : t("album.about.production");

  const isCreditClickable = (c: CreditItem) =>
    (c.kind !== "production" && !!c.id) || (c.kind === "production" && !!c.url);

  return (
    <View>
      {/* ---------- rating + views (above the description) ---------- */}
      {hasStats && (
        <View style={s.statsRow}>
          {meta.rating !== null && (
            <View style={s.statItem}>
              <Ionicons name="star" size={16} color={COLORS.goldLight} />
              <Text style={s.statValue}>{meta.rating.toFixed(1)}</Text>
              {meta.ratingCount ? (
                <Text style={s.statSub}>
                  ({formatCount(meta.ratingCount)})
                </Text>
              ) : null}
            </View>
          )}

          {meta.rating !== null && meta.views !== null && (
            <View style={s.statDivider} />
          )}

          {meta.views !== null && (
            <View style={s.statItem}>
              <Ionicons
                name="headset-outline"
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={s.statValue}>{formatCount(meta.views)}</Text>
              <Text style={s.statSub}>{t("album.about.listens")}</Text>
            </View>
          )}
        </View>
      )}

      {/* ---------- short synopsis + View more ---------- */}
      {!!(meta.shortDescription || meta.fullDescription) && (
        <>
          <Text style={s.heading}>
            {t("album.aboutTitle", { title: story.title })}
          </Text>

          <Text
            style={s.description}
            numberOfLines={expanded ? undefined : 3}
            maxFontSizeMultiplier={1.4}
          >
            {expanded
              ? meta.fullDescription || meta.shortDescription
              : meta.shortDescription || meta.fullDescription}
          </Text>

        </>
      )}

      {/* ---------- credits: author, narrator, production house ---------- */}
      {expanded && meta.credits.length > 0 && (
        <View style={s.creditsCard}>
          {meta.credits.map((c, i) => {
            const clickable = isCreditClickable(c);
            return (
              <Pressable
                key={`${c.kind}-${i}`}
                disabled={!clickable}
                onPress={() => onOpenCredit(c)}
                style={({ pressed }) => [
                  s.creditRow,
                  i === meta.credits.length - 1 &&
                    extraCredits.length === 0 &&
                    s.creditRowLast,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole={clickable ? "link" : "text"}
                accessibilityLabel={`${creditLabel(c.kind)}: ${c.name}`}
              >
                <Text style={s.creditLabel}>{creditLabel(c.kind)}</Text>
                <View style={s.creditValueWrap}>
                  <Text
                    style={[s.creditValue, clickable && s.creditValueLink]}
                    numberOfLines={2}
                  >
                    {c.name}
                  </Text>
                  {clickable && (
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={COLORS.gold}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* other credits (music, editing ...) only after "View more" */}
          {extraCredits.map((c, i) => (
              <View
                key={`extra-${i}`}
                style={[
                  s.creditRow,
                  i === extraCredits.length - 1 && s.creditRowLast,
                ]}
              >
                <Text style={s.creditLabel}>{c.label}</Text>
                {!!c.value && (
                  <Text style={[s.creditValue, { flexShrink: 1 }]}>
                    {c.value}
                  </Text>
                )}
              </View>
            ))}
        </View>
      )}

      {expanded && showRawOnly && (
        <View style={s.creditsCard}>
          {rawCredits.map((c, i) => (
            <View
              key={`raw-${i}`}
              style={[s.creditRow, i === rawCredits.length - 1 && s.creditRowLast]}
            >
              <Text style={s.creditLabel}>{c.label}</Text>
              {!!c.value && (
                <Text style={[s.creditValue, { flexShrink: 1 }]}>{c.value}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {hasMore && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={10}
          style={s.moreBtn}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? t("album.about.viewLess") : t("album.about.viewMore")
          }
        >
          <Text style={s.moreText}>
            {expanded ? t("album.about.viewLess") : t("album.about.viewMore")}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={COLORS.gold}
          />
        </Pressable>
      )}

      {/* ---------- free episode: easy to find ---------- */}
      {!!onPlayFree && (
        <Pressable
          onPress={onPlayFree}
          style={({ pressed }) => [s.freeCard, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t("album.about.playFree")}
        >
          <View style={s.freeIcon}>
            <Ionicons name="play" size={16} color={COLORS.bgDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.freeTitle}>{t("album.about.playFree")}</Text>
            <Text style={s.freeSub}>{t("album.about.playFreeSub")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gold} />
        </Pressable>
      )}

      {/* ---------- chapter titles (locked ones show a lock) ---------- */}
      {chapters.length > 0 && (
        <View style={s.chaptersBlock}>
          <View style={s.chaptersHeader}>
            <Text style={s.heading}>
              {t("album.about.chaptersTitle", { count: chapters.length })}
            </Text>
          </View>

          {preview.map((c) => {
            const locked = !isFree(c) && !hasAccess;
            const free = isFree(c) && !hasAccess;
            return (
              <Pressable
                key={String(c.id)}
                onPress={locked ? onLockedPress : onSeeAllChapters}
                style={({ pressed }) => [s.chapterRow, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <Text style={s.chapterNo}>
                  {String(c.number).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.chapterTitle, locked && s.chapterTitleLocked]}
                    numberOfLines={1}
                  >
                    {c.title}
                  </Text>
                  {!!c.duration && (
                    <Text style={s.chapterDuration}>{c.duration}</Text>
                  )}
                </View>
                {locked ? (
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={COLORS.textFainter}
                  />
                ) : free ? (
                  <View style={s.freeTag}>
                    <Text style={s.freeTagText}>{t("album.about.free")}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={onSeeAllChapters}
            style={({ pressed }) => [s.seeAll, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <Text style={s.seeAllText}>
              {chapters.length > PREVIEW_CHAPTERS
                ? t("album.about.seeAllChapters", { count: chapters.length })
                : t("album.about.openChapters")}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.gold} />
          </Pressable>
        </View>
      )}

      {children}
    </View>
  );
}

const s = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statValue: { color: COLORS.cream, fontSize: 14, fontWeight: "700" },
  statSub: { color: COLORS.textMutedDeep, fontSize: 12.5 },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.goldBorder,
  },

  heading: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 14,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 4,
  },
  moreText: { color: COLORS.gold, fontSize: 13.5, fontWeight: "600" },

  creditsCard: {
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.goldBorderFaint,
  },
  creditRowLast: { borderBottomWidth: 0 },
  creditLabel: { color: COLORS.textFaint, fontSize: 13 },
  creditValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  creditValue: {
    color: COLORS.creamSoft,
    fontSize: 13.5,
    fontWeight: "500",
    textAlign: "right",
    flexShrink: 1,
  },
  creditValueLink: { color: COLORS.goldLight, textDecorationLine: "underline" },

  freeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: "rgba(200,155,76,0.10)",
  },
  freeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
  },
  freeTitle: { color: COLORS.cream, fontSize: 14.5, fontWeight: "700" },
  freeSub: { color: COLORS.textMutedDeep, fontSize: 12, marginTop: 2 },

  chaptersBlock: { marginTop: 8 },
  chaptersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.goldBorderFaint,
  },
  chapterNo: {
    width: 26,
    color: COLORS.textFaint,
    fontSize: 13,
    fontWeight: "600",
  },
  chapterTitle: { color: COLORS.cream, fontSize: 14.5, fontWeight: "500" },
  chapterTitleLocked: { color: COLORS.textMutedDeep },
  chapterDuration: { color: COLORS.textFaint, fontSize: 12, marginTop: 2 },
  freeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(143,209,158,0.16)",
  },
  freeTagText: { color: "#8fd19e", fontSize: 11, fontWeight: "700" },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    marginTop: 4,
  },
  seeAllText: { color: COLORS.gold, fontSize: 14, fontWeight: "600" },
});
