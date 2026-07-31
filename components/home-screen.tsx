import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 480;
const MINI_PLAYER_HEIGHT = 51;
const TAB_BAR_CONTENT_HEIGHT = 62;
const MIN_TOUCH_TARGET = 44;

// const RELEASES = [
//   { id: 'urgent-siege-1', title: 'Urgent Siege', artist: 'Damned Anthem', color: '#FEB935' },
//   { id: 'urgent-siege-2', title: 'Urgent Siege', artist: 'Damned Anthem', color: '#56D384' },
// ];
const RELEASES = [
  {
    id: 1,
    title: "Ezhavathu Jenmam",
    artist: "Indra Soundarrajan",
    // image: require("../assets/images/home-img.jpeg"),
     image: require("../assets/images/home/1.jpeg"),
  },
  {
    id: 2,
    title: "Aaram Sakthi",
    artist: "Indra Soundarrajan",
    image: require("../assets/images/home/2.jpg"),
    color: '#56D384' 
  },
  {
    id: 3,
    title: "Aindhaam Sakthi",
    artist: "Indra Soundarrajan",
    image: require("../assets/images/home/3.jpg"),
  },
  {
    id: 4,
    title: "Kaatrai Maarividu - Naankaam Sakthi",
    artist: "Indra Soundarrajan",
    image: require("../assets/images/home/4.jpg"),
  },
];
function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = clampValue(Math.min(width, MAX_CONTENT_WIDTH) / BASE_WIDTH, 0.85, 1.2);
  const titleSize = Math.round(28 * scale);
  const bannerHeight = clampValue(height * 0.64, 420, 620);
  const footerHeight = MINI_PLAYER_HEIGHT + TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerHeight }]}
      >
        <View style={[styles.banner, { height: bannerHeight }]}>
          <View style={styles.photo} />

          <LinearGradient
            colors={['rgba(0,0,0,0)', '#000000', '#000000']}
            locations={[0.026, 0.6377, 1]}
            style={styles.shadow}
          />

          <Pressable
            style={[styles.avatarWrapper, { top: insets.top + 12 }]}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <View style={styles.avatar} />
          </Pressable>

          <View
            style={[
              styles.bannerContent,
              { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: Math.round(30 * scale) },
            ]}
          >
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.21 }]}>
              Listen to music{'\n'}without restrictions
            </Text>

            <Pressable
              onPress={() => router.push('/top-playlists')}
              style={({ pressed }) => [styles.trialButton, pressed && styles.pressed]}
            >
              <Text style={styles.trialButtonText}>Trial version</Text>
            </Pressable>

            <Text style={styles.priceText}>Free for 3 months, then $12 a month</Text>
          </View>
        </View>

        <View
          style={[
            styles.releasesSection,
            { maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: Math.round(28 * scale) },
          ]}
        >
          <View style={styles.releasesHeader}>
            <Text style={[styles.releasesTitle, { fontSize: Math.round(26 * scale) }]}>
              New releases
            </Text>
            <Pressable
              onPress={() => router.push('/top-playlists')}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.releasesRow}>
            {RELEASES.map((release) => (
              <View key={release.id} style={styles.releaseCard}>
                <View style={styles.releaseArtwork}>
                  {/* <Pressable onPress={() => router.push("/playlist-detail")}>
                    <Image
                      source={release.image}
                      style={styles.releaseImage}
                      resizeMode="cover"
                    />
                  </Pressable> */}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/playlist-detail",
                        params: {
                          id: release.id,
                        },
                      })
                    }
                  >
                    <Image
                      source={release.image}
                      style={styles.releaseImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color="#FFFFFF"
                    style={styles.releaseArtworkIcon}
                  />
                </View>

                <Text style={styles.releaseTitle}>
                  {release.title}
                </Text>

                <Text style={styles.releaseArtist}>
                  {release.artist}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* <View style={styles.miniPlayer}>
          <Pressable hitSlop={10} style={styles.miniPlayerExpand}>
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle}>Urgent Siege</Text>
            <Text style={styles.miniPlayerArtist}>Damned Anthem</Text>
          </View>

          <Pressable hitSlop={10} style={styles.miniPlayerPause}>
            <Ionicons name="pause" size={16} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={styles.miniPlayerProgressTrack}>
            <View style={styles.miniPlayerProgressFill} />
          </View>
        </View> */}

        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          <Pressable style={styles.tabItem} >
            <Ionicons name="home" size={22} color="#FFFFFF" />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
          </Pressable>

          <Pressable style={styles.tabItem} onPress={() => router.push('/top-playlists')}>
            <Ionicons name="stats-chart" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Top</Text>
          </Pressable>
          <Pressable
            style={styles.tabItem}
            onPress={() => router.push('/favorites')}
          >
            <Ionicons name="bookmark" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Favorites</Text>
          </Pressable>

          <Pressable style={styles.tabItem}>
            <Ionicons name="search" size={20} color="#8A8A8A" />
            <Text style={styles.tabLabel}>Search</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  scrollContent: {
    flexGrow: 1,
  },

  banner: {
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
    height: '49%',
  },

  avatarWrapper: {
    position: 'absolute',
    right: 20,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEBC86',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },

  bannerContent: {
    position: 'absolute',
    bottom: 24,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },

  trialButton: {
    width: '100%',
    maxWidth: 236,
    minHeight: MIN_TOUCH_TARGET,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  trialButtonText: {
    color: '#000000',
    fontSize: 18,
  },

  priceText: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
  },

  releasesSection: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24,
  },

  releasesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  releasesTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  viewAllButton: {
    minHeight: 32,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255,255,255,0.26)',
    justifyContent: 'center',
  },

  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  releasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  releaseCard: {
    flexGrow: 1,
    flexBasis: 140,
    maxWidth: '48%',
  },

  releaseArtwork: {
  width: "100%",
  height: 180, // unga design-ku set pannunga
  borderRadius: 12,
  overflow: "hidden",
  position: "relative",
},
releaseImage: {
  width: "100%",
  height: "100%",
},
  releaseArtworkIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.5,
  },

  releaseTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },

  releaseArtist: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
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

  tabLabelActive: {
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.7,
  },
});
