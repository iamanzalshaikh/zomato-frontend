import { apiFetch } from '@/lib/apiFetch';

export type CartLine = {
  _id: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  addons?: { name: string; price: number }[];
};

export type Cart = {
  _id: string;
  restaurantId: string | { _id: string; restaurantName?: string };
  items: CartLine[];
  subtotal: number;
  discountTotal?: number;
  deliveryFee?: number;
  taxTotal?: number;
  taxAmount?: number;
  platformFee?: number;
  couponDiscount?: number;
  total: number;
  grandTotal?: number;
  generalNote?: string;
  dontSendCutlery: boolean;
  isVipMode: boolean;
  goldDiscount?: number;
  appliedCouponId?: unknown;
};

export async function fetchCart(): Promise<Cart | null> {
  const body = await apiFetch('/cart');
  return (body as any)?.data?.cart ?? null;
}

export type AddonItem = {
  name: string;
  price: number;
};

export async function addToCart(input: {
  restaurantId: string;
  menuItemId: string;
  quantity: number;
  addons?: AddonItem[];
  specialInstructions?: string;
}): Promise<Cart | null> {
  const body = await apiFetch('/cart/add', { method: 'POST', body: JSON.stringify(input) });
  return (body as any)?.data?.cart ?? null;
}

export async function updateCartItem(input: { itemId: string; quantity: number }): Promise<Cart | null> {
  const body = await apiFetch(`/cart/update/${input.itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity: input.quantity }),
  });
  return (body as any)?.data?.cart ?? null;
}

export async function removeCartItem(input: { itemId: string }): Promise<Cart | null> {
  const body = await apiFetch(`/cart/remove/${input.itemId}`, { method: 'DELETE' });
  return (body as any)?.data?.cart ?? null;
}

export async function clearCart(): Promise<void> {
  await apiFetch('/cart/clear', { method: 'DELETE' });
}

export async function applyCoupon(input: { couponCode: string }): Promise<Cart | null> {
  const body = await apiFetch('/cart/apply-coupon', { method: 'POST', body: JSON.stringify(input) });
  return (body as any)?.data?.cart ?? null;
}

export async function removeCoupon(): Promise<Cart | null> {
  const body = await apiFetch('/cart/remove-coupon', { method: 'DELETE' });
  return (body as any)?.data?.cart ?? null;
}

export async function updateCartPreferences(input: {
  generalNote?: string;
  dontSendCutlery?: boolean;
  isVipMode?: boolean;
}): Promise<Cart | null> {
  const body = await apiFetch('/cart/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return (body as any)?.data?.cart ?? null;
}

