import { apiFetch } from '@/lib/apiFetch';

export type AppNotification = {
  _id: string;
  notificationType: string;
  title: string;
  message: string;
  body?: string;
  isRead: boolean;
  sentAt: string;
  redirectType?: string;
  redirectId?: string;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const body = await apiFetch('/users/notifications');
  const notifications = (body as { data?: { notifications?: AppNotification[] } })?.data?.notifications;
  return Array.isArray(notifications) ? notifications : [];
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch(`/users/notifications/read/${notificationId}`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/users/notifications/read-all', { method: 'PATCH' });
}

export async function registerDeviceToken(token: string, platform: 'android' | 'ios' | 'web') {
  return apiFetch('/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterDeviceToken(token: string) {
  return apiFetch('/notifications/device-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

