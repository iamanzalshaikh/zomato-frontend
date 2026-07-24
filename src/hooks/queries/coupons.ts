import { useQuery } from '@tanstack/react-query';
import { fetchCouponsByRestaurant } from '@/services/coupons';

export const couponKeys = {
  byRestaurant: (restaurantId: string) => ['coupons', 'restaurant', restaurantId] as const,
};

export function useCouponsByRestaurantQuery(restaurantId: string, enabled = true) {
  return useQuery({
    queryKey: couponKeys.byRestaurant(restaurantId),
    queryFn: () => fetchCouponsByRestaurant(restaurantId),
    enabled: Boolean(restaurantId) && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
}
