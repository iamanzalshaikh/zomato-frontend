import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import {
  addToCart,
  applyCoupon,
  clearCart,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
  updateCartPreferences,
  type Cart,
} from '@/services/cart';
import { ensureCaseCartPrices } from '@/lib/repairCaseCartPrices';
import { useCaseCartStore, getCaseCartSnapshot } from '@/stores/caseCart';
import { fetchCaseMerchantMenu } from '@/services/case';
import { clearReorderDraft } from '@/lib/caseCheckout';

export const cartKeys = {
  all: ['cart'] as const,
};

// Select each primitive field individually (Zustand keeps these referentially
// stable across renders) and derive the Cart via useMemo — calling
// s.asCart() directly as a selector allocates a new object every read, which
// makes useSyncExternalStore see an unstable snapshot and can spiral into
// "Maximum update depth exceeded".
function useCaseCartAsQueryData(): Cart | null {
  const items = useCaseCartStore((s) => s.items);
  const restaurantId = useCaseCartStore((s) => s.restaurantId);
  const restaurantName = useCaseCartStore((s) => s.restaurantName);
  const generalNote = useCaseCartStore((s) => s.generalNote);
  const dontSendCutlery = useCaseCartStore((s) => s.dontSendCutlery);

  // Auto-heal legacy lines saved with price=0; drop any that stay unpriced.
  useEffect(() => {
    if (!CASE_CHECKOUT_ENABLED) return;
    if (!items.some((i) => !(Number(i.price) > 0))) return;
    void ensureCaseCartPrices().catch(() => {});
  }, [items]);

  return useMemo<Cart | null>(() => {
    if (!items.length) return null;
    const storeIds = [...new Set(items.map((i) => i.restaurantId).filter(Boolean))];
    const primaryId = restaurantId && restaurantId !== 'multi' ? restaurantId : storeIds[0] ?? 'multi';
    const primaryName =
      storeIds.length > 1
        ? `${storeIds.length} stores`
        : restaurantName ?? items.find((i) => i.restaurantId === primaryId)?.restaurantName ?? 'Store';
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    return {
      _id: 'case-local-cart',
      restaurantId: { _id: primaryId, restaurantName: primaryName },
      items: items.map((line) => ({
        _id: line._id,
        menuItemId: line.menuItemId,
        itemName: line.itemName,
        quantity: line.quantity,
        price: line.price,
        total: line.total,
        addons: line.addons,
        // retained for multi-store billing (extra fields ok on runtime objects)
        restaurantId: line.restaurantId,
        restaurantName: line.restaurantName,
      })) as Cart['items'],
      subtotal,
      total: subtotal,
      grandTotal: subtotal,
      dontSendCutlery,
      isVipMode: false,
      generalNote,
    };
  }, [items, restaurantId, restaurantName, generalNote, dontSendCutlery]);
}

export function useCartQuery() {
  const caseCart = useCaseCartAsQueryData();

  const classic = useQuery({
    queryKey: cartKeys.all,
    queryFn: fetchCart,
    staleTime: 30_000,
    refetchOnMount: false,
    enabled: !CASE_CHECKOUT_ENABLED,
  });

  if (CASE_CHECKOUT_ENABLED) {
    return {
      ...classic,
      data: caseCart,
      isLoading: false,
      isFetching: false,
      refetch: async () => ({ data: getCaseCartSnapshot() }) as any,
    };
  }

  return classic;
}

