import { createMMKV, MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Initialize fast MMKV v4 instance
export const mmkv: MMKV = createMMKV();

/**
 * High-performance hybrid storage wrapper.
 * Provides synchronous native MMKV access with automatic transparent
 * migration from legacy AsyncStorage so existing user data is NEVER lost.
 */
export const AppStorage = {
  /**
   * Synchronous get from MMKV (instant, zero bridge latency)
   */
  getString(key: string): string | undefined {
    return mmkv.getString(key);
  },

  /**
   * Synchronous set to MMKV
   */
  setString(key: string, value: string): void {
    mmkv.set(key, value);
    // Also save to AsyncStorage asynchronously in background for backwards compatibility
    AsyncStorage.setItem(key, value).catch(() => {});
  },

  /**
   * Async getItem compatible with AsyncStorage interface, but reads from MMKV first.
   * If not in MMKV, checks AsyncStorage and migrates on-the-fly.
   */
  async getItem(key: string): Promise<string | null> {
    const val = mmkv.getString(key);
    if (val !== undefined && val !== null) {
      return val;
    }

    // Transparent migration from legacy AsyncStorage
    try {
      const legacyVal = await AsyncStorage.getItem(key);
      if (legacyVal !== null) {
        mmkv.set(key, legacyVal);
        return legacyVal;
      }
    } catch {}

    return null;
  },

  /**
   * Async setItem compatible with AsyncStorage interface
   */
  async setItem(key: string, value: string): Promise<void> {
    mmkv.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },

  /**
   * Remove item from both MMKV and AsyncStorage
   */
  async removeItem(key: string): Promise<void> {
    mmkv.remove(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  /**
   * Synchronous delete from MMKV
   */
  delete(key: string): void {
    mmkv.remove(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
};

/**
 * Encrypted-at-rest storage (iOS Keychain / Android Keystore-backed EncryptedSharedPreferences)
 * for sensitive values such as the user's GPS coordinates. Transparently migrates any
 * legacy plaintext copy from AppStorage on first read, then removes the plaintext copy.
 */
export const SecureLocationStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureVal = await SecureStore.getItemAsync(key).catch(() => null);
    if (secureVal !== null) return secureVal;

    // Migrate any pre-existing plaintext value written before this change.
    const legacyVal = await AppStorage.getItem(key);
    if (legacyVal !== null) {
      // Only drop the plaintext copy once the secure copy is written; on devices with
      // a broken Keystore it stays the only copy.
      const migrated = await SecureStore.setItemAsync(key, legacyVal).then(() => true, () => false);
      if (migrated) await AppStorage.removeItem(key);
      return legacyVal;
    }

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      // Some Android 9 / Samsung devices have a broken Keystore and always throw here.
      // Losing the user's city would leave them stuck on city search, so fall back.
      if (__DEV__) console.warn('SecureStore write failed, using AppStorage:', e);
      await AppStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
