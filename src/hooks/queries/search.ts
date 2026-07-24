import { useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseMerchants } from '@/services/case';
import { searchGlobal, fetchTrendingSearches } from '@/services/search';
import { perfQuery } from '@/lib/perf';

export const searchKeys = {
  global: (q: string) => ['search', 'global', q] as const,
  trending: ['search', 'trending'] as const,
};

async function searchPreferCase(query: string) {
  if (CASE_CHECKOUT_ENABLED) {
    try {
      const merchants = await fetchCaseMerchants({ search: query, limit: 30 });
      const restaurants = merchants.items.map((m) => ({
        _id: m.id,
        restaurantName: m.restaurantName,
        cuisines: m.cuisines,
        averageRating: m.averageRating,
        logo: m.logo ?? undefined,
        averageDeliveryTime: m.averageDeliveryTime,
        isOpen: m.isOpen,
      }));
      if (restaurants.length) {
        return { restaurants, foods: [] as unknown[] };
      }
    } catch {
      /* fall through */
    }
  }
  return searchGlobal(query);
}

export function useGlobalSearchQuery(q: string) {
  const query = q.trim();
  const result = useQuery({
    queryKey: searchKeys.global(query),
    queryFn: () => searchPreferCase(query),
    enabled: query.length > 0,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  });
  perfQuery(`Search("${query}")`, result.isFetching, result.dataUpdatedAt);
  return result;
}

export function useTrendingSearchesQuery() {
  const result = useQuery({
    queryKey: searchKeys.trending,
    queryFn: fetchTrendingSearches,
    staleTime: 10 * 60 * 1000,
  });
  perfQuery('TrendingSearches', result.isFetching, result.dataUpdatedAt);
  return result;
}
