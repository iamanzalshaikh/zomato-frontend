import { useQuery } from '@tanstack/react-query';

import { fetchOrderById, trackOrder } from '@/services/orders';
import { perfQuery } from '@/lib/perf';

export const orderDetailKeys = {
  byId: (orderId: string) => ['orders', 'byId', orderId] as const,
  track: (orderId: string) => ['orders', 'track', orderId] as const,
};

export function useOrderByIdQuery(orderId: string) {
  const q = useQuery({
    queryKey: orderDetailKeys.byId(orderId),
    queryFn: () => fetchOrderById(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,           // 30s — order detail can change (status updates)
  });
  perfQuery(`OrderById(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useOrderTrackQuery(orderId: string) {
  const q = useQuery({
    queryKey: orderDetailKeys.track(orderId),
    queryFn: () => trackOrder(orderId),
    enabled: Boolean(orderId),
    staleTime: 120_000,
  });
  perfQuery(`TrackOrder(${orderId})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

