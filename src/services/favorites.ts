import { apiFetch } from '@/lib/apiFetch';

export async function fetchFavorites() {
  const body = await apiFetch('/users/favorites');
  return (body as any)?.data?.favorites ?? [];
}

export async function addFavorite(restaurantId: string) {
  const body = await apiFetch(`/users/favorites/${restaurantId}`, { method: 'POST' });
  return (body as any)?.data;
}

export async function removeFavorite(restaurantId: string) {
  const body = await apiFetch(`/users/favorites/${restaurantId}`, { method: 'DELETE' });
  return (body as any)?.data;
}

