import { useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseOrderById, fetchCaseOrders, type CaseOrder } from '@/services/caseOrders';
import { fetchOrderById, fetchOrderHistory, trackOrder, type Order } from '@/services/orders';
import { perfQuery } from '@/lib/perf';

export const orderKeys = {
  history: ['orders', 'history'] as const,
};

function normalizeCaseAsOrder(o: CaseOrder): Order & CaseOrder {
  const firstRestaurant = o.restaurant;
  return {
    ...o,
    _id: o._id || o.id,
    orderNumber: o.orderNumber,
    customerId: '',
    restaurantId: firstRestaurant
      ? {
          _id: String((firstRestaurant as any).id ?? ''),
          restaurantName: String((firstRestaurant as any).restaurantName ?? 'Store'),
          logo: (firstRestaurant as any).logo,
        }
      : undefined,
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
    platformFee: 0,
    couponDiscount: o.couponDiscount,
    walletDeduction: 0,
    grandTotal: o.grandTotal,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
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
      if (caseOrders.length) return caseOrders.map(normalizeCaseAsOrder);
    } catch {
      /* fall through */
    }
  }
  return fetchOrderHistory();
}

export function useOrderHistoryQuery() {
  const q = useQuery({
    queryKey: orderKeys.history,
    queryFn: fetchHistoryPreferCase,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  perfQuery('OrderHistory', q.isFetching, q.dataUpdatedAt);
  return q;
}
