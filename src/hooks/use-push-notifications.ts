import { useEffect } from 'react';

import {
  registerForPushNotifications,
  setupNotificationListeners,
} from '@/lib/pushNotifications';

export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let subs: ReturnType<typeof setupNotificationListeners> | null = null;

    (async () => {
      await registerForPushNotifications();
      subs = setupNotificationListeners();
    })();

    return () => {
      subs?.foregroundSubscription.remove();
      subs?.responseSubscription.remove();
    };
  }, [enabled]);
}
