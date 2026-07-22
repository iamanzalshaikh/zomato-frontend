import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { refreshAccessToken } from '@/lib/tokenRefresh';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { getAccessToken, getRefreshToken } from '@/lib/storage';
import { getSelectedDeliveryPointId } from '@/lib/caseCheckout';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';

const BOOT_TIMEOUT_MS = 5000;
const LOADING_ORANGE = '#ff5a00';

export default function Index() {
  const [target, setTarget] = useState<'welcome' | 'tabs' | 'delivery' | null>(null);

  useEffect(() => {
    let alive = true;

    const fallback = setTimeout(() => {
      if (alive) setTarget('welcome');
    }, BOOT_TIMEOUT_MS);

    (async () => {
      try {
        let token = await getAccessToken();
        if (!token) {
          const refresh = await getRefreshToken();
          if (refresh) {
            token = await refreshAccessToken();
          }
        }
        if (!alive) return;
        clearTimeout(fallback);
        if (token) {
          void registerForPushNotifications();
          if (CASE_CHECKOUT_ENABLED) {
            const pointId = await getSelectedDeliveryPointId();
            if (!pointId) {
              setTarget('delivery');
              return;
            }
          }
          setTarget('tabs');
        } else {
          setTarget('welcome');
        }
      } catch {
        if (!alive) return;
        clearTimeout(fallback);
        setTarget('welcome');
      }
    })();

    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LOADING_ORANGE }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (target === 'delivery') {
    return <Redirect href="/(onboarding)/delivery-point" />;
  }

  return <Redirect href={target === 'tabs' ? '/(tabs)' : '/(onboarding)'} />;
}
