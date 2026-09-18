import { StyleSheet } from "react-native";

/* ---------- palette ---------- */

export const COLORS = {
  bg: "#000000",
  bg2: "#0a0714",
  card: "#1c1c1c",
  cardAlt: "#17131f",
  border: "rgba(255,255,255,0.08)",

  text1: "#ffffff",
  text2: "#b3b3b3",
  text3: "#8a8a8a",

  lav: "#b79bd1",
  lavDim: "#8b7aa0",
  lavSoft: "rgba(167,139,250,0.16)",

  gold: "#e8b84b",
  danger: "#e85c3f",
  success: "#4caf7d",
};

/* ---------- fallback cover gradients ---------- */
/* Used by StoryCard when a story has no cover image. */

export const COVERS: [string, string][] = [
  ["#5b3f9e", "#241b2c"],
  ["#8c1932", "#3a0f18"],
  ["#1e3264", "#0f172e"],
  ["#477d95", "#132a33"],
  ["#7358ff", "#2a1f5c"],
  ["#c9532f", "#3a1a10"],
];

/* Softer / dimmer gradients for the "Perfect Before Bed" row. */

export const BED_COVERS: [string, string][] = [
  ["#2c2340", "#0d0a1a"],
  ["#1f2b45", "#0a0f1e"],
  ["#33263f", "#120d1a"],
  ["#22303a", "#0a1215"],
];

/* ---------- shared styles ---------- */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
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
  centerFill: {
    alignItems: "center",
    justifyContent: "center",
  },
  wrapContent: {
    paddingBottom: 100,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  /* top bar */
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
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

  /* search bar */
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: "#8a8a8a",
  },

  /* generic section */
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionTitleStandalone: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
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

  /* big spotlight category cards — 2x2, image-backed now */
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  categoryCard: {
    width: "48.5%",
    height: 96,
    borderRadius: 10,
    padding: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  categoryCardText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    maxWidth: "90%",
  },

  /* genre grid — icon + label, background falls back to a color since API sends null */
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  genreTile: {
    width: "48.5%",
    height: 64,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  genreTileIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  genreTileIcon: {
    width: 60,
    height: 60,
  },
  genreTileText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
    flexShrink: 1,
  },

  /* narrators */
  narratorRow: {
    gap: 0,
  },
  narratorItem: {
    alignItems: "center",
    gap: 4,
    width: 72,
  },
  narratorAvatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  narratorAvatarImg: {
    width: "100%",
    height: "100%",
  },
  narratorName: {
    fontSize: 11,
    color: "#d0d0d0",
    textAlign: "center",
  },
  narratorCount: {
    fontSize: 10,
    color: "#8a8a8a",
    textAlign: "center",
  },

  /* authors */
  authorRow: {
    gap: 0,
  },
  authorCard: {
    width: 92,
    gap: 2,
  },
  authorCardImg: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  authorCardName: {
    fontSize: 12,
    color: "#d0d0d0",
  },

  /* bottom tab bar */
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222",
    backgroundColor: "#000",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: "#7a7a7a",
  },
  tabLabelActive: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default styles;