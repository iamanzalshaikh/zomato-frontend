import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { useCaseDeliveryPointsQuery } from '@/hooks/queries/case';
import { setSelectedDeliveryPoint } from '@/lib/caseCheckout';
import { toast } from '@/lib/toast';

export default function DeliveryPointScreen() {
  const router = useRouter();
  const pointsQ = useCaseDeliveryPointsQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const points = useMemo(() => {
    const list = pointsQ.data ?? [];
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [pointsQ.data]);

  const selected = points.find((p) => p.id === selectedId) ?? null;

  const east = points.filter((p) => (p.campus ?? '').toUpperCase() === 'EAST');
  const west = points.filter((p) => (p.campus ?? '').toUpperCase() === 'WEST');
  const other = points.filter((p) => {
    const c = (p.campus ?? '').toUpperCase();
    return c !== 'EAST' && c !== 'WEST';
  });

  async function confirm() {
    if (!selected) {
      toast.warning('Pick a campus drop-off point', 'Delivery point');
      return;
    }
    try {
      setBusy(true);
      await setSelectedDeliveryPoint(selected.id, selected.name);
      toast.success('Delivery point saved', 'CASE');
      router.replace('/(tabs)');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save delivery point');
    } finally {
      setBusy(false);
    }
  }

  function renderGroup(title: string, items: typeof points, delay: number) {
    if (!items.length) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        {items.map((point, i) => {
          const active = selectedId === point.id;
          return (
            <Animated.View key={point.id} entering={FadeInDown.delay(delay + i * 40).duration(280)}>
              <PressableScale
                onPress={() => setSelectedId(point.id)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons name="location" size={20} color={active ? CaseUi.orange : CaseUi.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{point.name}</Text>
                  {point.campus ? <Text style={styles.rowSub}>{point.campus} campus</Text> : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={CaseUi.orange} /> : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={styles.title}>Campus drop-off</Text>
          <Text style={styles.sub}>Choose where CASE should deliver your order</Text>
        </Animated.View>

        {pointsQ.isLoading ? (
          <View style={styles.scroll}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonBlock width={40} height={40} radius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width="55%" height={14} />
                  <SkeletonBlock width="30%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {renderGroup('East campus', east, 0)}
            {renderGroup('West campus', west, 80)}
            {renderGroup('Other', other, 160)}
            {!points.length ? (
              <EmptyState
                icon="location-outline"
                title="No delivery points yet"
                subtitle="Check your connection and try again."
              />
            ) : null}
          </ScrollView>
        )}

        <PressableScale
          onPress={confirm}
          disabled={busy || !selected}
          style={[styles.cta, (busy || !selected) && { opacity: 0.6 }]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Continue</Text>}
        </PressableScale>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  scroll: { paddingBottom: 24, gap: 8 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  group: { marginBottom: 16, gap: 8 },
  groupTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    color: CaseUi.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
  },
  rowActive: {
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.orangeSoft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.field,
  },
  iconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: CaseUi.ink,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  cta: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: CaseUi.orange,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});
