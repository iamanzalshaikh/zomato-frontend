import { useQuery } from '@tanstack/react-query';

import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseOrderById } from '@/services/caseOrders';
import { fetchOrderById, trackOrder } from '@/services/orders';
import { perfQuery } from '@/lib/perf';

export const orderDetailKeys = {
  byId: (orderId: string) => ['orders', 'byId', orderId] as const,
  track: (orderId: string) => ['orders', 'track', orderId] as const,
};

async function fetchOrderPreferCase(orderId: string) {
  if (CASE_CHECKOUT_ENABLED) {
    try {
      return await fetchCaseOrderById(orderId);
    } catch {
      /* fall through to classic */
    }
  }
  return fetchOrderById(orderId);
}

const TERMINAL_ORDER_STATUSES = new Set(['DELIVERED', 'CANCELLED']);

export function useOrderByIdQuery(orderId: string) {
  const q = useQuery({
    queryKey: orderDetailKeys.byId(orderId),
    queryFn: () => fetchOrderPreferCase(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
    refetchInterval: CASE_CHECKOUT_ENABLED
      ? (query) => {
          const status = String(
            (query.state.data as { orderStatus?: string; status?: string } | undefined)?.orderStatus ??
              (query.state.data as { status?: string } | undefined)?.status ??
              '',
          ).toUpperCase();
          if (TERMINAL_ORDER_STATUSES.has(status)) return false;
          return 20_000;
        }
      : false,
  });
  perfQuery(`OrderById(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useOrderTrackQuery(orderId: string) {
  const q = useQuery({
    queryKey: orderDetailKeys.track(orderId),
    // Classic track payload works for CASE orders (same Order table).
    queryFn: () => trackOrder(orderId),
    enabled: Boolean(orderId),
    staleTime: 15_000,
    refetchInterval: (query) => {
      const status = String(
        (query.state.data as { orderStatus?: string; status?: string } | undefined)?.orderStatus ??
          (query.state.data as { status?: string } | undefined)?.status ??
          '',
      ).toUpperCase();
      if (TERMINAL_ORDER_STATUSES.has(status)) return false;
      return 20_000;
    },
  });
  perfQuery(`TrackOrder(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}
