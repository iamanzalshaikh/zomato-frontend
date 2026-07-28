import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, Alert, NativeModules, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { WebViewProps } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProfileQuery } from '@/hooks/queries/profile';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys } from '@/hooks/queries/cart';
import {
  buildRazorpayWebCheckoutHtml,
  isRazorpayNativeAvailable,
  openRazorpayCheckout,
  type RazorpayOpenResult,
} from '@/lib/razorpayCheckout';
import { createPaymentOrder, verifyPayment, type PaymentOrderResponse } from '@/services/payments';

type PaymentPhase = 'loading' | 'native' | 'webview' | 'verifying' | 'error';
type WebViewComponent = ComponentType<WebViewProps>;

function hasWebViewNativeModule(): boolean {
  return (
    typeof NativeModules === 'object' &&
    NativeModules != null &&
    (NativeModules as { RNCWebView?: unknown }).RNCWebView != null
  );
}

export default function RazorpayPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const profileQuery = useProfileQuery();
  const params = useLocalSearchParams<{
    orderId?: string;
    restaurantName?: string;
  }>();

  const orderId = String(params.orderId ?? '');
  const restaurantName = params.restaurantName ? String(params.restaurantName) : undefined;

  const [phase, setPhase] = useState<PaymentPhase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webHtml, setWebHtml] = useState<string | null>(null);
  const [WebView, setWebView] = useState<WebViewComponent | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrderResponse | null>(null);

  const nativeAttempted = useRef(false);
  const launchStarted = useRef(false);
  const prefillRef = useRef<{ email?: string; mobile?: string }>({});
  prefillRef.current = {
    email: profileQuery.data?.email,
    mobile: profileQuery.data?.mobile,
  };

  useEffect(() => {
    if (!hasWebViewNativeModule()) return;
    import('react-native-webview')
      .then((mod) => setWebView(() => mod.WebView))
      .catch(() => setWebView(null));
  }, []);

  const goToSuccess = useCallback(async () => {
    void qc.invalidateQueries({ queryKey: ['cart'] });
    void qc.invalidateQueries({ queryKey: cartKeys.all });
    void qc.invalidateQueries({ queryKey: ['orders'] });
    void qc.invalidateQueries({ queryKey: ['orders', 'byId', orderId] });
    router.replace({
      pathname: '/order-success',
      params: { orderId, payment: 'ONLINE' },
    });
  }, [orderId, qc, router]);

  const goToSuccessRef = useRef(goToSuccess);
  goToSuccessRef.current = goToSuccess;

  const handlePaymentSuccess = useCallback(
    async (result: RazorpayOpenResult) => {
      setPhase('verifying');
      try {
        await verifyPayment({
          orderId,
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
        });
        await goToSuccessRef.current();
      } catch (e: unknown) {
        const msg =
          (e as { message?: string })?.message ?? 'Payment verification failed. Please contact support.';
        setErrorMessage(msg);
        setPhase('error');
      }
    },
    [orderId],
  );

  const handlePaymentSuccessRef = useRef(handlePaymentSuccess);
  handlePaymentSuccessRef.current = handlePaymentSuccess;

  // Create payment order once per orderId/retry — do not restart when profile loads.
  useEffect(() => {
    if (!orderId) {
      setErrorMessage('Missing order id.');
      setPhase('error');
      return;
    }

    let cancelled = false;
    setPaymentOrder(null);
    launchStarted.current = false;
    setPhase('loading');
    setErrorMessage(null);
    setWebHtml(null);

    (async () => {
      try {
        const po = await createPaymentOrder(orderId);
        if (cancelled) return;

        if (po.autoConfirmed) {
          await goToSuccessRef.current();
          return;
        }

        if (!po.keyId || !po.razorpayOrderId) {
          throw new Error('Online payment is not configured on the server.');
        }

        setPaymentOrder(po);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = (e as { message?: string })?.message ?? 'Could not start payment.';
        setErrorMessage(msg);
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, retryCount]);

  // Launch native or WebView checkout once payment order is ready.
  useEffect(() => {
    if (!paymentOrder || launchStarted.current || phase === 'error' || phase === 'verifying') return;

    const checkoutInput = {
      keyId: paymentOrder.keyId!,
      razorpayOrderId: paymentOrder.razorpayOrderId!,
      amountPaise: paymentOrder.razorpayAmount,
    };

    let cancelled = false;

    (async () => {
      if (isRazorpayNativeAvailable() && !nativeAttempted.current) {
        launchStarted.current = true;
        nativeAttempted.current = true;
        setPhase('native');
        const result = await openRazorpayCheckout({
          ...checkoutInput,
          name: 'QuickBite',
          description: restaurantName ? `Order from ${restaurantName}` : 'Food order',
          prefillEmail: prefillRef.current.email,
          prefillContact: prefillRef.current.mobile,
        });
        if (cancelled) return;

        if (result) {
          await handlePaymentSuccessRef.current(result);
          return;
        }

        router.back();
        return;
      }

      if (!hasWebViewNativeModule()) {
        setErrorMessage(
          'Payment UI needs a rebuilt app. Run: npx expo run:android — or use Cash on Delivery.',
        );
        setPhase('error');
        return;
      }

      // Wait until WebView module is loaded before marking launch started.
      if (!WebView) return;

      launchStarted.current = true;
      setWebHtml(
        buildRazorpayWebCheckoutHtml({
          keyId: checkoutInput.keyId,
          razorpayOrderId: checkoutInput.razorpayOrderId,
          amountPaise: checkoutInput.amountPaise,
          name: 'QuickBite',
          description: restaurantName ? `Order from ${restaurantName}` : 'Food order',
          prefillEmail: prefillRef.current.email,
          prefillContact: prefillRef.current.mobile,
        }),
      );
      setPhase('webview');
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentOrder, WebView, restaurantName, router, phase]);

  const retryPayment = useCallback(() => {
    nativeAttempted.current = false;
    launchStarted.current = false;
    setErrorMessage(null);
    setWebHtml(null);
    setPaymentOrder(null);
    setPhase('loading');
    setRetryCount((n) => n + 1);
  }, []);

  const onWebMessage = useCallback(
    async (raw: string) => {
      try {
        const payload = JSON.parse(raw) as {
          type: string;
          message?: string;
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        };

        if (payload.type === 'success') {
          if (
            !payload.razorpay_payment_id ||
            !payload.razorpay_order_id ||
            !payload.razorpay_signature
          ) {
            throw new Error('Incomplete payment response from Razorpay.');
          }
          await handlePaymentSuccess({
            razorpay_payment_id: payload.razorpay_payment_id,
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_signature: payload.razorpay_signature,
          });
          return;
        }

        if (payload.type === 'cancel') {
          router.back();
          return;
        }

        if (payload.type === 'error') {
          setErrorMessage(payload.message ?? 'Payment failed.');
          setPhase('error');
        }
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message ?? 'Payment failed.';
        setErrorMessage(msg);
        setPhase('error');
      }
    },
    [handlePaymentSuccess, router],
  );

  const statusLabel = useMemo(() => {
    if (phase === 'loading') return 'Preparing payment…';
    if (phase === 'native') return 'Opening Razorpay…';
    if (phase === 'verifying') return 'Confirming payment…';
    if (phase === 'error') return errorMessage ?? 'Payment failed';
    return 'Complete payment below';
  }, [errorMessage, phase]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (phase === 'verifying') return;
              Alert.alert('Cancel payment?', 'Your order is created but not paid yet.', [
                { text: 'Stay', style: 'cancel' },
                { text: 'Go back', style: 'destructive', onPress: () => router.back() },
              ]);
            }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText style={[styles.title, { color: theme.text }]}>Pay with Razorpay</ThemedText>
          <View style={styles.backBtn} />
        </View>

        {(phase === 'loading' || phase === 'native' || phase === 'verifying') && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.status, { color: theme.textSecondary }]}>{statusLabel}</ThemedText>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color="#e23744" />
            <ThemedText style={[styles.status, { color: theme.text }]}>{statusLabel}</ThemedText>
            <ThemedText style={[styles.errorHint, { color: theme.textSecondary }]}>
              Your order is saved but payment was not completed. You can retry or go back to your orders.
            </ThemedText>
            <Pressable
              onPress={retryPayment}
              style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.retryText}>Retry payment</ThemedText>
            </Pressable>
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/order/[orderId]',
                  params: { orderId },
                })
              }
              style={[styles.secondaryBtn, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText style={[styles.secondaryBtnText, { color: theme.text }]}>View order</ThemedText>
            </Pressable>
          </View>
        )}

        {phase === 'webview' && webHtml && WebView && (
          <WebView
            originWhitelist={['*']}
            source={{ html: webHtml, baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={(event) => onWebMessage(event.nativeEvent.data)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            style={styles.webview}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backBtn: { width: 32 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  status: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  errorHint: { textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: -4 },
  webview: { flex: 1 },
  retryBtn: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  retryText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  secondaryBtn: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
});
