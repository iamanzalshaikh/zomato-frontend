import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { OrderTrackingMap } from '@/components/order-tracking-map';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { useOrderByIdQuery, useOrderTrackQuery } from '@/hooks/queries/orderDetail';
import { fetchOrderRoute } from '@/services/orders';
import { useOrderSocket } from '@/hooks/use-order-socket';

function pickCoord(...sources: ({ latitude?: number; longitude?: number } | null | undefined)[]) {
  for (const s of sources) {
    const lat = Number(s?.latitude);
    const lng = Number(s?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

const STATUS_STEPS = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
];

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Shop Accepted',
  PREPARING: 'Order is being Prepared',
  READY_FOR_PICKUP: 'Ready for Pickup',
  RIDER_ASSIGNED: 'Campus Rider Assigned',
  PICKED_UP: 'Order Picked Up',
  ON_THE_WAY: 'Heading to Delivery Point',
  DELIVERED: 'Order Delivered',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Waiting for the shop to accept your order',
  CONFIRMED: 'Shop accepted — your order will be prepared soon',
  PREPARING: 'Your items are being prepared & packed',
  READY_FOR_PICKUP: 'Rider is about to pick up your order',
  RIDER_ASSIGNED: 'Partner is arriving at the shop',
  PICKED_UP: 'Partner is on the way to you',
  ON_THE_WAY: 'Partner is heading to your Campus Delivery Point',
  DELIVERED: 'Hope you enjoy your order!',
};

function LivePulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false);
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, { backgroundColor: color }, ringStyle]} />
      <View style={[styles.pulseDot, { backgroundColor: color }]} />
    </View>
  );
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';

  const trackQ = useOrderTrackQuery(id);
  const orderQ = useOrderByIdQuery(id);
  useOrderSocket(id);

  // Prefer live track payload; fall back to order detail (CASE-friendly).
  const tracking: any = trackQ.data ?? orderQ.data;
  const order: any = orderQ.data;

  const status = String(tracking?.orderStatus ?? tracking?.status ?? order?.orderStatus ?? 'PENDING');

  // Lazy useState initializer is the sanctioned "compute once at mount" escape
  // hatch — unlike a ref, this value is safe to read during render.
  const [mountTime] = useState(() => Date.now());

  const remainingMins = useMemo(() => {
    if (tracking?.etaMinutes != null) return tracking.etaMinutes;
    const estTime = tracking?.estimatedDeliveryTime ?? order?.estimatedDeliveryTime;
    if (!estTime) return null;
    const diffMs = new Date(estTime).getTime() - mountTime;
    const diffMins = Math.ceil(diffMs / (60 * 1000));
    return diffMins > 0 ? diffMins : 0;
  }, [tracking?.etaMinutes, tracking?.estimatedDeliveryTime, order?.estimatedDeliveryTime, mountTime]);

  const etaText = useMemo(() => {
    if (status === 'DELIVERED') return 'Delivered';
    if (status === 'CANCELLED') return 'Cancelled';
    if (status === 'PENDING') return 'Awaiting shop';
    const prepMins = tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime;
    if ((status === 'CONFIRMED' || status === 'PREPARING') && prepMins) {
      return `~${prepMins} min prep`;
    }
    if (remainingMins == null) return '—';
    if (remainingMins === 0) return 'Arriving any moment';
    return `${remainingMins} mins`;
  }, [status, remainingMins, tracking?.estimatedPreparationTime, order?.estimatedPreparationTime]);

  const riderCoord = pickCoord(tracking?.liveLocation, tracking?.riderLocation, order?.riderLocation);

  const riderHeading =
    (tracking?.liveLocation as { heading?: number } | undefined)?.heading ??
    (tracking?.riderLocation as { heading?: number } | undefined)?.heading;

  const customerCoord = pickCoord(
    tracking?.deliveryLocation,
    order?.customerAddress,
    order?.deliveryAddress,
    order?.deliveryPoint,
  );

  const restaurantCoord = pickCoord(
    tracking?.restaurantLocation,
    order?.restaurantId && typeof order.restaurantId === 'object'
      ? {
          latitude: Number((order.restaurantId as { latitude?: number }).latitude),
          longitude: Number((order.restaurantId as { longitude?: number }).longitude),
        }
      : null,
    order?.restaurant?.location,
  );

  const hasUsableMapPoint = Boolean(
    (customerCoord && Math.abs(customerCoord.latitude) > 0.01) ||
      (restaurantCoord && Math.abs(restaurantCoord.latitude) > 0.01) ||
      riderCoord,
  );

  const routeQ = useQuery({
    queryKey: [
      'order-route',
      id,
      riderCoord ? Math.round(riderCoord.latitude * 200) : 0,
      riderCoord ? Math.round(riderCoord.longitude * 200) : 0,
      status,
    ],
    queryFn: () => fetchOrderRoute(id),
    enabled: Boolean(id) && hasUsableMapPoint && !CASE_CHECKOUT_ENABLED,
    staleTime: 45_000,
    retry: false,
  });

  const timeline = useMemo(() => {
    const logs = tracking?.timelineLogs ?? order?.timelineLogs ?? [];
    const logsMap = new Map<string, string>();
    if (Array.isArray(logs)) {
      logs.forEach((log: any) => {
        if (log?.status) logsMap.set(log.status, log.timestamp);
      });
    }

    return STATUS_STEPS.map((s) => ({
      status: s,
      timestamp: logsMap.get(s) ?? null,
    }));
  }, [tracking?.timelineLogs, order?.timelineLogs]);

  const currentStepIndex = STATUS_STEPS.indexOf(status);
  const socketLive = Boolean(tracking?.socketLive);

  const activeStepDescription = useMemo(() => STEP_DESCRIPTIONS[status] ?? 'Updating your order status', [status]);

  const riderInfo = useMemo(() => {
    const fromTrack = tracking?.rider;
    if (fromTrack?.fullName || fromTrack?.mobile) return fromTrack;
    const riderDoc = order?.riderId;
    if (riderDoc && typeof riderDoc === 'object') {
      const user = riderDoc.userId;
      return {
        fullName: user?.fullName ?? riderDoc.fullName ?? 'Delivery Partner',
        mobile: user?.mobile ?? riderDoc.mobile ?? null,
        riderCode: riderDoc.riderCode,
        vehicleType: riderDoc.vehicleType,
      };
    }
    return null;
  }, [tracking?.rider, order?.riderId]);

  const showRiderCard = Boolean(
    riderInfo && ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(status),
  );

  const loading = (trackQ.isLoading || orderQ.isLoading) && !tracking && !order;
  const failed = trackQ.isError && orderQ.isError && !tracking && !order;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={[styles.container, styles.center]}>
            <Text style={styles.mutedText}>Connecting to live status...</Text>
          </View>
        ) : failed ? (
          <View style={[styles.container, styles.center]}>
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {(trackQ.error as Error)?.message ??
                  (orderQ.error as Error)?.message ??
                  'Failed to load tracking data.'}
              </Text>
              <PressableScale
                onPress={() => {
                  void trackQ.refetch();
                  void orderQ.refetch();
                }}
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>Retry</Text>
              </PressableScale>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              <OrderTrackingMap
                customer={customerCoord}
                restaurant={restaurantCoord}
                rider={riderCoord}
                riderHeading={riderHeading}
                routePath={routeQ.data}
                height={260}
                followRider
                orderStatus={status}
              />
              <View style={[styles.socketBadge, { backgroundColor: socketLive ? 'rgba(22,163,74,0.92)' : 'rgba(15,15,15,0.85)' }]}>
                <LivePulse color="#FFFFFF" />
                <Text style={styles.socketText}>
                  {socketLive ? 'Live Tracking' : 'Updating every 20s'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
                <View style={styles.etaHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.etaSubText}>ESTIMATED DELIVERY TIME</Text>
                    <Text style={styles.etaMainText}>{etaText}</Text>
                  </View>
                  <View style={styles.bicycleIconCircle}>
                    <Ionicons name="bicycle" size={24} color={CaseUi.orange} />
                  </View>
                </View>

                <View style={styles.divider} />

                {(status === 'CONFIRMED' || status === 'PREPARING') &&
                (tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime) ? (
                  <Text style={styles.waitTimeText}>
                    Shop prep time: {tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime} minutes
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <LivePulse color={CaseUi.orange} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.etaDescriptionText}>{activeStepDescription}</Text>
                  </View>
                </View>
              </Animated.View>

              {showRiderCard && riderInfo ? (
                <Animated.View entering={FadeInDown.delay(60).duration(300)} style={[styles.card, styles.riderCard]}>
                  <View style={styles.riderCardHeader}>
                    <View style={styles.bicycleIconCircle}>
                      <Ionicons name="person" size={22} color={CaseUi.orange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderLabel}>Your delivery partner</Text>
                      <Text style={styles.riderName}>{riderInfo.fullName ?? 'Delivery Partner'}</Text>
                      {riderInfo.riderCode ? <Text style={styles.riderMeta}>ID: {riderInfo.riderCode}</Text> : null}
                    </View>
                  </View>
                  {riderInfo.mobile ? (
                    <PressableScale
                      onPress={() => Linking.openURL(`tel:${riderInfo.mobile}`)}
                      style={styles.callRiderBtn}
                    >
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                      <Text style={styles.callRiderText}>Call {riderInfo.mobile}</Text>
                    </PressableScale>
                  ) : null}
                </Animated.View>
              ) : null}

              {/* Delivery Timeline Card */}
              <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.card}>
                <Text style={styles.timelineTitle}>Delivery Timeline</Text>

                <View style={styles.timelineList}>
                  {timeline.map((step, idx) => {
                    const stepStatus = step.status;
                    const stepLabel = STEP_LABELS[stepStatus] ?? stepStatus.replace(/_/g, ' ');
                    const stepIdx = STATUS_STEPS.indexOf(stepStatus);
                    const isCompleted = stepIdx >= 0 && stepIdx <= currentStepIndex;
                    const isActive = stepStatus === status;

                    return (
                      <Animated.View
                        key={stepStatus}
                        entering={FadeInDown.delay(150 + idx * 30).duration(240)}
                        style={styles.timelineItem}
                      >
                        <View style={styles.timelineLeftColumn}>
                          <View
                            style={[
                              styles.timelinePoint,
                              isCompleted ? { backgroundColor: CaseUi.orange } : { backgroundColor: CaseUi.line },
                              isActive && styles.timelinePointActive,
                            ]}
                          />
                          {idx < timeline.length - 1 && (
                            <View
                              style={[
                                styles.timelineLineConnector,
                                { backgroundColor: stepIdx < currentStepIndex ? CaseUi.orange : CaseUi.line },
                              ]}
                            />
                          )}
                        </View>

                        <View style={styles.timelineContentColumn}>
                          <Text
                            style={[
                              styles.timelineStepLabel,
                              isCompleted && styles.timelineStepLabelDone,
                              isActive && styles.timelineStepLabelActive,
                            ]}
                          >
                            {stepLabel}
                          </Text>
                          {step.timestamp ? (
                            <Text style={styles.timelineTimestamp}>
                              {new Date(step.timestamp).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
                          ) : null}
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Support Quick Buttons */}
              <Animated.View entering={FadeInDown.delay(180).duration(300)} style={styles.actionRow}>
                <PressableScale style={styles.actionBtn} onPress={() => Linking.openURL('tel:18001234567')}>
                  <Ionicons name="call" size={18} color={CaseUi.orange} />
                  <Text style={styles.actionText}>Call Support</Text>
                </PressableScale>
                <PressableScale style={styles.actionBtn} onPress={() => router.push('/support')}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={CaseUi.orange} />
                  <Text style={styles.actionText}>Get Help</Text>
                </PressableScale>
              </Animated.View>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  mutedText: { color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
  mapContainer: {
    height: 260,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  socketBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  socketText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  pulseWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  etaHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etaSubText: { fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5, color: CaseUi.muted },
  etaMainText: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4, color: CaseUi.ink },
  bicycleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orangeSoft,
  },
  divider: { height: 1, marginVertical: 12, backgroundColor: CaseUi.line },
  etaDescriptionText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  waitTimeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 10, color: CaseUi.orange },
  riderCard: { gap: 12 },
  riderCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riderLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: CaseUi.muted,
  },
  riderName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2, color: CaseUi.ink },
  riderMeta: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2, color: CaseUi.muted },
  callRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: CaseUi.orange,
  },
  callRiderText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },
  timelineTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, marginBottom: 16, color: CaseUi.ink },
  timelineList: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', minHeight: 48 },
  timelineLeftColumn: { alignItems: 'center', width: 20 },
  timelinePoint: { width: 8, height: 8, borderRadius: 4, zIndex: 2, marginTop: 5 },
  timelinePointActive: { borderWidth: 3, borderColor: CaseUi.orangeSoft },
  timelineLineConnector: { width: 2, flex: 1, marginVertical: 2, zIndex: 1 },
  timelineContentColumn: { flex: 1, paddingLeft: 12, paddingBottom: 16, justifyContent: 'flex-start' },
  timelineStepLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  timelineStepLabelDone: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  timelineStepLabelActive: { color: CaseUi.orange },
  timelineTimestamp: { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 3, color: CaseUi.muted },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
  },
  actionText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: CaseUi.ink },
  errorCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { color: CaseUi.danger, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
