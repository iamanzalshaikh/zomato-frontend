import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type CaseCategoryId =
  | 'ALL'
  | 'RESTAURANT'
  | 'PHARMACY'
  | 'GROCERY'
  | 'STORE'
  | 'GET_ANYTHING';

export const CASE_CATEGORY_META: Record<
  CaseCategoryId,
  { icon: IoniconName; color: string; label: string; image: string; short: string }
> = {
  ALL: {
    icon: 'apps-outline',
    color: '#F5F5F5',
    label: 'All',
    short: 'All',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&auto=format&fit=crop&q=80',
  },
  RESTAURANT: {
    icon: 'restaurant-outline',
    color: '#FFE8E0',
    label: 'Restaurants',
    short: 'Food',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80',
  },
  PHARMACY: {
    icon: 'medkit-outline',
    color: '#E8F4FF',
    label: 'Pharmacy',
    short: 'Pharmacy',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80',
  },
  GROCERY: {
    icon: 'basket-outline',
    color: '#E8F8EE',
    label: 'Groceries',
    short: 'Grocery',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
  },
  STORE: {
    icon: 'storefront-outline',
    color: '#F3E8FF',
    label: 'Stores',
    short: 'Store',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
  },
  GET_ANYTHING: {
    icon: 'sparkles-outline',
    color: '#FFF4E5',
    label: 'Get Anything',
    short: 'Anything',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=200&auto=format&fit=crop&q=80',
  },
};

/** Blinkit-style top row order on home / category switcher */
export const CASE_HOME_CATEGORY_ROW: CaseCategoryId[] = [
  'ALL',
  'RESTAURANT',
  'GROCERY',
  'PHARMACY',
  'STORE',
  'GET_ANYTHING',
];

export const CASE_SHOP_CATEGORIES: CaseCategoryId[] = [
  'RESTAURANT',
  'PHARMACY',
  'GROCERY',
  'STORE',
  'GET_ANYTHING',
];

export const CASE_SECTION_BUSINESS_TYPES: CaseCategoryId[] = [
  'RESTAURANT',
  'PHARMACY',
  'GROCERY',
  'STORE',
];

export const CASE_DEFAULT_DELIVERY_MINS = 25;

export const MERCHANT_LOGO_FALLBACKS: Record<string, string> = {
  RESTAURANT:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
  PHARMACY:
    'https://images.unsplash.com/photo-1587854692152-cf660f4c54a8?w=200&auto=format&fit=crop&q=80',
  GROCERY:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
  STORE:
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
  DEFAULT:
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=80',
};

export function getMerchantLogoUri(
  merchant: { logo?: string | null; bannerImages?: string[]; businessType?: string },
  _index = 0,
): string {
  const fromApi = merchant.logo || merchant.bannerImages?.[0];
  if (typeof fromApi === 'string' && fromApi.length > 0) return fromApi;
  const key = (merchant.businessType ?? 'DEFAULT').toUpperCase();
  return MERCHANT_LOGO_FALLBACKS[key] ?? MERCHANT_LOGO_FALLBACKS.DEFAULT;
}

export function getCategoryMeta(categoryId: string) {
  const key = categoryId.toUpperCase() as CaseCategoryId;
  return CASE_CATEGORY_META[key] ?? CASE_CATEGORY_META.ALL;
}
