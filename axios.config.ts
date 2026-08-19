import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosLib from 'axios';

const STORAGE_KEY = '@audiobooks_user_data';

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

      if (storedUser) {
        const user = JSON.parse(storedUser);

        if (config.method?.toLowerCase() === 'get') {
          config.params = {
            ...config.params,
            user_id: user.userId,
          };
        } else {
          config.data = {
            ...config.data,
            user_id: user.userId,
          };
        }
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

export default axios;