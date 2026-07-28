import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import type { Cart, CartLine } from '@/services/cart';
import type { CaseOrderItemInput, PlaceCaseOrderInput } from '@/services/caseOrders';
import { storageGetItem, storageRemoveItem, storageSetItem } from '@/lib/storage';
import { useCaseCartStore } from '@/stores/caseCart';

const DELIVERY_POINT_KEY = 'case.deliveryPointId';
const DELIVERY_POINT_NAME_KEY = 'case.deliveryPointName';
const GET_ANYTHING_KEY = 'case.getAnythingDraft';
const REORDER_KEY = 'case.reorderDraft';
const PAYMENT_METHOD_KEY = 'case.paymentMethod';
const COUPON_CODE_KEY = 'case.couponCode';

/** In-memory mirrors so cart/checkout don't wait on storage every mount. */
const mem = {
  paymentMethod: undefined as 'COD' | 'BANK_TRANSFER' | undefined,
  couponCode: undefined as string | undefined,
  deliveryPointId: undefined as string | null | undefined,
  deliveryPointName: undefined as string | null | undefined,
};

export type CasePaymentMethod = 'COD' | 'BANK_TRANSFER';

/** Shared across Cart and Checkout so a choice made on one screen carries to the other. */
export async function getSelectedPaymentMethod(): Promise<CasePaymentMethod> {
  if (mem.paymentMethod !== undefined) return mem.paymentMethod;
  const raw = await storageGetItem(PAYMENT_METHOD_KEY);
  mem.paymentMethod = raw === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'COD';
  return mem.paymentMethod;
}

export async function setSelectedPaymentMethod(method: CasePaymentMethod): Promise<void> {
  mem.paymentMethod = method;
  await storageSetItem(PAYMENT_METHOD_KEY, method);
}

/** Shared across Cart and Checkout so a coupon typed on one screen carries to the other. */
export async function getSelectedCouponCode(): Promise<string> {
  if (mem.couponCode !== undefined) return mem.couponCode;
  mem.couponCode = (await storageGetItem(COUPON_CODE_KEY)) ?? '';
  return mem.couponCode;
}

export async function setSelectedCouponCode(code: string): Promise<void> {
  mem.couponCode = code;
  if (code) await storageSetItem(COUPON_CODE_KEY, code);
  else await storageRemoveItem(COUPON_CODE_KEY);
}

export type GetAnythingDraft = {
  note: string;
  tip: number;
  estimatedPrice: number;
};

export async function getSelectedDeliveryPointId(): Promise<string | null> {
  if (mem.deliveryPointId !== undefined) return mem.deliveryPointId;
  mem.deliveryPointId = await storageGetItem(DELIVERY_POINT_KEY);
  return mem.deliveryPointId;
}

export async function getSelectedDeliveryPointName(): Promise<string | null> {
  if (mem.deliveryPointName !== undefined) return mem.deliveryPointName;
  mem.deliveryPointName = await storageGetItem(DELIVERY_POINT_NAME_KEY);
  return mem.deliveryPointName;
}

export async function setSelectedDeliveryPoint(id: string, name: string): Promise<void> {
  mem.deliveryPointId = id;
  mem.deliveryPointName = name;
  await storageSetItem(DELIVERY_POINT_KEY, id);
  await storageSetItem(DELIVERY_POINT_NAME_KEY, name);
}

export async function clearSelectedDeliveryPoint(): Promise<void> {
  mem.deliveryPointId = null;
  mem.deliveryPointName = null;
  await storageRemoveItem(DELIVERY_POINT_KEY);
  await storageRemoveItem(DELIVERY_POINT_NAME_KEY);
}

export async function saveGetAnythingDraft(draft: GetAnythingDraft): Promise<void> {
  await storageSetItem(GET_ANYTHING_KEY, JSON.stringify(draft));
}

export async function loadGetAnythingDraft(): Promise<GetAnythingDraft | null> {
  const raw = await storageGetItem(GET_ANYTHING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GetAnythingDraft;
  } catch {
    return null;
  }
}

export async function clearGetAnythingDraft(): Promise<void> {
  await storageRemoveItem(GET_ANYTHING_KEY);
}

export async function saveReorderDraft(items: CaseOrderItemInput[], deliveryPointId?: string | null) {
  await storageSetItem(REORDER_KEY, JSON.stringify({ items, deliveryPointId }));
}

