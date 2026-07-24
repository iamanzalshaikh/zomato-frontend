import { apiFetch } from '@/lib/apiFetch';

export type Coupon = {
  _id: string;
  couponCode: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount?: number;
  validTo: string;
  usageLimit: number;
  usedCount: number;
};

export async function fetchCouponsByRestaurant(restaurantId: string) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { coupons: Coupon[]; count: number };
  }>(`/coupons/restaurant/${restaurantId}`);
  return body.data;
}