export function useAddToCartMutation() {
  const qc = useQueryClient();
  const addLocal = useCaseCartStore((s) => s.addItem);

  return useMutation({
    mutationFn: async (input: {
      restaurantId: string;
      menuItemId: string;
      quantity: number;
      addons?: { name: string; price: number }[];
      specialInstructions?: string;
      itemName?: string;
      price?: number;
      restaurantName?: string;
    }) => {
      if (CASE_CHECKOUT_ENABLED) {
        const addonExtra = (input.addons ?? []).reduce((s, a) => s + Number(a.price ?? 0), 0);
        let unit = Number(input.price ?? 0) + addonExtra;
        let itemName = input.itemName ?? 'Item';
        let restaurantName = input.restaurantName;

        // If caller forgot price, resolve from merchant menu so cart never stores 0.
        if (!(unit > 0) && input.restaurantId && input.menuItemId) {
          try {
            const menu = await fetchCaseMerchantMenu(input.restaurantId);
            const match = menu.items.find(
              (it) =>
                String(it.id) === String(input.menuItemId) ||
                String(it._id) === String(input.menuItemId),
            );
            if (match) {
              unit = Number(match.discountedPrice ?? match.price ?? 0) + addonExtra;
              if (!input.itemName || input.itemName === 'Item') itemName = match.itemName;
              if (!restaurantName) restaurantName = menu.restaurantName;
            }
          } catch {
            /* keep unit as-is; repair pass can still heal later */
          }
        }

        if (!(unit > 0)) {
          throw new Error('Item price is missing. Try again from the store menu.');
        }

        // Normal adds must not leave a reorder draft that hijacks checkout totals
        try {
          await clearReorderDraft();
        } catch {
          /* ignore */
        }

        if (__DEV__) {
          console.log('[cart] add', {
            restaurantId: input.restaurantId,
            menuItemId: input.menuItemId,
            itemName,
            price: unit,
            qty: input.quantity,
          });
        }

        addLocal({
          restaurantId: input.restaurantId,
          restaurantName,
          menuItemId: input.menuItemId,
          itemName,
          quantity: input.quantity,
          price: unit,
          specialInstructions: input.specialInstructions,
        });
        return getCaseCartSnapshot();
      }
      return addToCart(input);
    },
    onSuccess: (cart) => {
      if (!CASE_CHECKOUT_ENABLED) {
        if (cart) qc.setQueryData(cartKeys.all, cart);
        else void qc.invalidateQueries({ queryKey: cartKeys.all });
      }
    },
  });
}

export function useUpdateCartItemMutation() {
  const qc = useQueryClient();
  const updateLocal = useCaseCartStore((s) => s.updateQuantity);

  return useMutation({
    mutationFn: async (input: { itemId: string; quantity: number }) => {
      if (CASE_CHECKOUT_ENABLED) {
        updateLocal(input.itemId, input.quantity);
        return getCaseCartSnapshot();
      }
      return updateCartItem(input);
    },
    onSuccess: (cart) => {
      if (!CASE_CHECKOUT_ENABLED && cart) qc.setQueryData(cartKeys.all, cart);
    },
  });
}

export function useRemoveCartItemMutation() {
  const qc = useQueryClient();
  const removeLocal = useCaseCartStore((s) => s.removeItem);

  return useMutation({
    mutationFn: async (input: { itemId: string }) => {
      if (CASE_CHECKOUT_ENABLED) {
        removeLocal(input.itemId);
        return getCaseCartSnapshot();
      }
      return removeCartItem(input);
    },
    onSuccess: (cart) => {
      if (!CASE_CHECKOUT_ENABLED) {
        if (cart) qc.setQueryData(cartKeys.all, cart);
        else qc.setQueryData(cartKeys.all, null);
      }
    },
  });
}

export function useClearCartMutation() {
  const qc = useQueryClient();
  const clearLocal = useCaseCartStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      if (CASE_CHECKOUT_ENABLED) {
        clearLocal();
        return;
      }
      await clearCart();
    },
    onSuccess: () => {
      if (!CASE_CHECKOUT_ENABLED) qc.setQueryData(cartKeys.all, null);
    },
  });
}

export function useApplyCouponMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyCoupon,
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(cartKeys.all, cart);
    },
  });
}

export function useRemoveCouponMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeCoupon,
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(cartKeys.all, cart);
    },
  });
}

export function useUpdateCartPreferencesMutation() {
  const qc = useQueryClient();
  const setNote = useCaseCartStore((s) => s.setNote);
  const setDontSendCutlery = useCaseCartStore((s) => s.setDontSendCutlery);

  return useMutation({
    mutationFn: async (input: {
      generalNote?: string;
      dontSendCutlery?: boolean;
      isVipMode?: boolean;
    }) => {
      if (CASE_CHECKOUT_ENABLED) {
        if (input.generalNote !== undefined) setNote(input.generalNote);
        if (input.dontSendCutlery !== undefined) setDontSendCutlery(input.dontSendCutlery);
        return getCaseCartSnapshot();
      }
      return updateCartPreferences(input);
    },
    onSuccess: (cart) => {
      if (cart && !CASE_CHECKOUT_ENABLED) qc.setQueryData(cartKeys.all, cart);
    },
  });
}
