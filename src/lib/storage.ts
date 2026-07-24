/**
 * Token storage — SecureStore when available, else AsyncStorage (persists in Expo Go),
 * else in-memory (last resort; lost on app restart).
 */

import { requireOptionalNativeModule } from 'expo-modules-core';
import { NativeModules } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

let memory: Record<string, string | undefined> = {};

function hasSecureStoreNativeModule(): boolean {
  return requireOptionalNativeModule('ExpoSecureStore') != null;
}

async function getAsyncStorage() {
  // IMPORTANT: Do not import AsyncStorage eagerly. In some runtimes (web / certain dev clients)
  // the native module may be null and the package throws on import.
  // Also, even on Android/iOS, newly-added native modules require a rebuild of the dev client.
  // Guard against that case to avoid crashing the app at startup.
  const hasNative =
    typeof NativeModules === 'object' &&
    NativeModules != null &&
    (NativeModules as any).RNCAsyncStorage != null;
  if (!hasNative) return null;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    return (mod as any)?.default ?? mod;
  } catch {
    return null;
  }
}

async function getSecureStore() {
  if (!hasSecureStoreNativeModule()) return null;
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}

async function secureGet(key: string): Promise<string | null> {
  const SecureStore = await getSecureStore();
  if (SecureStore?.getItemAsync) {
    return SecureStore.getItemAsync(key);
  }
  const AsyncStorage = await getAsyncStorage();
  if (AsyncStorage?.getItem) {
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync) return fromAsync;
  }
  return memory[key] ?? null;
}

async function secureSet(key: string, value: string): Promise<void> {
  const SecureStore = await getSecureStore();
  if (SecureStore?.setItemAsync) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const AsyncStorage = await getAsyncStorage();
  if (AsyncStorage?.setItem) {
    await AsyncStorage.setItem(key, value);
  }
  memory[key] = value;
}

async function secureDelete(key: string): Promise<void> {
  const SecureStore = await getSecureStore();
  if (SecureStore?.deleteItemAsync) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  const AsyncStorage = await getAsyncStorage();
  if (AsyncStorage?.removeItem) {
    await AsyncStorage.removeItem(key);
  }
  delete memory[key];
}

export async function getAccessToken(): Promise<string | null> {
  return secureGet(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_TOKEN_KEY);
}

export async function setTokens(input: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    secureSet(ACCESS_TOKEN_KEY, input.accessToken),
    secureSet(REFRESH_TOKEN_KEY, input.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([secureDelete(ACCESS_TOKEN_KEY), secureDelete(REFRESH_TOKEN_KEY)]);
  memory = {};
}

export async function storageGetItem(key: string): Promise<string | null> {
  return secureGet(key);
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  await secureSet(key, value);
}

export async function storageRemoveItem(key: string): Promise<void> {
  await secureDelete(key);
}

