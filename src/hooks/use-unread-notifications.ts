import { useQuery } from '@tanstack/react-query';

import { fetchNotifications } from '@/services/notifications';

export function useUnreadNotificationCount(enabled = true) {
  const q = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const notifications = await fetchNotifications();
      return notifications.filter((n) => !n.isRead).length;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return q.data ?? 0;
}
