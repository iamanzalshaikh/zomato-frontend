import { apiFetch } from '@/lib/apiFetch';

export type CaseCategory = {
  id: string;
  businessType: string | null;
  label: string;
  icon?: string;
  description?: string;
  isCustomRequest?: boolean;
};

export type CaseDeliveryPoint = {
  id: string;
  campus?: string;
  name: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type CaseBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  placement?: string;
  businessType?: string | null;
  sortOrder?: number;
};

export type CaseAnnouncement = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
};

export type CasePlatformConfig = {
  supportPhone?: string;
  supportWhatsapp?: string;
  eastCampusDeliveryFee?: number;
  westCampusDeliveryFee?: number;
  multiStoreFee?: number;
  extraItemThreshold?: number;
  extraItemFee?: number;
  usdExchangeRateJmd?: number;
  usdServiceCharge?: number;
};

export type CaseBootstrap = {
  categories: CaseCategory[];
  deliveryPoints: CaseDeliveryPoint[];
  config: CasePlatformConfig;
  banners: CaseBanner[];
  announcements: CaseAnnouncement[];
  popularNearYou?: CaseMerchant[];
};

export type CaseMerchant = {
  id: string;
  _id: string;
  restaurantName: string;
  logo?: string | null;
  bannerImages?: string[];
  businessType?: string;
  averageDeliveryTime?: number;
  averageRating?: number;
  totalRatings?: number;
  minimumOrderAmount?: number;
  isOpen?: boolean;
  totalOrders?: number;
  cuisines?: string[];
};

export type CaseMerchantsResult = {
  items: CaseMerchant[];
  total: number;
  page: number;
  limit: number;
};

function normalizeId<T extends Record<string, unknown>>(item: T): T & { id: string; _id: string } {
  const raw = item as { id?: string; _id?: string };
  const id = raw._id ?? raw.id ?? '';
  return { ...item, id, _id: id };
}

function unwrapData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function normalizeCategory(item: Record<string, unknown>): CaseCategory {
  const n = normalizeId(item);
  return {
    id: String(n.id),
    businessType: (n.businessType as string | null) ?? null,
    label: String(n.label ?? n.id),
    icon: n.icon as string | undefined,
    description: n.description as string | undefined,
    isCustomRequest: Boolean(n.isCustomRequest),
  };
}

function normalizeDeliveryPoint(item: Record<string, unknown>): CaseDeliveryPoint {
  const n = normalizeId(item);
  return {
    id: String(n.id),
    campus: n.campus as string | undefined,
    name: String(n.name ?? 'Campus'),
    icon: n.icon as string | undefined,
    isActive: n.isActive as boolean | undefined,
    sortOrder: n.sortOrder as number | undefined,
  };
}

function normalizeBanner(item: Record<string, unknown>): CaseBanner {
  const n = normalizeId(item);
  return {
    id: String(n.id),
    title: String(n.title ?? ''),
    subtitle: (n.subtitle as string | null) ?? null,
    ctaText: (n.ctaText as string | null) ?? null,
    imageUrl: String(n.imageUrl ?? ''),
    linkUrl: (n.linkUrl as string | null) ?? null,
    placement: (n.placement as string | undefined) ?? undefined,
    businessType: (n.businessType as string | null) ?? null,
    sortOrder: n.sortOrder as number | undefined,
  };
}

function normalizeAnnouncement(item: Record<string, unknown>): CaseAnnouncement {
  const n = normalizeId(item);
  return {
    id: String(n.id),
    title: n.title as string | undefined,
    message: (n.message ?? n.body) as string | undefined,
    body: n.body as string | undefined,
  };
}

