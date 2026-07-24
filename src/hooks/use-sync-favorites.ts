import { useEffect } from 'react';

import { useFavoritesQuery } from '@/hooks/queries/favorites';
import { useFavoritesStore } from '@/stores/favoritesStore';

/** Keeps Zustand favorite IDs in sync with the favorites API query. */
export function useSyncFavorites() {
  const favsQuery = useFavoritesQuery();
  const setFromList = useFavoritesStore((s) => s.setFromList);

  useEffect(() => {
    if (favsQuery.data) setFromList(favsQuery.data);
  }, [favsQuery.data, setFromList]);
}
