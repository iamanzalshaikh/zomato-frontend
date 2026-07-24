import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Standard mockup tab bar height */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return 58 + Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 6) + 12;
}
