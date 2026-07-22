import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { useCaseOrderQuery, useEditCaseOrderMutation } from '@/hooks/queries/caseOrders';
import { useCaseDeliveryPointsQuery } from '@/hooks/queries/case';
import type { CaseOrderItemInput } from '@/services/caseOrders';
import { toast } from '@/lib/toast';

export default function EditCaseOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';
  const orderQ = useCaseOrderQuery(id);
  const pointsQ = useCaseDeliveryPointsQuery();
  const editMut = useEditCaseOrderMutation();

  const order = orderQ.data;
  const [notes, setNotes] = useState('');
  const [tipAmount, setTipAmount] = useState('0');
  const [deliveryPointId, setDeliveryPointId] = useState<string | null>(null);
  const [items, setItems] = useState<CaseOrderItemInput[]>([]);

  useEffect(() => {
    if (!order) return;
    setNotes(String(order.notes ?? ''));
    setTipAmount(String(order.tipAmount ?? 0));
    setDeliveryPointId((order.deliveryPoint as { id?: string } | null | undefined)?.id ?? null);
    setItems(
      (order.items ?? []).map((i) => ({
        itemType: (i.itemType as 'MENU_ITEM' | 'CUSTOM_REQUEST') || 'MENU_ITEM',
        menuItemId: i.menuItemId ? String(i.menuItemId) : undefined,
        restaurantId: i.restaurantId ? String(i.restaurantId) : undefined,
        itemName: String(i.itemName ?? 'Item'),
        quantity: Number(i.quantity ?? 1),
        price: Number(i.price ?? 0),
        customNote: i.customNote ?? undefined,
      })),
    );
  }, [order]);

  const points = pointsQ.data ?? [];
  const canEdit = useMemo(() => {
    const s = String(order?.orderStatus ?? '');
    return s === 'PENDING' || s === 'PENDING_PAYMENT_VERIFICATION';
  }, [order?.orderStatus]);

  function bumpQty(index: number, delta: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it)).filter((it) => it.quantity > 0),
    );
  }

  async function save() {
    if (!canEdit) {
      toast.warning('This order can no longer be edited');
      return;
    }
    if (!items.length) {
      toast.warning('Keep at least one item');
      return;
    }
    try {
      await editMut.mutateAsync({
        orderId: id,
        input: {
          notes: notes.trim() || undefined,
          tipAmount: Number(tipAmount) || 0,
          deliveryPointId: deliveryPointId || undefined,
          items,
        },
      });
      toast.success('Order updated');
      router.replace({ pathname: '/order/[orderId]', params: { orderId: id } });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update order');
    }
  }

  if (orderQ.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={CaseUi.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <PressableScale onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.title}>Edit order</Text>
        </View>

        {!canEdit ? (
          <Text style={styles.editWarning}>
            Editing is only allowed shortly after placing, while the order is still pending.
          </Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>Items</Text>
          {items.map((item, idx) => (
            <Animated.View key={`${item.itemName}-${idx}`} entering={FadeInDown.delay(idx * 40).duration(240)} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemPrice}>J${Number(item.price).toFixed(0)} each</Text>
              </View>
              <View style={styles.qty}>
                <PressableScale onPress={() => bumpQty(idx, -1)} style={styles.qtyBtn}>
                  <Ionicons name="remove" size={16} color={CaseUi.orange} />
                </PressableScale>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <PressableScale onPress={() => bumpQty(idx, 1)} style={styles.qtyBtn}>
                  <Ionicons name="add" size={16} color={CaseUi.orange} />
                </PressableScale>
              </View>
            </Animated.View>
          ))}

          <Text style={styles.label}>Drop-off point</Text>
          {points.map((p) => {
            const active = deliveryPointId === p.id;
            return (
              <PressableScale
                key={p.id}
                onPress={() => setDeliveryPointId(p.id)}
                style={[styles.point, active && styles.pointActive]}
              >
                <Text style={styles.pointText}>{p.name}</Text>
              </PressableScale>
            );
          })}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Update delivery notes…"
            placeholderTextColor={CaseUi.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Tip (J$)</Text>
          <TextInput value={tipAmount} onChangeText={setTipAmount} keyboardType="decimal-pad" style={styles.input} />
        </ScrollView>

        <PressableScale onPress={save} disabled={editMut.isPending || !canEdit} style={[styles.cta, (editMut.isPending || !canEdit) && { opacity: 0.6 }]}>
          <Text style={styles.ctaText}>{editMut.isPending ? 'Saving…' : 'Save changes'}</Text>
        </PressableScale>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  editWarning: { color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, padding: 16, paddingTop: 0 },
  body: { padding: 16, paddingBottom: 100, gap: 8 },
  label: { marginTop: 12, marginBottom: 4, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  itemName: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold' },
  itemPrice: { color: CaseUi.muted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { color: CaseUi.ink, minWidth: 20, textAlign: 'center', fontFamily: 'PlusJakartaSans_700Bold' },
  point: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    marginBottom: 6,
  },
  pointActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  pointText: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  cta: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: CaseUi.orange,
  },
  ctaText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
});