function normalizeMerchant(item: Record<string, unknown>): CaseMerchant {
  const n = normalizeId(item);
  return {
    id: String(n.id),
    _id: String(n._id),
    restaurantName: String(n.restaurantName ?? 'Store'),
    logo: (n.logo as string | null) ?? null,
    bannerImages: (n.bannerImages as string[]) ?? [],
    businessType: n.businessType as string | undefined,
    averageDeliveryTime: Number(n.averageDeliveryTime ?? 25),
    averageRating: Number(n.averageRating ?? 0),
    totalRatings: n.totalRatings != null ? Number(n.totalRatings) : undefined,
    minimumOrderAmount: n.minimumOrderAmount != null ? Number(n.minimumOrderAmount) : undefined,
    isOpen: n.isOpen as boolean | undefined,
    totalOrders: n.totalOrders as number | undefined,
    cuisines: (n.cuisines as string[]) ?? [],
  };
}

export async function fetchCaseBootstrap(): Promise<CaseBootstrap> {
  const body = await apiFetch('/public/bootstrap');
  const data = unwrapData<Record<string, unknown>>(body);

  const categoriesRaw = (data.categories as Record<string, unknown>[]) ?? [];
  const deliveryPointsRaw = (data.deliveryPoints as Record<string, unknown>[]) ?? [];
  const bannersRaw = (data.banners as Record<string, unknown>[]) ?? [];
  const announcementsRaw = (data.announcements as Record<string, unknown>[]) ?? [];
  const popularRaw = (data.popularNearYou as Record<string, unknown>[]) ?? [];

  return {
    categories: categoriesRaw.map(normalizeCategory),
    deliveryPoints: deliveryPointsRaw.map(normalizeDeliveryPoint),
    config: (data.config as CasePlatformConfig) ?? {},
    banners: bannersRaw.map(normalizeBanner),
    announcements: announcementsRaw.map(normalizeAnnouncement),
    popularNearYou: popularRaw.map(normalizeMerchant),
  };
}

export async function fetchCaseBanners(params: {
  placement: 'HOME' | 'CATEGORY' | 'RESTAURANT' | 'CHECKOUT';
  businessType?: string;
}): Promise<CaseBanner[]> {
  const qs = new URLSearchParams();
  qs.set('placement', params.placement);
  if (params.businessType) qs.set('businessType', params.businessType);
  const body = await apiFetch(`/public/banners?${qs.toString()}`);
  const data = unwrapData<{ banners?: Record<string, unknown>[] }>(body);
  const list = data.banners ?? [];
  return list.map(normalizeBanner);
}

export async function fetchCaseCategories(): Promise<CaseCategory[]> {
  const body = await apiFetch('/public/categories');
  const data = unwrapData<Record<string, unknown>[] | { categories?: Record<string, unknown>[] }>(body);
  const list = Array.isArray(data) ? data : data.categories ?? [];
  return list.map(normalizeCategory);
}

export async function fetchCaseMerchants(params?: {
  businessType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CaseMerchantsResult> {
  const qs = new URLSearchParams();
  if (params?.businessType) qs.set('businessType', params.businessType);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));

  const query = qs.toString();
  const body = await apiFetch(`/public/merchants${query ? `?${query}` : ''}`);
  const data = unwrapData<{
    items?: Record<string, unknown>[];
    total?: number;
    page?: number;
    limit?: number;
  }>(body);

  const itemsRaw = data.items ?? [];
  return {
    items: itemsRaw.map(normalizeMerchant),
    total: data.total ?? itemsRaw.length,
    page: data.page ?? params?.page ?? 1,
    limit: data.limit ?? params?.limit ?? 20,
  };
}

export async function fetchCasePopularNearYou(params?: {
  businessType?: string;
  limit?: number;
}): Promise<{ items: CaseMerchant[]; total: number; sponsoredCount: number }> {
  const qs = new URLSearchParams();
  if (params?.businessType) qs.set('businessType', params.businessType);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const body = await apiFetch(`/public/popular-near-you${query ? `?${query}` : ''}`);
  const data = unwrapData<{
    items?: Record<string, unknown>[];
    total?: number;
    sponsoredCount?: number;
  }>(body);
  const items = (data.items ?? []).map(normalizeMerchant);
  return {
    items,
    total: data.total ?? items.length,
    sponsoredCount: data.sponsoredCount ?? 0,
  };
}

