import { useMemo } from 'react';
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
import { useCaseCartStore, getCaseCartSnapshot } from '@/stores/caseCart';

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

  return useMemo<Cart | null>(() => {
    if (!items.length || !restaurantId) return null;
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    return {
      _id: 'case-local-cart',
      restaurantId: { _id: restaurantId, restaurantName: restaurantName ?? 'Store' },
      items: items.map(({ restaurantId: _r, restaurantName: _n, specialInstructions: _s, ...line }) => line),
      subtotal,
      total: subtotal,
      grandTotal: subtotal,
      dontSendCutlery: false,
      isVipMode: false,
      generalNote,
    };
  }, [items, restaurantId, restaurantName, generalNote]);
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
        const unit = Number(input.price ?? 0) + addonExtra;
        addLocal({
          restaurantId: input.restaurantId,
          restaurantName: input.restaurantName,
          menuItemId: input.menuItemId,
          itemName: input.itemName ?? 'Item',
          quantity: input.quantity,
          price: unit > 0 ? unit : Number(input.price ?? 0),
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
  return useMutation({
    mutationFn: updateCartPreferences,
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(cartKeys.all, cart);
    },
  });
}
