import { apiFetch } from '@/lib/apiFetch';

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

export async function fetchPlaceSuggestions(
  query: string,
  coords?: { latitude: number; longitude: number },
): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query.trim() });
  if (coords) {
    params.set('lat', String(coords.latitude));
    params.set('lng', String(coords.longitude));
  }
  const body = await apiFetch(`/restaurants/places/autocomplete?${params.toString()}`);
  const suggestions = (body as { data?: { suggestions?: PlaceSuggestion[] } })?.data?.suggestions;
  return Array.isArray(suggestions) ? suggestions : [];
}

export async function fetchPlaceDetails(placeId: string) {
  const body = await apiFetch(`/restaurants/places/details/${encodeURIComponent(placeId)}`);
  return (body as { data?: { place?: { latitude: number; longitude: number; formattedAddress: string } } })
    ?.data?.place;
}
