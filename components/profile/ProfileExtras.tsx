import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Book, selectTotal, useCartStore } from './cartStore';
import { COLORS } from './style';

/* ---- app contact details: change these ---- */
export const SUPPORT_EMAIL = 'support@yourapp.com';
export const SUPPORT_PHONE = '+911234567890';
export const WHATSAPP_NUMBER = '911234567890'; // no "+"
export const APP_VERSION = '1.0.0';

const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const SHEET_BG = '#1B1416';
const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/* ---------- generic bottom sheet ---------- */
function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={x.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[x.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={x.grabber} />
        <View style={x.sheetHeader}>
          <Text style={x.sheetTitle}>{title}</Text>
          <Pressable hitSlop={12} onPress={onClose} style={x.sheetClose}>
            <Ionicons name="close" size={18} color={COLORS.cream} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
        >
          {children}
        </ScrollView>
        {footer}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [x.actionRow, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={x.actionIcon}>
        <Ionicons name={icon} size={20} color={COLORS.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={x.actionTitle}>{title}</Text>
        {!!subtitle && <Text style={x.actionSub}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
    </Pressable>
  );
}

/* ---------- contact us ---------- */
export function ContactSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.contactUs', 'Contact us')}>
      <Text style={x.sheetIntro}>
        {t('profile.contactIntro', 'We usually reply within 24 hours.')}
      </Text>
      <ActionRow
        icon="mail-outline"
        title={t('profile.emailUs', 'Email')}
        subtitle={SUPPORT_EMAIL}
        onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=Support%20request`)}
      />
      <ActionRow
        icon="logo-whatsapp"
        title="WhatsApp"
        subtitle={t('profile.whatsappSub', 'Chat with our team')}
        onPress={() => open(`https://wa.me/${WHATSAPP_NUMBER}`)}
      />
      <ActionRow
        icon="call-outline"
        title={t('profile.callUs', 'Call')}
        subtitle={SUPPORT_PHONE}
        onPress={() => open(`tel:${SUPPORT_PHONE}`)}
      />
    </Sheet>
  );
}

/* ---------- about us ---------- */
export function AboutSheet({
  visible,
  onClose,
  onTerms,
  onPrivacy,
}: {
  visible: boolean;
  onClose: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.aboutUs', 'About us')}>
      <View style={x.aboutHero}>
        <LinearGradient colors={[COLORS.gold, COLORS.maroon]} style={x.aboutLogo}>
          <Ionicons name="headset" size={30} color={COLORS.cream} />
        </LinearGradient>
        <Text style={x.aboutName}>{t('profile.appName', 'Your App Name')}</Text>
        <Text style={x.aboutVersion}>
          {t('profile.version', 'Version')} {APP_VERSION}
        </Text>
      </View>
      <Text style={x.aboutBody}>
        {t(
          'profile.aboutBody',
          'Listen to stories anywhere and download episodes for offline listening. Made with care for story lovers.'
        )}
      </Text>
      <ActionRow
        icon="document-text-outline"
        title={t('profile.terms', 'Terms of service')}
        onPress={onTerms}
      />
      <ActionRow
        icon="shield-checkmark-outline"
        title={t('profile.privacy', 'Privacy policy')}
        onPress={onPrivacy}
      />
    </Sheet>
  );
}


/* ---------- badge (cart count on a row) ---------- */
export function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <View style={x.badge}>
      <Text style={x.badgeText}>{value > 99 ? '99+' : value}</Text>
    </View>
  );
}

