import axios from '@/axios.config';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserId } from '../../components/download/currentUser';

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
      if (mounted.current) setHasLastPlayed(false);
      return;
    }

    try {
      const response = await axios.post('/', {
        method: 'getLibraryData',
        user_id: userId,
        language_code: (i18n.language || 'en').split('-')[0],
      });

      const story = response.data?.data?.last_played?.story;

      if (mounted.current) setHasLastPlayed(!!story?.id);
    } catch (error) {
      // Keep the previous value if the request fails.
      console.log('getLibraryData (last played check) failed:', error);
    }
  }, [i18n.language]);

  return { hasLastPlayed, refresh };
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
  onRefresh: () => void;
};

function CustomTabBar({
  state,
  navigation,
  isPlaying = false,
  hasLastPlayed,
  onRefresh,
}: CustomTabBarProps) {
  const { t } = useTranslation();
  const routeNames = state.routes.map((r: any) => r.name);

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
    <SafeAreaView edges={['bottom']} style={styles.tabBar}>
      {SIDE_TABS.map(renderSideTab)}

      {/* Center "Now Playing" button. It stays INSIDE the bar (no negative
          margin), so the mini player above the bar never overlaps it, and
          its label lines up with the other labels. */}
      {showCenter && (
        <View style={styles.centerWrapper}>
          <Pressable
            style={styles.centerButton}
            onPress={() => navigation.navigate('playlist-info')}
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
                  name="pulse"
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
  // TODO: replace with real playback state from your store/context.
  const isPlaying = false;

  const { hasLastPlayed, refresh } = useHasLastPlayed();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          isPlaying={isPlaying}
          hasLastPlayed={hasLastPlayed}
          onRefresh={refresh}
        />
      )}
      screenOptions={{ headerShown: false }}
      // Default is 'firstRoute': back from ANY page jumped to Home.
      // 'history' = back returns to the page the user came from.
      backBehavior="history"
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="now-playing" />
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