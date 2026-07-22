import { FlatList, RefreshControl, StyleSheet, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useOrderHistoryQuery } from '@/hooks/queries/orders';
import {
  canTrackOrder,
  getPaymentStatusDisplay,
  isPaymentFailed,
  needsOnlinePayment,
} from '@/lib/orderPayment';
import type { Order } from '@/services/orders';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString(undefined, options)} at ${date.toLocaleTimeString(undefined, timeOptions)}`;
}

function getStatusConfig(status?: string) {
  const s = (status ?? 'PENDING').toUpperCase();
  switch (s) {
    case 'DELIVERED':
      return { label: 'Delivered', color: CaseUi.success, icon: 'checkmark-circle' as const };
    case 'CANCELLED':
      return { label: 'Cancelled', color: CaseUi.danger, icon: 'close-circle' as const };
    case 'PENDING':
      return { label: 'Awaiting acceptance', color: '#F59E0B', icon: 'hourglass' as const };
    case 'CONFIRMED':
      return { label: 'Accepted', color: CaseUi.orange, icon: 'checkmark-circle' as const };
    case 'PREPARING':
      return { label: 'Preparing', color: CaseUi.orange, icon: 'restaurant' as const };
    case 'READY_FOR_PICKUP':
      return { label: 'Ready for Pickup', color: CaseUi.orange, icon: 'gift' as const };
    case 'RIDER_ASSIGNED':
    case 'PICKED_UP':
    case 'ON_THE_WAY':
      return { label: 'Out for Delivery', color: CaseUi.orange, icon: 'bicycle' as const };
    default:
      return { label: s, color: CaseUi.muted, icon: 'information-circle' as const };
  }
}

function isActiveOrder(status?: string) {
  const s = (status ?? '').toUpperCase();
  return s !== 'DELIVERED' && s !== 'CANCELLED';
}

const PAYMENT_TONE_COLORS: Record<string, string> = {
  failed: CaseUi.danger,
  pending: '#F59E0B',
  paid: CaseUi.success,
};

export default function OrdersScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const q = useOrderHistoryQuery();
  const items = (Array.isArray(q.data) ? q.data : []) as Order[];
  const loading = q.isLoading || q.isFetching;
  const error = (q.error as any)?.message ?? null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>Track ongoing and past campus deliveries</Text>
        </Animated.View>

        {!!error && (
          <ErrorState title="Couldn't load your orders" subtitle={error} actionLabel="Retry" onAction={() => q.refetch()} />
        )}

        {loading && !items.length && !error ? (
          <View style={styles.listContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <SkeletonBlock width={38} height={38} radius={19} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBlock width="55%" height={14} />
                    <SkeletonBlock width="35%" height={11} />
                  </View>
                </View>
                <SkeletonBlock width="100%" height={40} radius={10} style={{ marginTop: 14 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(o) => o._id}
            contentContainerStyle={[styles.listContainer, { paddingBottom: tabBarHeight + 16 }]}
            refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={CaseUi.orange} />}
            ListEmptyComponent={
              !error ? <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Your campus orders will show up here." /> : null
            }
            renderItem={({ item, index }) => {
              const statusConfig = getStatusConfig(item.orderStatus);
              const isOrderActive = isActiveOrder(item.orderStatus);
              const paymentInfo = getPaymentStatusDisplay(item);
              const unpaidOnline = needsOnlinePayment(item);
              const paymentFailed = isPaymentFailed(item);
              const showTrack = isOrderActive && canTrackOrder(item);
              const itemsList = item.orderItems?.map((it) => `${it.quantity} x ${it.itemName}`).join(', ') || '';
              const paymentToneColor = PAYMENT_TONE_COLORS[paymentInfo.tone] ?? CaseUi.muted;

              const openOrder = () => router.push({ pathname: '/order/[orderId]', params: { orderId: item._id } });

              const payOrRetry = () => {
                router.push({
                  pathname: '/payment/razorpay',
                  params: { orderId: item._id, restaurantName: item.restaurantId?.restaurantName ?? '' },
                });
              };

              return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
                  <PressableScale onPress={openOrder} style={styles.card}>
                    <View style={styles.restaurantRow}>
                      <View style={styles.restaurantLeft}>
                        <View style={styles.restaurantIconCircle}>
                          {item.restaurantId?.logo ? (
                            <Image source={{ uri: item.restaurantId.logo }} style={styles.restaurantLogo} />
                          ) : (
                            <Ionicons name="restaurant" size={16} color={CaseUi.orange} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restaurantName}>{item.restaurantId?.restaurantName || 'Restaurant'}</Text>
                          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={CaseUi.muted} />
                    </View>

                    <View style={styles.chipRow}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}18` }]}>
                        <Ionicons name={statusConfig.icon} size={10} color={statusConfig.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${paymentToneColor}18` }]}>
                        <Text style={[styles.statusText, { color: paymentToneColor }]}>{paymentInfo.label}</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.itemsSummaryRow}>
                      <Text style={styles.itemsListText} numberOfLines={2}>
                        {itemsList}
                      </Text>
                      <Text style={styles.totalAmount}>J${item.grandTotal ?? 0}</Text>
                    </View>

                    {(unpaidOnline || showTrack) && (
                      <View style={styles.footerActionRow}>
                        {unpaidOnline && (
                          <PressableScale
                            onPress={payOrRetry}
                            style={[
                              styles.actionBtn,
                              paymentFailed ? styles.actionBtnDanger : styles.actionBtnPrimary,
                              { flex: showTrack ? 1 : undefined },
                            ]}
                          >
                            <Ionicons name="card-outline" size={14} color={paymentFailed ? CaseUi.danger : CaseUi.orange} />
                            <Text style={[styles.actionBtnText, { color: paymentFailed ? CaseUi.danger : CaseUi.orange }]}>
                              {paymentFailed ? 'Retry payment' : 'Pay now'}
                            </Text>
                          </PressableScale>
                        )}
                        {showTrack && (
                          <PressableScale
                            onPress={() => router.push({ pathname: '/order/track/[orderId]', params: { orderId: item._id } })}
                            style={[styles.actionBtn, styles.actionBtnPrimary, { flex: unpaidOnline ? 1 : undefined }]}
                          >
                            <Ionicons name="bicycle-outline" size={14} color={CaseUi.orange} />
                            <Text style={[styles.actionBtnText, { color: CaseUi.orange }]}>Track live</Text>
                          </PressableScale>
                        )}
                      </View>
                    )}
                  </PressableScale>
                </Animated.View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: CaseUi.ink, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4, color: CaseUi.muted },
  listContainer: { padding: 16, paddingBottom: 40, gap: 14 },
  skeletonCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    padding: 14,
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    padding: 14,
    ...CaseUi.softShadow,
  },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  restaurantLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  restaurantIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
  },
  restaurantLogo: { width: '100%', height: '100%' },
  restaurantName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: CaseUi.ink },
  orderDate: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2, color: CaseUi.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  divider: { height: 1, marginVertical: 12, backgroundColor: CaseUi.line },
  itemsSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  itemsListText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', flex: 1, lineHeight: 17, color: CaseUi.muted },
  totalAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: CaseUi.ink },
  footerActionRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: CaseUi.orangeSoft, borderColor: CaseUi.orange },
  actionBtnDanger: { backgroundColor: '#FEE2E2', borderColor: CaseUi.danger },
  actionBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11 },
});
