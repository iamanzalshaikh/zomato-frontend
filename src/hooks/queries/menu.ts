import { useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseMerchantMenu } from '@/services/case';
import {
  fetchMenuItemDetails,
  fetchMenuItemsByRestaurant,
  fetchCombosByRestaurant,
  type MenuItem,
} from '@/services/menu';
import { usePerfQuery } from '@/lib/perf';

export const menuKeys = {
  byRestaurant: (restaurantId: string) => ['menu', 'restaurant', restaurantId] as const,
  combos: (restaurantId: string) => ['menu', 'restaurant', restaurantId, 'combos'] as const,
  item: (itemId: string) => ['menu', 'item', itemId] as const,
};

async function fetchMenuPreferCase(restaurantId: string): Promise<MenuItem[]> {
  if (CASE_CHECKOUT_ENABLED) {
    try {
      const menu = await fetchCaseMerchantMenu(restaurantId);
      return menu.items.map((item) => ({
        _id: item._id || item.id,
        restaurantId: item.restaurantId,
        categoryId: item.categoryId,
        itemName: item.itemName,
        description: item.description,
        images: item.images,
        price: item.discountedPrice != null ? item.discountedPrice : item.price,
        discountedPrice: item.discountedPrice ?? undefined,
        foodType: item.foodType,
        isAvailable: item.isAvailable !== false && !item.isSoldOut,
        addons: item.addons,
      }));
    } catch {
      // fall through to classic menu
    }
  }
  return fetchMenuItemsByRestaurant(restaurantId);
}

export function useMenuByRestaurantQuery(restaurantId: string) {
  const q = useQuery({
    queryKey: menuKeys.byRestaurant(restaurantId),
    queryFn: () => fetchMenuPreferCase(restaurantId),
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

