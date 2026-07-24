import { router } from 'expo-router';

export type NotificationTarget = {
  redirectType?: string;
  redirectId?: string;
  notificationType?: string;
};

export function openNotificationTarget(item: NotificationTarget): boolean {
  const id = item.redirectId ? String(item.redirectId) : '';

  if (item.redirectType === 'ORDER' && id) {
    router.push({ pathname: '/order/track/[orderId]', params: { orderId: id } });
    return true;
  }

  if (item.redirectType === 'RESTAURANT' && id) {
    router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: id } });
    return true;
  }

  if (item.notificationType === 'ORDER' && id) {
    router.push({ pathname: '/order/track/[orderId]', params: { orderId: id } });
    return true;
  }

  return false;
}

export function handlePushNotificationData(data: Record<string, unknown>) {
  const orderId = data.orderId ?? data.redirectId;
  const type = data?.type;
  const isOrderNotification =
    type === 'order_update' ||
    (typeof type === 'string' &&
      (type.startsWith('customer.order_') || type.startsWith('customer.payment_')));

  if (isOrderNotification && orderId) {
    router.push({
      pathname: '/order/track/[orderId]',
      params: { orderId: String(orderId) },
    });
    return;
  }

  if (data.redirectType === 'ORDER' && orderId) {
    router.push({
      pathname: '/order/track/[orderId]',
      params: { orderId: String(orderId) },
    });
    return;
  }

  if (data.redirectType === 'RESTAURANT' && data.redirectId) {
    router.push({
      pathname: '/restaurant/[restaurantId]',
      params: { restaurantId: String(data.redirectId) },
    });
    return;
  }

  router.push('/notifications');
}
