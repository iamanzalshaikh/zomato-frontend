import Constants from 'expo-constants';
import { Platform } from 'react-native';

type GoogleMapsExtra = {
  android?: string;
  ios?: string;
  geocoding?: string;
  places?: string;
  routes?: string;
};

const extra =
  (Constants.expoConfig?.extra?.googleMaps as GoogleMapsExtra | undefined) ??
  (Constants as { easConfig?: { googleMaps?: GoogleMapsExtra } }).easConfig?.googleMaps ??
  {};

export const GOOGLE_MAPS_ANDROID_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? extra.android ?? '';
export const GOOGLE_MAPS_IOS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? extra.ios ?? '';
export const GOOGLE_GEOCODING_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY ?? extra.geocoding ?? '';
export const GOOGLE_PLACES_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? extra.places ?? '';
export const GOOGLE_ROUTES_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_ROUTES_KEY ?? extra.routes ?? '';

export function getNativeMapsApiKey(): string {
  return Platform.OS === 'ios' ? GOOGLE_MAPS_IOS_KEY : GOOGLE_MAPS_ANDROID_KEY;
}

export function hasGoogleMapsConfigured(): boolean {
  return Boolean(getNativeMapsApiKey());
}
