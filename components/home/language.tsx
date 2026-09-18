import axios from '@/axios.config';
import { changeAppLanguage } from '@/constants/locales';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS } from './style';

/* ---------- types ---------- */

interface LanguageOption {
  code: string; // must match a key in constants/locales resources
  name: string; // English display name
  native: string; // Name written in its own script
}

/** Shape of one row from `getAppLanguages`. */
interface ApiLanguage {
  language_id: number;
  language_name_english: string;
  native_language: string | null;
  language_code: string;
  language_app: string | null;
  icon_source: string | null;
  status: number;
  type: string | null;
  created_date: string;
  updated_date: string;
}

/* ---------- icons ---------- */

const BackIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 19l-7-7 7-7" />
  </Svg>
);

const SearchIcon = ({ size = 15, color = COLORS.text1 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Circle cx={11} cy={11} r={7} />
    <Path d="M21 21l-4.3-4.3" />
  </Svg>
);

const CheckCircleIcon = ({ size = 20, color = COLORS.text1 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} fill={color} />
    <Path d="M7.5 12.5l3 3 6-6.5" stroke="#1a1420" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const RingIcon = ({ size = 20, color = 'rgba(255,255,255,0.28)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <Circle cx={12} cy={12} r={9.2} />
  </Svg>
);

/* ---------- screen ---------- */

const LanguageScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const [query, setQuery] = useState('');
  // Pre-select whichever language is currently active (restored from
  // AsyncStorage at startup), rather than hardcoding "en".
  // i18n.language can be a region code like "en-IN", so take the base.
  const [selected, setSelected] = useState(() => i18n.language?.split('-')[0] ?? 'en');
  const [saving, setSaving] = useState(false);

  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchLanguages = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const res = await axios.post('/', { method: 'getAppLanguages' });
      const rows: ApiLanguage[] = res.data?.data ?? [];

      const mapped: LanguageOption[] = rows
        .filter((r) => r.status === 1 && !!r.language_code)
        .map((r) => ({
          code: r.language_code.trim().toLowerCase(),
          name: r.language_name_english,
          // native_language is nullable server-side; fall back to English name.
          native: r.native_language?.trim() || r.language_name_english,
        }));

      setLanguages(mapped);
      // Empty response is treated the same as a failure: nothing to select.
      if (!mapped.length) setLoadFailed(true);
    } catch (err) {
      console.error('Failed to load languages:', err);
      setLanguages([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q)
    );
  }, [query, languages]);

  // If the language the user had selected disappears from a refreshed
  // list (e.g. retry returns a different set), fall back to English
  // rather than leaving `selected` pointing at a code not on screen.
  useEffect(() => {
    if (!languages.length) return;
    if (!languages.some((l) => l.code === selected)) {
      setSelected(languages.some((l) => l.code === 'en') ? 'en' : languages[0].code);
    }
  }, [languages]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectLanguage = (code: string) => {
    if (code === selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(code);
  };

  const applyLanguage = async () => {
    if (saving || !languages.length) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Persist to AsyncStorage + switch i18next. This is what
      //    actually re-renders every t() call across the app.
      await changeAppLanguage(selected);
    } catch (err) {
      console.error('Failed to apply language locally:', err);
    }

    try {
      // 2. Sync to the backend. Kept in its own try/catch so a network
      //    failure here can't undo or skip the local switch above.
      await axios.post('/', {
        method: 'setLanguage',
        language: selected,
      });
    } catch (err) {
      // Non-fatal: the UI is already in the new language and the choice
      // is persisted locally; the backend can be re-synced later.
    } finally {
      setSaving(false);
      router.back();
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.bgFill} pointerEvents="none" />

      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000', '#000000']}
        locations={[0.026, 0.6377, 1]}
        style={styles.bgOverlay}
        pointerEvents="none"
      />

      {/* ---------- header ---------- */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
        >
          <BackIcon />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{t('common.appLanguage')}</Text>
          <Text style={styles.headerSubtitle}>{t('common.chooseLanguage')}</Text>
        </View>
      </View>

      {/* ---------- search ---------- */}
      <View style={styles.searchBox}>
        <SearchIcon />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('common.search')}
          placeholderTextColor={COLORS.text1}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {/* ---------- language list ---------- */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.green} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            loadFailed ? (
              <TouchableOpacity
                style={styles.retryRow}
                activeOpacity={0.8}
                onPress={fetchLanguages}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>{t('common.loadFailedRetry')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.emptyText}>{t('common.noMatch', { query })}</Text>
            )
          }
          renderItem={({ item }) => {
            const isSelected = item.code === selected;

            return (
              <TouchableOpacity
                style={[styles.langRow, isSelected && styles.langRowActive]}
                activeOpacity={0.8}
                onPress={() => selectLanguage(item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select ${item.name}`}
              >
                <View style={styles.langTextWrap}>
                  <Text style={styles.langNative}>{item.native}</Text>
                  <Text style={styles.langName}>{item.name}</Text>
                </View>

                {isSelected ? <CheckCircleIcon /> : <RingIcon />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ---------- apply button ---------- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[styles.applyBtn, (saving || loading || !languages.length) && styles.applyBtnDisabled]}
          activeOpacity={0.88}
          onPress={applyLanguage}
          disabled={saving || loading || !languages.length}
          accessibilityRole="button"
          accessibilityLabel={t('common.apply')}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#1a1420" />
          ) : (
            <Text style={styles.applyBtnText}>{t('common.apply')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LanguageScreen;

/* ---------- styles ----------
 * Kept local to this screen rather than pulled from the shared
 * home-screen stylesheet, since none of these (search box, language
 * rows, apply button) exist there yet. Colors reuse the shared COLORS
 * palette so it stays visually consistent with the rest of the app.
 */
const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0a0814',
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2E635B',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTextWrap: {
    flex: 1,
    paddingTop: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.text2,
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 17,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: Platform.OS === 'android' ? 0 : undefined,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 90,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  separator: {
    height: 8,
  },
  emptyText: {
    color: COLORS.text2,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
  retryRow: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  retryText: {
    color: COLORS.text2,
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  langRowActive: {
    backgroundColor: 'rgba(127, 255, 249, 0.14)',
    borderColor: COLORS.green,
  },
  langTextWrap: {
    gap: 2,
  },
  langNative: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  langName: {
    color: COLORS.text2,
    fontSize: 12.5,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(10,8,20,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  applyBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.55,
  },
  applyBtnText: {
    color: '#eefcf1',
    fontSize: 15,
    fontWeight: '700',
  },
});