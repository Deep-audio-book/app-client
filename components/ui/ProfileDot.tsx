import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/utils/typedReduxHooks';
import { initialsFor } from '@/utils/initials';

// Reads the SAME Redux slice ProfileScreen.tsx already reads
// (s.auth.user), so this always matches what's shown on the actual
// Profile page — no separate fetch, no separate source of truth,
// no more "?" placeholder.
type Props = {
  dotStyle: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function ProfileDot({ dotStyle, textStyle }: Props) {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <TouchableOpacity
      style={dotStyle}
      activeOpacity={0.7}
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={t('home.openProfile')}
    >
      {user?.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <>
          <LinearGradient
            colors={['#e85c3f', '#d9a441']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={textStyle}>{initialsFor(user?.username)}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}