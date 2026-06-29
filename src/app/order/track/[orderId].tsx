import { useMemo, useRef } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OrderTrackingMap } from '@/components/order-tracking-map';
import { useTheme } from '@/hooks/use-theme';
import { useOrderByIdQuery, useOrderTrackQuery } from '@/hooks/queries/orderDetail';
import { fetchOrderRoute } from '@/services/orders';
import { useQuery } from '@tanstack/react-query';
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
  CONFIRMED: 'Restaurant Accepted',
  PREPARING: 'Food is being Prepared',
  READY_FOR_PICKUP: 'Ready for Pickup',
  RIDER_ASSIGNED: 'Delivery Partner Assigned',
  PICKED_UP: 'Order Picked Up',
  ON_THE_WAY: 'Out for Delivery',
  DELIVERED: 'Order Delivered',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Waiting for the restaurant to accept your order',
  CONFIRMED: 'Restaurant accepted — your food will be prepared soon',
  PREPARING: 'Chef is cooking your delicious meal',
  READY_FOR_PICKUP: 'Rider is about to pick up your food',
  RIDER_ASSIGNED: 'Partner is arriving at the restaurant',
  PICKED_UP: 'Partner is on the way to you',
  ON_THE_WAY: 'Partner is nearby, keep your phone handy',
  DELIVERED: 'Hope you enjoy your meal!',
};

