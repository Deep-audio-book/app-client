import ProfileDot from '@/components/ui/ProfileDot';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// adjust these two paths to match your folder structure
import { SUPPORT_EMAIL } from '../profile/ProfileExtras';
import { COLORS, MAX_CONTENT_WIDTH } from '../profile/style';

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type Props = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  /** shows a "Contact us" button at the end */
  showContact?: boolean;
};

export default function LegalScreen({ title, updated, intro, sections, showContact = true }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[COLORS.glowTop, 'transparent']}
        style={s.glow}
        pointerEvents="none"
      />

      <SafeAreaView edges={['top']}>
        <View style={s.header}>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.cream} />
          </Pressable>
          <Text style={s.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <ProfileDot dotStyle={s.profileDot} textStyle={s.profileDotText} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 40, maxWidth: MAX_CONTENT_WIDTH },
        ]}
      >
        <Text style={s.updated}>{updated}</Text>
        <Text style={s.intro}>{intro}</Text>

        {sections.map((sec) => (
          <View key={sec.heading} style={s.section}>
            <Text style={s.heading} accessibilityRole="header">
              {sec.heading}
            </Text>

            {sec.paragraphs?.map((p) => (
              <Text key={p} style={s.body}>
                {p}
              </Text>
            ))}

            {sec.bullets?.map((b) => (
              <View key={b} style={s.bulletRow}>
                <View style={s.dot} />
                <Text style={[s.body, s.bulletText]}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {showContact && (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
            style={({ pressed }) => [s.contactBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.contactUs', 'Contact us')}
          >
            <Ionicons name="mail-outline" size={18} color={COLORS.gold} />
            <Text style={s.contactText}>{t('profile.contactUs', 'Contact us')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg ?? '#140D0F' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden', // clips ProfileDot's own gradient into a circle
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDotText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  updated: { color: COLORS.textFaint, fontSize: 13, marginBottom: 10 },
  intro: { color: COLORS.cream, fontSize: 16, lineHeight: 24, marginBottom: 8 },
  section: { marginTop: 24 },
  heading: { color: COLORS.cream, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { color: COLORS.cream, opacity: 0.8, fontSize: 15, lineHeight: 23, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 9,
  },
  bulletText: { flex: 1, marginBottom: 0 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginTop: 32,
  },
  contactText: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
});