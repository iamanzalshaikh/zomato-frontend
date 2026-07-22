import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { CaseUi } from '@/constants/caseUi';
import { useCart } from '@/hooks/use-cart';
import { toast } from '@/lib/toast';
import {
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
  useAddToCartMutation,
  useUpdateCartPreferencesMutation,
} from '@/hooks/queries/cart';
import { useCaseQuoteQuery } from '@/hooks/queries/caseOrders';
import {
  getSelectedCouponCode,
  getSelectedDeliveryPointId,
  getSelectedDeliveryPointName,
  getSelectedPaymentMethod,
  mapCartToCaseItems,
  setSelectedCouponCode,
  setSelectedPaymentMethod,
  type CasePaymentMethod,
} from '@/lib/caseCheckout';
import { fetchMenuItemsByRestaurant, type MenuItem } from '@/services/menu';
import { useCouponsByRestaurantQuery } from '@/hooks/queries/coupons';
import { formatCouponDescription, pickPrimaryCoupon } from '@/lib/offerDisplay';

function isLikelyNonVeg(itemName: string) {
  const lower = itemName.toLowerCase();
  return ['chicken', 'mutton', 'egg', 'fish', 'kabab', 'kebab', 'meat', 'tikka', 'tandoori'].some(
    (kw) => lower.includes(kw),
  );
}

