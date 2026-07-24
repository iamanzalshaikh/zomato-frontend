import { useQuery } from '@tanstack/react-query';

import { fetchRestaurantReviews } from '@/services/reviews';

export const reviewKeys = {
  byRestaurant: (restaurantId: string) => ['reviews', 'restaurant', restaurantId] as const,
};

export function useRestaurantReviewsQuery(restaurantId: string, limit = 5, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.byRestaurant(restaurantId),
    queryFn: () => fetchRestaurantReviews(restaurantId, 1, limit),
    enabled: Boolean(restaurantId) && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
}
