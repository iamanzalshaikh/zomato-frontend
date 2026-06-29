import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeGradient } from '@/components/safe-gradient';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/hooks/use-cart';
import { useCartQuery } from '@/hooks/queries/cart';
import { useProfileQuery } from '@/hooks/queries/profile';
import { useQueryClient } from '@tanstack/react-query';
import { createOrder } from '@/services/orders';
import type { Address } from '@/services/profile';
import { storageGetItem, storageSetItem } from '@/lib/storage';
import { cartKeys } from '@/hooks/queries/cart';
import { toast } from '@/lib/toast';

export default function CheckoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart } = useCart();
  const qc = useQueryClient();
  const cartQuery = useCartQuery();
  const profileQuery = useProfileQuery();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const bottomBarPaddingBottom = bottomInset + 12;
  const bottomBarHeight = 76 + bottomBarPaddingBottom;

  const [busy, setBusy] = useState(false);
  const addresses = useMemo(
    () => (profileQuery.data?.addresses ?? []) as Address[],
    [profileQuery.data],
  );
  // Derive default address without an effect — effects that only set state from
  // derived data cause a wasted render cycle and trigger ESLint react-hooks/set-state-in-effect.
  const defaultAddressId = useMemo(() => {
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    return def?._id ?? '';
  }, [addresses]);
  const [addressId, setAddressId] = useState<string>(defaultAddressId);

  // If addresses load async after mount, keep addressId in sync
  useEffect(() => {
    if (!addressId && defaultAddressId) {
      setAddressId(defaultAddressId);
    }
  }, [defaultAddressId, addressId]);

  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');

  const total = useMemo(() => Number(cart?.grandTotal ?? cart?.total ?? 0), [cart]);
  const restaurant = cart?.restaurantId as any;

  // Sync payment method from storage on mount
  useEffect(() => {
    async function loadPayment() {
      const saved = await storageGetItem('paymentMethod');
      if (saved === 'ONLINE' || saved === 'COD') {
        setPaymentMethod(saved);
      }
    }
    loadPayment();
  }, []);

  const handleSelectPaymentMethod = async (method: 'COD' | 'ONLINE') => {
    setPaymentMethod(method);
    await storageSetItem('paymentMethod', method);
  };

  async function finishCheckout(orderId: string) {
    await qc.invalidateQueries({ queryKey: ['cart'] });
    await qc.invalidateQueries({ queryKey: cartKeys.all });
    await cartQuery.refetch();
    toast.success('Your order has been placed', 'Order placed');
    router.replace({
      pathname: '/order-success',
      params: { orderId, payment: paymentMethod },
    });
  }

  async function placeOrder() {
    if (!addressId) {
      toast.warning('Please select a delivery address', 'Address required');
      return;
    }
    try {
      setBusy(true);
      const order = await createOrder({
        deliveryAddressId: addressId,
        paymentMethod,
        deliveryInstructions: instructions.trim() || undefined,
      });

      const orderId = String(order?._id ?? '');
      if (!orderId) {
        throw new Error('Order was created but no order id was returned.');
      }

      if (paymentMethod === 'ONLINE') {
        router.push({
          pathname: '/payment/razorpay',
          params: {
            orderId,
            restaurantName: restaurant?.restaurantName ?? '',
          },
        });
        return;
      }

      await finishCheckout(orderId);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to place order';
      if (msg !== 'Payment cancelled') {
        toast.error(msg, 'Order failed');
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a._id === addressId);
  }, [addresses, addressId]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <Pressable onPress={() => router.push('/(onboarding)/location')}>
            <ThemedText style={[styles.couponsLink, { color: theme.primary }]}>Change Pin</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomBarHeight + 16 }]}
        >
          {/* Restaurant Details */}
          {restaurant && (
            <ThemedView type="backgroundElement" style={styles.restaurantCard}>
              <Ionicons name="restaurant-outline" size={16} color={theme.primary} />
              <ThemedText style={styles.restaurantNameText}>{restaurant.restaurantName || 'Restaurant'}</ThemedText>
            </ThemedView>
          )}

          {/* Delivery Address Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
              <Pressable onPress={() => router.push('/(onboarding)/location')}>
                <ThemedText style={[styles.changeLinkText, { color: theme.primary }]}>Change</ThemedText>
              </Pressable>
            </View>
            {addresses.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
                No saved address found. Please add one in Location setup.
              </ThemedText>
            ) : (
              selectedAddress && (
                <View style={styles.selectedAddressContainer}>
                  <View style={[styles.addressPinCircle, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons 
                      name={selectedAddress.label === 'Home' ? 'home' : selectedAddress.label === 'Work' ? 'briefcase' : 'location'} 
                      size={16} 
                      color={theme.primary} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.selectedAddressLabel}>{selectedAddress.label}</ThemedText>
                    <ThemedText themeColor="textSecondary" numberOfLines={2} style={styles.selectedAddressText}>
                      {selectedAddress.fullAddress}
                    </ThemedText>
                  </View>
                </View>
              )
            )}
          </ThemedView>

          {/* Items Summary (Zomato Style) */}
          {cart?.items && cart.items.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Items Ordered</ThemedText>
              <View style={{ gap: 10, marginTop: 12 }}>
                {cart.items.map((it: any) => (
                  <View key={it._id} style={styles.itemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={[styles.vegBorder, { borderColor: it.isVeg === false ? '#E5484D' : '#24963F' }]}>
                        <View style={[styles.vegDot, { backgroundColor: it.isVeg === false ? '#E5484D' : '#24963F' }]} />
                      </View>
                      <ThemedText style={styles.itemNameText}>{it.itemName}</ThemedText>
                    </View>
                    <ThemedText themeColor="textSecondary" style={styles.itemQtyText}>x {it.quantity}</ThemedText>
                    <ThemedText style={styles.itemPriceText}>₹{it.total}</ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          )}

          {/* Instructions Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Delivery Instructions</ThemedText>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Eg. Ring bell, leave at door…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }]}
            />
          </ThemedView>

          {/* Payment Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Select Payment Method</ThemedText>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => handleSelectPaymentMethod('COD')}
                style={[
                  styles.paymentOptionBtn,
                  { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
                  paymentMethod === 'COD' && { borderColor: theme.primary, backgroundColor: theme.primarySoft }
                ]}
              >
                <Ionicons name="cash" size={16} color={paymentMethod === 'COD' ? theme.primary : theme.textSecondary} />
                <ThemedText style={[styles.paymentOptionText, { color: theme.text }, paymentMethod === 'COD' && { color: theme.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Cash on Delivery
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleSelectPaymentMethod('ONLINE')}
                style={[
                  styles.paymentOptionBtn,
                  { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
                  paymentMethod === 'ONLINE' && { borderColor: theme.primary, backgroundColor: theme.primarySoft }
                ]}
              >
                <Ionicons name="card" size={16} color={paymentMethod === 'ONLINE' ? theme.primary : theme.textSecondary} />
                <ThemedText style={[styles.paymentOptionText, { color: theme.text }, paymentMethod === 'ONLINE' && { color: theme.primary, fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Online (Card/UPI)
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          {/* Detailed Bill Details */}
          {cart && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Bill Details</ThemedText>
              <View style={{ gap: 8, marginTop: 12 }}>
                <View style={styles.billRow}>
                  <ThemedText style={styles.billLabel}>Item Total</ThemedText>
                  <ThemedText style={[styles.billValue, { color: theme.text }]}>₹{cart.subtotal}</ThemedText>
                </View>
                {(cart.deliveryFee ?? 0) > 0 && (
                  <View style={styles.billRow}>
                    <ThemedText style={styles.billLabel}>Delivery Fee</ThemedText>
                    <ThemedText style={[styles.billValue, { color: theme.text }]}>₹{cart.deliveryFee}</ThemedText>
                  </View>
                )}
                {(cart.taxAmount ?? 0) > 0 && (
                  <View style={styles.billRow}>
                    <ThemedText style={styles.billLabel}>Taxes & Charges</ThemedText>
                    <ThemedText style={[styles.billValue, { color: theme.text }]}>₹{cart.taxAmount}</ThemedText>
                  </View>
                )}
                {(cart.platformFee ?? 0) > 0 && (
                  <View style={styles.billRow}>
                    <ThemedText style={styles.billLabel}>Platform Fee</ThemedText>
                    <ThemedText style={[styles.billValue, { color: theme.text }]}>₹{cart.platformFee}</ThemedText>
                  </View>
                )}
                {(cart.couponDiscount ?? 0) > 0 && (
                  <View style={styles.billRow}>
                    <ThemedText style={[styles.billLabel, { color: '#24963F' }]}>Coupon Discount</ThemedText>
                    <ThemedText style={[styles.billValue, { color: '#24963F' }]}>-₹{cart.couponDiscount ?? 0}</ThemedText>
                  </View>
                )}
                <View style={styles.billSeparator} />
                <View style={styles.billRow}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Grand Total</ThemedText>
                  <ThemedText style={[styles.sectionTitle, { color: theme.primary, fontSize: 16 }]}>₹{total}</ThemedText>
                </View>
              </View>
            </ThemedView>
          )}
        </ScrollView>

        {/* Sticky bottom bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.backgroundElement,
              borderTopColor: theme.backgroundSelected,
              paddingBottom: bottomBarPaddingBottom,
            },
          ]}
        >
          <View style={styles.bottomBarLeft}>
            <ThemedText style={styles.bottomBarTotalText}>₹{total}</ThemedText>
            <ThemedText style={[styles.bottomBarPaymentSub, { color: theme.textSecondary }]}>
              {paymentMethod === 'ONLINE' ? 'Pay using Online' : 'Pay using Cash'}
            </ThemedText>
          </View>
          <Pressable 
            disabled={busy || !addressId || !cart?.items?.length} 
            onPress={placeOrder} 
            style={styles.bottomBarBtn}
          >
            <SafeGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.btnGradient}
            >
              <ThemedText style={styles.bottomBarBtnText}>
                {busy
                  ? paymentMethod === 'ONLINE'
                    ? 'Processing payment…'
                    : 'Placing order…'
                  : paymentMethod === 'ONLINE'
                    ? 'Pay & Place Order'
                    : 'Place Order'}
              </ThemedText>
              <Ionicons name="caret-forward" size={14} color="#ffffff" />
            </SafeGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
    fontSize: 16,
  },
  couponsLink: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
  },
  scrollBody: {
    padding: 16,
    gap: 16,
  },
  restaurantCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restaurantNameText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.08)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { 
    fontFamily: 'PlusJakartaSans_800ExtraBold', 
    fontSize: 14,
  },
  changeLinkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  addressPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAddressLabel: {
    fontFamily: 'PlusJakartaSans_750Bold',
    fontSize: 13,
  },
  selectedAddressText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 16,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  vegBorder: {
    width: 12,
    height: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemNameText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
  },
  itemQtyText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    marginHorizontal: 12,
  },
  itemPriceText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12.5,
  },
  input: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
  },
  paymentOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  paymentOptionText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  billLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#9fa2a7',
  },
  billValue: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  billSeparator: {
    height: 1,
    backgroundColor: 'rgba(127,127,127,0.1)',
    marginVertical: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  bottomBarLeft: {
    flex: 1,
    flexDirection: 'column',
    marginRight: 12,
  },
  bottomBarTotalText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_850ExtraBold',
  },
  bottomBarPaymentSub: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 1,
  },
  bottomBarBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
    maxWidth: '58%',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 48,
    paddingVertical: 12,
  },
  bottomBarBtnText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    flexShrink: 1,
  },
});
