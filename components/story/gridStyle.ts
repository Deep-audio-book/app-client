import { StyleSheet } from 'react-native';


export const COLORS = {
  bgDeep: "#171717",       // home.wrapBg — main background
  bgSurface: "#1b2426",    // home.panel — cards, chips
  bgSurface2: "#212b2d",   // home.panel2 — nested surfaces
  bgElevated: "#131a1c",   // konjam dark-a, miniplayer/elevated bg
  line: "rgba(243,239,247,0.08)", // home.hair — hairline borders
  gold: "#e8c34d",         // home.gold — accents, progress bar, play btn
  red: "#e14b3c",          // home.red — badges (NEW, live etc)
  orange: "#e3c948",       // home.yellow — secondary accent
  textHi: "#f3eff7",       // home.text1 — titles
  textMid: "#a9b3b0",      // home.text2 — subtitles
  textLow: "#75807d",      // home.text3 — meta text
};


/* ---------- styles ---------- */

const styles = StyleSheet.create({
  
  screen: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  scrollContent: {
    paddingBottom: 190,
  },

  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2e5263",
  },
  bgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  pageHeader: {
    width: "100%",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
    // backgroundColor: COLORS.bgDeep,
    // paddingTop is applied inline via insets.top so it adapts per device
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitleWrap: {
    flex: 1,
  },
  pageTitle: {
    fontWeight: "800",
    fontSize: 21,
    color: COLORS.textHi,
  },
  pageSub: {
    fontSize: 11.5,
    color: COLORS.textLow,
    marginTop: 2,
    fontWeight: "500",
  },
  gridToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },

  /* chips */
  chipRow: {
    gap: 9,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipOn: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.gold,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMid,
  },
  chipTextOn: {
    color: COLORS.gold,
  },

  /* date group */
  dateGroupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  dateGroupLabel: {
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.textMid,
  },
  dateGroupCount: {
    fontWeight: "600",
    fontSize: 11,
    color: COLORS.textLow,
  },
  dateGroupRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.line,
    marginLeft: 6,
  },

  /* grid + cards */
  grid: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  relCard: {
    width: "47%",
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    overflow: "hidden",
  },
  relCover: {
    width: "100%",
    aspectRatio: 1,
  },
  relNewBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.red,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  relBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  relDayBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  relDayText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  relPlayBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  relBody: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 11,
  },
  relTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textHi,
    lineHeight: 16,
  },
  relAuthor: {
    fontSize: 10.5,
    color: COLORS.textLow,
    marginTop: 3,
  },
  relTag: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  relTagText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
  },

  /* mini player */
  miniplayer: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 78,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(246,196,69,0.25)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 8,
  },
  mpProgressTrack: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: COLORS.line,
    overflow: "hidden",
  },
  mpProgressFill: {
    height: "100%",
    backgroundColor: COLORS.gold,
  },
  mpCover: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  mpInfo: {
    flex: 1,
  },
  mpTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textHi,
  },
  mpSub: {
    fontSize: 10.5,
    color: COLORS.textLow,
    marginTop: 1,
  },
  mpPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  mpExpand: {
    color: COLORS.textLow,
    fontSize: 16,
    marginLeft: 2,
  },

  /* bottom nav */
  bottomnav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: "rgba(19,34,31,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  navitem: {
    alignItems: "center",
    gap: 5,
  },
  navitemText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textLow,
  },
});

export default styles;
