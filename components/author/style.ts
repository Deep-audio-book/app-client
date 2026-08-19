import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  loading: {
    flex: 1,
    backgroundColor: '#0e0e0e79',
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
  paddingHorizontal: 14,
  paddingBottom: 24,
  zIndex: 10,
},

 
circleButton: {
  width: 48,
  height: 48,
  borderRadius: 24,
  borderWidth: 1.5,
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
  flex: 1,
  textAlign: 'center',
  color: '#FFF',
  fontSize: 24,
  fontWeight: '700',
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
  

  listContent: {
  paddingHorizontal: 14,
  paddingTop: 10,
  paddingBottom: 30,
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




   root: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  row: {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 86,
  paddingVertical: 8,
  paddingHorizontal: 12,
},
  avatar: {
    flexShrink: 0,
  },
  

  rowInfo: {
  flex: 1,
  marginLeft: 14,
  marginRight: 4,
},
  
  artistName: {
  fontSize: 19,
  fontWeight: '600',
  color: '#FFF',
},
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  
  metaText: {
  fontSize: 16,
  color: 'rgba(255,255,255,0.65)',
  marginTop: 4,
},
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.648)',
    flexShrink: 0,
  },
  
  moreButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
},
  miniPlayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 51,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  miniPlayerProgress: {
    height: 3,
    width: '44%',
    backgroundColor: '#FFF',
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 16,
  },
  miniPlayerText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  trackArtist: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.503)',
    marginTop: 2,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#FFF',
  },
 

  // authordetails  screen styles

   centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

    errorText: {
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

    retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#080A14',
  },

    retryLabel: {
    color: '#fff',
    fontWeight: '600',
  },

  coverWrapper: {
    alignItems: 'center',
  },

  cover: {
    width: 164,
    height: 162,
    borderRadius: 16,
    backgroundColor: '#DCDCDC',
  },

    sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.54,
    color: '#faf7f7',
    textTransform: 'capitalize',
    marginTop: 32,
  },
  storiesList: {
    gap: 20,
    marginTop: 20,
  },
  emptyText: {
    color: '#47494E',
    fontSize: 14,
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  storyThumb: {
    width: 71,
    height: 66,
    borderRadius: 10,
    backgroundColor: '#DCDCDC',
  },
  storyInfo: {
    flex: 1,
    gap: 4,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.48,
    color: '#fefefe',
    textTransform: 'capitalize',
  },
  storyAuthor: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.36,
    color: '#f5f5f5',
  },
readMore: {
  color: '#D4AF37',
  fontSize: 14,
  fontWeight: '600',
  marginTop: 8,
}
});



export default styles;