import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addFavorite, fetchFavorites, removeFavorite } from '@/services/favorites';
import { usePerfQuery } from '@/lib/perf';

export const favoritesKeys = {
  all: ['favorites'] as const,
};

export function useFavoritesQuery(options?: { enabled?: boolean }) {
  const q = useQuery({
    queryKey: favoritesKeys.all,
    queryFn: fetchFavorites,
    enabled: options?.enabled !== false,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  usePerfQuery('Favorites', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useToggleFavoriteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { restaurantId: string; has: boolean }) => {
      if (input.has) return removeFavorite(input.restaurantId);
      return addFavorite(input.restaurantId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: favoritesKeys.all }),
  });
}

