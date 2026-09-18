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
  textLow: "#75807d",   
  greenUp: "#4FCB8D",
  

};


const styles = StyleSheet.create({
  screen: {
      flex: 1,
    //   backgroundColor: COLORS.bgDeep,
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
  /* header */
  pageHeader: {
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
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },

  /* segmented control */
  segmented: {
    flexDirection: "row",
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  segItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  segItemOn: {
    backgroundColor: COLORS.gold,
  },
  segItemText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textLow,
  },
  segItemTextOn: {
    color: "#241D06",
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

  /* result count */
  resultCount: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 12,
    color: COLORS.textLow,
    fontWeight: "600",
  },

  /* list + rows */
  list: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTop3: {
    borderColor: "rgba(246,196,69,0.4)",
    backgroundColor: "rgba(246,196,69,0.06)",
  },

  rankCol: {
    width: 24,
    alignItems: "center",
  },
  rankNum: {
    fontWeight: "800",
    fontSize: 17,
    color: COLORS.textLow,
  },
  rankNumTop3: {
    color: COLORS.gold,
    fontSize: 19,
  },
  trendText: {
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 2,
  },
  trendUp: {
    color: COLORS.greenUp,
  },
  trendDown: {
    color: COLORS.red,
  },
  trendSame: {
    color: COLORS.textLow,
  },

  rowCover: {
    width: 56,
    height: 56,
    borderRadius: 11,
    overflow: "hidden",
  },

  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textHi,
  },
  rowAuthor: {
    fontSize: 11,
    color: COLORS.textLow,
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  rowTag: {
    backgroundColor: COLORS.bgSurface2,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
  },
  rowPlays: {
    fontSize: 10.5,
    color: COLORS.gold,
    fontWeight: "700",
  },

  rowPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
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

