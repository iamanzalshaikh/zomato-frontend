import { apiFetch } from '@/lib/apiFetch';

export async function searchGlobal(q: string) {
  const qs = q ? `?${new URLSearchParams({ q }).toString()}` : '';
  const body = await apiFetch(`/search${qs}`);
  return (body as any)?.data ?? {};
}

export async function fetchTrendingSearches() {
  const body = await apiFetch('/search/trending');
  return ((body as any)?.data?.trending ?? []) as { query: string; count: number }[];
}


