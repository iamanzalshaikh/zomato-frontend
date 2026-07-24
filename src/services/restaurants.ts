import { apiFetch } from '@/lib/apiFetch';

export type Restaurant = {
  _id: string;
  restaurantName: string;
  description?: string;
  logo?: string;
  bannerImages?: string[];
  cuisines?: string[];
  tags?: string[];
  averageRating?: number;
  totalRatings?: number;
  averageDeliveryTime?: number;
  minimumOrderAmount?: number;
  isOpen?: boolean;
  distanceKm?: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function fetchRestaurants(params?: {
  page?: number;
  limit?: number;
  sort?: 'rating' | 'deliveryTime' | 'distance' | 'newest';
  lat?: number;
  lng?: number;
  cuisine?: string;
  isOpen?: boolean;
  minRating?: number;
}) {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { restaurants: Restaurant[]; pagination: PaginationMeta };
  }>(`/restaurants${qs}`);
  return body.data;
}

export async function fetchRestaurantById(restaurantId: string) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { restaurant: Restaurant };
  }>(`/restaurants/${restaurantId}`);
  return body.data.restaurant;
}

export async function fetchRecommendedRestaurants() {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { restaurants: Restaurant[] };
  }>('/restaurants/recommended');
  return body.data.restaurants;
}


