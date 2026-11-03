import axios from '@/axios.config';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserId } from '../../components/download/currentUser';
import { useTabBarStore } from '../../components/ui/tabBarStore';
import { TRANSITION } from '../../components/ui/transitions';
import { useResumeLastPlayed } from '../../hooks/useResumeLastPlayed';
import { usePlayer } from '../../providers/PlayerProvider';
import { RootState } from '../../redux/store';

const GOLD = '#F5B93C';
const INACTIVE = '#8A8A8A';

/* ---------- sizes: every tab icon is the same size so the bar looks balanced ---------- */
const ICON_SIZE = 24;
const CENTER_SIZE = 38; // gold circle
const CENTER_ICON_SIZE = 22;

/*
 * Checks getLibraryData and tells us whether the user has a last_played
 * story. The Now Playing button is only shown when this is true.
 *
 * Payload:
 *   { method: "getLibraryData", user_id, language_code }
 *
 * "Has last played" = data.last_played.story exists (and has an id).
 */
function useHasLastPlayed() {
  const { i18n } = useTranslation();
  const [hasLastPlayed, setHasLastPlayed] = useState(false);
  const [lastStoryId, setLastStoryId] = useState<string | null>(null);
  const [lastChapterNumber, setLastChapterNumber] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      if (mounted.current) {
        setHasLastPlayed(false);
        setLastStoryId(null);
        setLastChapterNumber(null);
      }
      return;
    }

    try {
      const response = await axios.post('/', {
        method: 'getLibraryData',
        user_id: userId,
        language_code: (i18n.language || 'en').split('-')[0],
      });

      const story = response.data?.data?.last_played?.story;

      if (mounted.current) {
        setHasLastPlayed(!!story?.id);
        setLastStoryId(story?.id ? String(story.id) : null);
        setLastChapterNumber(
          story?.current_chapter_number != null
            ? Number(story.current_chapter_number)
            : null
        );
      }
    } catch (error) {
      // Keep the previous value if the request fails.
      console.log('getLibraryData (last played check) failed:', error);
    }
  }, [i18n.language]);

  return { hasLastPlayed, lastStoryId, lastChapterNumber, refresh };
}

/* Soft gold ring that pulses outward behind the Now Playing circle. */
function PulseRing({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [active, anim]);

  if (!active) return null;

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulseRing, { opacity, transform: [{ scale }] }]}
    />
  );
}

type CustomTabBarProps = {
  state: any;
  navigation: any;
  // Live playback state from your store (optional). The button also shows
  // right after the first play, before getLibraryData has last_played.
  isPlaying?: boolean;
  hasLastPlayed: boolean;
  lastStoryId?: string | null;
  lastChapterNumber?: number | null;
  onRefresh: () => void;
};

function CustomTabBar({
  state,
  navigation,
  isPlaying = false,
  hasLastPlayed,
  lastStoryId,
  lastChapterNumber,
  onRefresh,
}: CustomTabBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { openPlayerScreen } = usePlayer();
  const { resume } = useResumeLastPlayed();
  const setTabBarHeight = useTabBarStore((st) => st.setHeight);
  const routeNames = state.routes.map((r: any) => r.name);

  // Now Playing: open the real player when something is loaded; otherwise
  // open the last played story so the person can resume it.
  const playerActive = useSelector((st: RootState) => st.player.isActive);

  const handleNowPlaying = () => {
    if (playerActive) {
      openPlayerScreen();
      return;
    }

    // nothing loaded yet: open the last played book at the episode and the
    // second where the person stopped, straight in the player.
    if (lastStoryId) {
      resume(lastStoryId, lastChapterNumber);
    }
  };

  // Re-check last_played on mount and every time the user switches tab,
  // so the button appears after they play something.
  useEffect(() => {
    onRefresh();
  }, [state.index, isPlaying, onRefresh]);

  const SIDE_TABS = [
    { name: 'home', label: t('tabs.home'), icon: 'home-outline' },
    { name: 'search', label: t('tabs.search'), icon: 'search-outline' },
  ];
  const SIDE_TABS_RIGHT = [
    { name: 'favorites', label: t('tabs.favorites'), icon: 'heart-outline' },
    { name: 'library', label: t('tabs.library'), icon: 'library-outline' },
  ];

  // Only show the center button when there is something to resume.
  const showCenter = hasLastPlayed || isPlaying;

  // Whenever the button is visible there is an active/last session, so it
  // always carries the gold glow.
  const centerActive = showCenter;

  const renderSideTab = (tab: (typeof SIDE_TABS)[number]) => {
    const routeIndex = routeNames.indexOf(tab.name);
    const isFocused = state.index === routeIndex;
    return (
      <Pressable
        key={tab.name}
        style={styles.tabItem}
        onPress={() => navigation.navigate(tab.name)}
      >
        <Ionicons
          name={tab.icon as any}
          size={ICON_SIZE}
          color={isFocused ? '#FFFFFF' : INACTIVE}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : INACTIVE }]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.tabBar}
      onLayout={(e) => setTabBarHeight(e.nativeEvent.layout.height)}
    >
      {SIDE_TABS.map(renderSideTab)}

      {/* Center "Now Playing" button. It stays INSIDE the bar (no negative
          margin), so the mini player above the bar never overlaps it, and
          its label lines up with the other labels. */}
      {showCenter && (
        <View style={styles.centerWrapper}>
          <Pressable
            style={styles.centerButton}
            onPress={handleNowPlaying}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.nowPlaying')}
          >
            <View style={styles.centerBox}>
              <PulseRing active={centerActive} />
              <View
                style={[
                  styles.centerCircle,
                  centerActive && styles.centerCircleActive,
                ]}
              >
                <Ionicons
                  name={centerActive ? 'headset' : 'headset-outline'}
                  size={CENTER_ICON_SIZE}
                  color={centerActive ? GOLD : INACTIVE}
                />
              </View>
            </View>
            <Text
              style={[
                styles.centerLabel,
                { color: centerActive ? GOLD : INACTIVE },
              ]}
            >
              {t('tabs.nowPlaying')}
            </Text>
          </Pressable>
        </View>
      )}

      {SIDE_TABS_RIGHT.map(renderSideTab)}
    </SafeAreaView>
  );
}

export default function TabLayout() {
  // Real playback state from redux (was a hardcoded `false`).
  const isPlaying = useSelector((st: RootState) => st.player.isPlaying);

  const { hasLastPlayed, lastStoryId, lastChapterNumber, refresh } =
    useHasLastPlayed();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          isPlaying={isPlaying}
          hasLastPlayed={hasLastPlayed}
          lastStoryId={lastStoryId}
          lastChapterNumber={lastChapterNumber}
          onRefresh={refresh}
        />
      )}
      screenOptions={{
        headerShown: false,
        // Subtle cross-fade when moving between tabs
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: TRANSITION.tab, easing: TRANSITION.easing },
        },
      }}
      // Default is 'firstRoute': back from ANY page jumped to Home.
      // 'history' = back returns to the page the user came from.
      backBehavior="history"
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}

/*
 * Vertical layout (top of bar = 0):
 *   bar paddingTop 6
 *   side icons : start at 6 + 14 = 20, 24px tall, label right below
 *   center     : circle 38px starts at 6, ends at 44, label at 46
 * -> both labels start at y = 46, so everything lines up and nothing
 *    sticks out above the bar.
 */
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#222',
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 6,
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerBox: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: INACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircleActive: {
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, // Android glow approximation
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  centerLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
});