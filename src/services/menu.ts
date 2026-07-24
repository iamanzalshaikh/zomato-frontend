import { apiFetch } from '@/lib/apiFetch';

export type MenuItem = {
  _id: string;
  restaurantId: string;
  categoryId: string;
  itemName: string;
  description?: string;
  shortDescription?: string;
  images?: string[];
  price: number;
  discountedPrice?: number;
  foodType?: string;
  isAvailable?: boolean;
  isRecommended?: boolean;
  preparationTimeMinutes?: number;
  addons?: Array<{ name: string; price: number; isAvailable: boolean }>;
};

export type ComboItem = {
  id: string;
  title: string;
  image: string;
  price: number;
  tag: string;
  foodType: string;
  mainItem: MenuItem;
};

export async function fetchMenuItemsByRestaurant(restaurantId: string) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { items: MenuItem[] };
  }>(`/menu/items/${restaurantId}`);
  return body.data.items;
}

export async function fetchCombosByRestaurant(restaurantId: string) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { combos: ComboItem[] };
  }>(`/menu/items/combos/${restaurantId}`);
  return body.data.combos;
}

export async function fetchMenuItemDetails(itemId: string) {
  const body = await apiFetch<{
    success: true;
    message: string;
    data: { item: MenuItem };
  }>(`/menu/items/details/${itemId}`);
  return body.data.item;
}

