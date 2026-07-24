import React from 'react';
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
import { useThemeContext } from '@/context/ThemeContext';
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
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const allItems = (Array.isArray(q.data) ? q.data : []) as Order[];
  const loading = q.isLoading || q.isFetching;
  const error = (q.error as any)?.message ?? null;

  const activeItems = allItems.filter((o) => isActiveOrder(o.orderStatus));
  const pastItems = allItems.filter((o) => !isActiveOrder(o.orderStatus));

  function renderCard(item: Order, index: number, isActive: boolean) {
    const statusConfig = getStatusConfig(item.orderStatus);
    const paymentInfo = getPaymentStatusDisplay(item);
    const unpaidOnline = needsOnlinePayment(item);
    const paymentFailed = isPaymentFailed(item);
    const showTrack = isActive && canTrackOrder(item);
    const itemsList = item.orderItems?.map((it) => `${it.quantity} × ${it.itemName}`).join(', ') || '';
    const paymentToneColor = PAYMENT_TONE_COLORS[paymentInfo.tone] ?? CaseUi.muted;

    const openOrder = () => router.push({ pathname: '/order/[orderId]', params: { orderId: item._id } });
    const payOrRetry = () => router.push({
      pathname: '/payment/razorpay',
      params: { orderId: item._id, restaurantName: item.restaurantId?.restaurantName ?? '' },
    });

    return (
      <Animated.View key={item._id} entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
        <PressableScale
          onPress={openOrder}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#141417' : CaseUi.white,
              borderColor: isActive ? CaseUi.orange : (isDark ? '#27272A' : CaseUi.line),
            },
            isActive && styles.cardActive,
          ]}
        >
          {isActive && <View style={styles.activeAccent} />}
          <View style={styles.restaurantRow}>
            <View style={styles.restaurantLeft}>
              <View style={[styles.restaurantIconCircle, { backgroundColor: isDark ? '#222228' : CaseUi.field }]}>
                {item.restaurantId?.logo ? (
                  <Image source={{ uri: item.restaurantId.logo }} style={styles.restaurantLogo} />
                ) : (
                  <Ionicons name="restaurant" size={16} color={CaseUi.orange} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.restaurantName, { color: colors.text }]}>{item.restaurantId?.restaurantName || 'Restaurant'}</Text>
                <Text style={[styles.orderDate, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
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
            <Text style={[styles.itemsListText, { color: colors.textSecondary }]} numberOfLines={2}>
              {itemsList}
            </Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>JMD {item.grandTotal ?? 0}</Text>
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
  }

  const sections = [
    ...(activeItems.length > 0
      ? [
          <Animated.View key="active-header" entering={FadeInDown.duration(280)} style={styles.sectionLabel}>
            <View style={styles.sectionLabelDot} />
            <Text style={styles.sectionLabelText}>Active Orders ({activeItems.length})</Text>
          </Animated.View>,
          ...activeItems.map((o, i) => renderCard(o, i, true)),
        ]
      : []),
    ...(pastItems.length > 0
      ? [
          <Animated.View key="past-header" entering={FadeInDown.delay(60).duration(280)} style={styles.sectionLabel}>
            <Text style={[styles.sectionLabelText, { color: CaseUi.muted }]}>Past Orders</Text>
          </Animated.View>,
          ...pastItems.map((o, i) => renderCard(o, activeItems.length + i, false)),
        ]
      : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.header, { borderBottomColor: isDark ? '#222226' : CaseUi.line }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Track ongoing and past campus deliveries</Text>
        </Animated.View>

        {!!error && (
          <ErrorState title="Couldn't load your orders" subtitle={error} actionLabel="Retry" onAction={() => q.refetch()} />
        )}

        {loading && !allItems.length && !error ? (
          <View style={styles.listContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.skeletonCard, { borderColor: isDark ? '#27272A' : CaseUi.line }]}>
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
            data={sections}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={[styles.listContainer, { paddingBottom: tabBarHeight + 16 }]}
            refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={CaseUi.orange} />}
            ListEmptyComponent={
              !error ? <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Your campus orders will show up here." /> : null
            }
            renderItem={({ item }) => item as React.ReactElement}
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
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: CaseUi.ink, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 6, color: CaseUi.muted },
  listContainer: { padding: 16, paddingBottom: 40, gap: 16 },
  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CaseUi.line,
    padding: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    padding: 16,
    ...CaseUi.softShadow,
  },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  restaurantLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  restaurantIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
  },
  restaurantLogo: { width: '100%', height: '100%' },
  restaurantName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5, color: CaseUi.ink },
  orderDate: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2, color: CaseUi.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  divider: { height: 1, marginVertical: 14, backgroundColor: CaseUi.line },
  itemsSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  itemsListText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', flex: 1, lineHeight: 18, color: CaseUi.muted },
  totalAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: CaseUi.ink },
  footerActionRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnPrimary: { backgroundColor: CaseUi.orangeSoft, borderColor: CaseUi.orange },
  actionBtnDanger: { backgroundColor: '#FEE2E2', borderColor: CaseUi.danger },
  actionBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12 },
  cardActive: {
    borderWidth: 1.5,
  },
  activeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: CaseUi.orange,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  sectionLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CaseUi.orange,
  },
  sectionLabelText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: CaseUi.ink,
    letterSpacing: 0.2,
  },
});

