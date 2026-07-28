import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';

import SplashScreen from './splash';
import { refreshAccessToken } from '@/lib/tokenRefresh';
import { getAccessToken, getRefreshToken } from '@/lib/storage';
import { getSelectedDeliveryPointId } from '@/lib/caseCheckout';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';

const SPLASH_DURATION_MS = 2500;

export default function Index() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const startTime = Date.now();
      let destination: '/(tabs)' | '/(onboarding)/delivery-point' | '/(onboarding)' = '/(onboarding)';

      try {
        let token = await getAccessToken();
        if (!token) {
          const refresh = await getRefreshToken();
          if (refresh) {
            token = await refreshAccessToken();
          }
        }
        if (token) {
          // Push registration happens once, in (tabs)/_layout.tsx's
          // usePushNotifications — calling it here too duplicated every
          // push-token/device-token network call on every cold start.
          if (CASE_CHECKOUT_ENABLED) {
            const pointId = await getSelectedDeliveryPointId();
            if (!pointId) {
              destination = '/(onboarding)/delivery-point';
            } else {
              destination = '/(tabs)';
            }
          } else {
            destination = '/(tabs)';
          }
        }
      } catch {
        destination = '/(onboarding)';
      }

      // Maintain splash screen for 2.5 seconds
      const elapsed = Date.now() - startTime;
      if (elapsed < SPLASH_DURATION_MS) {
        await new Promise((r) => setTimeout(r, SPLASH_DURATION_MS - elapsed));
      }

      if (!alive) return;

      // Navigate to destination route underneath
      router.replace(destination);

      // Smoothly unmount splash screen after transition
      setTimeout(() => {
        if (alive) setBooting(false);
      }, 350);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!booting) return null;

  return (
    <Animated.View style={{ flex: 1 }} exiting={FadeOut.duration(350)}>
      <SplashScreen />
    </Animated.View>
  );
}
