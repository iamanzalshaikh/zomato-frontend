import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { SpellingLoader } from '@/components/spelling-loader';
import { CaseUi } from '@/constants/caseUi';
import { useCart } from '@/hooks/use-cart';
import { toast } from '@/lib/toast';
import { useThemeContext } from '@/context/ThemeContext';
import { getCartRestaurantName } from '@/lib/cartDisplay';
import {
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
  useAddToCartMutation,
  useUpdateCartPreferencesMutation,
} from '@/hooks/queries/cart';
import { useCaseQuoteQuery, buildCaseQuoteInput } from '@/hooks/queries/caseOrders';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProfileQuery } from '@/hooks/queries/profile';
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
import type { MenuItem } from '@/services/menu';
import { useMenuByRestaurantQuery } from '@/hooks/queries/menu';
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
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );
  const { cart, loading } = useCart();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  // Tab scenes already sit above the tab bar — pin checkout strip to bottom: 0.
  const checkoutBarPaddingBottom = 10;
  const checkoutBarHeight = 72 + checkoutBarPaddingBottom;
  const cartTitle = getCartRestaurantName(cart) || 'Your order';
  const modalBottomPad = Math.max(insets.bottom, 12);

  const updateLine = useUpdateCartItemMutation();
  const removeLine = useRemoveCartItemMutation();
  const clearCart = useClearCartMutation();
  const addToCartMut = useAddToCartMutation();
  const updatePrefs = useUpdateCartPreferencesMutation();

  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noCutlery, setNoCutlery] = useState(true);
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

  const menuQ = useMenuByRestaurantQuery(restaurantId);
  const cartItemIds = useMemo(
    () => new Set(cart?.items.map((it) => it.menuItemId) ?? []),
    [cart?.items],
  );
  const recommendations = useMemo(() => {
    const items = menuQ.data ?? [];
    return items.filter((it) => !cartItemIds.has(it._id)).slice(0, 5);
  }, [menuQ.data, cartItemIds]);

  // Build a menuItemId -> imageUrl lookup from cached menu (covers cart lines too)
  const menuItemImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of menuQ.data ?? []) {
      if (item.images?.[0]) map[item._id] = item.images[0];
    }
    return map;
  }, [menuQ.data]);

  const caseItems = useMemo(() => mapCartToCaseItems(cart), [cart]);
  const cartSubtotal = useMemo(
    () =>
      (cart?.items ?? []).reduce((s, it) => {
        const line = Number(it.total);
        if (Number.isFinite(line) && line > 0) return s + line;
        return s + Number(it.price || 0) * Number(it.quantity || 0);
      }, 0),
    [cart?.items],
  );
  // Debounce coupon before it enters the quote key — matches Checkout, and
  // keeps a shared cache entry between the two screens for the same cart.
  const debouncedCoupon = useDebouncedValue(couponCode.trim(), 400);
  const profileQuery = useProfileQuery();
  const profileUserId =
    (profileQuery.data as { _id?: string; id?: string } | undefined)?._id ??
    (profileQuery.data as { id?: string } | undefined)?.id;
  const quoteInput = useMemo(() => {
    if (!caseItems.length || cartSubtotal <= 0) return null;
    return buildCaseQuoteInput({
      lines: caseItems.map((i) => ({
        merchantId: i.restaurantId ?? null,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
      deliveryPointId,
      couponCode: debouncedCoupon,
      userId: profileUserId,
    });
  }, [caseItems, cartSubtotal, deliveryPointId, debouncedCoupon, profileUserId]);
  const quoteQ = useCaseQuoteQuery(
    quoteInput,
    // Same fix as Checkout: wait for deliveryPointId to resolve first,
    // otherwise the first quote fires without it and shows a price missing
    // the delivery fee before a second request silently corrects it.
    isFocused && caseItems.length > 0 && cartSubtotal > 0 && Boolean(deliveryPointId),
  );
  const quote = quoteQ.data;

  const subtotal =
    quote?.subtotal != null && quote.subtotal > 0 ? quote.subtotal : cartSubtotal;
  const total =
    quote?.totalJmd != null && quote.totalJmd > 0
      ? quote.totalJmd
      : subtotal + Number(quote?.deliveryFee ?? 0);

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
    return <SpellingLoader />;
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.headerRow, { borderBottomColor: isDark ? '#222226' : CaseUi.line }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
            <Pressable onPress={() => router.back()} style={[styles.iconCircle, { backgroundColor: isDark ? '#1F1F24' : CaseUi.field }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {cartTitle}
              </Text>
              <Pressable
                onPress={() => router.push('/(onboarding)/delivery-point')}
                style={styles.locationSelector}
              >
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  Deliver to <Text style={styles.locationTextStrong}>{deliveryPointName}</Text>
                </Text>
                <Ionicons name="chevron-down" size={12} color={CaseUi.muted} />
              </Pressable>
            </View>
          </View>
          <Pressable onPress={handleClearCart} style={[styles.iconCircle, { backgroundColor: isDark ? '#1F1F24' : CaseUi.field }]}>
            <Ionicons name="trash-outline" size={18} color={CaseUi.danger} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: checkoutBarHeight + 12 }]}
        >
          {/* Cart items */}
          <View style={[styles.itemsCard, { backgroundColor: isDark ? '#141417' : CaseUi.white, borderColor: isDark ? '#27272A' : CaseUi.line }]}>
            {cart.items.map((it) => {
              const portionName =
                it.addons && it.addons.length > 0
                  ? it.addons.map((a: { name: string }) => a.name.replace('Portion: ', '')).join(', ')
                  : null;
              const itemImage = menuItemImageMap[it.menuItemId] ?? null;
              const restaurantName =
                (it as { restaurantName?: string }).restaurantName ||
                (typeof restaurant === 'object' && restaurant?.restaurantName
                  ? restaurant.restaurantName
                  : 'Store');

              return (
                <View key={it._id} style={[styles.cartItemRow, { borderBottomColor: isDark ? '#27272A' : CaseUi.line }]}>
                  {/* Thumbnail */}
                  <View style={[styles.itemThumb, { backgroundColor: isDark ? '#222228' : CaseUi.field }]}>
                    {itemImage ? (
                      <Image
                        source={{ uri: itemImage }}
                        style={styles.itemThumbImg}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <Ionicons name="fast-food-outline" size={24} color={CaseUi.muted} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.itemNameText, { color: colors.text }]} numberOfLines={1}>{it.itemName}</Text>
                    {portionName ? (
                      <Text style={[styles.itemPortionText, { color: colors.textSecondary }]} numberOfLines={1}>{portionName}</Text>
                    ) : (
                      <Text style={[styles.itemStoreName, { color: colors.textSecondary }]} numberOfLines={1}>{restaurantName}</Text>
                    )}
                    <Text style={[styles.itemPriceText, { color: isDark ? '#FF9F64' : CaseUi.ink }]}>
                      JMD {Math.round(Number(it.price || 0) * Number(it.quantity || 0))}
                    </Text>
                  </View>

                  {/* Inline qty pill */}
                  <View style={[styles.quantityContainer, { borderColor: isDark ? '#3F3F46' : CaseUi.line }]}>
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
                      hitSlop={6}
                    >
                      <Ionicons name="remove" size={14} color={isDark ? '#AAAAAA' : '#555555'} />
                    </Pressable>
                    <Text style={[styles.qtyValueText, { color: colors.text }]}>{it.quantity}</Text>
                    <Pressable
                      disabled={mutating}
                      onPress={() => updateLine.mutateAsync({ itemId: it._id, quantity: it.quantity + 1 })}
                      style={styles.qtyBtn}
                      hitSlop={6}
                    >
                      <Ionicons name="add" size={14} color={isDark ? '#AAAAAA' : '#555555'} />
                    </Pressable>
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

          {/* Peach Promo Coupon Card */}
          <View
            style={[
              styles.couponCardPeach,
              { backgroundColor: isDark ? '#2D201A' : '#FFF5EE', borderColor: isDark ? '#5C3826' : '#FFE0CC' }
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pricetag" size={14} color={CaseUi.orange} />
                {quote?.discountAmount ? (
                  <Text style={[styles.couponCodeTitle, { color: isDark ? '#FF9F64' : '#E05A10' }]}>
                    Saved JMD {quote.discountAmount} with &apos;{couponCode}&apos;
                  </Text>
                ) : (
                  <Text style={[styles.couponCodeTitle, { color: isDark ? '#FF9F64' : '#E05A10' }]}>
                    {suggestedCoupon
                      ? `Try '${suggestedCoupon.couponCode}'`
                      : 'Have a coupon code?'}
                  </Text>
                )}
              </View>
              <Text style={[styles.couponCodeDesc, { color: isDark ? '#D1A38C' : '#8A583C' }]}>
                {suggestedCoupon
                  ? formatCouponDescription(suggestedCoupon)
                  : 'Enter promo code at checkout for maximum discount'}
              </Text>
            </View>

            {couponCode ? (
              <Pressable onPress={() => applyCouponCode('')} style={styles.applyButtonCircle}>
                <Ionicons name="close-circle" size={20} color={CaseUi.orange} />
              </Pressable>
            ) : (
              <View style={[styles.couponInputRow, { backgroundColor: isDark ? '#3D2A20' : '#FFFFFF', borderColor: isDark ? '#5C3826' : '#FFE0CC' }]}>
                <TextInput
                  value={couponCode}
                  onChangeText={setCouponCode}
                  onBlur={() => applyCouponCode(couponCode)}
                  placeholder="Enter code"
                  placeholderTextColor={isDark ? '#8A583C' : '#A88D7E'}
                  autoCapitalize="characters"
                  style={[styles.couponMiniInput, { color: isDark ? '#FF9F64' : '#E05A10' }]}
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

          {/* Bill breakdown — driven by the real /public/quote API, same as Checkout */}
          <View style={[styles.billDetailsCard, { backgroundColor: isDark ? '#141417' : CaseUi.white, borderColor: isDark ? '#27272A' : CaseUi.line }]}>
            <Text style={[styles.billDetailsTitle, { color: colors.text }]}>Bill Details</Text>
            {quoteQ.isError && !quote ? (
              <Text style={{ color: CaseUi.danger, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 8 }}>
                Couldn't load bill total. Check your connection and try again.
              </Text>
            ) : null}
            {quoteQ.isFetching && !quote ? (
              <ActivityIndicator color={CaseUi.orange} style={{ marginVertical: 8 }} />
            ) : (
              <>
                <Row label="Item Total" value={`JMD ${subtotal}`} color={colors.text} />
                <Row
                  label="Delivery Fee"
                  value={quote?.deliveryFee ? `JMD ${quote.deliveryFee}` : deliveryPointId ? 'FREE' : 'Set at checkout'}
                  color={colors.text}
                />
                {quote && quote.multiStoreFee > 0 ? (
                  <Row label="Multi-store pickup" value={`JMD ${quote.multiStoreFee}`} color={colors.text} />
                ) : null}
                {quote && quote.discountAmount > 0 ? (
                  <Row label="Coupon Discount" value={`-JMD ${quote.discountAmount}`} color={CaseUi.success} />
                ) : null}
                <View style={[styles.cardSeparator, { backgroundColor: isDark ? '#27272A' : CaseUi.line }]} />
                <Row label="Total" value={`JMD ${total}`} color={CaseUi.orange} bold />
              </>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomCheckoutBar,
            {
              backgroundColor: isDark ? '#141417' : CaseUi.white,
              borderTopColor: isDark ? '#27272A' : CaseUi.line,
              bottom: 0,
              paddingBottom: checkoutBarPaddingBottom,
            },
          ]}
        >
          <View style={styles.bottomCheckoutRow}>
            <Pressable onPress={() => setShowPaymentModal(true)} style={styles.paymentMethodSelect}>
              <Text style={styles.payUsingLabel}>PAY USING</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.payUsingMethod, { color: colors.text }]} numberOfLines={1}>
                  {paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash on Delivery'}
                </Text>
                <Ionicons name="chevron-up" size={14} color={CaseUi.muted} />
              </View>
            </Pressable>
            <Pressable
              disabled={mutating || cartSubtotal <= 0}
              onPress={() => router.push('/checkout')}
              style={[styles.placeOrderBtn, cartSubtotal <= 0 && { opacity: 0.55 }]}
            >
              <View style={styles.placeOrderInner}>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={styles.btnTotalText}>JMD {Math.round(total)}</Text>
                  <Text style={styles.btnTotalLabel}>TOTAL</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.placeOrderText}>Checkout</Text>
                  <Ionicons name="caret-forward" size={14} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
          </View>
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

            <View style={[styles.modalFooter, { paddingBottom: modalBottomPad + 12 }]}>
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
  scrollBody: { padding: 14, gap: 10 },
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
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemThumbImg: { width: '100%', height: '100%' },
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
  itemStoreName: { fontSize: 12, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium' },
  itemPortionText: { fontSize: 12, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium' },
  editItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4, alignSelf: 'flex-start' },
  editItemText: { color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 2,
    flexShrink: 0,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValueText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    minWidth: 18,
    textAlign: 'center',
  },
  itemPriceText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
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
  couponCardPeach: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
    ...CaseUi.softShadow,
  },
  couponCodeTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  couponCodeDesc: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 38,
    width: 140,
  },
  couponMiniInput: { flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', paddingVertical: 0 },
  applyButton: { paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  applyButtonText: { color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  applyButtonTextAction: { color: CaseUi.orange, fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  applyButtonTextWrap: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFE0CC' },
  applyButtonCircle: { padding: 4 },
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
    left: 0,
    right: 0,
    backgroundColor: CaseUi.white,
    borderTopWidth: 1,
    borderTopColor: CaseUi.line,
    paddingHorizontal: 12,
    paddingTop: 10,
    ...CaseUi.cardShadow,
  },
  bottomCheckoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentMethodSelect: {
    width: 118,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  payUsingLabel: {
    fontSize: 9,
    color: CaseUi.muted,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.6,
    marginBottom: 2,
    includeFontPadding: false,
    lineHeight: 12,
  },
  payUsingMethod: { fontSize: 11, color: CaseUi.ink, fontFamily: 'PlusJakartaSans_700Bold', flexShrink: 1 },
  placeOrderBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: CaseUi.orange },
  placeOrderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 52,
  },
  btnTotalText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
  btnTotalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 8, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: -2 },
  placeOrderText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
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
