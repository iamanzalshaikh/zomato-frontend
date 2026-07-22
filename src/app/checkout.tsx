import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { CaseUi } from '@/constants/caseUi';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { useCart } from '@/hooks/use-cart';
import { useCartQuery, cartKeys } from '@/hooks/queries/cart';
import { useProfileQuery } from '@/hooks/queries/profile';
import { useCaseDeliveryPointsQuery } from '@/hooks/queries/case';
import { useCaseQuoteQuery, usePlaceCaseOrderMutation, caseOrderKeys } from '@/hooks/queries/caseOrders';
import {
  buildPlaceCaseOrderFromCart,
  clearGetAnythingDraft,
  clearReorderDraft,
  getSelectedCouponCode,
  getSelectedDeliveryPointId,
  getSelectedDeliveryPointName,
  getSelectedPaymentMethod,
  loadGetAnythingDraft,
  loadReorderDraft,
  mapCartToCaseItems,
  setSelectedCouponCode,
  setSelectedPaymentMethod,
  type GetAnythingDraft,
} from '@/lib/caseCheckout';
import { createOrder } from '@/services/orders';
import { clearCart } from '@/services/cart';
import type { CaseOrderItemInput } from '@/services/caseOrders';
import type { Address } from '@/services/profile';
import { toast } from '@/lib/toast';

