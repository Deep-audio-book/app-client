import { StyleSheet } from 'react-native';

export const BASE_WIDTH = 390;
export const MAX_CONTENT_WIDTH = 480;
export const MINI_PLAYER_HEIGHT = 51;
export const TAB_BAR_CONTENT_HEIGHT = 62;
export const MIN_TOUCH_TARGET = 44;

// Same family the rest of the app uses (AlbumScreen's COLORS, the gold
// tab-bar accent) so Profile doesn't feel like a different app.
export const COLORS = {
  bgDeep: '#0B0908',
  glowTop: 'rgba(214,135,93,0.35)',
  gold: '#D9A441',
  maroon: '#8A5A3A',
  cream: '#F0E6D2',
  textMuted: 'rgba(240,230,210,0.62)',
  textFaint: 'rgba(240,230,210,0.32)',
  hairline: 'rgba(240,230,210,0.09)',
  danger: '#C97B6A',
  panel: 'rgba(240,230,210,0.045)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },

  glow: {
    position: 'absolute',
    top: -200,
    left: -80,
    right: -80,
    height: 380,
  },

  headerSafeArea: {
    backgroundColor: 'transparent',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '600',
  },

  closeButton: {
    position: 'absolute',
    right: 12,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  /* ---- hero ---- */

  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },

  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.35)',
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitials: {
    color: COLORS.bgDeep,
    fontWeight: '700',
  },

  name: {
    color: COLORS.cream,
    fontFamily: 'Fraunces-Medium',
    fontSize: 22,
    marginTop: 16,
  },

  email: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3,
  },

  /* ---- section groups ---- */

  sectionLabel: {
    color: COLORS.textFaint,
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },

  group: {
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    overflow: 'hidden',
  },

  signOutGroup: {
    marginTop: 28,
    marginBottom: 12,
  },

  /* ---- flat list row ---- */

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 14,
    gap: 12,
  },

  rowPressed: {
    backgroundColor: 'rgba(240,230,210,0.06)',
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
    marginLeft: 14 + 18 + 12, // aligns under the label, past the icon
  },

  rowIconWrap: {
    width: 18,
    alignItems: 'center',
  },

  rowLabel: {
    flex: 1,
    fontSize: 15,
  },

  rowValue: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginRight: 2,
  },
});

export default styles;