export async function loadReorderDraft(): Promise<{
  items: CaseOrderItemInput[];
  deliveryPointId?: string | null;
} | null> {
  const raw = await storageGetItem(REORDER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearReorderDraft(): Promise<void> {
  await storageRemoveItem(REORDER_KEY);
}

function restaurantIdFromCart(cart: Cart): string {
  const r = cart.restaurantId;
  if (typeof r === 'string') return r;
  return String((r as { _id?: string; id?: string })?._id ?? (r as { id?: string })?.id ?? '');
}

export function mapCartLineToCaseItem(line: CartLine, restaurantId: string): CaseOrderItemInput {
  const item: CaseOrderItemInput = {
    itemType: 'MENU_ITEM',
    menuItemId: String(line.menuItemId ?? ''),
    restaurantId: restaurantId || undefined,
    itemName: String(line.itemName || 'Item'),
    quantity: Math.max(1, Number(line.quantity) || 1),
    price: Math.max(0, Number(line.price) || 0),
  };
  return item;
}

function sanitizeCaseItem(raw: CaseOrderItemInput): CaseOrderItemInput {
  const item: CaseOrderItemInput = {
    itemType: raw.itemType === 'CUSTOM_REQUEST' ? 'CUSTOM_REQUEST' : 'MENU_ITEM',
    itemName: String(raw.itemName || 'Item').trim() || 'Item',
    quantity: Math.max(1, Number(raw.quantity) || 1),
    price: Math.max(0, Number(raw.price) || 0),
  };
  const menuItemId = raw.menuItemId != null ? String(raw.menuItemId).trim() : '';
  if (menuItemId) item.menuItemId = menuItemId;
  const restaurantId = raw.restaurantId != null ? String(raw.restaurantId).trim() : '';
  if (restaurantId) item.restaurantId = restaurantId;
  const special = raw.specialInstructions != null ? String(raw.specialInstructions).trim() : '';
  if (special) item.specialInstructions = special;
  const note = raw.customNote != null ? String(raw.customNote).trim() : '';
  if (note) item.customNote = note;
  if (Array.isArray(raw.imageUrls) && raw.imageUrls.length) {
    item.imageUrls = raw.imageUrls.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
  }
  if (raw.backupChoiceType === 'ITEM' || raw.backupChoiceType === 'NO_SUBSTITUTE') {
    item.backupChoiceType = raw.backupChoiceType;
  }
  if (raw.backupItemId) item.backupItemId = String(raw.backupItemId);
  return item;
}

export function mapCartToCaseItems(cart: Cart | null): CaseOrderItemInput[] {
  if (CASE_CHECKOUT_ENABLED) {
    const local = useCaseCartStore.getState();
    if (local.items.length) {
      return local.items.map((line) => {
        const rid =
          line.restaurantId && line.restaurantId !== 'multi'
            ? line.restaurantId
            : local.restaurantId && local.restaurantId !== 'multi'
              ? local.restaurantId
              : undefined;
        return sanitizeCaseItem({
          itemType: 'MENU_ITEM',
          menuItemId: String(line.menuItemId ?? ''),
          restaurantId: rid,
          itemName: line.itemName,
          quantity: line.quantity,
          price: Number(line.price),
          specialInstructions: line.specialInstructions || undefined,
        });
      });
    }
  }

  if (!cart?.items?.length) return [];
  const restaurantId = restaurantIdFromCart(cart);
  return cart.items.map((line) => sanitizeCaseItem(mapCartLineToCaseItem(line, restaurantId)));
}

export function buildPlaceCaseOrderFromCart(input: {
  cart: Cart | null;
  deliveryPointId: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  notes?: string;
  tipAmount?: number;
  couponCode?: string;
  useLoyaltyFreeDelivery?: boolean;
  expressDelivery?: boolean;
  customItems?: CaseOrderItemInput[];
}): PlaceCaseOrderInput {
  const items = (input.customItems?.length ? input.customItems : mapCartToCaseItems(input.cart)).map(
    sanitizeCaseItem,
  );

  const payload: PlaceCaseOrderInput = {
    deliveryPointId: String(input.deliveryPointId),
    paymentMethod: input.paymentMethod,
    items,
  };

  const notes = input.notes != null ? String(input.notes).trim() : '';
  if (notes) payload.notes = notes;
  if (input.tipAmount != null && Number.isFinite(input.tipAmount)) {
    payload.tipAmount = Math.max(0, Number(input.tipAmount));
  }
  const coupon = input.couponCode != null ? String(input.couponCode).trim() : '';
  if (coupon) payload.couponCode = coupon;
  if (input.useLoyaltyFreeDelivery) payload.useLoyaltyFreeDelivery = true;
  if (input.expressDelivery) payload.expressDelivery = true;

  return payload;
}

export function isCaseCheckoutEnabled() {
  return CASE_CHECKOUT_ENABLED;
}
