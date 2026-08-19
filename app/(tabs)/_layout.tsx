import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function CustomTabBar({ state, navigation }: any) {
  const routeNames = state.routes.map((r: any) => r.name);

  const TAB_CONFIG = [
    { name: 'home', label: 'Home', icon: 'home-outline', size: 22 },
    { name: 'album', label: 'Search', icon: 'search', size: 20 },
    { name: 'favorites', label: 'Favorites', icon: 'bookmark', size: 18 },
    { name: 'albums', label: 'Library', icon: 'library', size: 22 },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBar}>
      {TAB_CONFIG.map((tab) => {
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
              color={isFocused ? '#FFFFFF' : '#8A8A8A'}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : '#8A8A8A' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="album" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="albums" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#222',
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
});