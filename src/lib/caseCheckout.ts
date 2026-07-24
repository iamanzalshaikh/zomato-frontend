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

export type CasePaymentMethod = 'COD' | 'BANK_TRANSFER';

/** Shared across Cart and Checkout so a choice made on one screen carries to the other. */
export async function getSelectedPaymentMethod(): Promise<CasePaymentMethod> {
  const raw = await storageGetItem(PAYMENT_METHOD_KEY);
  return raw === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'COD';
}

export async function setSelectedPaymentMethod(method: CasePaymentMethod): Promise<void> {
  await storageSetItem(PAYMENT_METHOD_KEY, method);
}

/** Shared across Cart and Checkout so a coupon typed on one screen carries to the other. */
export async function getSelectedCouponCode(): Promise<string> {
  return (await storageGetItem(COUPON_CODE_KEY)) ?? '';
}

export async function setSelectedCouponCode(code: string): Promise<void> {
  if (code) await storageSetItem(COUPON_CODE_KEY, code);
  else await storageRemoveItem(COUPON_CODE_KEY);
}

export type GetAnythingDraft = {
  note: string;
  tip: number;
  estimatedPrice: number;
};

export async function getSelectedDeliveryPointId(): Promise<string | null> {
  return storageGetItem(DELIVERY_POINT_KEY);
}

export async function getSelectedDeliveryPointName(): Promise<string | null> {
  return storageGetItem(DELIVERY_POINT_NAME_KEY);
}

export async function setSelectedDeliveryPoint(id: string, name: string): Promise<void> {
  await storageSetItem(DELIVERY_POINT_KEY, id);
  await storageSetItem(DELIVERY_POINT_NAME_KEY, name);
}

export async function clearSelectedDeliveryPoint(): Promise<void> {
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
  return {
    itemType: 'MENU_ITEM',
    menuItemId: String(line.menuItemId),
    restaurantId,
    itemName: line.itemName,
    quantity: line.quantity,
    price: Number(line.price),
    specialInstructions: undefined,
  };
}

export function mapCartToCaseItems(cart: Cart | null): CaseOrderItemInput[] {
  if (CASE_CHECKOUT_ENABLED) {
    const local = useCaseCartStore.getState();
    if (local.items.length) {
      return local.items.map((line) => ({
        itemType: 'MENU_ITEM' as const,
        menuItemId: String(line.menuItemId),
        restaurantId: line.restaurantId,
        itemName: line.itemName,
        quantity: line.quantity,
        price: Number(line.price),
        specialInstructions: line.specialInstructions,
      }));
    }
  }

  if (!cart?.items?.length) return [];
  const restaurantId = restaurantIdFromCart(cart);
  return cart.items.map((line) => mapCartLineToCaseItem(line, restaurantId));
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
  const items = input.customItems?.length
    ? input.customItems
    : mapCartToCaseItems(input.cart);

  return {
    deliveryPointId: input.deliveryPointId,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    tipAmount: input.tipAmount,
    couponCode: input.couponCode,
    useLoyaltyFreeDelivery: input.useLoyaltyFreeDelivery,
    expressDelivery: input.expressDelivery,
    items,
  };
}

export function isCaseCheckoutEnabled() {
  return CASE_CHECKOUT_ENABLED;
}
