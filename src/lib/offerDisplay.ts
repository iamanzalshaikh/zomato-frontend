import type { Coupon } from '@/services/coupons';

/** Short badge for restaurant cards (home / featured). */
export function formatCouponBadge(coupon: Coupon): string {
  const code = (coupon.couponCode ?? '').toUpperCase();
  const title = (coupon.title ?? '').toLowerCase();

  if (code.includes('BOGO') || title.includes('buy 1') || title.includes('bogo')) {
    return 'BUY 1 GET 1';
  }

  if (coupon.discountType === 'PERCENTAGE') {
    if (coupon.discountValue >= 50) {
      return `${coupon.discountValue}% OFF`;
    }
    const cap = coupon.maximumDiscount ? ` up to ₹${coupon.maximumDiscount}` : '';
    return `${coupon.discountValue}% OFF${cap}`;
  }

  return `₹${coupon.discountValue} OFF above ₹${coupon.minimumOrderAmount}`;
}

/** Longer line for cart / offer sheets. */
export function formatCouponDescription(coupon: Coupon): string {
  if (coupon.description?.trim()) return coupon.description.trim();
  return formatCouponBadge(coupon);
}

export function pickPrimaryCoupon(coupons: Coupon[]): Coupon | null {
  if (!coupons.length) return null;
  const bogo = coupons.find((c) => formatCouponBadge(c).includes('BUY 1 GET 1'));
  if (bogo) return bogo;
  const pct = coupons.find((c) => c.discountType === 'PERCENTAGE');
  if (pct) return pct;
  return coupons[0];
}