function FoodTypeDot({ itemName }: { itemName: string }) {
  const nonVeg = isLikelyNonVeg(itemName);
  return (
    <View style={[styles.foodTypeBorder, { borderColor: nonVeg ? CaseUi.danger : CaseUi.success }]}>
      {nonVeg ? (
        <View style={[styles.nonVegTriangle, { borderBottomColor: CaseUi.danger }]} />
      ) : (
        <View style={[styles.vegDotInner, { backgroundColor: CaseUi.success }]} />
      )}
    </View>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billLabelBold, { color: bold ? CaseUi.ink : color }]}>
        {label}
      </Text>
      <Text style={[styles.billValue, bold && styles.billValueBold, { color }]}>{value}</Text>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loading } = useCart();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const checkoutBarPaddingBottom = bottomInset + 10;
  const checkoutBarHeight = 108 + checkoutBarPaddingBottom;

  const updateLine = useUpdateCartItemMutation();
  const removeLine = useRemoveCartItemMutation();
  const clearCart = useClearCartMutation();
  const addToCartMut = useAddToCartMutation();
  const updatePrefs = useUpdateCartPreferencesMutation();

  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noCutlery, setNoCutlery] = useState(true);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CasePaymentMethod>('COD');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deliveryPointId, setDeliveryPointId] = useState<string | null>(null);
  const [deliveryPointName, setDeliveryPointName] = useState('Select drop-off');

  const mutating =
    updateLine.isPending ||
    removeLine.isPending ||
    clearCart.isPending ||
    addToCartMut.isPending ||
    updatePrefs.isPending;

  const restaurant = cart?.restaurantId as any;
  const restaurantId =
    typeof restaurant === 'object' && restaurant?._id
      ? String(restaurant._id)
      : typeof cart?.restaurantId === 'string'
        ? cart.restaurantId
        : '';
  const couponsQ = useCouponsByRestaurantQuery(restaurantId);
  const suggestedCoupon = pickPrimaryCoupon(couponsQ.data?.coupons ?? []);

  // Hydrate the shared coupon/payment/delivery-point selections so this
  // screen and Checkout always agree, instead of drifting independently.
  useEffect(() => {
    void (async () => {
      const [code, method, pointId, pointName] = await Promise.all([
        getSelectedCouponCode(),
        getSelectedPaymentMethod(),
        getSelectedDeliveryPointId(),
        getSelectedDeliveryPointName(),
      ]);
      setCouponCode(code);
      setPaymentMethod(method);
      setDeliveryPointId(pointId);
      if (pointName) setDeliveryPointName(pointName);
    })();
  }, []);

  useEffect(() => {
    if (cart) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local draft fields from server cart snapshot
      setNote(cart.generalNote ?? '');
      setNoCutlery(cart.dontSendCutlery ?? false);
    }
  }, [cart]);

  useEffect(() => {
    if (restaurant?._id) {
      fetchMenuItemsByRestaurant(restaurant._id)
        .then((items) => {
          const inCartIds = new Set(cart?.items.map((it) => it.menuItemId) ?? []);
          setRecommendations(items.filter((it) => !inCartIds.has(it._id)).slice(0, 5));
        })
        .catch((err) => console.log('Error fetching recommendations', err));
    }
  }, [restaurant?._id, cart?.items]);

  const caseItems = useMemo(() => mapCartToCaseItems(cart), [cart]);
  const quoteInput = useMemo(() => {
    if (!caseItems.length) return null;
    return {
      lines: caseItems.map((i) => ({
        merchantId: i.restaurantId ?? null,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
      deliveryPointId: deliveryPointId ?? undefined,
      couponCode: couponCode.trim() || undefined,
    };
  }, [caseItems, deliveryPointId, couponCode]);
  const quoteQ = useCaseQuoteQuery(quoteInput, caseItems.length > 0);
  const quote = quoteQ.data;

  const handleSelectPayment = async (method: CasePaymentMethod) => {
    setPaymentMethod(method);
    await setSelectedPaymentMethod(method);
    setShowPaymentModal(false);
  };

  const applyCouponCode = async (code: string) => {
    setCouponCode(code);
    await setSelectedCouponCode(code.trim());
  };

  const handleAddRecommendation = async (item: MenuItem) => {
    if (mutating) return;
    try {
      await addToCartMut.mutateAsync({
        restaurantId: restaurant._id,
        menuItemId: item._id,
        quantity: 1,
        itemName: item.itemName,
        price: item.discountedPrice ?? item.price,
        restaurantName: restaurant?.restaurantName,
      });
      toast.success(`Added ${item.itemName}`, 'Added to cart');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to add item');
    }
  };

  const handleClearCart = () => {
    Alert.alert('Clear cart?', 'This removes every item in your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCart.mutateAsync();
          toast.info('Cart cleared');
        },
      },
    ]);
  };

  if (loading && !cart) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={CaseUi.orange} />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </ThemedView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.iconCircle}>
              <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>Your Cart</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={[styles.center, { flex: 1 }]}>
            <Ionicons name="cart-outline" size={80} color={CaseUi.line} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Add items from a store to start your order!</Text>
            <Pressable onPress={() => router.push('/(tabs)')} style={styles.shopBtn}>
              <Text style={styles.shopBtnText}>Browse Stores</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const subtotal = quote?.subtotal ?? cart.subtotal ?? 0;
  const total = quote?.totalJmd ?? cart.grandTotal ?? subtotal;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
            <Pressable onPress={() => router.back()} style={styles.iconCircle}>
              <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {restaurant?.restaurantName || 'Your order'}
              </Text>
              <Pressable
                onPress={() => router.push('/(onboarding)/delivery-point')}
                style={styles.locationSelector}
              >
                <Text style={styles.locationText} numberOfLines={1}>
                  Deliver to <Text style={styles.locationTextStrong}>{deliveryPointName}</Text>
                </Text>
                <Ionicons name="chevron-down" size={12} color={CaseUi.muted} />
              </Pressable>
            </View>
          </View>
          <Pressable onPress={handleClearCart} style={styles.iconCircle}>
            <Ionicons name="trash-outline" size={18} color={CaseUi.danger} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: checkoutBarHeight + 16 }]}
        >
          {/* Cart items */}
          <View style={styles.itemsCard}>
            {cart.items.map((it) => {
              const portionName =
                it.addons && it.addons.length > 0
                  ? it.addons.map((a: { name: string }) => a.name.replace('Portion: ', '')).join(', ')
                  : null;

              return (
                <View key={it._id} style={styles.cartItemRow}>
                  <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
                    <View style={{ marginTop: 3 }}>
                      <FoodTypeDot itemName={it.itemName} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNameText}>{it.itemName}</Text>
                      {portionName ? <Text style={styles.itemPortionText}>{portionName}</Text> : null}
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/restaurant/[restaurantId]',
                            params: { restaurantId: restaurant?._id },
                          })
                        }
                        style={styles.editItemBtn}
                      >
                        <Text style={styles.editItemText}>Edit</Text>
                        <Ionicons name="caret-forward" size={10} color={CaseUi.orange} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={styles.quantityContainer}>
                      <Pressable
                        disabled={mutating}
                        onPress={async () => {
                          if (it.quantity <= 1) {
                            Alert.alert('Remove item', `Remove ${it.itemName}?`, [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: async () => {
                                  await removeLine.mutateAsync({ itemId: it._id });
                                  toast.info(`${it.itemName} removed from cart`);
                                },
                              },
                            ]);
                          } else {
                            await updateLine.mutateAsync({ itemId: it._id, quantity: it.quantity - 1 });
                          }
                        }}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="remove" size={14} color="#FFFFFF" />
                      </Pressable>
                      <Text style={styles.qtyValueText}>{it.quantity}</Text>
                      <Pressable
                        disabled={mutating}
                        onPress={() => updateLine.mutateAsync({ itemId: it._id, quantity: it.quantity + 1 })}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    <Text style={styles.itemPriceText}>J${it.price * it.quantity}</Text>
                  </View>
                </View>
              );
            })}

            <Pressable
              onPress={() =>
                router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: restaurant?._id } })
              }
              style={styles.addMoreRow}
            >
              <Ionicons name="add-circle-outline" size={20} color={CaseUi.orange} />
              <Text style={styles.addMoreText}>Add more items</Text>
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
            >
              <Pressable
                onPress={() => setShowNoteInput(!showNoteInput)}
                style={[styles.actionCapsule, showNoteInput && styles.actionCapsuleActive]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={showNoteInput ? CaseUi.orange : CaseUi.muted}
                />
                <Text style={[styles.actionCapsuleText, showNoteInput && styles.actionCapsuleTextActive]}>
                  {note ? 'Edit note' : 'Add note'}
                </Text>
              </Pressable>

              <Pressable
                disabled={mutating}
                onPress={async () => {
                  const nextVal = !noCutlery;
                  setNoCutlery(nextVal);
                  await updatePrefs.mutateAsync({ dontSendCutlery: nextVal });
                }}
                style={[styles.actionCapsule, noCutlery && styles.actionCapsuleActive]}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={14}
                  color={noCutlery ? CaseUi.orange : CaseUi.muted}
                />
                <Text style={[styles.actionCapsuleText, noCutlery && styles.actionCapsuleTextActive]}>
                  {noCutlery ? 'No cutlery' : 'Send cutlery'}
                </Text>
              </Pressable>
            </ScrollView>

            {showNoteInput && (
              <View style={styles.noteInputContainer}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="E.g., extra spicy, no onions..."
                  placeholderTextColor={CaseUi.muted}
                  style={styles.noteTextInput}
                  onBlur={async () => {
                    await updatePrefs.mutateAsync({ generalNote: note.trim() });
                  }}
                />
                {note.length > 0 && (
                  <Pressable
                    onPress={async () => {
                      setNote('');
                      await updatePrefs.mutateAsync({ generalNote: '' });
                    }}
                  >
                    <Ionicons name="close" size={16} color={CaseUi.muted} />
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.recsSection}>
              <View style={styles.recsHeader}>
                <Ionicons name="grid-outline" size={16} color={CaseUi.muted} />
                <Text style={styles.recsTitle}>Complete your order with</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {recommendations.map((item) => (
                  <View key={item._id} style={styles.recCard}>
                    <View style={styles.recImageContainer}>
                      {item.images?.[0] ? (
                        <Image source={{ uri: item.images[0] }} style={styles.recImage} contentFit="cover" />
                      ) : (
                        <View style={[styles.recImage, styles.recImagePlaceholder]}>
                          <Ionicons name="fast-food-outline" size={22} color={CaseUi.muted} />
                        </View>
                      )}
                      <Pressable onPress={() => handleAddRecommendation(item)} style={styles.recAddBtn}>
                        <Ionicons name="add" size={16} color={CaseUi.orange} />
                      </Pressable>
                    </View>
                    <View style={styles.recContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FoodTypeDot itemName={item.itemName} />
                        <Text style={styles.recItemName} numberOfLines={1}>
                          {item.itemName}
                        </Text>
                      </View>
                      <Text style={styles.recItemPrice}>J${item.discountedPrice ?? item.price}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Coupon */}
          <View style={styles.couponCard}>
            <View style={styles.couponRow}>
              <Ionicons name="pricetag-outline" size={18} color={CaseUi.orange} />
              <View style={{ flex: 1 }}>
                {quote?.discountAmount ? (
                  <Text style={styles.couponCodeTitle}>
                    Saved J${quote.discountAmount} with &apos;{couponCode}&apos;
                  </Text>
                ) : (
                  <Text style={styles.couponCodeTitle}>
                    {suggestedCoupon
                      ? `Try '${suggestedCoupon.couponCode}' — ${formatCouponDescription(suggestedCoupon)}`
                      : 'Have a coupon code?'}
                  </Text>
                )}
              </View>
              {couponCode ? (
                <Pressable onPress={() => applyCouponCode('')} style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>REMOVE</Text>
                </Pressable>
              ) : (
                <View style={styles.couponInputRow}>
                  <TextInput
                    value={couponCode}
                    onChangeText={setCouponCode}
                    onBlur={() => applyCouponCode(couponCode)}
                    placeholder="Enter code"
                    placeholderTextColor={CaseUi.muted}
                    autoCapitalize="characters"
                    style={styles.couponMiniInput}
                  />
                  <Pressable
                    disabled={!couponCode.trim()}
                    onPress={() => applyCouponCode(couponCode)}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>APPLY</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Bill breakdown — driven by the real /public/quote API, same as Checkout */}
          <View style={styles.billDetailsCard}>
            <Text style={styles.billDetailsTitle}>Bill Details</Text>
            {quoteQ.isFetching && !quote ? (
              <ActivityIndicator color={CaseUi.orange} style={{ marginVertical: 8 }} />
            ) : (
              <>
                <Row label="Item Total" value={`J$${subtotal}`} color={CaseUi.ink} />
                <Row
                  label="Delivery Fee"
                  value={quote?.deliveryFee ? `J$${quote.deliveryFee}` : deliveryPointId ? 'FREE' : 'Set at checkout'}
                  color={CaseUi.ink}
                />
                {quote && quote.multiStoreFee > 0 ? (
                  <Row label="Multi-store Fee" value={`J$${quote.multiStoreFee}`} color={CaseUi.ink} />
                ) : null}
                {quote && quote.discountAmount > 0 ? (
                  <Row label="Coupon Discount" value={`-J$${quote.discountAmount}`} color={CaseUi.success} />
                ) : null}
                <View style={styles.cardSeparator} />
                <Row label="Total" value={`J$${total}`} color={CaseUi.orange} bold />
              </>
            )}
          </View>
        </ScrollView>

        <View style={[styles.bottomCheckoutBar, { paddingBottom: checkoutBarPaddingBottom }]}>
          <Pressable onPress={() => setShowPaymentModal(true)} style={styles.paymentMethodSelect}>
            <View>
              <Text style={styles.payUsingLabel}>PAY USING</Text>
              <Text style={styles.payUsingMethod}>
                {paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash on Delivery'}
              </Text>
            </View>
            <Ionicons name="chevron-up" size={16} color={CaseUi.muted} />
          </Pressable>
          <Pressable disabled={mutating} onPress={() => router.push('/checkout')} style={styles.placeOrderBtn}>
            <View style={styles.placeOrderInner}>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={styles.btnTotalText}>J${total}</Text>
                <Text style={styles.btnTotalLabel}>TOTAL</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.placeOrderText}>Proceed to Checkout</Text>
                <Ionicons name="caret-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowPaymentModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="wallet-outline" size={20} color={CaseUi.ink} />
                <Text style={styles.modalTitle}>Payment Method</Text>
              </View>
              <Pressable onPress={() => setShowPaymentModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color={CaseUi.muted} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubTitle}>Choose how you want to pay</Text>

              <Pressable
                onPress={() => handleSelectPayment('COD')}
                style={[styles.optionCard, paymentMethod === 'COD' && styles.optionCardActive]}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: CaseUi.successSoft }]}>
                    <Ionicons name="cash" size={22} color={CaseUi.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Cash on Delivery</Text>
                    <Text style={styles.optionDesc}>Pay with cash when your order arrives</Text>
                  </View>
                </View>
                <Ionicons
                  name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMethod === 'COD' ? CaseUi.orange : CaseUi.muted}
                />
              </Pressable>

              <Pressable
                onPress={() => handleSelectPayment('BANK_TRANSFER')}
                style={[styles.optionCard, paymentMethod === 'BANK_TRANSFER' && styles.optionCardActive]}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: CaseUi.orangeSoft }]}>
                    <Ionicons name="business" size={22} color={CaseUi.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Bank Transfer</Text>
                    <Text style={styles.optionDesc}>Transfer, then upload your receipt</Text>
                  </View>
                </View>
                <Ionicons
                  name={paymentMethod === 'BANK_TRANSFER' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMethod === 'BANK_TRANSFER' ? CaseUi.orange : CaseUi.muted}
                />
              </Pressable>
            </View>

            <View style={[styles.modalFooter, { paddingBottom: bottomInset + 12 }]}>
              <Pressable onPress={() => setShowPaymentModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: CaseUi.muted, marginTop: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.field,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
  },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 11, color: CaseUi.muted, maxWidth: 220 },
  locationTextStrong: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orange },
  scrollBody: { padding: 14, gap: 14 },
  itemsCard: {
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.lg,
    paddingHorizontal: 14,
    paddingTop: 6,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  foodTypeBorder: {
    width: 13,
    height: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2.5,
  },
  vegDotInner: { width: 6, height: 6, borderRadius: 3 },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  itemNameText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: CaseUi.ink },
  itemPortionText: { fontSize: 12, color: CaseUi.muted, marginTop: 2 },
  editItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, alignSelf: 'flex-start' },
  editItemText: { color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: CaseUi.orange,
    overflow: 'hidden',
    height: 32,
    width: 80,
  },
  qtyBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  qtyValueText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: '#FFFFFF',
    width: 24,
    textAlign: 'center',
  },
  itemPriceText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink, marginTop: 2 },
  addMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  addMoreText: { color: CaseUi.orange, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    maxWidth: 160,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  actionCapsuleActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  actionCapsuleText: { color: CaseUi.muted, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', flexShrink: 1 },
  actionCapsuleTextActive: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold' },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  noteTextInput: { flex: 1, color: CaseUi.ink, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  recsSection: { marginTop: 4 },
  recsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  recsTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
  recCard: {
    width: 100,
    backgroundColor: CaseUi.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  recImageContainer: { position: 'relative', height: 80, backgroundColor: CaseUi.field },
  recImage: { width: '100%', height: '100%' },
  recImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recAddBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...CaseUi.softShadow,
  },
  recContent: { padding: 6, gap: 2 },
  recItemName: { fontSize: 10, color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold', flex: 1 },
  recItemPrice: { fontSize: 10, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  couponCard: {
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  couponCodeTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: CaseUi.ink },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    backgroundColor: CaseUi.field,
    width: 130,
  },
  couponMiniInput: { flex: 1, color: CaseUi.ink, fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', paddingVertical: 0 },
  applyButton: { paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  applyButtonText: { color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  billDetailsCard: {
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  billDetailsTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink, marginBottom: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 12, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_600SemiBold' },
  billLabelBold: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  billValue: { fontSize: 12, color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold' },
  billValueBold: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardSeparator: { height: 1, backgroundColor: CaseUi.line, marginVertical: 10 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, marginTop: 16 },
  emptySubtitle: { fontSize: 12, color: CaseUi.muted, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  shopBtn: { backgroundColor: CaseUi.orange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  shopBtnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
  bottomCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CaseUi.white,
    borderTopWidth: 1,
    borderTopColor: CaseUi.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    ...CaseUi.cardShadow,
  },
  paymentMethodSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  payUsingLabel: { fontSize: 9, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.6 },
  payUsingMethod: { fontSize: 12, color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold' },
  placeOrderBtn: { borderRadius: 14, overflow: 'hidden', backgroundColor: CaseUi.orange },
  placeOrderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    height: 52,
  },
  btnTotalText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },
  btnTotalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 8, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: -2 },
  placeOrderText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  modalTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: CaseUi.ink },
  modalBody: { paddingVertical: 18, gap: 12 },
  modalSubTitle: { fontSize: 14, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 8 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  optionCardActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  optionDesc: { fontSize: 11, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  modalFooter: { paddingTop: 8 },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
});