export default function TrackOrderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';

  const trackQ = useOrderTrackQuery(id);
  const orderQ = useOrderByIdQuery(id);
  useOrderSocket(id);

  const tracking: any = trackQ.data;
  const order: any = orderQ.data;

  const status = String(tracking?.orderStatus ?? tracking?.status ?? order?.orderStatus ?? 'PENDING');
  
  // Use a ref for the mount time so it's stable across renders.
  // Date.now() inside useMemo is impure (ESLint react-hooks/purity).
  const mountTimeRef = useRef(Date.now());

  const remainingMins = useMemo(() => {
    if (tracking?.etaMinutes != null) return tracking.etaMinutes;
    const estTime = tracking?.estimatedDeliveryTime ?? order?.estimatedDeliveryTime;
    if (!estTime) return null;
    const diffMs = new Date(estTime).getTime() - mountTimeRef.current;
    const diffMins = Math.ceil(diffMs / (60 * 1000));
    return diffMins > 0 ? diffMins : 0;
  }, [tracking?.etaMinutes, tracking?.estimatedDeliveryTime, order?.estimatedDeliveryTime]);

  const etaText = useMemo(() => {
    if (status === 'DELIVERED') return 'Delivered';
    if (status === 'CANCELLED') return 'Cancelled';
    if (status === 'PENDING') return 'Awaiting restaurant';
    const prepMins = tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime;
    if ((status === 'CONFIRMED' || status === 'PREPARING') && prepMins) {
      return `~${prepMins} min prep`;
    }
    if (remainingMins == null) return '—';
    if (remainingMins === 0) return 'Arriving any moment';
    return `${remainingMins} mins`;
  }, [status, remainingMins, tracking?.estimatedPreparationTime, order?.estimatedPreparationTime]);

  const riderCoord = pickCoord(
    tracking?.liveLocation,
    tracking?.riderLocation,
    order?.riderLocation,
  );

  const riderHeading =
    (tracking?.liveLocation as { heading?: number } | undefined)?.heading ??
    (tracking?.riderLocation as { heading?: number } | undefined)?.heading;

  const customerCoord = pickCoord(
    tracking?.deliveryLocation,
    order?.customerAddress,
    order?.deliveryAddress,
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

  const routeQ = useQuery({
    queryKey: [
      'order-route',
      id,
      riderCoord ? Math.round(riderCoord.latitude * 200) : 0,
      riderCoord ? Math.round(riderCoord.longitude * 200) : 0,
      status,
    ],
    queryFn: () => fetchOrderRoute(id),
    enabled: Boolean(id) && Boolean(riderCoord || restaurantCoord),
    staleTime: 45_000,
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

  const activeStepDescription = useMemo(() => {
    return STEP_DESCRIPTIONS[status] ?? 'Updating your order status';
  }, [status]);

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
    riderInfo &&
      ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(status),
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }]}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Live Tracking</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {trackQ.isLoading && !tracking ? (
          <ThemedView style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
            <ThemedText style={{ color: theme.textSecondary }}>Connecting to live status...</ThemedText>
          </ThemedView>
        ) : trackQ.isError ? (
          <ThemedView style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
            <ThemedView type="backgroundElement" style={styles.errorCard}>
              <ThemedText style={styles.errorText}>
                {(trackQ.error as Error)?.message ?? 'Failed to load tracking data.'}
              </ThemedText>
              <Pressable onPress={() => trackQ.refetch()} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
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
              <View style={[styles.socketBadge, { backgroundColor: socketLive ? 'rgba(15,138,95,0.9)' : 'rgba(36,37,40,0.85)' }]}>
                <View style={[styles.socketDot, { backgroundColor: socketLive ? '#ffffff' : '#9fa2a7' }]} />
                <ThemedText style={styles.socketText}>
                  {socketLive ? 'Live Tracking' : 'Updating every 10s'}
                </ThemedText>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.backgroundSelected }]}>
              <View style={styles.etaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.etaSubText, { color: theme.textSecondary }]}>
                    ESTIMATED DELIVERY TIME
                  </ThemedText>
                  <ThemedText style={[styles.etaMainText, { color: theme.text }]}>
                    {etaText}
                  </ThemedText>
                </View>
                <View style={[styles.bicycleIconCircle, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="bicycle" size={24} color={theme.primary} />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

              {(status === 'CONFIRMED' || status === 'PREPARING') &&
              (tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime) ? (
                <ThemedText style={[styles.waitTimeText, { color: theme.primary }]}>
                  Restaurant prep time: {tracking?.estimatedPreparationTime ?? order?.estimatedPreparationTime} minutes
                </ThemedText>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.indicatorPulse}>
                  <View style={styles.pulseInner} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.etaDescriptionText}>{activeStepDescription}</ThemedText>
                </View>
              </View>
            </ThemedView>

            {showRiderCard && riderInfo ? (
              <ThemedView type="backgroundElement" style={[styles.card, styles.riderCard, { borderColor: theme.backgroundSelected }]}>
                <View style={styles.riderCardHeader}>
                  <View style={[styles.bicycleIconCircle, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="person" size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.riderLabel}>Your delivery partner</ThemedText>
                    <ThemedText style={[styles.riderName, { color: theme.text }]}>
                      {riderInfo.fullName ?? 'Delivery Partner'}
                    </ThemedText>
                    {riderInfo.riderCode ? (
                      <ThemedText style={[styles.riderMeta, { color: theme.textSecondary }]}>
                        ID: {riderInfo.riderCode}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                {riderInfo.mobile ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${riderInfo.mobile}`)}
                    style={[styles.callRiderBtn, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="call" size={18} color="#ffffff" />
                    <ThemedText style={styles.callRiderText}>Call {riderInfo.mobile}</ThemedText>
                  </Pressable>
                ) : null}
              </ThemedView>
            ) : null}

            {/* Delivery Timeline Card */}
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.backgroundSelected }]}>
              <ThemedText style={styles.timelineTitle}>Delivery Timeline</ThemedText>
              
              <View style={styles.timelineList}>
                {timeline.map((step, idx) => {
                  const stepStatus = step.status;
                  const stepLabel = STEP_LABELS[stepStatus] ?? stepStatus.replace(/_/g, ' ');
                  const stepIdx = STATUS_STEPS.indexOf(stepStatus);
                  const isCompleted = stepIdx >= 0 && stepIdx <= currentStepIndex;
                  const isActive = stepStatus === status;

                  return (
                    <View key={stepStatus} style={styles.timelineItem}>
                      {/* Left Line & Dot Column */}
                      <View style={styles.timelineLeftColumn}>
                        <View
                          style={[
                            styles.timelinePoint,
                            isCompleted ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSelected },
                            isActive && { borderWidth: 3, borderColor: `${theme.primary}50` },
                          ]}
                        />
                        {idx < timeline.length - 1 && (
                          <View
                            style={[
                              styles.timelineLineConnector,
                              { backgroundColor: stepIdx < currentStepIndex ? theme.primary : theme.backgroundSelected },
                            ]}
                          />
                        )}
                      </View>

                      {/* Content Column */}
                      <View style={styles.timelineContentColumn}>
                        <ThemedText
                          style={[
                            styles.timelineStepLabel,
                            isCompleted ? { color: theme.text, fontFamily: 'PlusJakartaSans_800ExtraBold' } : { color: theme.textSecondary },
                            isActive && { color: theme.primary },
                          ]}
                        >
                          {stepLabel}
                        </ThemedText>
                        {step.timestamp ? (
                          <ThemedText style={[styles.timelineTimestamp, { color: theme.textSecondary }]}>
                            {new Date(step.timestamp).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ThemedView>

            {/* Support Quick Buttons */}
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                onPress={() => Linking.openURL('tel:18001234567')}
              >
                <Ionicons name="call" size={18} color={theme.primary} />
                <ThemedText style={[styles.actionText, { color: theme.text }]}>Call Support</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                onPress={() => router.push('/support')}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color={theme.primary} />
                <ThemedText style={[styles.actionText, { color: theme.text }]}>Get Help</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16.5,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  mapContainer: {
    height: 260,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.08)',
  },
  socketBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  socketDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  socketText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaSubText: {
    fontSize: 8.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  etaMainText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_850ExtraBold',
    marginTop: 4,
  },
  bicycleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  indicatorPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,90,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff5a00',
  },
  etaDescriptionText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  waitTimeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 10,
  },
  riderCard: {
    gap: 12,
  },
  riderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.7,
  },
  riderName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginTop: 2,
  },
  riderMeta: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
  callRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  callRiderText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  timelineTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 20,
  },
  timelinePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
    marginTop: 5,
  },
  timelineLineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    zIndex: 1,
  },
  timelineContentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  timelineStepLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 0,
  },
  timelineTimestamp: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: 'PlusJakartaSans_750Bold',
    fontSize: 12.5,
  },
  errorCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,55,68,0.25)',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#e23744',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#ff5a00',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});