export async function fetchCaseDeliveryPoints(): Promise<CaseDeliveryPoint[]> {
  const body = await apiFetch('/public/delivery-points');
  const data = unwrapData<Record<string, unknown>[]>(body);
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeDeliveryPoint);
}

export type CaseMenuItem = {
  id: string;
  _id: string;
  restaurantId: string;
  categoryId: string;
  itemName: string;
  description?: string;
  images?: string[];
  price: number;
  discountedPrice?: number | null;
  foodType?: string;
  isAvailable?: boolean;
  isSoldOut?: boolean;
  stockStatus?: string;
  requiresBackup?: boolean;
  attributes?: {
    unit?: string;
    weight?: string;
    brand?: string;
    requiresPrescription?: boolean;
    freshness?: string;
    packSize?: string;
  } | null;
  backups?: Array<{ id: string; name: string; price: number }>;
  addons?: Array<{ name: string; price: number; isAvailable: boolean }>;
};

export type CaseMerchantMenu = {
  id: string;
  _id: string;
  restaurantName: string;
  logo?: string | null;
  businessType?: string;
  isOpen?: boolean;
  categories?: Array<{ id: string; name: string; sortOrder?: number }>;
  items: CaseMenuItem[];
};

export async function fetchCaseMerchantMenu(merchantId: string): Promise<CaseMerchantMenu> {
  const body = await apiFetch(`/case/merchants/${merchantId}/menu`);
  const data = unwrapData<Record<string, unknown>>(body);
  const itemsRaw = (data.items as Record<string, unknown>[]) ?? [];
  const items = itemsRaw.map((item) => {
    const n = normalizeId(item);
    return {
      id: String(n.id),
      _id: String(n._id),
      restaurantId: String(n.restaurantId ?? merchantId),
      categoryId: String(n.categoryId ?? ''),
      itemName: String(n.itemName ?? 'Item'),
      description: n.description as string | undefined,
      images: (n.images as string[]) ?? [],
      price: Number(n.price ?? 0),
      discountedPrice:
        n.discountedPrice != null ? Number(n.discountedPrice) : null,
      foodType: n.foodType as string | undefined,
      isAvailable: n.isAvailable !== false && n.isSoldOut !== true,
      isSoldOut: Boolean(n.isSoldOut),
      stockStatus: n.stockStatus as string | undefined,
      requiresBackup: Boolean(n.requiresBackup),
      attributes: (n.attributes as CaseMenuItem['attributes']) ?? null,
      backups: (n.backups as CaseMenuItem['backups']) ?? [],
      addons: (n.addons as CaseMenuItem['addons']) ?? [],
    } satisfies CaseMenuItem;
  });

  return {
    id: String(data.id ?? data._id ?? merchantId),
    _id: String(data._id ?? data.id ?? merchantId),
    restaurantName: String(data.restaurantName ?? 'Store'),
    logo: (data.logo as string | null) ?? null,
    businessType: data.businessType as string | undefined,
    isOpen: data.isOpen as boolean | undefined,
    categories: (data.categories as CaseMerchantMenu['categories']) ?? [],
    items,
  };
}

export type CaseFaq = { q: string; a: string } | { question: string; answer: string };

export async function fetchCaseFaq(): Promise<CaseFaq[]> {
  const body = await apiFetch('/public/faq');
  const data = unwrapData<CaseFaq[] | { faqs?: CaseFaq[] }>(body);
  return Array.isArray(data) ? data : data.faqs ?? [];
}

export type CaseSupportInfo = {
  supportPhone?: string;
  supportWhatsapp?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
};

export async function fetchCaseSupport(): Promise<CaseSupportInfo> {
  const body = await apiFetch('/public/support');
  const data = unwrapData<CaseSupportInfo>(body) ?? {};
  return {
    ...data,
    supportPhone: data.supportPhone ?? data.phone,
    supportWhatsapp: data.supportWhatsapp ?? data.whatsapp,
  };
}

export async function fetchCaseTerms(): Promise<{ title?: string; content?: string; body?: string }> {
  const body = await apiFetch('/public/terms');
  return unwrapData(body) ?? {};
}
