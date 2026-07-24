import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { couponKeys } from '@/hooks/queries/coupons';
import { pickPrimaryCoupon, formatCouponBadge } from '@/lib/offerDisplay';
import { fetchCouponsByRestaurant } from '@/services/coupons';

export function useRestaurantOfferBadges(restaurantIds: string[]) {
  const uniqueIds = useMemo(
    () => [...new Set(restaurantIds.filter(Boolean))],
    [restaurantIds],
  );

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: couponKeys.byRestaurant(id),
      queryFn: () => fetchCouponsByRestaurant(id),
      staleTime: 120_000,
      enabled: Boolean(id),
    })),
  });

  return useMemo(() => {
    const badges: Record<string, string | null> = {};
    uniqueIds.forEach((id, index) => {
      const coupons = queries[index]?.data?.coupons ?? [];
      const primary = pickPrimaryCoupon(coupons);
      badges[id] = primary ? formatCouponBadge(primary) : null;
    });
    return badges;
  }, [uniqueIds, queries]);
}
