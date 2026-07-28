import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Cart, CartLine } from '@/services/cart';
import { storageGetItem, storageRemoveItem, storageSetItem } from '@/lib/storage';

export type CaseCartLine = CartLine & {
  restaurantId: string;
  restaurantName?: string;
  specialInstructions?: string;
};

export type CaseCartPricePatch = {
  lineId: string;
  price: number;
  itemName?: string;
  restaurantName?: string;
};

type CaseCartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CaseCartLine[];
  generalNote: string;
  dontSendCutlery: boolean;
  /** True when the last add replaced a different store's cart (legacy single-store path). */
  lastReplacedStore: boolean;
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
  setDontSendCutlery: (value: boolean) => void;
  /** Patch unit prices on existing lines (used to heal legacy price=0 rows). */
  patchLinePrices: (patches: CaseCartPricePatch[]) => void;
  consumeReplacedStoreFlag: () => boolean;
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

function derivePrimary(items: CaseCartLine[]): { restaurantId: string | null; restaurantName: string | null } {
  if (!items.length) return { restaurantId: null, restaurantName: null };
  const ids = [...new Set(items.map((i) => i.restaurantId).filter(Boolean))];
  if (ids.length === 1) {
    const first = items.find((i) => i.restaurantId === ids[0]);
    return {
      restaurantId: ids[0],
      restaurantName: first?.restaurantName ?? null,
    };
  }
  return {
    restaurantId: 'multi',
    restaurantName: `${ids.length} stores`,
  };
}

export const useCaseCartStore = create<CaseCartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],
      generalNote: '',
      dontSendCutlery: true,
      lastReplacedStore: false,

      addItem: (input) => {
        const state = get();
        const unitPrice = Math.max(0, Number(input.price) || 0);
        const existing = state.items.find(
          (i) => i.menuItemId === input.menuItemId && i.restaurantId === input.restaurantId,
        );
        let items: CaseCartLine[];
        if (existing) {
          items = state.items.map((i) =>
            i.menuItemId === input.menuItemId && i.restaurantId === input.restaurantId
              ? {
                  ...i,
                  quantity: i.quantity + input.quantity,
                  // Heal zero-price legacy lines when a later add brings a real price
                  price: Number(i.price) > 0 ? Number(i.price) : unitPrice,
                  itemName:
                    i.itemName && i.itemName !== 'Item' ? i.itemName : input.itemName || i.itemName,
                  restaurantName: i.restaurantName || input.restaurantName || i.restaurantName,
                }
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
              price: unitPrice,
              total: unitPrice * input.quantity,
              restaurantId: input.restaurantId,
              restaurantName: input.restaurantName,
              specialInstructions: input.specialInstructions,
            },
          ];
        }

        const primary = derivePrimary(recalc(items));
        set({
          ...primary,
          items: recalc(items),
          lastReplacedStore: false,
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        const items = recalc(
          get().items.map((i) => (i._id === itemId ? { ...i, quantity } : i)),
        );
        set({ items, ...derivePrimary(items) });
      },

      removeItem: (itemId) => {
        const items = get().items.filter((i) => i._id !== itemId);
        set({
          items,
          ...derivePrimary(items),
        });
      },

      clear: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          items: [],
          generalNote: '',
          dontSendCutlery: true,
          lastReplacedStore: false,
        }),

      setNote: (note) => set({ generalNote: note }),
      setDontSendCutlery: (value) => set({ dontSendCutlery: value }),

      patchLinePrices: (patches) => {
        if (!patches.length) return;
        const byId = new Map(patches.map((p) => [p.lineId, p]));
        const items = recalc(
          get().items.map((line) => {
            const patch = byId.get(line._id);
            if (!patch || !(Number(patch.price) > 0)) return line;
            return {
              ...line,
              price: Number(patch.price),
              itemName:
                line.itemName && line.itemName !== 'Item'
                  ? line.itemName
                  : patch.itemName || line.itemName,
              restaurantName: line.restaurantName || patch.restaurantName || line.restaurantName,
            };
          }),
        );
        set({ items, ...derivePrimary(items) });
      },

      consumeReplacedStoreFlag: () => {
        const flag = get().lastReplacedStore;
        if (flag) set({ lastReplacedStore: false });
        return flag;
      },

      asCart: () => {
        const { items, restaurantId, restaurantName, generalNote, dontSendCutlery } = get();
        if (!items.length) return null;
        const primary = restaurantId ? { restaurantId, restaurantName } : derivePrimary(items);
        if (!primary.restaurantId) return null;
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        return {
          _id: 'case-local-cart',
          restaurantId: {
            _id: primary.restaurantId,
            restaurantName: primary.restaurantName ?? 'Store',
          },
          items: items.map((line) => ({
            _id: line._id,
            menuItemId: line.menuItemId,
            itemName: line.itemName,
            quantity: line.quantity,
            price: line.price,
            total: line.total,
            addons: line.addons,
            restaurantId: line.restaurantId,
            restaurantName: line.restaurantName,
          })) as CartLine[],
          subtotal,
          total: subtotal,
          grandTotal: subtotal,
          dontSendCutlery,
          isVipMode: false,
          generalNote,
        };
      },
    }),
    {
      // v2: abandon legacy price=0 carts from older add-to-cart bugs
      name: 'case.localCart.v2',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        restaurantId: s.restaurantId,
        restaurantName: s.restaurantName,
        items: s.items,
        generalNote: s.generalNote,
        dontSendCutlery: s.dontSendCutlery,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.items?.length) return;
        // Strip any persisted zero-price junk immediately on load
        const good = state.items.filter((i) => Number(i.price) > 0);
        if (good.length !== state.items.length) {
          state.items = good;
          if (!good.length) {
            state.restaurantId = null;
            state.restaurantName = null;
          }
        }
      },
    },
  ),
);

export function getCaseCartSnapshot(): Cart | null {
  return useCaseCartStore.getState().asCart();
}

export function caseCartHasZeroPriceLines(): boolean {
  return useCaseCartStore.getState().items.some((i) => !(Number(i.price) > 0));
}
