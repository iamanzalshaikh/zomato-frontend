import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Matches AppTabs `tabBarStyle.height`.
 * Tab scenes are already laid out above the tab bar — do NOT use this as
 * `bottom` offset inside a tab screen (that double-counts and creates a gap).
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return 58 + Math.max(insets.bottom, 0);
}
