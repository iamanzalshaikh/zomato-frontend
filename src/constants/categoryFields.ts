import type { CaseCategoryId } from '@/constants/caseHome';

export type MenuItemAttributes = {
  unit?: string;
  weight?: string;
  brand?: string;
  requiresPrescription?: boolean;
  freshness?: string;
  packSize?: string;
};

export type CategoryFieldConfig = {
  shopMode: 'menu' | 'aisles' | 'request';
  productLabels: {
    showFoodType?: boolean;
    showSpice?: boolean;
    showAddons?: boolean;
    showUnit?: boolean;
    showWeight?: boolean;
    showBrand?: boolean;
    showRxBadge?: boolean;
    showFreshness?: boolean;
    showStock?: boolean;
  };
  emptyHint: string;
  addLabel: string;
};

export const CATEGORY_FIELDS: Record<
  Exclude<CaseCategoryId, 'ALL'>,
  CategoryFieldConfig
> = {
  RESTAURANT: {
    shopMode: 'menu',
    productLabels: {
      showFoodType: true,
      showSpice: true,
      showAddons: true,
      showStock: true,
    },
    emptyHint: 'No dishes available yet',
    addLabel: 'ADD',
  },
  PHARMACY: {
    shopMode: 'aisles',
    productLabels: {
      showUnit: true,
      showRxBadge: true,
      showBrand: true,
      showStock: true,
    },
    emptyHint: 'No pharmacy items yet',
    addLabel: 'ADD',
  },
  GROCERY: {
    shopMode: 'aisles',
    productLabels: {
      showWeight: true,
      showUnit: true,
      showFreshness: true,
      showStock: true,
    },
    emptyHint: 'No grocery items yet',
    addLabel: 'ADD',
  },
  STORE: {
    shopMode: 'aisles',
    productLabels: {
      showBrand: true,
      showUnit: true,
      showStock: true,
    },
    emptyHint: 'No store items yet',
    addLabel: 'ADD',
  },
  GET_ANYTHING: {
    shopMode: 'request',
    productLabels: {},
    emptyHint: 'Describe what you need',
    addLabel: 'Request',
  },
};

export function getCategoryFields(businessType?: string | null): CategoryFieldConfig {
  const key = (businessType ?? 'RESTAURANT').toUpperCase() as Exclude<CaseCategoryId, 'ALL'>;
  return CATEGORY_FIELDS[key] ?? CATEGORY_FIELDS.RESTAURANT;
}

export function formatProductMeta(
  businessType: string | undefined | null,
  attrs?: MenuItemAttributes | null,
  foodType?: string | null,
): string[] {
  const cfg = getCategoryFields(businessType);
  const tags: string[] = [];
  if (cfg.productLabels.showFoodType && foodType) {
    tags.push(foodType === 'veg' ? 'Veg' : foodType === 'egg' ? 'Egg' : 'Non-veg');
  }
  if (cfg.productLabels.showWeight && attrs?.weight) tags.push(attrs.weight);
  if (cfg.productLabels.showUnit && (attrs?.unit || attrs?.packSize)) {
    tags.push(attrs?.packSize || attrs?.unit || '');
  }
  if (cfg.productLabels.showBrand && attrs?.brand) tags.push(attrs.brand);
  if (cfg.productLabels.showFreshness && attrs?.freshness) tags.push(attrs.freshness);
  if (cfg.productLabels.showRxBadge && attrs?.requiresPrescription) tags.push('Rx may be required');
  return tags.filter(Boolean);
}
