import { useQuery } from '@tanstack/react-query';

import { searchGlobal, fetchTrendingSearches } from '@/services/search';
import { perfQuery } from '@/lib/perf';

export const searchKeys = {
  global: (q: string) => ['search', 'global', q] as const,
  trending: ['search', 'trending'] as const,
};

export function useGlobalSearchQuery(q: string) {
  const query = q.trim();
  const result = useQuery({
    queryKey: searchKeys.global(query),
    queryFn: () => searchGlobal(query),
    enabled: query.length > 0,
    staleTime: 30_000,           // 30s — same search term reuses cached results
    gcTime: 2 * 60_000,          // keep in cache 2 min
  });
  perfQuery(`Search("${query}")`, result.isFetching, result.dataUpdatedAt);
  return result;
}

export function useTrendingSearchesQuery() {
  const result = useQuery({
    queryKey: searchKeys.trending,
    queryFn: fetchTrendingSearches,
    staleTime: 10 * 60 * 1000, // 10 minutes staleTime
  });
  perfQuery('TrendingSearches', result.isFetching, result.dataUpdatedAt);
  return result;
}


