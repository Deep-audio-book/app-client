
import {
  StyleSheet
} from 'react-native';

export const BASE_WIDTH = 393;
export const MAX_CONTENT_WIDTH = 480;
const MIN_TOUCH_TARGET = 44;
export const BANNER_HEIGHT = 800;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },

  scrollContent: {
    flexGrow: 1,
  },

  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },

  photo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A4D47',
  },

  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },

  iconButton: {
    width: 42,
    height: 42,
    minWidth: MIN_TOUCH_TARGET - 2,
    minHeight: MIN_TOUCH_TARGET - 2,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoriesScroll: {
    marginTop: 20,
    flexGrow: 0,
  },

  categoriesContent: {
    flexDirection: 'row',
    gap: 8,
  },

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  categoryChipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.48,
  },

  highlightsCard: {
  marginTop: 20,
  height: 112,
  borderRadius: 20,
  backgroundColor: 'rgba(255,255,255,0.08)',
  paddingHorizontal: 20,
  paddingTop: 22,
  overflow: 'visible', 
},

  highlightsTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.66,
    width: 103,
  },

  highlightsStack: {
    position: 'absolute',
    right: 20,
    top: 2,
    width: 201,
    height: 108,
  },

  viewAllButton: {
    minHeight: 32,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255,255,255,0.26)',
    justifyContent: 'center',
  },
  highlightsThumb: {
    position: 'absolute',
    top: 0,
    width: 108,
    height: 108,
    borderRadius: 10.5,
  },

  section: {
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  viewAll: {
    color: '#8A8A8A',
    fontSize: 12,
    letterSpacing: 0.36,
  },

  trendingRow: {
    flexDirection: 'row',
    gap: 10,
  },

  trendingCard: {
    width: 200,
    gap: 4,
  },

  trendingArtwork: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  downloadBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.48,
    marginTop: 10,
    textTransform: 'capitalize',
  },

  trendingAuthor: {
    color: '#8A8A8A',
    fontSize: 12,
    letterSpacing: 0.36,
  },

  authorsRow: {
    flexDirection: 'row',
    gap: 14,
  },

  authorAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#2A2A2A',
  },

  recommendationCard: {
    height: 152,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#000000',
    paddingTop: 16,
  },

  tabItem: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.7,
  },

    tabLabel: {
    color: '#8A8A8A',
    fontSize: 11,
  },

  ReleaseCard: {
    width: 134,
    gap: 4,
  },
  ReleaseArtwork: {
    width: 134,
    height: 162,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  genreRow: {
     flexDirection: 'row',
      gap: 12,
    },



socialRow: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
},

socialIconButton: {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: 'center',
  justifyContent: 'center',
  // backgroundColor ivlo வேணாம் - inline ah brand color varum ConnectWithUsSection la irunthu
},

//featured books box style 
previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ---- Featured Books additions ----
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingVertical: 18,
  },
  highlightTitle: {
    flexWrap: 'wrap',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  highlightTile: {
    position: 'absolute',
    top: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  highlightTileShadow: {
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gallerySlide: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
  galleryHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 10,
  },
//genre styles
  genreAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingTop: 12,
  },

  genreIconBox: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  genreName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // background-ku etha color use pannunga
    textAlign: 'center',
    textTransform: 'capitalize',
  },

});

export default styles;