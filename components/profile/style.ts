import {
    StyleSheet
} from 'react-native';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 480;
const MINI_PLAYER_HEIGHT = 51;
const TAB_BAR_CONTENT_HEIGHT = 62;
const MIN_TOUCH_TARGET = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  glow: {
    position: 'absolute',
    top: -180,
    alignSelf: 'center',
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: '#D6875D',
    opacity: 0.4,
  },

  headerSafeArea: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
  },

  closeButton: {
    position: 'absolute',
    right: 12,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {},

  avatar: {
    backgroundColor: '#FECBA8',
    alignSelf: 'center',
    marginTop: 24,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },

  email: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },

  subscriptionCard: {
    minHeight: 82,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },

  subscriptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  subscriptionSubtitle: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    marginTop: 4,
  },

  button: {
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  pressed: {
    opacity: 0.7,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  miniPlayer: {
    height: 51,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  miniPlayerExpand: {
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  miniPlayerArtist: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 11,
    marginTop: 2,
  },

  miniPlayerPause: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniPlayerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  miniPlayerProgressFill: {
    width: '44%',
    height: 3,
    backgroundColor: '#FFFFFF',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingTop: 12,
  },

  tabItem: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  tabLabel: {
    color: '#8A8A8A',
    fontSize: 11,
  },
});

export default styles;