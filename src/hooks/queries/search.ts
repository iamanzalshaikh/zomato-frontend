import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseMerchants } from '@/services/case';
import { searchGlobal, fetchTrendingSearches } from '@/services/search';
import { usePerfQuery } from '@/lib/perf';

export const searchKeys = {
  global: (q: string) => ['search', 'global', q] as const,
  trending: ['search', 'trending'] as const,
};

type SearchRestaurantRow = {
  _id: string;
  restaurantName: string;
  cuisines?: string[];
  businessType?: string;
  averageRating?: number;
  logo?: string;
  averageDeliveryTime?: number;
  isOpen?: boolean;
  bannerImages?: string[];
  minimumOrderAmount?: number;
};

type UnifiedSearchResult = {
  search: {
    restaurants: SearchRestaurantRow[];
    foods: unknown[];
  };
};

function unwrapGlobalSearch(raw: unknown): { restaurants: SearchRestaurantRow[]; foods: unknown[] } {
  const root = (raw as any)?.search ?? raw ?? {};
  return {
    restaurants: Array.isArray(root.restaurants) ? root.restaurants : [],
    foods: Array.isArray(root.foods) ? root.foods : [],
  };
}

/**
 * CASE merchant search (visibility-correct) + global foods.
 * CASE merchants are preferred, but we soft-timeout at 900ms so a cold DB
 * path never blocks the search UI past ~1s — global results fill in instead.
 */
async function searchUnified(query: string): Promise<UnifiedSearchResult> {
  const globalPromise = searchGlobal(query).catch(() => ({ search: { restaurants: [], foods: [] } }));

  if (!CASE_CHECKOUT_ENABLED) {
    const globalRaw = await globalPromise;
    const global = unwrapGlobalSearch(globalRaw);
    return { search: { restaurants: global.restaurants, foods: global.foods } };
  }

  const merchantsPromise = fetchCaseMerchants({ search: query, limit: 15 }).catch(() => null);
  const timedCase = Promise.race([
    merchantsPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
  ]);

  const [globalRaw, merchantsRes] = await Promise.all([globalPromise, timedCase]);
  const global = unwrapGlobalSearch(globalRaw);

  const caseRestaurants: SearchRestaurantRow[] = (merchantsRes?.items ?? []).map((m) => ({
    _id: m.id,
    restaurantName: m.restaurantName,
    cuisines: m.cuisines,
    businessType: m.businessType,
    averageRating: m.averageRating,
    logo: m.logo ?? undefined,
    averageDeliveryTime: m.averageDeliveryTime,
    isOpen: m.isOpen,
    bannerImages: m.bannerImages,
    minimumOrderAmount: m.minimumOrderAmount,
  }));

  if (caseRestaurants.length > 0) {
    return {
      search: {
        restaurants: caseRestaurants,
        foods: global.foods,
      },
    };
  }

  return {
    search: {
      restaurants: global.restaurants,
      foods: global.foods,
    },
  };
}

export function useGlobalSearchQuery(q: string) {
  const query = q.trim();
  const result = useQuery({
    queryKey: searchKeys.global(query),
    queryFn: () => searchUnified(query),
    enabled: query.length >= 2,
    staleTime: 3 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  });
  usePerfQuery(`Search("${query}")`, result.isFetching, result.dataUpdatedAt);
  return result;
}

export function useTrendingSearchesQuery(enabled = true) {
  const result = useQuery({
    queryKey: searchKeys.trending,
    queryFn: fetchTrendingSearches,
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });
  usePerfQuery('TrendingSearches', result.isFetching, result.dataUpdatedAt);
  return result;
}
