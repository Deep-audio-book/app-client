import { StyleSheet } from 'react-native';

export const BASE_WIDTH = 390;
export const MAX_CONTENT_WIDTH = 560;
export const MINI_PLAYER_HEIGHT = 51;
const MIN_TOUCH_TARGET = 44;

// ---------------------------------------------------------
// Theme palette (Agal Vilakku — dark gold / maroon)
// ---------------------------------------------------------
export const COLORS = {
  bg: '#14100C',
  bg2: "rgba(200,155,76,0.3)",
  bgDeep: '#0B0906',
  border: '#050403',

  gold: '#C89B4C',
  goldLight: '#E3B768',
  goldPale: '#F6D68C',
  goldBorder: 'rgba(200,155,76,0.3)',
  goldBorderFaint: 'rgba(200,155,76,0.12)',
  goldWash: 'rgba(124,36,49,0.28)', // used for heroGlow

  cream: '#F0E6D2',
  creamSoft: '#EFE6D4',

  textMuted: '#C9BCA6',
  textMutedDeep: '#A6927A',
  textFaint: '#7A6C58',
  textFainter: '#6F634F',

  maroon: '#7C2431',
  maroonLight: '#953447',

  panel: '#1D1610',
};

// NOTE: register these with expo-font / useFonts somewhere high up in
// the app (Fraunces-Medium, Fraunces-MediumItalic, DMSans-Regular,
// DMSans-Medium). If they aren't loaded yet, these just fall back to
// the platform default font — nothing breaks.
const FONT_SERIF = 'Fraunces-Medium';
const FONT_SERIF_ITALIC = 'Fraunces-MediumItalic';
const FONT_SANS = 'DMSans-Regular';
const FONT_SANS_MEDIUM = 'DMSans-Medium';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  bgFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: COLORS.bg2,
    },
    bgOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
  hero: {
    overflow: 'hidden',
  },

  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.goldWash,
  },

  heroShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },

  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },

  heroBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },

  cover: {
    width: 136,
    height: 136,
    borderRadius: 14,
    backgroundColor: COLORS.maroon,
    marginBottom: 18,
  },

  heroTitle: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '500',
    fontFamily: FONT_SERIF_ITALIC,
  },

  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },

  heroMetaText: {
    color: COLORS.gold,
    fontSize: 16,
    fontFamily: FONT_SANS_MEDIUM,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textFainter,
  },

  heroDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    letterSpacing: 0.15,
    fontWeight: '400',
    fontFamily: FONT_SANS,
    textAlign: 'center',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginTop: 24,
  },

  circleButtonSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(240,230,210,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(240,230,210,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButton: {
    width: 69,
    height: 69,
    borderRadius: 34.5,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },

  playIcon: {
    marginLeft: 3,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 10,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.goldBorderFaint,
  },

  pressed: {
    opacity: 0.6,
  },

  trackNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(200,155,76,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trackNumberText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONT_SERIF,
  },

  trackInfo: {
    flex: 1,
  },

  trackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  trackTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: FONT_SANS_MEDIUM,
    flexShrink: 1,
  },

  explicitBadge: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(200,155,76,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  explicitBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
  },

  trackArtist: {
    color: COLORS.textFaint,
    fontSize: 14,
    marginTop: 2,
    fontFamily: FONT_SANS,
  },

  nowLabel: {
    color: COLORS.textFaint,
    fontSize: 12,
  },

  trackMenuButton: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Credits section
  creditsSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.goldBorderFaint,
  },

  creditsHeading: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_SERIF,
    marginBottom: 12,
  },

  creditsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.goldBorderFaint,
  },

  creditsLabel: {
    color: COLORS.textFaint,
    fontSize: 13,
    fontFamily: FONT_SANS,
  },

  creditsValue: {
    color: COLORS.creamSoft,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONT_SANS_MEDIUM,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  miniPlayer: {
    height: 51,
    backgroundColor: 'rgba(11,9,6,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  miniPlayerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: 'rgba(200,155,76,0.2)',
  },

  miniPlayerProgressFill: {
    width: '44%',
    height: 3,
    backgroundColor: COLORS.gold,
  },

  miniPlayerChevron: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniPlayerInfo: {
    flex: 1,
    alignItems: 'center',
  },

  miniPlayerTitle: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: FONT_SANS_MEDIUM,
  },

  miniPlayerArtist: {
    color: COLORS.textFaint,
    fontSize: 11,
    marginTop: 2,
    fontFamily: FONT_SANS,
  },

  miniPlayerPause: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;
