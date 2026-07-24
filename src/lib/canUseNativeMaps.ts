import { NativeModules } from 'react-native';

/** True only when the app was built with react-native-maps linked (expo run:android / dev client). */
export function hasNativeMapsModule(): boolean {
  return Boolean(
    NativeModules.RNMapsAirModule ??
      NativeModules.AIRMapModule ??
      NativeModules.AIRMapManager,
  );
}
