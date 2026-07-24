import type { Cart } from '@/services/cart';

export function getCartItemCount(cart: Cart | null | undefined): number {
  return cart?.items?.reduce((sum, it) => sum + (it.quantity ?? 0), 0) ?? 0;
}

export function getCartDisplayTotal(cart: Cart | null | undefined): number {
  if (!cart) return 0;
  const grand = Number(cart.grandTotal);
  if (Number.isFinite(grand) && grand > 0) return grand;
  const total = Number(cart.total);
  if (Number.isFinite(total) && total > 0) return total;
  const subtotal = Number(cart.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return subtotal;
  return (
    cart.items?.reduce((sum, it) => {
      const line = Number(it.total);
      if (Number.isFinite(line) && line > 0) return sum + line;
      return sum + Number(it.price ?? 0) * Number(it.quantity ?? 1);
    }, 0) ?? 0
  );
}

export function getCartRestaurantName(cart: Cart | null | undefined): string | null {
  const r = cart?.restaurantId;
  if (r && typeof r === 'object' && 'restaurantName' in r) {
    return String(r.restaurantName ?? '') || null;
  }
  return null;
}
