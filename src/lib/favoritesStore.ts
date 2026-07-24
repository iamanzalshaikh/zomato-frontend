import { addFavorite, fetchFavorites, removeFavorite } from '@/services/favorites';

type Listener = () => void;

let state: { ids: Set<string>; loading: boolean } = { ids: new Set(), loading: false };
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function getFavoritesSnapshot() {
  return { ids: state.ids, loading: state.loading };
}

export function subscribeFavorites(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshFavorites() {
  try {
    state = { ...state, loading: true };
    emit();
    const favorites = await fetchFavorites();
    const ids = new Set<string>((favorites ?? []).map((r: any) => String(r?._id ?? r?.id ?? '')));
    state = { ids, loading: false };
    emit();
  } catch {
    state = { ...state, loading: false };
    emit();
  }
}

export async function toggleFavorite(restaurantId: string) {
  const has = state.ids.has(restaurantId);
  try {
    if (has) {
      await removeFavorite(restaurantId);
      const next = new Set(state.ids);
      next.delete(restaurantId);
      state = { ...state, ids: next };
      emit();
      return;
    }
    await addFavorite(restaurantId);
    const next = new Set(state.ids);
    next.add(restaurantId);
    state = { ...state, ids: next };
    emit();
  } catch {
    // ignore for now
  }
}