/* ---------- edit profile ---------- */
export function EditProfileSheet({
  visible,
  onClose,
  initialName,
  email,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  email?: string;
  onSave: (v: { username: string }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError('');
    }
  }, [visible, initialName]);

  const trimmed = name.trim();
  const canSave = trimmed.length >= 2 && trimmed !== initialName.trim() && !saving;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave({ username: trimmed });
      onClose();
    } catch {
      setError(t('profile.saveFailed', "Couldn't save your changes. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('profile.editProfile', 'Edit profile')}
      footer={
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [
            x.primaryBtn,
            { marginTop: 16 },
            !canSave && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.saveChanges', 'Save changes')}
        >
          {saving ? (
            <ActivityIndicator color="#1B1416" />
          ) : (
            <Text style={x.primaryBtnText}>{t('profile.saveChanges', 'Save changes')}</Text>
          )}
        </Pressable>
      }
    >
      <Text style={x.fieldLabel}>{t('profile.name', 'Name')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={x.input}
        placeholder={t('profile.namePlaceholder', 'Your name')}
        placeholderTextColor={COLORS.textFaint}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
        returnKeyType="done"
        accessibilityLabel={t('profile.name', 'Name')}
      />

      <Text style={x.fieldLabel}>{t('profile.email', 'Email')}</Text>
      <View style={[x.input, x.inputDisabled]}>
        <Text style={x.inputDisabledText} numberOfLines={1}>
          {email || '-'}
        </Text>
        <Ionicons name="lock-closed-outline" size={16} color={COLORS.textFaint} />
      </View>
      <Text style={x.hint}>
        {t('profile.emailLocked', 'Email can’t be changed here. Contact support if you need to update it.')}
      </Text>
      {!!error && <Text style={x.error}>{error}</Text>}
    </Sheet>
  );
}

/* ---------- cart ---------- */
function Stepper({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <View style={x.stepper}>
      <Pressable hitSlop={8} onPress={onDec} style={x.stepBtn} accessibilityLabel="Decrease">
        <Ionicons name="remove" size={16} color={COLORS.cream} />
      </Pressable>
      <Text style={x.stepQty}>{qty}</Text>
      <Pressable hitSlop={8} onPress={onInc} style={x.stepBtn} accessibilityLabel="Increase">
        <Ionicons name="add" size={16} color={COLORS.cream} />
      </Pressable>
    </View>
  );
}

function Cover({ book }: { book: Book }) {
  if (book.cover) {
    return <Image source={{ uri: book.cover }} style={[x.cartCover, { resizeMode: 'cover' }]} />;
  }
  return (
    <LinearGradient
      colors={[COLORS.maroon, '#2A1519']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[x.cartCover, x.coverFallback]}
    >
      <Text style={x.coverText} numberOfLines={4}>
        {book.title}
      </Text>
    </LinearGradient>
  );
}

export function CartSheet({
  visible,
  onClose,
  onCheckout,
}: {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { t } = useTranslation();
  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore(selectTotal);
  const list = Object.values(items);

  const footer =
    list.length > 0 ? (
      <View style={x.cartFooter}>
        <View style={x.totalRow}>
          <Text style={x.totalLabel}>{t('profile.total', 'Total')}</Text>
          <Text style={x.totalValue}>{formatPrice(total)}</Text>
        </View>
        <Pressable
          onPress={onCheckout}
          style={({ pressed }) => [x.primaryBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.checkout', 'Checkout')}
        >
          <Text style={x.primaryBtnText}>{t('profile.checkout', 'Checkout')}</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.myCart', 'My cart')} footer={footer}>
      {list.length === 0 ? (
        <View style={x.empty}>
          <Ionicons name="cart-outline" size={40} color={COLORS.textFaint} />
          <Text style={x.emptyTitle}>{t('profile.cartEmpty', 'Your cart is empty')}</Text>
          <Text style={x.emptySub}>
            {t('profile.cartEmptySub', 'Books you add will show up here.')}
          </Text>
        </View>
      ) : (
        list.map((item) => (
          <View key={item.id} style={x.cartItem}>
            <Cover book={item} />
            <View style={{ flex: 1 }}>
              <Text style={x.cartTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={x.cartAuthor} numberOfLines={1}>
                {item.author}
              </Text>
              <View style={x.cartBottom}>
                <Stepper qty={item.qty} onInc={() => inc(item.id)} onDec={() => dec(item.id)} />
                <Text style={x.cartPrice}>{formatPrice(item.price * item.qty)}</Text>
              </View>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => remove(item.id)}
              accessibilityLabel={t('profile.removeItem', 'Remove')}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.textFaint} />
            </Pressable>
          </View>
        ))
      )}
    </Sheet>
  );
}

export const x = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: COLORS.cream, fontSize: 20, fontWeight: '700' },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIntro: { color: COLORS.textFaint, fontSize: 14, marginBottom: 12 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    minHeight: 56,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: COLORS.cream, fontSize: 16, fontWeight: '600' },
  actionSub: { color: COLORS.textFaint, fontSize: 13, marginTop: 2 },
  aboutHero: { alignItems: 'center', paddingVertical: 12 },
  aboutLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutName: { color: COLORS.cream, fontSize: 20, fontWeight: '700', marginTop: 12 },
  aboutVersion: { color: COLORS.textFaint, fontSize: 13, marginTop: 2 },
  aboutBody: {
    color: COLORS.cream,
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },

  /* edit profile */
  fieldLabel: { color: COLORS.textFaint, fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    color: COLORS.cream,
    fontSize: 16,
    marginBottom: 12,
  },
  inputDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.6,
    marginBottom: 6,
  },
  inputDisabledText: { color: COLORS.cream, fontSize: 16, flex: 1, marginRight: 8 },
  hint: { color: COLORS.textFaint, fontSize: 12, lineHeight: 17 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  editBtnText: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },

  /* cart */
  coverFallback: { padding: 8, justifyContent: 'flex-end' },
  coverText: { color: COLORS.cream, fontSize: 11, fontWeight: '700' },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  cartCover: { width: 56, height: 80, borderRadius: 8 },
  cartTitle: { color: COLORS.cream, fontSize: 15, fontWeight: '600' },
  cartAuthor: { color: COLORS.textFaint, fontSize: 12, marginTop: 2 },
  cartBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cartPrice: { color: COLORS.gold, fontSize: 15, fontWeight: '700' },
  cartFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { color: COLORS.textFaint, fontSize: 15 },
  totalValue: { color: COLORS.cream, fontSize: 20, fontWeight: '700' },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#1B1416', fontSize: 16, fontWeight: '700' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 10,
    height: 36,
  },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepQty: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTitle: { color: COLORS.cream, fontSize: 16, fontWeight: '600', marginTop: 6 },
  emptySub: { color: COLORS.textFaint, fontSize: 13, textAlign: 'center' },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: { color: '#1B1416', fontSize: 11, fontWeight: '800' },
  footerText: {
    color: COLORS.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});