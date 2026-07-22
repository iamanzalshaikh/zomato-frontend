import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '@/hooks/queries/notifications';
import { openNotificationTarget } from '@/lib/notificationNavigation';
import type { AppNotification } from '@/services/notifications';

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function NotificationRow({ item, onPress, index }: { item: AppNotification; onPress: () => void; index: number }) {
  const isOrder = item.notificationType === 'ORDER';
  const isClickable = Boolean(
    (item.redirectType === 'ORDER' || item.redirectType === 'RESTAURANT' || isOrder) && item.redirectId,
  );

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(240)}>
      <PressableScale onPress={onPress} style={[styles.row, !item.isRead && styles.rowUnread]}>
        <View style={[styles.iconWrap, isOrder && styles.iconWrapOrder]}>
          <Ionicons
            name={isOrder ? 'receipt-outline' : 'notifications-outline'}
            size={20}
            color={isOrder ? CaseUi.orange : CaseUi.muted}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, !item.isRead && styles.unreadTitle]}>{item.title ?? 'Notification'}</Text>
          <Text style={styles.body} numberOfLines={3}>
            {item.message ?? item.body ?? ''}
          </Text>
          <Text style={styles.time}>{item.sentAt ? formatTimeAgo(item.sentAt) : ''}</Text>
        </View>
        {isClickable ? <Ionicons name="chevron-forward" size={18} color={CaseUi.muted} style={styles.chevron} /> : null}
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </PressableScale>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const q = useNotificationsQuery();
  const items = Array.isArray(q.data) ? q.data : [];
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const unread = items.filter((n) => !n.isRead).length;

  function onOpen(item: AppNotification) {
    if (!item.isRead) {
      markOne.mutate(String(item._id));
    }
    openNotificationTarget(item);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 ? (
            <PressableScale onPress={() => markAll.mutate()} disabled={markAll.isPending} style={styles.markBtn}>
              <Text style={styles.markText}>Mark all</Text>
            </PressableScale>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        {q.isLoading ? (
          <View style={{ gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.row, { paddingVertical: 14 }]}>
                <SkeletonBlock width={40} height={40} radius={12} />
                <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
                  <SkeletonBlock width="60%" height={14} />
                  <SkeletonBlock width="90%" height={12} />
                  <SkeletonBlock width="25%" height={10} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => String(n._id)}
            refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={CaseUi.orange} />}
            ListEmptyComponent={
              <EmptyState
                icon="notifications-off-outline"
                title="No notifications yet"
                subtitle="Order updates and offers will appear here."
              />
            }
            renderItem={({ item, index }) => <NotificationRow item={item} onPress={() => onOpen(item)} index={index} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: CaseUi.ink },
  markBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: CaseUi.orangeSoft },
  markText: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
    gap: 8,
  },
  rowUnread: { backgroundColor: CaseUi.orangeSoft },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.field,
  },
  iconWrapOrder: { backgroundColor: CaseUi.orangeSoft },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink, fontSize: 14 },
  unreadTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  body: { marginTop: 4, fontSize: 12, lineHeight: 16, color: CaseUi.muted },
  time: { marginTop: 6, fontSize: 11, color: CaseUi.muted },
  chevron: { marginTop: 10 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    right: 4,
    top: 18,
    backgroundColor: CaseUi.orange,
  },
});
