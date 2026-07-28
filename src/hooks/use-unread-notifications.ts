import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchNotifications } from '@/services/notifications';

/**
 * Unread badge — deferred until after first paint, polls only while app is active.
 */
export function useUnreadNotificationCount(enabled = true) {
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      setAppActive(next === 'active');
    });
    return () => {
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setDeferred(false);
      return;
    }
    const t = setTimeout(() => setDeferred(true), 1200);
    return () => clearTimeout(t);
  }, [enabled]);

  const q = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const notifications = await fetchNotifications();
      return notifications.filter((n) => !n.isRead).length;
    },
    enabled: enabled && deferred && appActive,
    refetchInterval: appActive ? 90_000 : false,
    staleTime: 60_000,
  });

  return q.data ?? 0;
}
