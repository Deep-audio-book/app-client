import { StyleSheet } from 'react-native';
const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  wrapContent: {
    paddingBottom: 100,
  },

  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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

  /* top bar — identical to SearchScreen.topbar */
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

  /* generic section — identical spacing to SearchScreen.section */
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  /* hero card */
  heroCard: {
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    padding: 16,
    justifyContent: "flex-end",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a1b0c",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#712b13",
    marginTop: 3,
  },
  heroPlayButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  /* menu list */
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  menuCount: {
    fontSize: 12,
    color: "#8a8a8a",
    marginRight: 2,
  },

  /* bottom tab bar — identical to SearchScreen.tabBar */
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
