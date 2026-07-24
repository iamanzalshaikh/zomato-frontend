import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Cart, CartLine } from '@/services/cart';
import { storageGetItem, storageRemoveItem, storageSetItem } from '@/lib/storage';

export type CaseCartLine = CartLine & {
  restaurantId: string;
  restaurantName?: string;
  specialInstructions?: string;
};

type CaseCartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CaseCartLine[];
  generalNote: string;
  addItem: (input: {
    restaurantId: string;
    restaurantName?: string;
    menuItemId: string;
    itemName: string;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clear: () => void;
  setNote: (note: string) => void;
  asCart: () => Cart | null;
};

const zustandStorage = {
  getItem: async (name: string) => storageGetItem(name),
  setItem: async (name: string, value: string) => storageSetItem(name, value),
  removeItem: async (name: string) => storageRemoveItem(name),
};

function lineId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function recalc(items: CaseCartLine[]): CaseCartLine[] {
  return items.map((it) => ({
    ...it,
    total: Number(it.price) * Number(it.quantity),
  }));
}

export const useCaseCartStore = create<CaseCartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],
      generalNote: '',

      addItem: (input) => {
        const state = get();
        // Single-merchant cart for CASE (matches classic UX)
        if (state.restaurantId && state.restaurantId !== input.restaurantId && state.items.length) {
          set({
            restaurantId: input.restaurantId,
            restaurantName: input.restaurantName ?? null,
            items: recalc([
              {
                _id: lineId(),
                menuItemId: input.menuItemId,
                itemName: input.itemName,
                quantity: input.quantity,
                price: input.price,
                total: input.price * input.quantity,
                restaurantId: input.restaurantId,
                restaurantName: input.restaurantName,
                specialInstructions: input.specialInstructions,
              },
            ]),
          });
          return;
        }

        const existing = state.items.find((i) => i.menuItemId === input.menuItemId);
        let items: CaseCartLine[];
        if (existing) {
          items = state.items.map((i) =>
            i.menuItemId === input.menuItemId
              ? { ...i, quantity: i.quantity + input.quantity }
              : i,
          );
        } else {
          items = [
            ...state.items,
            {
              _id: lineId(),
              menuItemId: input.menuItemId,
              itemName: input.itemName,
              quantity: input.quantity,
              price: input.price,
              total: input.price * input.quantity,
              restaurantId: input.restaurantId,
              restaurantName: input.restaurantName,
              specialInstructions: input.specialInstructions,
            },
          ];
        }

        set({
          restaurantId: input.restaurantId,
          restaurantName: input.restaurantName ?? state.restaurantName,
          items: recalc(items),
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: recalc(
            get().items.map((i) => (i._id === itemId ? { ...i, quantity } : i)),
          ),
        });
      },

      removeItem: (itemId) => {
        const items = get().items.filter((i) => i._id !== itemId);
        set({
          items,
          ...(items.length === 0
            ? { restaurantId: null, restaurantName: null }
            : {}),
        });
      },

      clear: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          items: [],
          generalNote: '',
        }),

      setNote: (note) => set({ generalNote: note }),

      asCart: () => {
        const { items, restaurantId, restaurantName, generalNote } = get();
        if (!items.length || !restaurantId) return null;
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        return {
          _id: 'case-local-cart',
          restaurantId: {
            _id: restaurantId,
            restaurantName: restaurantName ?? 'Store',
          },
          items: items.map(({ restaurantId: _r, restaurantName: _n, specialInstructions: _s, ...line }) => line),
          subtotal,
          total: subtotal,
          grandTotal: subtotal,
          dontSendCutlery: false,
          isVipMode: false,
          generalNote,
        };
      },
    }),
    {
      name: 'case.localCart.v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        restaurantId: s.restaurantId,
        restaurantName: s.restaurantName,
        items: s.items,
        generalNote: s.generalNote,
      }),
    },
  ),
);

export function getCaseCartSnapshot(): Cart | null {
  return useCaseCartStore.getState().asCart();
}
