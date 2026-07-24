import { apiFetch } from '@/lib/apiFetch';

export type Order = {
  _id: string;
  orderNumber: string;
  customerId: string;
  restaurantId?: {
    _id: string;
    restaurantName: string;
    logo?: string;
    slug?: string;
  };
  riderId?: string;
  orderItems: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    price: number;
    total: number;
    addons?: { name: string; price: number }[];
  }[];
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  platformFee: number;
  couponDiscount: number;
  walletDeduction: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  customerAddress: {
    fullAddress: string;
    latitude: number;
    longitude: number;
  };
  estimatedDeliveryTime?: string;
  estimatedPreparationTime?: number;
  createdAt?: string;
};

export async function createOrder(input: {
  deliveryAddressId: string;
  paymentMethod: 'COD' | 'ONLINE';
  couponId?: string;
  deliveryInstructions?: string;
}) {
  const body = await apiFetch('/orders/create', { method: 'POST', body: JSON.stringify(input) });
  return (body as any)?.data?.order ?? (body as any)?.data;
}

export async function fetchOrderHistory() {
  const body = await apiFetch('/orders/user/history');
  return (body as any)?.data?.orders ?? (body as any)?.data?.history ?? [];
}

export async function fetchOrderById(orderId: string) {
  const body = await apiFetch(`/orders/${orderId}`);
  return (body as any)?.data?.order ?? (body as any)?.data;
}

export async function trackOrder(orderId: string) {
  const body = await apiFetch(`/orders/track/${orderId}`);
  return (body as any)?.data?.tracking ?? (body as any)?.data;
}

export async function fetchOrderRoute(orderId: string) {
  const body = await apiFetch(`/orders/track/${orderId}/route`);
  return (body as any)?.data?.path ?? [];
}

export async function requestOrderRefund(orderId: string, description: string) {
  const body = await apiFetch('/orders/refund-request', {
    method: 'POST',
    body: JSON.stringify({ orderId, description }),
  });
  return (body as any)?.data ?? body;
}

