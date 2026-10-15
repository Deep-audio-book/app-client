import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import {
  useSafeAreaInsets
} from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from '@/axios.config';
import { useFocusRefetch } from "../../hooks/useFocusRefetch";
import { LinearGradient } from 'expo-linear-gradient';


const BASE_WIDTH = 390;
const MAX_CONTENT_WIDTH = 560;
const MINI_PLAYER_HEIGHT = 51;
const MIN_TOUCH_TARGET = 44;

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type Narrator = {
  id: number;
  name: string;
  description: string;
  avatar: string;
  storyCount: number;
};

function NarratorRow({
  narrator,
  artworkSize,
  detailMethod,
  idKey,
}: {
  narrator: Narrator;
  artworkSize: number;
  detailMethod: string;
  idKey: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  // method + id_key passed to author-details come from THIS screen's
  // own params (detailMethod / idKey), which in turn came from whichever
  // screen navigated here — nothing hardcoded.
  const handlePress = () => {
    router.push({
      pathname: '/author-details',
      params: {
        method: detailMethod,
        id_key: idKey,
        id: narrator.id.toString(),
        title: narrator.name,
        color: '#684a6a',
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('narrator.openNarrator', { name: narrator.name })}
    >
      <Image
        source={{ uri: narrator.avatar }}
        style={[
          styles.artwork,
          {
            width: artworkSize,
            height: artworkSize,
          },
        ]}
        resizeMode="cover"
      />

      <View style={styles.info}>
        <Text
          style={styles.title}
          numberOfLines={1}
          maxFontSizeMultiplier={1.6}
        >
          {narrator.name}
        </Text>

        {/* <Text
          style={styles.artist}
          numberOfLines={1}
          maxFontSizeMultiplier={1.6}
        >
          {narrator.description || t('narrator.defaultRole')}
        </Text> */}

        <Text style={styles.year} maxFontSizeMultiplier={1.6}>
          {t('narrator.storyCount', { count: narrator.storyCount })}
        </Text>
      </View>

      <Pressable
        hitSlop={10}
        style={styles.menuButton}
        accessibilityRole="button"
        accessibilityLabel={t('narrator.openMenu', { name: narrator.name })}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color="rgba(255,255,255,0.5)"
        />
      </Pressable>
    </Pressable>
  );
}

// Scrolls away with the list now (rendered as FlatList's ListHeaderComponent) —
// no more absolute positioning / floating card background behind it. Sits
// inside the FlatList's already-padded content container, so no extra
// horizontal padding is applied here.
function Header({ topInset }: { topInset: number }) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <View style={styles.headerContent}>
        <Pressable
          hitSlop={10}
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {t('narrator.headerTitle')}
        </Text>
        {/* <Pressable hitSlop={10} style={styles.headerButton}>
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </Pressable> */}
      </View>
    </View>
  );
}





export default function NarratorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Everything comes from the previous screen now — nothing is hardcoded.
  // Defaults kept so any existing navigation calls without params still work.
  const params = useLocalSearchParams<{
    method?: string;        // API method to fetch THIS list (e.g. getAllNarrators / getAllAuthors)
    dataKey?: string;       // section.type to match in the response (e.g. all-narrators / all-authors)
    detailMethod?: string;  // API method author-details should call (e.g. getNarratorDetails / getAuthorDetails)
    idKey?: string;         // param key author-details expects (e.g. narrator_id / author_id)
  }>();

  const method = params.method || 'getAllNarrators';
  const dataKey = params.dataKey || 'all-narrators';
  const detailMethod = params.detailMethod || 'getNarratorDetails';
  const idKey = params.idKey || 'narrator_id';

  const [narrators, setNarrators] = useState<Narrator[]>([]);

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const sideInset = Math.max(insets.left, insets.right);
  const horizontalPadding = Math.max(Math.round(30 * scale), sideInset);
  const artworkSize = Math.round(clampValue(78 * scale, 64, 90));

  const footerHeight = MINI_PLAYER_HEIGHT + 62 + insets.bottom;

  // Refetches every time this tab/screen comes into focus — not just on
  // first mount — so switching language (or anything else) and coming back
  // here always shows fresh data. `loading` comes from the hook itself, so
  // there's no separate useState for it and no manual try/catch/finally.
  const { loading } = useFocusRefetch(async () => {
    const response = await axios.post('/', {
      method, // dynamic — depends on which screen navigated here
    });

    
    const narratorSection = response?.data?.data?.find(
      (item: any) => item.type === dataKey // dynamic
    );

    const narratorData = narratorSection?.data ?? [];

    setNarrators(narratorData);
    // console.log('Narrators fetched:', narratorData);
  });

  return (
    <View style={styles.container}>
       <View style={styles.bgFill} pointerEvents="none" />

      <LinearGradient
        colors={["rgba(0,0,0,0)", "#000000", "#000000"]}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />
      <FlatList
        data={narrators}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NarratorRow
            narrator={item}
            artworkSize={artworkSize}
            detailMethod={detailMethod}
            idKey={idKey}
          />
        )}
        ListHeaderComponent={<Header topInset={insets.top} />}
        contentContainerStyle={{
          maxWidth: MAX_CONTENT_WIDTH,
          width: contentWidth,
          alignSelf: 'center',
          paddingHorizontal: horizontalPadding,
          paddingBottom: footerHeight,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 40 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {t('narrator.loading')}
              </Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 40 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {t('narrator.empty')}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  header: {
    backgroundColor: 'transparent',
  },

  artwork: {
    borderRadius: 14,
  },

  headerContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 12,
    gap: 12,
  },

  pressed: {
    opacity: 0.6,
  },

  info: {
    flex: 1,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },

  artist: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
    marginTop: 6,
  },

  year: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 16,
    marginTop: 6,
  },

  explicitBadge: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  explicitBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
  },

  menuButton: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  },

  miniPlayerContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniPlayerProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  miniPlayerProgressFill: {
    width: '44%',
    height: 3,
    backgroundColor: '#FFFFFF',
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

  tabBar: {
    backgroundColor: '#000000',
    paddingTop: 12,
  },

  tabBarContent: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
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
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#684a6a",
  },
  bgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});