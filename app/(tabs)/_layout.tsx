import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Pass this in from your playback store (Zustand/Context/etc.)
// so the center button glows gold whenever audio is active,
// not only when that tab is focused.
type CustomTabBarProps = {
  state: any;
  navigation: any;
  isPlaying?: boolean;
};

const GOLD = '#F5B93C';
const INACTIVE = '#8A8A8A';

function CustomTabBar({ state, navigation, isPlaying = false }: CustomTabBarProps) {
  const { t } = useTranslation();
  const routeNames = state.routes.map((r: any) => r.name);

  const SIDE_TABS = [
    { name: 'home', label: t('tabs.home'), icon: 'home-outline', size: 22 },
    { name: 'search', label: t('tabs.search'), icon: 'search', size: 20 },
  ];
  const SIDE_TABS_RIGHT = [
    { name: 'favorites', label: t('tabs.favorites'), icon: 'heart-outline', size: 20 },
    { name: 'library', label: t('tabs.library'), icon: 'library-outline', size: 22 },
  ];

  const nowPlayingIndex = routeNames.indexOf('now-playing');
  const nowPlayingFocused = state.index === nowPlayingIndex;
  const centerActive = nowPlayingFocused || isPlaying;

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
          size={tab.size}
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

      {/* Center "Now Playing" button, raised above the bar */}
      <View style={styles.centerWrapper}>
        <Pressable
          style={styles.centerButton}
          onPress={() => navigation.navigate('playlist-info')}
        >
          <View
            style={[
              styles.centerCircle,
              centerActive && styles.centerCircleActive,
            ]}
          >
            <Ionicons
              name="pulse"
              size={22}
              color={centerActive ? GOLD : INACTIVE}
            />
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

      {SIDE_TABS_RIGHT.map(renderSideTab)}
    </SafeAreaView>
  );
}

export default function TabLayout() {
  // Swap this for real playback state, e.g. from a store/context
  const isPlaying = true;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} isPlaying={isPlaying} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="now-playing" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}

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
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22, // pops the circle above the bar
  },
  centerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: INACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircleActive: {
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, // Android glow approximation
  },
  centerLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});