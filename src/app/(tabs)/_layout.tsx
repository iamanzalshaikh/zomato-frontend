import AppTabs from '@/components/app-tabs';
import { useSyncFavorites } from '@/hooks/use-sync-favorites';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useCustomerSocket } from '@/hooks/use-customer-socket';

export default function TabsLayout() {
  useSyncFavorites();
  usePushNotifications(true);
  useCustomerSocket(true);
  return <AppTabs />;
}

