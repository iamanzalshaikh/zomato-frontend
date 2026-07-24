import { requireOptionalNativeModule } from 'expo-modules-core';

import { apiFetch } from '@/lib/apiFetch';

export type LatLng = { latitude: number; longitude: number };

function hasLocationNativeModule(): boolean {
  return requireOptionalNativeModule('ExpoLocation') != null;
}

async function getExpoLocation() {
  if (!hasLocationNativeModule()) return null;
  try {
    return await import('expo-location');
  } catch {
    return null;
  }
}

export async function canUseNativeLocation(): Promise<boolean> {
  return (await getExpoLocation()) != null;
}

export async function ensureForegroundPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'> {
  const Location = await getExpoLocation();
  if (!Location) return 'unavailable';
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status;
  }
  return current.status;
}

export async function getCurrentCoords(): Promise<LatLng | null> {
  const Location = await getExpoLocation();
  if (!Location) return null;
  
  // Try last known position first (fast & reliable on emulators)
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords) {
      if (__DEV__) console.log('📍 [LOCATION] Last known position found:', last.coords);
      return { latitude: last.coords.latitude, longitude: last.coords.longitude };
    }
  } catch (err) {
    if (__DEV__) console.log('📍 [LOCATION] Error getting last known position:', err);
  }

  // Create a timeout promise to prevent hanging
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      if (__DEV__) console.log('📍 [LOCATION] getCurrentPositionAsync timed out after 4s');
      resolve(null);
    }, 4000);
  });

  const fetchPromise = (async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (err) {
      if (__DEV__) console.log('📍 [LOCATION] getCurrentPositionAsync error:', err);
      return null;
    }
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
  if (result) return result;

  // Fallback to Kalyan Bypass if both failed or timed out (super robust for emulators)
  if (__DEV__) console.log('📍 [LOCATION] Falling back to Kalyan Bypass coordinates');
  return { latitude: 19.237533, longitude: 73.118242 };
}

export async function reverseGeocode(latlng: LatLng): Promise<Record<string, unknown> | null> {
  try {
    const body = await apiFetch(
      `/restaurants/geocode/reverse?lat=${latlng.latitude}&lng=${latlng.longitude}`,
    );
    const address = (body as { data?: { address?: Record<string, unknown> } })?.data?.address;
    if (address) {
      return {
        name: address.street,
        street: address.street,
        city: address.city,
        region: address.state,
        postalCode: address.pincode,
        country: address.country,
      };
    }
  } catch {
    // fall through to device geocoder
  }

  const Location = await getExpoLocation();
  if (!Location) return null;
  try {
    const results = await Location.reverseGeocodeAsync(latlng);
    if (results && results.length > 0) {
      return (results[0] as unknown as Record<string, unknown>);
    }
  } catch (err) {
    if (__DEV__) console.log('📍 [LOCATION] Reverse geocode error:', err);
  }
  
  // Fallback info for Kalyan Bypass if geocoding fails or is offline
  if (Math.abs(latlng.latitude - 19.2375) < 0.01) {
    return {
      name: 'Kalyan Bypass',
      city: 'Kalyan',
      region: 'Maharashtra',
      country: 'India',
    };
  }
  return null;
}

