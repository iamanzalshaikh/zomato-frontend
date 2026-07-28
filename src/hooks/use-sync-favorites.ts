import { useEffect, useState } from 'react';

import { useFavoritesQuery } from '@/hooks/queries/favorites';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { scheduleIdleTask } from '@/lib/scheduleIdle';

/** Keeps Zustand favorite IDs in sync with the favorites API query.
 *  Deferred so cold Home launch is not competing with bootstrap/popular. */
export function useSyncFavorites() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = scheduleIdleTask(() => setReady(true), 2500);
    return () => task.cancel();
  }, []);

  const favsQuery = useFavoritesQuery({ enabled: ready });
  const setFromList = useFavoritesStore((s) => s.setFromList);

  useEffect(() => {
    if (favsQuery.data) setFromList(favsQuery.data);
  }, [favsQuery.data, setFromList]);
}
