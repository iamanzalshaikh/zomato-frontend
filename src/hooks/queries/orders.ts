import { useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseOrders, type CaseOrder } from '@/services/caseOrders';
import { fetchOrderHistory, type Order } from '@/services/orders';
import { caseOrderKeys } from '@/hooks/queries/caseOrders';
import { usePerfQuery } from '@/lib/perf';

export const orderKeys = {
  history: ['orders', 'history'] as const,
};

function normalizeCaseAsOrder(o: CaseOrder): Order & CaseOrder {
  const firstRestaurant = o.restaurant;
  const storeName =
    String((firstRestaurant as any)?.restaurantName ?? '').trim() ||
    (o.items?.length === 1 ? 'Campus store' : `${o.items?.length ?? 0} items`) ||
    'Campus order';
  return {
    ...o,
    _id: o._id || o.id,
    orderNumber: o.orderNumber,
    customerId: '',
    restaurantId: {
      _id: String((firstRestaurant as any)?.id ?? o.items?.[0]?.restaurantId ?? ''),
      restaurantName: storeName === `${o.items?.length ?? 0} items` ? 'Campus order' : storeName,
      logo: (firstRestaurant as any)?.logo,
    },
    orderItems: (o.items ?? []).map((i) => ({
      menuItemId: String(i.menuItemId ?? ''),
      itemName: String(i.itemName ?? 'Item'),
      quantity: Number(i.quantity ?? 1),
      price: Number(i.price ?? 0),
      total: Number(i.price ?? 0) * Number(i.quantity ?? 1),
    })),
    subtotal: o.subtotal,
    taxAmount: 0,
    deliveryFee: o.deliveryFee,
    platformFee: Number((o as any).multiStoreFee ?? 0) + Number((o as any).extraItemFee ?? 0),
    couponDiscount: o.couponDiscount,
    walletDeduction: 0,
    grandTotal: o.grandTotal,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    payment: (o as any).payment ?? undefined,
    customerAddress: {
      fullAddress: o.deliveryPoint?.name ?? 'Campus drop-off',
      latitude: 0,
      longitude: 0,
    },
    estimatedPreparationTime: o.estimatedPreparationTime ?? undefined,
    riderId: o.riderId ?? undefined,
    createdAt: o.createdAt as string | undefined,
  };
}

async function fetchHistoryPreferCase(): Promise<Order[]> {
  if (CASE_CHECKOUT_ENABLED) {
    try {
      const caseOrders = await fetchCaseOrders();
      return caseOrders.map(normalizeCaseAsOrder);
    } catch {
      return [];
    }
  }
  return fetchOrderHistory();
}

/** Shared key with useCaseOrdersQuery when CASE is on — one network fetch for tabs + home. */
export function useOrderHistoryQuery(options?: { enabled?: boolean }) {
  const q = useQuery({
    queryKey: CASE_CHECKOUT_ENABLED ? caseOrderKeys.list() : orderKeys.history,
    queryFn: fetchHistoryPreferCase,
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  usePerfQuery('OrderHistory', q.isFetching, q.dataUpdatedAt);
  return q;
}
