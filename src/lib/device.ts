import { Platform } from 'react-native';

/** True on Android emulators where FCM push tokens are often unavailable. */
export function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  const constants = Platform.constants as {
    Model?: string;
    Manufacturer?: string;
    Fingerprint?: string;
  };
  const model = String(constants?.Model ?? '');
  const manufacturer = String(constants?.Manufacturer ?? '');
  const fingerprint = String(constants?.Fingerprint ?? '');
  return (
    /sdk_gphone|emulator|simulator|generic/i.test(model) ||
    /generic|emulator/i.test(fingerprint) ||
    (manufacturer.toLowerCase() === 'google' && /sdk/i.test(model))
  );
}
