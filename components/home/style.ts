import { StyleSheet } from 'react-native';

export const COVERS: [string, string][] = [
  ["#3a1f1c", "#161010"],
  ["#332c1a", "#161310"],
  ["#241f2e", "#131013"],
  ["#1e2a1c", "#121310"],
];

export const BED_COVERS: [string, string][] = [
  ["#6d74e0", "#4a3f8f"],
  ["#8a63c9", "#4a3579"],
  ["#5f7bd6", "#3a4a95"],
  ["#7a5cc0", "#40306e"],
];

/* ---------- colors ---------- */

export const COLORS = {
  wrapBg: "#05070a",
  panel: "#1b2426",
  panel2: "#212b2d",
  green: "#2E635B",
  lav: "#b79bd1",
  lavDim: "#8b7aa0",
  lavSoft: "rgba(183,155,209,0.16)",
  yellow: "#e3c948",
  red: "#e14b3c",
  text1: "#f3eff7",
  text2: "#a9b3b0",
  text3: "#75807d",
  gold: "#e8c34d",
  // Highlight used for the selected carousel slide + current chapter.
  highlight: "#F5B93C",
  hair: "rgba(243,239,247,0.08)",
};

/* ---------- shared thumbnail sizes ----------
 * Vertical book / show thumbnails  -> 3:4  (CARD_W x CARD_H)
 * Trending, Editor's Picks, genres -> 1:1  (SQUARE_SIZE x SQUARE_SIZE)
 */
export const CARD_W = 164;
export const CARD_H = 219; // 3:4 vertical rectangle (164 * 4 / 3)
export const SQUARE_SIZE = 164; // 1:1
export const GENRE_TILE = 96; // 1:1
export const CARD_RADIUS = 16;
export const H_PAD = 18;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.wrapBg,
  },
  centerFill: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  errorText: {
    color: COLORS.text2,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryBtnText: {
    color: "#241b2c",
    fontWeight: "700",
    fontSize: 13,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2E635B",
  },
  bgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  wrapContent: {
    flexGrow: 1,
    alignItems: "stretch",
    paddingBottom: 32,
  },
  screen: {
    width: "100%",
    paddingBottom: 24,
    paddingHorizontal: 0,
  },

  /* ---------- top bar ---------- */
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingBottom: 4,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  deep: {
    fontWeight: "700",
    fontSize: 19,
    color: COLORS.yellow,
  },
  aud: {
    fontWeight: "600",
    fontSize: 11,
    color: COLORS.red,
    letterSpacing: 0.3,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileDotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  /* ---------- Rent vs Premium switch (free users only) ---------- */
  modeSwitch: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 8,
    marginHorizontal: H_PAD,
    marginTop: 14,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 6,
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  modeChipActive: {
    backgroundColor: COLORS.lav,
  },
  modeChipText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text1,
  },
  modeChipTextActive: {
    color: "#241b2c",
  },

  /* ---------- hero area (greeting + continue listening) ---------- */
  hero: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greet: {
    fontWeight: "700",
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.text1,
    marginBottom: 3,
  },
  greetSub: {
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 16,
  },

  /* ---------- trending genre chips ---------- */
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: H_PAD,
    paddingTop: 20,
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: COLORS.lavSoft,
    borderWidth: 1,
    borderColor: COLORS.hair,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12.5,
    color: COLORS.text2,
  },

  /* ---------- generic section + header ---------- */
  rowSec: {
    marginTop: 30,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: H_PAD,
    marginBottom: 14,
  },
  rowHeadText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.text1,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text2,
    marginTop: 2,
  },
  viewAll: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.lav,
  },
  viewAllBtn: {
    minHeight: 34,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: COLORS.lavSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowScroll: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: H_PAD,
    paddingBottom: 4,
  },

  /* ---------- story card (cover only) ---------- */
  card: {
    width: CARD_W,
  },
  cardSquare: {
    width: SQUARE_SIZE,
  },
  cardCover: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_RADIUS,
    position: "relative",
    overflow: "hidden",
  },
  cardCoverSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: CARD_RADIUS,
    position: "relative",
    overflow: "hidden",
  },

  /* ---------- Perfect for Bedtime Stories ---------- */
  bedSection: {
    marginTop: 30,
    marginHorizontal: H_PAD,
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.hair,
    overflow: "hidden",
  },
  bedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  bedRowScroll: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  bedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lavSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bedHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  bedTitle: {
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.text1,
    marginBottom: 2,
  },
  bedSubtitle: {
    fontSize: 12.5,
    color: COLORS.text2,
  },
  bedCard: {
    width: CARD_W,
  },
  bedCover: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_RADIUS,
    position: "relative",
    overflow: "hidden",
  },
  bedDurationBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(20,16,35,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bedDurationText: {
    color: "#fff",
    fontSize: 10.5,
    fontWeight: "600",
  },
  bedCardTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text1,
    marginBottom: 2,
  },
  bedCardNarrator: {
    fontSize: 11.5,
    color: COLORS.text3,
  },
  bedGenreText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.lav,
    marginBottom: 2,
  },

  /* ---------- authors ---------- */
  tertiary: {
    width: "100%",
    paddingHorizontal: H_PAD,
    marginTop: 30,
  },
  tertiaryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tertiaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text1,
  },
  authorRow: {
    flexDirection: "row",
    gap: 12,
  },
  authorChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.hair,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  authorAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  authorChipText: {
    fontSize: 15,
    color: COLORS.text2,
  },

  /* ---------- footer ---------- */
  footer: {
    width: "100%",
    paddingHorizontal: H_PAD,
    paddingTop: 22,
    paddingBottom: 26,
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.hair,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLabel: {
    fontSize: 10.5,
    color: COLORS.text3,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    gap: 6,
  },
  // 40x40 touch target (was 24x24) so taps register first time.
  social: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCopy: {
    marginTop: 14,
    fontSize: 10,
    color: COLORS.text3,
  },

  /* ---------- genres ---------- */
  section: {
    marginTop: 30,
  },
  genreRow: {
    flexDirection: "row",
    gap: 12,
  },
  genreIconBox: {
    width: GENRE_TILE, // 1:1
    height: GENRE_TILE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.panel2,
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
  },
  genreName: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "capitalize",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  primaryGenreText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.lav,
    marginBottom: 4,
  },
});

export default styles;