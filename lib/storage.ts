import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    const probeKey = '__p5_storage_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}
