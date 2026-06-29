import { useQuery } from '@tanstack/react-query';

import { fetchOrderHistory } from '@/services/orders';
import { perfQuery } from '@/lib/perf';

export const orderKeys = {
  history: ['orders', 'history'] as const,
};

export function useOrderHistoryQuery() {
  const q = useQuery({
    queryKey: orderKeys.history,
    queryFn: fetchOrderHistory,
    staleTime: 2 * 60 * 1000,    // 2 minutes — orders don't change often while browsing
    gcTime: 10 * 60 * 1000,      // keep in cache 10 minutes
  });
  perfQuery('OrderHistory', q.isFetching, q.dataUpdatedAt);
  return q;
}

