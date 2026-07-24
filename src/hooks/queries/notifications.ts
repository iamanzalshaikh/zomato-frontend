import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notifications';
import { perfQuery } from '@/lib/perf';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export function useNotificationsQuery() {
  const q = useQuery({
    queryKey: notificationKeys.all,
    queryFn: fetchNotifications,
    staleTime: 60 * 1000,       // 1 minute — fresh enough without hammering API
    gcTime: 5 * 60 * 1000,
  });
  perfQuery('Notifications', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

