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
  lav: "#b79bd1",
  lavDim: "#8b7aa0",
  lavSoft: "rgba(183,155,209,0.16)",
  yellow: "#e3c948",
  red: "#e14b3c",
  text1: "#f3eff7",
  text2: "#a9b3b0",
  text3: "#75807d",
  gold: "#e8c34d",
  hair: "rgba(243,239,247,0.08)",
};


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
    backgroundColor: COLORS.lav,
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
    paddingVertical: 32,  
  },
  screen: {
    width: "100%",
    // paddingTop removed: the top bar now gets its top spacing from
    // insets.top (applied inline in the component), so a fixed value
    // here would stack on top of it and push content down on devices
    // with a notch / Dynamic Island.
    paddingBottom: 24,
    paddingHorizontal: 0,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    // paddingTop removed here too: it's supplied inline as
    // insets.top + 8 in the component so it adapts per device.
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lav,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDotText: {
    fontWeight: "600",
    fontSize: 13,
    color: "#241b2c",
  },

  hero: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  
  greet: {
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 25,
    color: COLORS.text1,
    marginBottom: 3,
  },
  greetSub: {
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 16,
  },

  primaryCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.hair,
  },
  primaryCover: {
    width: 92,
    height: 118,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  ribbon: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: COLORS.red,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ribbonCard: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: COLORS.red,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: "600",
  },
  primaryInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 10,
    color: COLORS.lav,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  primaryTitle: {
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.text1,
    marginBottom: 6,
  },
  primaryNarrator: {
    fontSize: 11.5,
    color: COLORS.text3,
    marginBottom: 10,
  },
  resumeBtn: {
    backgroundColor: COLORS.lav,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  resumeBtnText: {
    color: "#241b2c",
    fontWeight: "700",
    fontSize: 12.5,
  },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: COLORS.lavSoft,
    borderWidth: 1,
    borderColor: COLORS.hair,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.text2,
  },

  waveRule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 18,
    opacity: 0.35,
  },
  waveBar: {
    width: 3,
    backgroundColor: COLORS.lavDim,
    borderRadius: 2,
  },

  rowSec: {
    paddingTop: 18,
    paddingBottom: 2,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 10,
  },
  rowTitle: {
    fontWeight: "600",
    fontSize: 14.5,
    color: COLORS.text1,
    opacity: 0.92,
  },
  viewAll: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.lav,
    backgroundColor: COLORS.lavSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 14,
    overflow: "hidden",
  },
  rowScroll: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },

  card: {
    width: 126,
  },
  cardCover: {
    width: 126,
    height: 158,
    borderRadius: 10,
    marginBottom: 7,
    position: "relative",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text1,
    lineHeight: 15,
    marginBottom: 2,
  },
  cardNarrator: {
    fontSize: 10.5,
    color: COLORS.text3,
    marginBottom: 4,
  },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardFootText: {
    fontSize: 9.5,
    color: COLORS.text3,
  },
  cardGenre: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.lav,
    backgroundColor: COLORS.lavSoft,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    overflow: "hidden",
  },

  bedSection: {
    marginTop: 24,
    marginHorizontal: 18,
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    paddingVertical: 12,      // 👈 padding: 12 -> paddingVertical: 12
    borderWidth: 1,
    borderColor: COLORS.hair,
    overflow: "hidden",
  },
  bedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 18,
  },
  bedRowScroll: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  bedIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.lavSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bedHeaderText: {
    flex: 1,
  },
  bedTitle: {
    fontWeight: "700",
    fontSize: 17,
    color: COLORS.text1,
    marginBottom: 3,
  },
  bedSubtitle: {
    fontSize: 12.5,
    color: COLORS.text2,
  },

  bedCard: {
    width: 150,
  },
  bedCover: {
    width: 150,
    height: 180,
    borderRadius: 16,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bedCoverTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#221a35",
    textAlign: "center",
    lineHeight: 20,
  },
  bedDurationBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(20,16,35,0.55)",
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
    marginBottom: 4,
  },

  tertiary: {
    width: "100%",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 4,
    opacity: 0.85,
  },
  tertiaryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tertiaryTitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.text2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  authorRow: {
    flexDirection: "row",
    gap: 12,
  },
  authorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.hair,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  authorAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  authorChipText: {
    fontSize: 14,
    color: COLORS.text2,
  },

  footer: {
    width: "100%",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 26,
    marginTop: 14,
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
    gap: 8,
  },
  social: {
    width: 24,
    height: 24,
    borderRadius: 12,
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

  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 14.5,
    color: COLORS.text1,
    opacity: 0.92,
  },
  genreRow: {
    flexDirection: "row",
    gap: 12,
  },
  genreAvatar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingTop: 12,
  },
  genreIconBox: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "",
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  genreName: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "capitalize",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  
});

export default styles;
