import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ta from './ta.json';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';

const resources = {
  en: { translation: en },
  ta: { translation: ta },
};

let initialized = false;

const initI18n = async () => {
  if (initialized) return i18n;

  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (!savedLanguage) {
    const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
    savedLanguage = resources[deviceLang as keyof typeof resources] ? deviceLang : 'en';
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    react: {
      useSuspense: false, // IMPORTANT: prevents blank/key-only render on RN
    },
  });

  initialized = true;
  return i18n;
};

export const changeAppLanguage = async (code: string) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  await i18n.changeLanguage(code);
};

export default initI18n;