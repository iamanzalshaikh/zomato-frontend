import { apiFetch } from '@/lib/apiFetch';

export async function createReview(input: {
  orderId: string;
  restaurantRating?: number;
  deliveryRating?: number;
  foodRating?: number;
  reviewText?: string;
}) {
  const body = await apiFetch('/reviews', { method: 'POST', body: JSON.stringify(input) });
  return (body as any)?.data?.review ?? (body as any)?.data;
}

export async function fetchRestaurantReviews(restaurantId: string, page = 1, limit = 10) {
  const qs = `?${new URLSearchParams({ page: String(page), limit: String(limit) }).toString()}`;
  const body = await apiFetch(`/reviews/restaurant/${restaurantId}${qs}`);
  return (body as any)?.data?.reviews ?? [];
}

