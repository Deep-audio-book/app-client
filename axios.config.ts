import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosLib from 'axios';
import i18n from 'i18next'; // same singleton that constants/locales/index.ts calls i18n.use(initReactI18next).init(...) on. Its default export (initI18n) is an async function, not the instance — so import the instance from 'i18next' directly here.

const STORAGE_KEY = '@audiobooks_user_data';
const DEFAULT_LANGUAGE_CODE = 'en';

const axios = axiosLib.create({
  baseURL:
    'https://yxsssitk9a.execute-api.ap-south-1.amazonaws.com/deepaudiobooks-v1/server',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_REAL_API_KEY',
  },
  timeout: 15000,
});

axios.interceptors.request.use(
  async (config) => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);

      // i18n.language can be a region-qualified code like "en-IN" — the
      // backend only knows plain codes ("en", "ta"), so take the base.
      // Falls back to "en" whenever nothing has been selected yet
      // (fresh install, i18next not yet initialized, etc.).
      const language_code =
        i18n.language?.split('-')[0]?.toLowerCase() || DEFAULT_LANGUAGE_CODE;

      const extraFields: Record<string, unknown> = { language_code };

      if (storedUser) {
        const user = JSON.parse(storedUser);
        extraFields.user_id = user.userId;
      }

      if (config.method?.toLowerCase() === 'get') {
        config.params = {
          ...config.params,
          ...extraFields,
        };
      } else {
        config.data = {
          ...config.data,
          ...extraFields,
        };
      }

            // console.log('[API REQUEST]', config.url, JSON.stringify(config.data ?? config.params));

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

export default axios;