const TIP_PRESETS = [0, 20, 50, 100];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <PressableScale onPress={() => onChange(!value)} style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </PressableScale>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold, { color: bold ? CaseUi.ink : color }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold, { color }]}>{value}</Text>
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isGetAnything = params.mode === 'get-anything';
  const { cart } = useCart();
  const qc = useQueryClient();
  const cartQuery = useCartQuery();
  const profileQuery = useProfileQuery();
  const pointsQ = useCaseDeliveryPointsQuery();
  const placeMut = usePlaceCaseOrderMutation();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const bottomBarPaddingBottom = bottomInset + 12;
  const bottomBarHeight = 96 + bottomBarPaddingBottom;

  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [tipAmount, setTipAmount] = useState('0');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [deliveryPointId, setDeliveryPointId] = useState<string | null>(null);
  const [deliveryPointName, setDeliveryPointName] = useState('Select drop-off');
  const [customItems, setCustomItems] = useState<CaseOrderItemInput[] | null>(null);
  const [getAnything, setGetAnything] = useState<GetAnythingDraft | null>(null);

  // Classic fallback state
  const addresses = useMemo(
    () => (profileQuery.data?.addresses ?? []) as Address[],
    [profileQuery.data],
  );
  const defaultAddressId = useMemo(() => {
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    return def?._id ?? '';
  }, [addresses]);
  const [addressId, setAddressId] = useState(defaultAddressId);
  const [classicPayment, setClassicPayment] = useState<'COD' | 'ONLINE'>('COD');

  useEffect(() => {
    if (!addressId && defaultAddressId) setAddressId(defaultAddressId);
  }, [defaultAddressId, addressId]);

  // Hydrate payment method + coupon chosen on the Cart screen so the choice
  // actually carries through instead of silently resetting to defaults.
  useEffect(() => {
    void (async () => {
      const [savedMethod, savedCoupon] = await Promise.all([
        getSelectedPaymentMethod(),
        getSelectedCouponCode(),
      ]);
      setPaymentMethod(savedMethod);
      if (savedCoupon) setCouponCode(savedCoupon);
    })();
  }, []);

  useEffect(() => {
    void setSelectedPaymentMethod(paymentMethod);
  }, [paymentMethod]);

  useEffect(() => {
    void setSelectedCouponCode(couponCode.trim());
  }, [couponCode]);

  useEffect(() => {
    void (async () => {
      const id = await getSelectedDeliveryPointId();
      const name = await getSelectedDeliveryPointName();
      if (id) setDeliveryPointId(id);
      if (name) setDeliveryPointName(name);

      if (!id && pointsQ.data?.[0]) {
        const first = pointsQ.data[0];
        setDeliveryPointId(first.id);
        setDeliveryPointName(first.name);
      }

      if (isGetAnything) {
        const draft = await loadGetAnythingDraft();
        if (draft) {
          setGetAnything(draft);
          setTipAmount(String(draft.tip || 0));
          setCustomItems([
            {
              itemType: 'CUSTOM_REQUEST',
              itemName: 'Get Anything',
              quantity: 1,
              price: draft.estimatedPrice,
              customNote: draft.note,
            },
          ]);
        }
      } else {
        const reorder = await loadReorderDraft();
        if (reorder?.items?.length) {
          setCustomItems(reorder.items);
          if (reorder.deliveryPointId) {
            setDeliveryPointId(reorder.deliveryPointId);
          }
        }
      }
    })();
  }, [isGetAnything, pointsQ.data]);

  const caseItems = useMemo(() => {
    if (customItems?.length) return customItems;
    return mapCartToCaseItems(cart);
  }, [customItems, cart]);

  const tipNum = Number(tipAmount) || 0;

  const quoteInput = useMemo(() => {
    if (!CASE_CHECKOUT_ENABLED || !caseItems.length) return null;
    return {
      lines: caseItems.map((i) => ({
        merchantId: i.restaurantId ?? null,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
      deliveryPointId: deliveryPointId ?? undefined,
      tipAmount: tipNum,
      couponCode: couponCode.trim() || undefined,
      useLoyaltyFreeDelivery: useLoyalty,
      expressDelivery,
      userId:
        (profileQuery.data as { _id?: string; id?: string } | undefined)?._id ??
        (profileQuery.data as { id?: string } | undefined)?.id,
    };
  }, [
    caseItems,
    deliveryPointId,
    tipNum,
    couponCode,
    useLoyalty,
    expressDelivery,
    profileQuery.data,
  ]);

  const quoteQ = useCaseQuoteQuery(quoteInput, CASE_CHECKOUT_ENABLED && caseItems.length > 0);
  const quote = quoteQ.data;

  const restaurant = cart?.restaurantId as any;

  async function finishCaseCheckout(orderId: string, method: 'COD' | 'BANK_TRANSFER') {
    await clearGetAnythingDraft();
    await clearReorderDraft();
    try {
      await clearCart();
    } catch {
      /* ignore */
    }
    try {
      const { useCaseCartStore } = await import('@/stores/caseCart');
      useCaseCartStore.getState().clear();
    } catch {
      /* ignore */
    }
    await qc.invalidateQueries({ queryKey: cartKeys.all });
    await qc.invalidateQueries({ queryKey: caseOrderKeys.all });
    await cartQuery.refetch();
    toast.success('Your order has been placed', 'Order placed');

    if (method === 'BANK_TRANSFER') {
      router.replace({ pathname: '/bank-transfer/[orderId]', params: { orderId } });
      return;
    }
    router.replace({
      pathname: '/order-success',
      params: { orderId, payment: method },
    });
  }

  async function placeCase() {
    if (!deliveryPointId) {
      toast.warning('Select a campus drop-off point', 'Delivery required');
      router.push('/(onboarding)/delivery-point');
      return;
    }
    if (!caseItems.length) {
      toast.warning('Your cart is empty', 'Checkout');
      return;
    }
    try {
      setBusy(true);
      const payload = buildPlaceCaseOrderFromCart({
        cart,
        deliveryPointId,
        paymentMethod,
        notes: instructions.trim() || getAnything?.note || undefined,
        tipAmount: tipNum,
        couponCode: couponCode.trim() || undefined,
        useLoyaltyFreeDelivery: useLoyalty,
        expressDelivery,
        customItems: caseItems,
      });
      const order = await placeMut.mutateAsync(payload);
      const orderId = String(order.id ?? order._id ?? '');
      if (!orderId) throw new Error('Order created but no id returned');
      await finishCaseCheckout(orderId, paymentMethod);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to place order', 'Order failed');
    } finally {
      setBusy(false);
    }
  }

  async function placeClassic() {
    if (!addressId) {
      toast.warning('Please select a delivery address', 'Address required');
      return;
    }
    try {
      setBusy(true);
      const order = await createOrder({
        deliveryAddressId: addressId,
        paymentMethod: classicPayment,
        deliveryInstructions: instructions.trim() || undefined,
      });
      const orderId = String(order?._id ?? '');
      if (!orderId) throw new Error('Order was created but no order id was returned.');
      if (classicPayment === 'ONLINE') {
        router.push({
          pathname: '/payment/razorpay',
          params: {
            orderId,
            restaurantName: restaurant?.restaurantName ?? '',
          },
        });
        return;
      }
      await qc.invalidateQueries({ queryKey: cartKeys.all });
      toast.success('Your order has been placed', 'Order placed');
      router.replace({
        pathname: '/order-success',
        params: { orderId, payment: classicPayment },
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to place order', 'Order failed');
    } finally {
      setBusy(false);
    }
  }

  if (!CASE_CHECKOUT_ENABLED) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.topRow}>
            <PressableScale onPress={() => router.back()} style={styles.iconCircle}>
              <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
            </PressableScale>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: bottomBarHeight, gap: 8 }}>
            <Text style={styles.sectionTitle}>Address</Text>
            {addresses.map((a) => (
              <PressableScale
                key={a._id}
                onPress={() => setAddressId(a._id)}
                style={[styles.payCard, addressId === a._id && styles.payCardActive]}
              >
                <Text style={styles.payCardText}>{a.label} — {a.fullAddress}</Text>
              </PressableScale>
            ))}
            <View style={{ height: 4 }} />
            <PressableScale
              onPress={() => setClassicPayment('COD')}
              style={[styles.payCard, classicPayment === 'COD' && styles.payCardActive]}
            >
              <Text style={styles.payCardText}>Cash on delivery</Text>
            </PressableScale>
            <PressableScale
              onPress={() => setClassicPayment('ONLINE')}
              style={[styles.payCard, classicPayment === 'ONLINE' && styles.payCardActive]}
            >
              <Text style={styles.payCardText}>Online (Razorpay)</Text>
            </PressableScale>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: bottomBarPaddingBottom }]}>
            <PressableScale disabled={busy} onPress={placeClassic} style={styles.placeBtn}>
              <Text style={styles.placeBtnText}>{busy ? 'Placing…' : 'Place order'}</Text>
            </PressableScale>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const total = quote?.totalJmd ?? caseItems.reduce((s, i) => s + i.price * i.quantity, 0) + tipNum;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.iconCircle}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>{isGetAnything ? 'Get Anything checkout' : 'Checkout'}</Text>
          <PressableScale onPress={() => router.push('/(onboarding)/delivery-point')} style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>Change</Text>
          </PressableScale>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomBarHeight + 16 }]}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
            <PressableScale
              onPress={() => router.push('/(onboarding)/delivery-point')}
              style={styles.card}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="location" size={18} color={CaseUi.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Campus drop-off</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>{deliveryPointName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={CaseUi.muted} />
            </PressableScale>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order items</Text>
            {caseItems.map((item, idx) => (
              <View key={`${item.itemName}-${idx}`} style={[styles.itemRow, idx === caseItems.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  {item.customNote ? (
                    <Text style={styles.itemNote} numberOfLines={2}>{item.customNote}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
                <Text style={styles.itemPrice}>J${(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Delivery notes</Text>
            <View style={styles.inputRow}>
              <Ionicons name="document-text-outline" size={16} color={CaseUi.muted} />
              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="E.g. leave at the front desk…"
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Add a tip for your rider</Text>
            <View style={styles.tipRow}>
              {TIP_PRESETS.map((amt) => (
                <PressableScale
                  key={amt}
                  onPress={() => setTipAmount(String(amt))}
                  style={[styles.tipChip, tipNum === amt && styles.tipChipActive]}
                >
                  <Text style={[styles.tipChipText, tipNum === amt && styles.tipChipTextActive]}>
                    {amt === 0 ? 'No tip' : `J$${amt}`}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Coupon</Text>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={16} color={CaseUi.orange} />
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                placeholder="Enter coupon code"
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />
              {couponCode ? (
                <PressableScale onPress={() => setCouponCode('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={CaseUi.muted} />
                </PressableScale>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.sectionCard}>
            <View style={styles.toggleRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="star-outline" size={16} color={CaseUi.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Loyalty free delivery</Text>
                <Text style={styles.cardSub}>Redeem points if eligible</Text>
              </View>
              <Toggle value={useLoyalty} onChange={setUseLoyalty} />
            </View>
            <View style={[styles.toggleRow, { marginTop: 14 }]}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="flash-outline" size={16} color={CaseUi.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Express delivery</Text>
                <Text style={styles.cardSub}>Priority campus run</Text>
              </View>
              <Toggle value={expressDelivery} onChange={setExpressDelivery} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment method</Text>
            <PressableScale
              onPress={() => setPaymentMethod('COD')}
              style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]}
            >
              <View style={[styles.iconCircleSoft, { backgroundColor: CaseUi.successSoft }]}>
                <Ionicons name="cash" size={20} color={CaseUi.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Cash on delivery</Text>
                <Text style={styles.cardSub}>Pay with cash when it arrives</Text>
              </View>
              <Ionicons
                name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'COD' ? CaseUi.orange : CaseUi.muted}
              />
            </PressableScale>
            <PressableScale
              onPress={() => setPaymentMethod('BANK_TRANSFER')}
              style={[styles.payOption, paymentMethod === 'BANK_TRANSFER' && styles.payOptionActive, { marginTop: 10 }]}
            >
              <View style={[styles.iconCircleSoft, { backgroundColor: CaseUi.orangeSoft }]}>
                <Ionicons name="business" size={20} color={CaseUi.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Bank transfer</Text>
                <Text style={styles.cardSub}>Transfer, then upload your receipt</Text>
              </View>
              <Ionicons
                name={paymentMethod === 'BANK_TRANSFER' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'BANK_TRANSFER' ? CaseUi.orange : CaseUi.muted}
              />
            </PressableScale>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).duration(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bill summary</Text>
            {quoteQ.isFetching && !quote ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <SkeletonBlock width={90} height={13} />
                    <SkeletonBlock width={50} height={13} />
                  </View>
                ))}
              </View>
            ) : (
              <>
                <Row label="Subtotal" value={`J$${(quote?.subtotal ?? 0).toFixed(0)}`} color={CaseUi.ink} />
                <Row label="Delivery" value={`J$${(quote?.deliveryFee ?? 0).toFixed(0)}`} color={CaseUi.ink} />
                {(quote?.multiStoreFee ?? 0) > 0 ? (
                  <Row label="Multi-store" value={`J$${quote!.multiStoreFee.toFixed(0)}`} color={CaseUi.ink} />
                ) : null}
                {(quote?.extraItemFee ?? 0) > 0 ? (
                  <Row label="Extra items" value={`J$${quote!.extraItemFee.toFixed(0)}`} color={CaseUi.ink} />
                ) : null}
                {(quote?.expressFee ?? 0) > 0 ? (
                  <Row label="Express" value={`J$${quote!.expressFee.toFixed(0)}`} color={CaseUi.ink} />
                ) : null}
                {(quote?.tipAmount ?? tipNum) > 0 ? (
                  <Row label="Tip" value={`J$${(quote?.tipAmount ?? tipNum).toFixed(0)}`} color={CaseUi.ink} />
                ) : null}
                {(quote?.discountAmount ?? 0) > 0 ? (
                  <Row label="Discount" value={`-J$${quote!.discountAmount.toFixed(0)}`} color={CaseUi.success} />
                ) : null}
                {quote?.loyaltyRedeemed ? (
                  <Text style={styles.loyaltyNote}>Loyalty free delivery applied</Text>
                ) : null}
                <View style={styles.divider} />
                <Row label="Total" value={`J$${total.toFixed(0)}`} color={CaseUi.orange} bold />
                {quote?.totalUsd != null ? (
                  <Text style={styles.usdNote}>≈ US${quote.totalUsd.toFixed(2)}</Text>
                ) : null}
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomBarPaddingBottom }]}>
          <View>
            <Text style={styles.bottomTotalLabel}>Total</Text>
            <Text style={styles.bottomTotalValue}>J${total.toFixed(0)}</Text>
          </View>
          <PressableScale
            disabled={busy || !caseItems.length}
            onPress={placeCase}
            style={[styles.placeBtn, (busy || !caseItems.length) && { opacity: 0.6 }]}
          >
            <Text style={styles.placeBtnText}>
              {busy ? 'Placing…' : paymentMethod === 'BANK_TRANSFER' ? 'Place & pay by bank' : 'Place order'}
            </Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: CaseUi.orangeSoft },
  changeBtnText: { color: CaseUi.orange, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  scrollBody: { padding: 14, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: CaseUi.radius.lg,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink, marginTop: 2 },
  cardSub: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted, marginTop: 2 },
  sectionCard: {
    padding: 14,
    borderRadius: CaseUi.radius.lg,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  sectionTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  itemName: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink },
  itemNote: { fontSize: 11, color: CaseUi.muted, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },
  itemQty: { fontSize: 12, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_600SemiBold' },
  itemPrice: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, minWidth: 60, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: CaseUi.field,
  },
  input: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink, height: '100%' },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  tipChipActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  tipChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.muted },
  tipChipTextActive: { color: CaseUi.orange },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: CaseUi.line,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: CaseUi.orange },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: CaseUi.radius.md,
    borderWidth: 1.5,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  payOptionActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  iconCircleSoft: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  summaryLabelBold: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  summaryValue: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  summaryValueBold: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  loyaltyNote: { color: CaseUi.success, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  usdNote: { color: CaseUi.muted, fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  divider: { height: 1, backgroundColor: CaseUi.line, marginVertical: 8 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: CaseUi.white,
    borderTopWidth: 1,
    borderTopColor: CaseUi.line,
    ...CaseUi.cardShadow,
  },
  bottomTotalLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  bottomTotalValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, marginTop: 2 },
  placeBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: CaseUi.orange,
  },
  placeBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  payCardActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  payCardText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink },
});
