import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  scroll: {
    flex: 1,
    backgroundColor: '#000',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  // Gradient background is rendered in the component
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 18,
    zIndex: 10,
  },

  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  circleButtonPlaceholder: {
    width: 42,
    height: 42,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  page: {
    paddingHorizontal: 24,
  },

  titleBlock: {
    marginTop: 24,
    marginBottom: 20,
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.7,
    textTransform: 'uppercase',
  },

  author: {
    fontSize: 12,
    color: '#A8A8A8',
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },

  genreTile: {
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },

  genreIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  genreName: {
    color: '#060606',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default styles;