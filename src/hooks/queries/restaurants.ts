import { useQuery } from '@tanstack/react-query';

import { fetchRecommendedRestaurants, fetchRestaurantById, fetchStorePageData } from '@/services/restaurants';
import { usePerfQuery } from '@/lib/perf';

export const restaurantKeys = {
  byId: (restaurantId: string) => ['restaurants', 'byId', restaurantId] as const,
  recommended: ['restaurants', 'recommended'] as const,
  storePage: (restaurantId: string) => ['restaurants', 'storePage', restaurantId] as const,
};

export function useRestaurantByIdQuery(restaurantId: string) {
  const q = useQuery({
    queryKey: restaurantKeys.byId(restaurantId),
    queryFn: () => fetchRestaurantById(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
  usePerfQuery(`RestaurantById(${restaurantId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useRecommendedRestaurantsQuery() {
  const q = useQuery({
    queryKey: restaurantKeys.recommended,
    queryFn: fetchRecommendedRestaurants,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  usePerfQuery('RecommendedRestaurants', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useStorePageQuery(restaurantId: string) {
  const q = useQuery({
    queryKey: restaurantKeys.storePage(restaurantId),
    queryFn: () => fetchStorePageData(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
  usePerfQuery(`StorePage(${restaurantId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}
