import { useFavoritesStore } from '@/stores/favoritesStore';

export function useFavorites() {
  const ids = useFavoritesStore((s) => s.ids);
  return { ids, loading: false };
}

