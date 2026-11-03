import { useCartCount } from '@/hooks/Usecartcount';
import { useMembership } from '@/hooks/useMembership';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logoutUser } from '../../redux/slices/authReducer';
import { useAppDispatch, useAppSelector } from '../../utils/typedReduxHooks';
import {
  APP_VERSION,
  AboutSheet,
  Badge,
  ContactSheet,
  EditProfileSheet,
  x,
} from './ProfileExtras';
import styles, {
  BASE_WIDTH,
  COLORS,
  MAX_CONTENT_WIDTH,
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

/* ---------- one flat list row: icon, label, value/badge/chevron ---------- */

function Row({
  icon,
  label,
  value,
  badge,
  onPress,
  tone = 'default',
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: number;
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

      {badge ? <Badge value={badge} /> : null}

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

/**
 * "Restore Purchases" re-links a subscription bought through the App Store /
 * Google Play to a new phone or a reinstalled app. Apple REQUIRES it when
 * subscriptions are sold through In-App Purchase. If payments go through
 * Razorpay / the website only, it is not needed and stays hidden.
 * Deep Talks + dev to confirm the payment model, then flip this.
 */
const SHOW_RESTORE_PURCHASES = Platform.OS === 'ios';

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

  // sheets
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Rentals in the cart (from the backend), refreshed when this screen is focused
  const cartCount = useCartCount();
  const { isPremium, currentPlan } = useMembership();
  const validUntil = currentPlan?.expiresOn
    ? new Date(currentPlan.expiresOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined;

  // Logout: clear session, then dismiss the modal AND go to /sign-in atomically.
  const handleLogout = async () => {
    await dispatch(logoutUser());

    if (typeof (router as any).dismissTo === 'function') {
      (router as any).dismissTo('/sign-in');
    } else {
      try {
        router.dismissAll();
      } catch {
        // Nothing to dismiss - fine.
      }
      router.replace('/sign-in');
    }
  };

  // Called when the user taps "Save changes" in the edit sheet.
  // Throw an error here if the API fails - the sheet shows the error message.
  const handleSaveProfile = async ({ username }: { username: string }) => {
    // TODO: 1) call your update-profile API
    //       2) update redux so the new name shows everywhere, e.g.
    //          await dispatch(updateProfile({ username })).unwrap();
    void username;
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
            onPress={() => router.push('/plans')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.premium', 'Premium')}
            style={{ position: 'absolute', right: 60, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="diamond-outline" size={20} color={COLORS.gold} />
          </Pressable>
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
          <View style={x.statusPill}>
            <Ionicons
              name={isPremium ? 'diamond' : 'person-outline'}
              size={13}
              color={isPremium ? COLORS.gold : COLORS.textFaint}
            />
            <Text style={[x.statusText, isPremium && { color: COLORS.gold }]}>
              {isPremium ? t('profile.premium', 'Premium') : t('profile.freeUser', 'Free User')}
            </Text>
          </View>
          {!!user?.email && (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          )}
          <Pressable
            onPress={() => setEditOpen(true)}
            style={({ pressed }) => [x.editBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfile', 'Edit profile')}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.gold} />
            <Text style={x.editBtnText}>{t('profile.editProfile', 'Edit profile')}</Text>
          </Pressable>
        </View>

        {/* ---------- account (no section headings) ---------- */}
        <View style={styles.group}>
          <Row
            icon="star-outline"
            label={t('profile.subscription')}
            value={validUntil ? t('profile.subscriptionValidUntil', { date: validUntil }) : undefined}
            onPress={() => router.push('/plans')}
          />
          <View style={styles.rowDivider} />
          <Row
            icon="receipt-outline"
            label={t('profile.myOrders', 'My orders')}
            onPress={() => router.push('/orders' as any)}
          />
          {/* Premium users listen to everything, so they don't need a cart */}
          {!isPremium && (
            <>
              <View style={styles.rowDivider} />
              <Row
                icon="cart-outline"
                label={t('profile.myCart', 'My cart')}
                badge={cartCount}
                onPress={() => router.push('/cart' as any)}
              />
            </>
          )}
          {SHOW_RESTORE_PURCHASES && (
            <>
              <View style={styles.rowDivider} />
              <Row icon="refresh-outline" label={t('profile.restorePurchases')} onPress={() => {}} />
            </>
          )}
        </View>

        {/* ---------- support ---------- */}
        <View style={styles.group}>
          <Row
            icon="help-circle-outline"
            label={t('profile.helpCenter', 'Help center')}
            onPress={() => router.push('/help' as any)}
          />
          <View style={styles.rowDivider} />
          <Row
            icon="chatbubble-ellipses-outline"
            label={t('profile.contactUs', 'Contact us')}
            onPress={() => setContactOpen(true)}
          />
        </View>

        {/* ---------- about ---------- */}
        <View style={styles.group}>
          <Row
            icon="information-circle-outline"
            label={t('profile.aboutUs', 'About us')}
            onPress={() => setAboutOpen(true)}
          />
          <View style={styles.rowDivider} />
          <Row
            icon="document-text-outline"
            label={t('profile.terms', 'Terms of service')}
            onPress={() => router.push('/terms' as any)}
          />
          <View style={styles.rowDivider} />
          <Row
            icon="shield-checkmark-outline"
            label={t('profile.privacy', 'Privacy policy')}
            onPress={() => router.push('/privacy' as any)}
          />
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

        <Text style={x.footerText}>
          {t('profile.version', 'Version')} {APP_VERSION}
        </Text>
      </ScrollView>

      {/* sheets */}
      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        initialName={user?.username ?? ''}
        email={user?.email}
        onSave={handleSaveProfile}
      />
      <ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} />
      <AboutSheet
        visible={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onTerms={() => {
          setAboutOpen(false);
          router.push('/terms' as any);
        }}
        onPrivacy={() => {
          setAboutOpen(false);
          router.push('/privacy' as any);
        }}
      />
    </View>
  );
}