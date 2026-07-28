import AppTabs from '@/components/app-tabs';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { caseKeys } from '@/hooks/queries/case';
import { useSyncFavorites } from '@/hooks/use-sync-favorites';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useCustomerSocket } from '@/hooks/use-customer-socket';
import { fetchCaseBootstrap } from '@/services/case';
import { scheduleIdleTask } from '@/lib/scheduleIdle';

export default function TabsLayout() {
  const queryClient = useQueryClient();

  useSyncFavorites();
  usePushNotifications(true);
  useCustomerSocket(true);

  useEffect(() => {
    const task = scheduleIdleTask(() => {
      // Only warm bootstrap — trending/recommended load when Search opens
      void queryClient.prefetchQuery({
        queryKey: caseKeys.bootstrap(),
        queryFn: fetchCaseBootstrap,
        staleTime: 30 * 60 * 1000,
      });
    }, 400);

    return () => task.cancel();
  }, [queryClient]);

  return <AppTabs />;
}

