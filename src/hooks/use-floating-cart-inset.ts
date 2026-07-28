import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FLOATING_CART_HEIGHT = 68;
const FLOATING_CART_GAP = 16;
const BASE_SCROLL_PADDING = 24;
/** Active-order sticky banner approximate height on Home */
export const ACTIVE_ORDER_BANNER_HEIGHT = 64;

/** Bottom offset for FloatingCartBar on full-screen stacks (no tab bar). */
export function useFloatingCartBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) + 12;
}

/**
 * Bottom offset for FloatingCartBar on tab screens.
 * Content sits above the tab bar, so we only need a small gap (+ optional banner stack).
 */
export function useTabFloatingCartBottom(extraAbove = 0): number {
  return 12 + Math.max(0, extraAbove);
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

/** Home / tab scroll padding when floating cart (+ optional active-order banner) is visible. */
export function useTabFloatingCartScrollPadding(hasCart: boolean, hasActiveOrder = false): number {
  // Tab scenes already sit above the tab bar — only pad for floating UI.
  const cartBlock = hasCart ? FLOATING_CART_HEIGHT + FLOATING_CART_GAP : 0;
  const orderBlock = hasActiveOrder ? ACTIVE_ORDER_BANNER_HEIGHT + 8 : 0;
  return cartBlock + orderBlock + 16;
}
