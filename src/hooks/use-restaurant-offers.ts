import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { pickPrimaryCoupon, formatCouponBadge } from '@/lib/offerDisplay';
import { fetchActiveCoupons } from '@/services/coupons';

/**
 * Offer badges for shop cards — ONE network call (platform coupons),
 * not N× /coupons/restaurant/:id.
 */
export function useRestaurantOfferBadges(restaurantIds: string[], _limit = 6) {
  const uniqueIds = useMemo(
    () => [...new Set(restaurantIds.filter(Boolean))],
    [restaurantIds],
  );

  const q = useQuery({
    queryKey: ['coupons', 'active'],
    queryFn: fetchActiveCoupons,
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    const badges: Record<string, string | null> = {};
    const primary = pickPrimaryCoupon(q.data?.coupons ?? []);
    const label = primary ? formatCouponBadge(primary) : null;
    uniqueIds.forEach((id) => {
      badges[id] = label;
    });
    return badges;
  }, [uniqueIds, q.data]);
}
