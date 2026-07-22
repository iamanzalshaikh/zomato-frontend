import { apiFetch } from '@/lib/apiFetch';
import { getAccessToken } from '@/lib/storage';
import { getApiUrl } from '@/config/env';

function unwrapData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// ─── Quote ─────────────────────────────────────────────────────

export type CaseQuoteLine = {
  merchantId?: string | null;
  quantity: number;
  unitPrice: number;
};

export type CaseQuoteInput = {
  lines: CaseQuoteLine[];
  deliveryPointId?: string;
  tipAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  userId?: string;
  useLoyaltyFreeDelivery?: boolean;
  expressDelivery?: boolean;
};

export type CaseQuote = {
  subtotal: number;
  deliveryFee: number;
  multiStoreFee: number;
  extraItemFee: number;
  expressFee: number;
  tipAmount: number;
  discountAmount: number;
  couponId: string | null;
  loyaltyRedeemed: boolean;
  totalJmd: number;
  totalUsd: number;
  usdRate: number;
  usdServiceCharge: number;
  merchantCount: number;
  itemCount: number;
  campus: 'EAST' | 'WEST' | null;
};

export async function fetchCaseQuote(input: CaseQuoteInput): Promise<CaseQuote> {
  const body = await apiFetch('/public/quote', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return unwrapData<CaseQuote>(body);
}

// ─── Place / list / detail ─────────────────────────────────────

export type CaseOrderItemInput = {
  itemType?: 'MENU_ITEM' | 'CUSTOM_REQUEST';
  menuItemId?: string;
  restaurantId?: string;
  itemName: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  customNote?: string;
  imageUrls?: string[];
  backupChoiceType?: 'ITEM' | 'NO_SUBSTITUTE';
  backupItemId?: string;
};

export type PlaceCaseOrderInput = {
  deliveryPointId: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  notes?: string;
  tipAmount?: number;
  couponCode?: string;
  payInUsd?: boolean;
  useLoyaltyFreeDelivery?: boolean;
  expressDelivery?: boolean;
  items: CaseOrderItemInput[];
};

export type CaseOrder = {
  id: string;
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  multiStoreFee: number;
  extraItemFee: number;
  surgeFee?: number;
  expressFee?: number;
  tipAmount: number;
  couponDiscount: number;
  grandTotal: number;
  totalUsd?: number | null;
  notes?: string | null;
  estimatedPreparationTime?: number | null;
  createdAt?: string;
  deliveryPoint?: {
    id?: string;
    name?: string;
    campus?: string;
  } | null;
  items?: Array<{
    id?: string;
    itemName?: string;
    quantity?: number;
    price?: number | string;
    itemType?: string;
    menuItemId?: string;
    restaurantId?: string;
    customNote?: string | null;
  }>;
  payment?: {
    id?: string;
    status?: string;
    receiptUrls?: string[];
    method?: string;
  } | null;
  restaurant?: { id?: string; restaurantName?: string; logo?: string } | null;
  riderId?: string | null;
};

export async function placeCaseOrder(input: PlaceCaseOrderInput): Promise<CaseOrder> {
  const body = await apiFetch('/orders/case', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = unwrapData<CaseOrder | { order?: CaseOrder }>(body);
  if (data && typeof data === 'object' && 'order' in data && data.order) {
    return { ...data.order, id: data.order.id ?? data.order._id, _id: data.order._id ?? data.order.id };
  }
  const order = data as CaseOrder;
  return { ...order, id: order.id ?? order._id, _id: order._id ?? order.id };
}

export async function fetchCaseOrders(): Promise<CaseOrder[]> {
  const body = await apiFetch('/orders/case');
  const data = unwrapData<CaseOrder[] | { orders?: CaseOrder[] }>(body);
  const list = Array.isArray(data) ? data : data.orders ?? [];
  return list.map((o) => ({ ...o, id: o.id ?? o._id, _id: o._id ?? o.id }));
}

export async function fetchCaseOrderById(orderId: string): Promise<CaseOrder> {
  const body = await apiFetch(`/orders/case/${orderId}`);
  const data = unwrapData<CaseOrder>(body);
  return { ...data, id: data.id ?? data._id, _id: data._id ?? data.id };
}

export async function editCaseOrder(
  orderId: string,
  input: Partial<PlaceCaseOrderInput> & { items?: CaseOrderItemInput[] },
): Promise<CaseOrder> {
  const body = await apiFetch(`/orders/case/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = unwrapData<CaseOrder>(body);
  return { ...data, id: data.id ?? data._id, _id: data._id ?? data.id };
}

export async function cancelCaseOrder(orderId: string, reason?: string): Promise<CaseOrder> {
  const body = await apiFetch(`/orders/case/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  const data = unwrapData<CaseOrder>(body);
  return { ...data, id: data.id ?? data._id, _id: data._id ?? data.id };
}

export async function uploadCaseBankReceipts(
  orderId: string,
  receiptUrls: string[],
): Promise<{ order: CaseOrder; payment: unknown }> {
  const body = await apiFetch(`/orders/case/${orderId}/receipts`, {
    method: 'POST',
    body: JSON.stringify({ receiptUrls }),
  });
  return unwrapData(body);
}

/** Absolute URL for receipt PDF (caller must send Authorization). */
export function getCaseReceiptPdfPath(orderId: string): string {
  return `/orders/case/${orderId}/receipt.pdf`;
}

export async function fetchCaseReceiptPdfBlob(orderId: string): Promise<Blob> {
  const url = `${getApiUrl()}${getCaseReceiptPdfPath(orderId)}`;
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to download receipt (${res.status})`);
  return res.blob();
}

// ─── Chat ──────────────────────────────────────────────────────

export type CaseChatMessage = {
  id: string;
  _id?: string;
  body: string;
  senderRole?: string;
  senderId?: string;
  createdAt?: string;
};

export async function fetchCaseOrderChat(orderId: string): Promise<CaseChatMessage[]> {
  const body = await apiFetch(`/case/orders/${orderId}/chat`);
  const data = unwrapData<CaseChatMessage[] | { messages?: CaseChatMessage[] }>(body);
  const list = Array.isArray(data) ? data : data.messages ?? [];
  return list.map((m) => ({ ...m, id: m.id ?? m._id ?? '' }));
}

export async function sendCaseOrderChat(orderId: string, message: string): Promise<CaseChatMessage> {
  const body = await apiFetch(`/case/orders/${orderId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ body: message }),
  });
  return unwrapData<CaseChatMessage>(body);
}

// ─── Reviews / reorder / push ──────────────────────────────────

export async function createCaseReview(input: {
  orderId: string;
  merchantId?: string;
  overallRating: number;
  merchantRating?: number;
  riderRating?: number;
  comment?: string;
}) {
  const body = await apiFetch('/case/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return unwrapData(body);
}

export type CaseReorderPayload = {
  deliveryPointId?: string | null;
  items: CaseOrderItemInput[];
};

export async function fetchCaseReorder(orderId: string): Promise<CaseReorderPayload> {
  const body = await apiFetch(`/case/orders/${orderId}/reorder`);
  return unwrapData<CaseReorderPayload>(body);
}

export async function registerCasePushToken(
  token: string,
  platform?: 'android' | 'ios' | 'web',
) {
  const body = await apiFetch('/case/users/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
  return unwrapData(body);
}
