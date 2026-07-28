import React, { memo, useCallback, useMemo } from 'react';
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
  getPaymentStatusDisplay,
  isPaymentFailed,
  needsOnlinePayment,
} from '@/lib/orderPayment';
import {
  isAwaitingBankVerification,
  needsBankReceiptUpload,
} from '@/lib/bankReceipt';
import {
  getCampusProgressSteps,
  getOrderStatusDisplay,
  isActiveOrderStatus,
} from '@/lib/orderStatus';
import type { Order } from '@/services/orders';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
}

function ProgressRail({ status }: { status?: string }) {
  const steps = getCampusProgressSteps(status);
  return (
    <View style={styles.progressRail}>
      {steps.map((step, i) => (
        <View key={step.key} style={styles.progressStep}>
          <View style={styles.progressDotRow}>
            <View
              style={[
                styles.progressDot,
                step.done && styles.progressDotDone,
                step.current && styles.progressDotCurrent,
              ]}
            />
            {i < steps.length - 1 ? (
              <View style={[styles.progressLine, step.done && styles.progressLineDone]} />
            ) : null}
          </View>
          <Text
            style={[
              styles.progressLabel,
              (step.done || step.current) && styles.progressLabelActive,
            ]}
            numberOfLines={1}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

type OrderRow =
  | { type: 'header'; key: string; label: string; count?: number; delay: number }
  | { type: 'order'; key: string; order: Order; index: number; isActive: boolean };

const OrderCard = memo(function OrderCard({
  order: item,
  index,
  isActive,
}: {
  order: Order;
  index: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const statusConfig = getOrderStatusDisplay(item.orderStatus);
  const paymentInfo = getPaymentStatusDisplay(item);
  const unpaidOnline = needsOnlinePayment(item);
  const paymentFailed = isPaymentFailed(item);
  const needsReceipt = needsBankReceiptUpload(item as any);
  const awaitingVerify = isAwaitingBankVerification(item as any);
  const itemsList =
    item.orderItems?.map((it) => `${it.quantity}× ${it.itemName}`).join(' · ') || 'Order items';
  const dropOff = item.customerAddress?.fullAddress;

  const openOrder = () =>
    router.push({ pathname: '/order/[orderId]', params: { orderId: item._id } });

  const displayStatus =
    awaitingVerify
      ? {
          label: 'Verifying payment',
          color: '#F59E0B',
          icon: 'time-outline' as const,
          hint: 'Receipt received — CASE is verifying payment',
        }
      : statusConfig;

  const primaryAction = (() => {
    if (needsReceipt) {
      return {
        label: 'Upload receipt',
        icon: 'cloud-upload-outline' as const,
        onPress: () =>
          router.push({
            pathname: '/bank-transfer/[orderId]',
            params: { orderId: item._id },
          }),
      };
    }
    if (awaitingVerify) {
      return {
        label: 'View order',
        icon: 'receipt-outline' as const,
        onPress: openOrder,
      };
    }
    if (unpaidOnline) {
      return {
        label: paymentFailed ? 'Retry payment' : 'Pay now',
        icon: 'card-outline' as const,
        onPress: () =>
          router.push({
            pathname: '/payment/razorpay',
            params: {
              orderId: item._id,
              restaurantName: item.restaurantId?.restaurantName ?? '',
            },
          }),
      };
    }
    if (isActive) {
      return {
        label: 'View status',
        icon: 'list-outline' as const,
        onPress: openOrder,
      };
    }
    return {
      label: 'View order',
      icon: 'receipt-outline' as const,
      onPress: openOrder,
    };
  })();

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
      <PressableScale
        onPress={openOrder}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#141417' : CaseUi.white,
            borderColor: isDark ? '#27272A' : CaseUi.line,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.storeIcon,
              { backgroundColor: isDark ? '#222228' : CaseUi.orangeSoft },
            ]}
          >
            {item.restaurantId?.logo ? (
              <Image source={{ uri: item.restaurantId.logo }} style={styles.storeLogo} />
            ) : (
              <Ionicons name="bag-handle" size={18} color={CaseUi.orange} />
            )}
          </View>
          <View style={styles.cardTopText}>
            <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
              {item.restaurantId?.restaurantName || 'Campus order'}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              #{item.orderNumber ?? item._id.slice(-6).toUpperCase()} · {formatDate(item.createdAt)}
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.text }]}>
            J${Number(item.grandTotal ?? 0).toFixed(0)}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${displayStatus.color}18` }]}>
            <Ionicons name={displayStatus.icon} size={12} color={displayStatus.color} />
            <Text style={[styles.badgeText, { color: displayStatus.color }]}>
              {displayStatus.label}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? '#222228' : CaseUi.field }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {paymentInfo.label}
            </Text>
          </View>
        </View>

        {isActive ? <ProgressRail status={item.orderStatus} /> : null}

        <Text style={[styles.itemsLine, { color: colors.textSecondary }]} numberOfLines={2}>
          {itemsList}
        </Text>
        {dropOff ? (
          <View style={styles.dropRow}>
            <Ionicons name="location-outline" size={13} color={CaseUi.muted} />
            <Text style={styles.dropText} numberOfLines={1}>
              Drop-off · {dropOff}
            </Text>
          </View>
        ) : null}

        {displayStatus.hint && isActive ? (
          <Text style={styles.hintText}>{displayStatus.hint}</Text>
        ) : null}

        <PressableScale onPress={primaryAction.onPress} style={styles.cta}>
          <Ionicons name={primaryAction.icon} size={16} color="#FFF" />
          <Text style={styles.ctaText}>{primaryAction.label}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.85)" />
        </PressableScale>
      </PressableScale>
    </Animated.View>
  );
});

function SectionHeaderRow({ row }: { row: Extract<OrderRow, { type: 'header' }> }) {
  return (
    <Animated.View entering={FadeInDown.delay(row.delay).duration(280)} style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>
        {row.label}
        {row.count != null ? ` · ${row.count}` : ''}
      </Text>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const tabBarHeight = useTabBarHeight();
  const q = useOrderHistoryQuery();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const allItems = (Array.isArray(q.data) ? q.data : []) as Order[];
  const loading = q.isLoading || q.isFetching;
  const error = (q.error as any)?.message ?? null;

  const activeItems = useMemo(
    () => allItems.filter((o) => isActiveOrderStatus(o.orderStatus)),
    [allItems],
  );
  const pastItems = useMemo(
    () => allItems.filter((o) => !isActiveOrderStatus(o.orderStatus)),
    [allItems],
  );

  const rows = useMemo<OrderRow[]>(() => {
    const out: OrderRow[] = [];
    if (activeItems.length > 0) {
      out.push({
        type: 'header',
        key: 'active-header',
        label: 'In progress',
        count: activeItems.length,
        delay: 0,
      });
      activeItems.forEach((o, i) =>
        out.push({ type: 'order', key: o._id, order: o, index: i, isActive: true }),
      );
    }
    if (pastItems.length > 0) {
      out.push({ type: 'header', key: 'past-header', label: 'Past orders', delay: 60 });
      pastItems.forEach((o, i) =>
        out.push({
          type: 'order',
          key: o._id,
          order: o,
          index: activeItems.length + i,
          isActive: false,
        }),
      );
    }
    return out;
  }, [activeItems, pastItems]);

  const keyExtractor = useCallback((row: OrderRow) => row.key, []);
  const renderItem = useCallback(({ item }: { item: OrderRow }) => {
    if (item.type === 'header') return <SectionHeaderRow row={item} />;
    return <OrderCard order={item.order} index={item.index} isActive={item.isActive} />;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAFAFA' }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Campus drop-off status — no map needed
          </Text>
        </Animated.View>

        {!!error && (
          <ErrorState
            title="Couldn't load your orders"
            subtitle={error}
            actionLabel="Retry"
            onAction={() => q.refetch()}
          />
        )}

        {loading && !allItems.length && !error ? (
          <View style={styles.listContainer}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.skeletonCard, { borderColor: isDark ? '#27272A' : CaseUi.line }]}
              >
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <SkeletonBlock width={44} height={44} radius={14} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBlock width="50%" height={14} />
                    <SkeletonBlock width="40%" height={11} />
                  </View>
                </View>
                <SkeletonBlock width="100%" height={48} radius={10} style={{ marginTop: 14 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            contentContainerStyle={[styles.listContainer, { paddingBottom: tabBarHeight + 20 }]}
            refreshControl={
              <RefreshControl
                refreshing={q.isFetching}
                onRefresh={() => q.refetch()}
                tintColor={CaseUi.orange}
              />
            }
            ListEmptyComponent={
              !error ? (
                <EmptyState
                  icon="receipt-outline"
                  title="No orders yet"
                  subtitle="When you place a campus order, it will show up here with clear status steps."
                />
              ) : null
            }
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: CaseUi.ink,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
    color: CaseUi.muted,
  },
  listContainer: { paddingHorizontal: 16, paddingTop: 4 },
  skeletonCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    backgroundColor: CaseUi.white,
  },
  sectionRow: { paddingTop: 10, paddingBottom: 6, paddingHorizontal: 2 },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.muted,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storeLogo: { width: '100%', height: '100%' },
  cardTopText: { flex: 1, minWidth: 0 },
  storeName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  metaLine: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  amount: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  progressRail: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 4,
  },
  progressStep: { flex: 1, minWidth: 0 },
  progressDotRow: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CaseUi.line,
  },
  progressDotDone: { backgroundColor: CaseUi.orange },
  progressDotCurrent: {
    backgroundColor: CaseUi.orange,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: CaseUi.line,
    marginHorizontal: 2,
  },
  progressLineDone: { backgroundColor: CaseUi.orange },
  progressLabel: {
    marginTop: 6,
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
  },
  progressLabelActive: { color: CaseUi.ink },
  itemsLine: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 18,
  },
  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  dropText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.orangeDeep,
  },
  cta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CaseUi.orange,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#FFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
  },
});
