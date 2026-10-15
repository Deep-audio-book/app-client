import { getDownloadedStorySummaries } from '../../download/downloadService';
import { useDownloadStore, waitForHydration } from '../../download/downloadStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logoutUser } from '../../redux/slices/authReducer';
import { useAppDispatch, useAppSelector } from '../../utils/typedReduxHooks';
import styles, {
  BASE_WIDTH,
  COLORS,
  MAX_CONTENT_WIDTH,
  MIN_TOUCH_TARGET,
} from './style';

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function initialsFor(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/* ---------- one flat list row: icon, label, value/chevron ---------- */

function Row({
  icon,
  label,
  value,
  onPress,
  tone = 'default',
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
}) {
  const color = tone === 'danger' ? COLORS.danger : COLORS.cream;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>

      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {onPress && showChevron && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
      )}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/* ---------- main screen ---------- */

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scale = clampValue(contentWidth / BASE_WIDTH, 0.85, 1.25);
  const avatarSize = Math.round(clampValue(96 * scale, 84, 112));

  // Real downloaded-episode count for the "Downloads" row, so it's
  // never a placeholder number.
  const [downloadedEpisodes, setDownloadedEpisodes] = useState(0);
  const downloadSig = useDownloadStore((s) =>
    Object.values(s.files)
      .map((f) => `${f.storyId}:${f.chapterId}:${f.kind}:${f.status}`)
      .sort()
      .join('|')
  );
  useEffect(() => {
    waitForHydration().then(() => {
      const total = getDownloadedStorySummaries().reduce(
        (sum, s) => sum + s.episodesDownloaded,
        0
      );
      setDownloadedEpisodes(total);
    });
  }, [downloadSig]);

  // BUG FIX #1: this used to just do router.replace('/') without clearing
  // the session. Redux + AsyncStorage still had the user, so app/index.tsx
  // saw a logged-in user and sent them straight back to /home.
  //
  // BUG FIX #2/#3: Profile is presented as a MODAL over the (tabs) group.
  // router.replace('/sign-in') alone only swaps the modal's own route -
  // (tabs)/Home underneath stays in the stack and reappears once the
  // modal finishes closing.
  //
  // BUG FIX #4: calling dismissAll() then replace() as two separate
  // steps raced - dismissAll() dispatches a POP_TO_TOP action, but by
  // the time it's processed, replace() had already changed the
  // navigator state, so the pop had nowhere to land ("The action
  // 'POP_TO_TOP' was not handled by any navigator" dev warning).
  // dismissTo() dismisses the modal AND navigates to the target route
  // as one atomic action - built for exactly this "close modal, go
  // somewhere else" case - so there's no race.
  const handleLogout = async () => {
    await dispatch(logoutUser());

    if (typeof (router as any).dismissTo === 'function') {
      (router as any).dismissTo('/sign-in');
    } else {
      // Older expo-router without dismissTo - fall back to the two-step
      // version, safely guarded.
      try {
        router.dismissAll();
      } catch {
        // Nothing to dismiss - fine.
      }
      router.replace('/sign-in');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.glowTop, 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <Pressable
            hitSlop={12}
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('profile.closeProfile')}
          >
            <Ionicons name="close" size={18} color={COLORS.cream} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 32,
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        {/* ---------- hero ---------- */}
        <View style={styles.hero}>
          <View
            style={[
              styles.avatarRing,
              { width: avatarSize + 6, height: avatarSize + 6, borderRadius: (avatarSize + 6) / 2 },
            ]}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.maroon]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Text style={[styles.avatarInitials, { fontSize: avatarSize * 0.34 }]}>
                {initialsFor(user?.username)}
              </Text>
            </LinearGradient>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {user?.username || t('profile.defaultName')}
          </Text>
          {!!user?.email && (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>

        {/* ---------- listening ---------- */}
        <SectionLabel>{t('profile.listeningSection')}</SectionLabel>
        <View style={styles.group}>
          <Row
            icon="download-outline"
            label={t('profile.downloads')}
            value={
              downloadedEpisodes > 0
                ? t('profile.downloadsCount', { count: downloadedEpisodes })
                : t('profile.noDownloadsYet')
            }
            onPress={() => router.push('/library' as any)}
          />
        </View>

        {/* ---------- membership ---------- */}
        <SectionLabel>{t('profile.membershipSection')}</SectionLabel>
        <View style={styles.group}>
          <Row
            icon="star-outline"
            label={t('profile.subscription')}
            value={t('profile.subscriptionValidUntil', { date: 'May 23, 2021' })}
            showChevron={false}
          />
          <View style={styles.rowDivider} />
          <Row icon="refresh-outline" label={t('profile.restorePurchases')} onPress={() => {}} />
          <View style={styles.rowDivider} />
          <Row icon="pricetag-outline" label={t('profile.enterPromoCode')} onPress={() => {}} />
        </View>

        {/* ---------- sign out ---------- */}
        <View style={[styles.group, styles.signOutGroup]}>
          <Row
            icon="log-out-outline"
            label={t('profile.logOut')}
            tone="danger"
            onPress={handleLogout}
            showChevron={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}