import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FLOATING_CART_HEIGHT = 68;
const FLOATING_CART_GAP = 16;
const BASE_SCROLL_PADDING = 24;

/** Bottom offset for FloatingCartBar on full-screen stacks (no tab bar). */
export function useFloatingCartBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) + 12;
}

/** ScrollView paddingBottom so menu content clears the floating cart bar. */
export function useFloatingCartScrollPadding(hasCart: boolean): number {
  const cartBottom = useFloatingCartBottom();
  const insets = useSafeAreaInsets();
  if (!hasCart) {
    return Math.max(insets.bottom, BASE_SCROLL_PADDING) + BASE_SCROLL_PADDING;
  }
  return cartBottom + FLOATING_CART_HEIGHT + FLOATING_CART_GAP;
}
