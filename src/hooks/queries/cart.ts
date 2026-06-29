import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const cartKeys = {
  all: ['cart'] as const,
};

export function useCartQuery() {
  return useQuery({
    queryKey: cartKeys.all,
    queryFn: fetchCart,
    staleTime: 30_000,
    refetchOnMount: false,
  });
}

export function useAddToCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addToCart,
    onSuccess: (cart) => {
      if (cart) {
        qc.setQueryData(cartKeys.all, cart);
      } else {
        void qc.invalidateQueries({ queryKey: cartKeys.all });
      }
    },
  });
}

export function useUpdateCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCartItem,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: cartKeys.all });
      const prev = qc.getQueryData<Cart | null>(cartKeys.all);
      if (prev) {
        const items = prev.items.map((line) =>
          line._id === input.itemId ? { ...line, quantity: input.quantity, total: line.price * input.quantity } : line,
        );
        qc.setQueryData(cartKeys.all, { ...prev, items });
      }
      return { prev };
    },
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(cartKeys.all, cart);
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(cartKeys.all, ctx.prev);
    },
  });
}

export function useRemoveCartItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(cartKeys.all, cart);
      else qc.setQueryData(cartKeys.all, null);
    },
  });
}

export function useClearCartMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => qc.setQueryData(cartKeys.all, null),
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
