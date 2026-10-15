import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "device-id-v1";
let cached: string | null = null;

/** Random id created once per app install and kept in AsyncStorage. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    const rand = () => Math.random().toString(36).slice(2, 10);
    id = `${Date.now().toString(36)}-${rand()}${rand()}`;
    await AsyncStorage.setItem(KEY, id);
  }

  cached = id;
  return id;
}
