import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAndroidEmulator } from '@/lib/device';
import { handlePushNotificationData } from '@/lib/notificationNavigation';
import { registerDeviceToken, unregisterDeviceToken } from '@/services/notifications';
import { registerCasePushToken } from '@/services/caseOrders';
import { queryClient } from '@/lib/queryClient';

const PUSH_TOKEN_TIMEOUT_MS = 8000;
const PUSH_TOKEN_KEY = 'expo.pushToken';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Push token timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'android' && isAndroidEmulator()) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    if (!projectId) {
      console.warn('[Push] No EAS projectId in app.json extra.eas.projectId');
      return null;
    }

    const tokenData = await withTimeout(
      Notifications.getExpoPushTokenAsync({ projectId }),
      PUSH_TOKEN_TIMEOUT_MS,
    );
    const token = tokenData.data;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerDeviceToken(token, platform);
    try {
      await registerCasePushToken(token, platform);
    } catch (err) {
      console.warn('[Push] CASE token register failed:', err);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#ff5a00',
      });

      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#ff5a00',
      });
    }

    console.log('[Push] Registered token:', token.slice(0, 24) + '…');
    return token;
  } catch (error) {
    console.warn('[Push] Registration failed:', error);
    return null;
  }
}

export async function unregisterForPushNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await unregisterDeviceToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn('[Push] Unregister failed:', error);
  }
}

export function setupNotificationListeners() {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handlePushNotificationData(response.notification.request.content.data as Record<string, unknown>);
  });

  return { foregroundSubscription, responseSubscription };
}

export function handleNotificationTap(data: Record<string, unknown>) {
  handlePushNotificationData(data);
}

/** Local alert when a socket order event arrives (same pattern as rider delivery alerts). */
export async function alertOrderUpdate(input: {
  title: string;
  body: string;
  orderId?: string;
  type?: string;
}) {
  Vibration.vibrate([0, 250, 120, 250]);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: input.type ?? 'customer.order_update',
        orderId: input.orderId ?? '',
        redirectType: 'ORDER',
        redirectId: input.orderId ?? '',
      },
      ...(Platform.OS === 'ios' ? { sound: 'default' } : { channelId: 'orders' }),
    },
    trigger: null,
  });
}
