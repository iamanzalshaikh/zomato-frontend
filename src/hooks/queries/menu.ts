import { useQuery } from '@tanstack/react-query';

import { fetchMenuItemDetails, fetchMenuItemsByRestaurant, fetchCombosByRestaurant } from '@/services/menu';
import { usePerfQuery } from '@/lib/perf';

export const menuKeys = {
  byRestaurant: (restaurantId: string) => ['menu', 'restaurant', restaurantId] as const,
  combos: (restaurantId: string) => ['menu', 'restaurant', restaurantId, 'combos'] as const,
  item: (itemId: string) => ['menu', 'item', itemId] as const,
};

export function useMenuByRestaurantQuery(restaurantId: string) {
  const q = useQuery({
    queryKey: menuKeys.byRestaurant(restaurantId),
    queryFn: () => fetchMenuItemsByRestaurant(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
  usePerfQuery(`Menu(${restaurantId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useCombosByRestaurantQuery(restaurantId: string) {
  const q = useQuery({
    queryKey: menuKeys.combos(restaurantId),
    queryFn: () => fetchCombosByRestaurant(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
  usePerfQuery(`Combos(${restaurantId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useMenuItemQuery(itemId: string) {
  const q = useQuery({
    queryKey: menuKeys.item(itemId),
    queryFn: () => fetchMenuItemDetails(itemId),
    enabled: Boolean(itemId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  usePerfQuery(`MenuItem(${itemId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

