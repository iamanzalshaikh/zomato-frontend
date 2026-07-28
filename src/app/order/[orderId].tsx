import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SpellingLoader } from '@/components/spelling-loader';
import { ErrorState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { useOrderByIdQuery, orderDetailKeys } from '@/hooks/queries/orderDetail';
import { requestOrderRefund } from '@/services/orders';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import {
  useCancelCaseOrderMutation,
  useCaseReorderMutation,
} from '@/hooks/queries/caseOrders';
import { saveReorderDraft } from '@/lib/caseCheckout';
import { openCaseReceiptPdf } from '@/lib/caseReceipt';
import {
  canTrackOrder,
  getPaymentStatusDisplay,
  isPaymentFailed,
  needsOnlinePayment,
} from '@/lib/orderPayment';
import {
  isAwaitingBankVerification,
  isBankPaymentSettled,
  needsBankReceiptUpload,
} from '@/lib/bankReceipt';
import { getCampusProgressSteps, getOrderStatusDisplay } from '@/lib/orderStatus';
import { useOrderSocket } from '@/hooks/use-order-socket';
import { toast } from '@/lib/toast';

const WARN = '#F59E0B';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isLikelyNonVeg(itemName: string) {
  const lower = itemName.toLowerCase();
  return ['chicken', 'mutton', 'egg', 'fish', 'kabab', 'kebab', 'meat', 'tikka', 'tandoori'].some((kw) =>
    lower.includes(kw),
  );
}

function FoodTypeDot({ itemName }: { itemName: string }) {
  const nonVeg = isLikelyNonVeg(itemName);
  return (
    <View style={[styles.foodTypeBorder, { borderColor: nonVeg ? CaseUi.danger : CaseUi.success }]}>
      {nonVeg ? (
        <View style={[styles.nonVegTriangle, { borderBottomColor: CaseUi.danger }]} />
      ) : (
        <View style={[styles.vegDotInner, { backgroundColor: CaseUi.success }]} />
      )}
    </View>
  );
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';
  const [refundNote, setRefundNote] = useState('');

  const q = useOrderByIdQuery(id);
  useOrderSocket(id);
  const order: any = q.data;
  const addToCart = useAddToCartMutation();
  const cancelMut = useCancelCaseOrderMutation();
  const reorderMut = useCaseReorderMutation();

  const status = String(order?.orderStatus ?? order?.status ?? 'UNKNOWN');
  const statusDisplay = (() => {
    if (isAwaitingBankVerification(order ?? {})) {
      return {
        label: 'Verifying payment',
        color: WARN,
        icon: 'time-outline' as const,
        hint: 'Receipt received — CASE is verifying your transfer',
      };
    }
    return getOrderStatusDisplay(status);
  })();
  const isDelivered = status === 'DELIVERED';
  const isCancelled = status === 'CANCELLED';
  const showUploadReceipt = CASE_CHECKOUT_ENABLED && needsBankReceiptUpload(order ?? {});
  const paymentSettled = isBankPaymentSettled(order ?? {});
  const paymentDisplay = order ? getPaymentStatusDisplay(order) : null;
  const showPayAgain = !CASE_CHECKOUT_ENABLED && order && needsOnlinePayment(order);
  const paymentFailed = order && isPaymentFailed(order);
  const showTrack = !CASE_CHECKOUT_ENABLED && order && canTrackOrder(order);
  const money = (n: number | undefined) =>
    CASE_CHECKOUT_ENABLED ? `J$${Number(n ?? 0).toFixed(0)}` : `₹${Number(n ?? 0).toFixed(0)}`;
  const canEdit =
    CASE_CHECKOUT_ENABLED &&
    !isDelivered &&
    !isCancelled &&
    !paymentSettled &&
    (status === 'PENDING' || status === 'PENDING_PAYMENT_VERIFICATION');
  const canCancelCase =
    CASE_CHECKOUT_ENABLED && !isDelivered && !isCancelled && !paymentSettled;

  function retryPayment() {
    router.push({
      pathname: '/payment/razorpay',
      params: { orderId: id, restaurantName: order?.restaurantId?.restaurantName ?? '' },
    });
  }

  const refundMut = useMutation({
    mutationFn: () => requestOrderRefund(id, refundNote.trim()),
    onSuccess: () => {
      Alert.alert('Refund requested', 'Our support team will review your request.');
      setRefundNote('');
    },
    onError: (e: Error) => Alert.alert('Refund Error', e.message),
  });

  async function reorder() {
    if (CASE_CHECKOUT_ENABLED) {
      try {
        const payload = await reorderMut.mutateAsync(id);
        await saveReorderDraft(payload.items, payload.deliveryPointId);
        toast.success('Items ready — confirm checkout', 'Reorder');
        router.push({ pathname: '/checkout', params: { mode: 'reorder' } });
      } catch (e: any) {
        Alert.alert('Reorder Error', e?.message ?? 'Failed to reorder');
      }
      return;
    }

    const restaurantId = String(order?.restaurantId?._id ?? order?.restaurantId ?? '');
    const items = order?.orderItems ?? order?.items ?? [];
    if (!restaurantId || items.length === 0) {
      Alert.alert('Reorder', 'Could not load items for this order.');
      return;
    }
    try {
      for (const line of items) {
        const menuItemId = String(line.menuItemId?._id ?? line.menuItemId ?? '');
        if (!menuItemId) continue;
        await addToCart.mutateAsync({
          restaurantId,
          menuItemId,
          quantity: line.quantity ?? 1,
          addons: line.addons ?? [],
          itemName: String(line.itemName ?? line.name ?? 'Item'),
          price: Number(line.price ?? line.unitPrice ?? 0),
        });
      }
      router.push('/cart');
    } catch (e: any) {
      Alert.alert('Reorder Error', e?.message ?? 'Failed to add items to cart.');
    }
  }

  function cancelOrder() {
    Alert.alert('Cancel order', 'Cancel this CASE order?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelMut.mutateAsync({ orderId: id, reason: 'Cancelled by customer' });
            // caseOrderKeys.list()/detail() are already invalidated inside the
            // mutation's own onSuccess; this screen only needs to additionally
            // invalidate its own (differently-keyed) query. Fire, don't await —
            // the cancel already succeeded, no need to block feedback on a refetch.
            void qc.invalidateQueries({ queryKey: orderDetailKeys.byId(id) });
            toast.success('Order cancelled');
          } catch (e: any) {
            Alert.alert('Cancel failed', e?.message ?? 'Could not cancel');
          }
        },
      },
    ]);
  }

  if (q.isLoading) {
    return <SpellingLoader />;
  }

  if (q.isError || !order) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState
            title="Order not found"
            subtitle={(q.error as Error)?.message ?? 'This order could not be loaded.'}
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </SafeAreaView>
      </View>
    );
  }

  const items = order.orderItems ?? order.items ?? [];
  const paymentToneColor =
    paymentDisplay?.tone === 'failed'
      ? CaseUi.danger
      : paymentDisplay?.tone === 'pending'
        ? WARN
        : paymentDisplay?.tone === 'paid'
          ? CaseUi.success
          : CaseUi.ink;
  const progressSteps = getCampusProgressSteps(status);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          <Animated.View entering={FadeInDown.duration(280)} style={styles.card}>
            <View style={styles.restaurantRow}>
              <View style={styles.logoCircle}>
                {order.restaurantId?.logo ? (
                  <Image source={{ uri: order.restaurantId.logo }} style={styles.restaurantLogo} />
                ) : (
                  <Ionicons name="bag-handle" size={18} color={CaseUi.orange} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {order.restaurantId?.restaurantName ||
                    order.restaurant?.restaurantName ||
                    'Campus order'}
                </Text>
                <Text style={styles.orderNumber} numberOfLines={1}>
                  #{order.orderNumber ?? id.slice(-8).toUpperCase()}
                </Text>
                <Text style={styles.orderDate}>Placed {formatDate(order.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statusGrid}>
              <View style={[styles.statusCell, { backgroundColor: `${statusDisplay.color}14` }]}>
                <Text style={styles.metaLabel}>Order status</Text>
                <View style={styles.statusValueRow}>
                  <Ionicons name={statusDisplay.icon} size={14} color={statusDisplay.color} />
                  <Text
                    style={[styles.metaValue, { color: statusDisplay.color, flex: 1 }]}
                    numberOfLines={2}
                  >
                    {statusDisplay.label}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusCell, { backgroundColor: CaseUi.field }]}>
                <Text style={styles.metaLabel}>Payment</Text>
                <Text style={[styles.metaValue, { color: paymentToneColor }]} numberOfLines={2}>
                  {paymentDisplay?.label ?? '—'}
                </Text>
              </View>
            </View>

            {statusDisplay.hint ? (
              <Text style={styles.statusHint}>{statusDisplay.hint}</Text>
            ) : null}

            {CASE_CHECKOUT_ENABLED && !isCancelled ? (
              <View style={styles.timeline}>
                {progressSteps.map((step, i) => (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          step.done && styles.timelineDotDone,
                          step.current && styles.timelineDotCurrent,
                        ]}
                      />
                      {i < progressSteps.length - 1 ? (
                        <View
                          style={[styles.timelineLine, step.done && styles.timelineLineDone]}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        (step.done || step.current) && styles.timelineLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>

          {showPayAgain && (
            <Animated.View
              entering={FadeInDown.delay(40).duration(280)}
              style={[styles.paymentAlert, paymentFailed ? styles.paymentAlertDanger : styles.paymentAlertWarn]}
            >
              <Ionicons name={paymentFailed ? 'close-circle' : 'card-outline'} size={22} color={paymentFailed ? CaseUi.danger : WARN} />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentAlertTitle}>{paymentFailed ? 'Payment not completed' : 'Payment required'}</Text>
                <Text style={styles.paymentAlertBody}>
                  {paymentFailed
                    ? 'Your payment did not go through. Retry to confirm this order with the restaurant.'
                    : 'Complete online payment to confirm your order. The restaurant will accept after payment.'}
                </Text>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.card}>
            <Text style={styles.sectionTitle}>Invoice details</Text>

            <View style={{ gap: 12, marginTop: 8 }}>
              {items.map((line: any, idx: number) => {
                const addText = line.addons && line.addons.length > 0 ? line.addons.map((a: any) => a.name).join(', ') : '';
                return (
                  <View key={idx} style={styles.itemInvoiceRow}>
                    <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                      <View style={{ marginTop: 2 }}>
                        <FoodTypeDot itemName={line.itemName} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNameText}>{line.itemName}</Text>
                        {!!addText && (
                          <Text style={styles.itemAddonsText} numberOfLines={1}>
                            {addText}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.itemQtyPrice}>
                      {line.quantity} x {money(line.price)} = {money(line.total ?? line.price * line.quantity)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.divider, { marginVertical: 14 }]} />

            <View style={{ gap: 8 }}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>{money(order.subtotal)}</Text>
              </View>
              {!!order.deliveryFee && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={styles.billValue}>{money(order.deliveryFee)}</Text>
                </View>
              )}
              {!!order.taxAmount && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Taxes & charges</Text>
                  <Text style={styles.billValue}>{money(order.taxAmount)}</Text>
                </View>
              )}
              {!!order.platformFee && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Platform Fee</Text>
                  <Text style={styles.billValue}>{money(order.platformFee)}</Text>
                </View>
              )}
              {!!order.couponDiscount && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: CaseUi.success }]}>Coupon Discount</Text>
                  <Text style={[styles.billValue, { color: CaseUi.success }]}>-{money(order.couponDiscount)}</Text>
                </View>
              )}
              {!!order.walletDeduction && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: CaseUi.success }]}>Wallet Deduction</Text>
                  <Text style={[styles.billValue, { color: CaseUi.success }]}>-{money(order.walletDeduction)}</Text>
                </View>
              )}

              <View style={[styles.divider, { marginVertical: 8 }]} />

              <View style={styles.billRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={[styles.grandTotalValue, { color: CaseUi.orange }]}>{money(order.grandTotal)}</Text>
              </View>
            </View>
          </Animated.View>

          {(order.customerAddress?.fullAddress || order.deliveryPoint?.name) && (
            <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="location" size={16} color={CaseUi.orange} />
                <Text style={styles.sectionTitle}>Campus drop-off</Text>
              </View>
              <Text style={styles.addressText}>
                {order.deliveryPoint?.name ?? order.customerAddress?.fullAddress}
              </Text>
              <Text style={styles.dropHint}>
                Rider brings your order to this point — no live map tracking in phase one.
              </Text>
            </Animated.View>
          )}

          {showUploadReceipt && (
            <PressableScale
              onPress={() => router.push({ pathname: '/bank-transfer/[orderId]', params: { orderId: id } })}
              style={styles.primaryBtn}
            >
              <Ionicons name="business" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryText}>Upload bank receipt</Text>
            </PressableScale>
          )}

          {CASE_CHECKOUT_ENABLED && isAwaitingBankVerification(order ?? {}) && (
            <View style={[styles.paymentAlert, styles.paymentAlertWarn]}>
              <Ionicons name="time-outline" size={22} color={WARN} />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentAlertTitle}>Receipt submitted</Text>
                <Text style={styles.paymentAlertBody}>
                  CASE is verifying your bank transfer. You&apos;ll get an update when payment is approved.
                </Text>
              </View>
            </View>
          )}

          {CASE_CHECKOUT_ENABLED && !isDelivered && !isCancelled && (
            <>
              {canEdit && (
                <PressableScale
                  onPress={() => router.push({ pathname: '/order/edit/[orderId]', params: { orderId: id } })}
                  style={styles.secondaryBtn}
                >
                  <Ionicons name="create-outline" size={16} color={CaseUi.orange} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryText, { color: CaseUi.orange }]}>Edit order</Text>
                </PressableScale>
              )}
              <PressableScale
                onPress={() => router.push({ pathname: '/order/chat/[orderId]', params: { orderId: id } })}
                style={styles.secondaryBtn}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={CaseUi.orange} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryText, { color: CaseUi.orange }]}>Order chat</Text>
              </PressableScale>
              {canCancelCase && (
                <PressableScale onPress={cancelOrder} disabled={cancelMut.isPending} style={[styles.secondaryBtn, styles.secondaryBtnDanger]}>
                  <Ionicons name="close-circle-outline" size={16} color={CaseUi.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryText, { color: CaseUi.danger }]}>
                    {cancelMut.isPending ? 'Cancelling…' : 'Cancel order'}
                  </Text>
                </PressableScale>
              )}
            </>
          )}

          {showPayAgain && (
            <PressableScale onPress={retryPayment} style={[styles.primaryBtn, paymentFailed && { backgroundColor: CaseUi.danger }]}>
              <Ionicons name="card" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryText}>{paymentFailed ? 'Retry payment' : 'Pay now'}</Text>
            </PressableScale>
          )}

          {showTrack && (
            <PressableScale
              onPress={() => router.push({ pathname: '/order/track/[orderId]', params: { orderId: id } })}
              style={styles.primaryBtn}
            >
              <Ionicons name="bicycle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryText}>Track live order</Text>
            </PressableScale>
          )}

          {CASE_CHECKOUT_ENABLED && (
            <PressableScale
              onPress={async () => {
                try {
                  await openCaseReceiptPdf(id);
                } catch {
                  /* handled */
                }
              }}
              style={styles.secondaryBtn}
            >
              <Ionicons name="document-outline" size={16} color={CaseUi.ink} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryText}>Receipt PDF</Text>
            </PressableScale>
          )}

          {CASE_CHECKOUT_ENABLED && !isCancelled && (
            <View style={{ gap: 10 }}>
              <PressableScale onPress={reorder} style={styles.secondaryBtn}>
                <Ionicons name="refresh" size={16} color={CaseUi.orange} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryText, { color: CaseUi.orange }]}>Reorder items</Text>
              </PressableScale>
              {isDelivered ? (
                <PressableScale
                  onPress={() => router.push({ pathname: '/rate-order/[orderId]', params: { orderId: id } })}
                  style={styles.secondaryBtn}
                >
                  <Ionicons name="star" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryText}>Rate this order</Text>
                </PressableScale>
              ) : null}
            </View>
          )}

          {!CASE_CHECKOUT_ENABLED && (isDelivered || isCancelled) && (
            <View style={{ gap: 10 }}>
              <PressableScale onPress={reorder} style={styles.secondaryBtn}>
                <Ionicons name="refresh" size={16} color={CaseUi.orange} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryText, { color: CaseUi.orange }]}>Reorder items</Text>
              </PressableScale>

              <PressableScale
                onPress={() => router.push({ pathname: '/rate-order/[orderId]', params: { orderId: id } })}
                style={styles.secondaryBtn}
              >
                <Ionicons name="star" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryText}>Rate this order</Text>
              </PressableScale>
            </View>
          )}

          {isDelivered && (
            <Animated.View entering={FadeInDown.delay(160).duration(280)} style={[styles.card, { marginTop: 6 }]}>
              <Text style={styles.sectionTitle}>Need Help with this order?</Text>
              <Text style={styles.refundSubtitle}>
                If items were missing, spilled or you had quality issues, submit a refund request.
              </Text>

              <TextInput
                value={refundNote}
                onChangeText={setRefundNote}
                placeholder="Describe your issue in details (min 10 chars)..."
                multiline
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />

              <PressableScale
                disabled={refundMut.isPending || refundNote.trim().length < 10}
                onPress={() => refundMut.mutate()}
                style={[styles.refundSubmitBtn, refundNote.trim().length >= 10 && styles.refundSubmitBtnActive]}
              >
                <Text style={[styles.refundSubmitText, refundNote.trim().length >= 10 && styles.refundSubmitTextActive]}>
                  {refundMut.isPending ? 'Submitting...' : 'Request Refund'}
                </Text>
              </PressableScale>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  mutedText: { color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16.5, color: CaseUi.ink },
  scrollBody: { padding: 16, paddingBottom: 40, gap: 14 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: CaseUi.field },
  restaurantLogo: { width: '100%', height: '100%' },
  restaurantName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: CaseUi.ink },
  orderNumber: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 2, color: CaseUi.muted },
  orderDate: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 1, color: CaseUi.muted },
  divider: { height: 1, marginVertical: 12, backgroundColor: CaseUi.line },
  statusGrid: { flexDirection: 'row', gap: 10 },
  statusCell: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
  },
  statusValueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.3,
    color: CaseUi.muted,
    textTransform: 'uppercase',
  },
  metaValue: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 18 },
  statusHint: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
    lineHeight: 17,
  },
  timeline: { flexDirection: 'row', marginTop: 16 },
  timelineStep: { flex: 1, minWidth: 0 },
  timelineRail: { flexDirection: 'row', alignItems: 'center' },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CaseUi.line,
  },
  timelineDotDone: { backgroundColor: CaseUi.orange },
  timelineDotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CaseUi.orange,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: CaseUi.line,
    marginHorizontal: 2,
  },
  timelineLineDone: { backgroundColor: CaseUi.orange },
  timelineLabel: {
    marginTop: 6,
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
  },
  timelineLabelActive: { color: CaseUi.ink },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
  dropHint: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
    lineHeight: 17,
  },
  itemInvoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 2 },
  foodTypeBorder: { width: 12, height: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  vegDotInner: { width: 6, height: 6, borderRadius: 3 },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4.5,
    borderRightWidth: 4.5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  itemNameText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: CaseUi.ink },
  itemAddonsText: { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2, color: CaseUi.muted },
  itemQtyPrice: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  billValue: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  grandTotalLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: CaseUi.ink },
  grandTotalValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5 },
  addressText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 16.5, marginTop: 4, color: CaseUi.muted },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: CaseUi.orange,
  },
  primaryText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13.5 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.orange,
    backgroundColor: 'transparent',
  },
  secondaryBtnDanger: { borderColor: CaseUi.danger },
  secondaryText: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  refundSubtitle: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4, marginBottom: 12, lineHeight: 15, color: CaseUi.muted },
  input: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    padding: 10,
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlignVertical: 'top',
    marginBottom: 12,
    color: CaseUi.ink,
  },
  refundSubmitBtn: { height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: CaseUi.field },
  refundSubmitBtnActive: { backgroundColor: CaseUi.danger },
  refundSubmitText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: CaseUi.muted },
  refundSubmitTextActive: { color: '#FFFFFF' },
  paymentAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  paymentAlertWarn: { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.1)' },
  paymentAlertDanger: { borderColor: 'rgba(220,38,38,0.35)', backgroundColor: 'rgba(220,38,38,0.08)' },
  paymentAlertTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
  paymentAlertBody: { marginTop: 4, fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 16, color: CaseUi.muted },
});
