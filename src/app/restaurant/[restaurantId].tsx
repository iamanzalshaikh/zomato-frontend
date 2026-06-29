import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  Modal,
  Platform,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type MenuItem, type ComboItem } from '@/services/menu';
import { type Coupon } from '@/services/coupons';
import { useTheme } from '@/hooks/use-theme';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { useMenuByRestaurantQuery, useCombosByRestaurantQuery } from '@/hooks/queries/menu';
import { useRestaurantByIdQuery } from '@/hooks/queries/restaurants';
import { useCouponsByRestaurantQuery } from '@/hooks/queries/coupons';
import { FavoriteHeart } from '@/components/favorite-heart';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { useRestaurantReviewsQuery } from '@/hooks/queries/reviews';
import { useCart } from '@/hooks/use-cart';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { toast } from '@/lib/toast';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';

function FoodTypeBadge({ type }: { type?: string }) {
  if (type === 'veg') {
    return (
      <View style={[styles.badgeContainer, { borderColor: '#0f8a5f' }]}>
        <View style={[styles.badgeDot, { backgroundColor: '#0f8a5f', borderRadius: 999 }]} />
      </View>
    );
  } else if (type === 'nonveg') {
    return (
      <View style={[styles.badgeContainer, { borderColor: '#e23744' }]}>
        <View
          style={[
            styles.badgeDot,
            {
              width: 0,
              height: 0,
              borderLeftWidth: 4,
              borderRightWidth: 4,
              borderBottomWidth: 8,
              borderStyle: 'solid',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#e23744',
              backgroundColor: 'transparent',
            },
          ]}
        />
      </View>
    );
  } else if (type === 'egg') {
    return (
      <View style={[styles.badgeContainer, { borderColor: '#d97706' }]}>
        <View style={[styles.badgeDot, { backgroundColor: '#d97706', borderRadius: 999 }]} />
      </View>
    );
  }
  return null;
}

function MenuItemAddColumn({
  item,
  onPress,
  busy,
}: {
  item: MenuItem;
  onPress: (item: MenuItem) => void;
  busy?: boolean;
}) {
  const hasAddons = Boolean(item.addons?.length);

  return (
    <View style={styles.itemRight}>
      {item.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImage} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.noPhotoImage}>
          <Ionicons name="fast-food-outline" size={32} color="#cccccc" />
        </View>
      )}
      <View style={styles.addBlock}>
        <Pressable
          onPress={() => onPress(item)}
          style={[styles.addBtn, busy && { opacity: 0.65 }]}
          disabled={busy}
          hitSlop={8}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#ff5a00" />
          ) : (
            <ThemedText style={styles.addBtnText}>ADD +</ThemedText>
          )}
        </Pressable>
        {hasAddons ? (
          <ThemedText style={styles.customisableText}>Customisable</ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const MenuItemRow = memo(function MenuItemRow({
  item,
  addingItemId,
  onAdd,
  showRecommendedBadge,
}: {
  item: MenuItem;
  addingItemId: string | null;
  onAdd: (item: MenuItem) => void;
  showRecommendedBadge?: boolean;
}) {
  return (
    <View style={styles.menuRow}>
      <View style={styles.itemLeft}>
        <FoodTypeBadge type={item.foodType} />
        <ThemedText style={styles.itemName}>{item.itemName}</ThemedText>
        {showRecommendedBadge ? (
          <View style={{ flexDirection: 'row' }}>
            <ThemedText style={{ fontSize: 10, color: '#0f8a5f', fontWeight: 'bold', backgroundColor: '#eefcf7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              ★ Highly reordered
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.priceRow}>
          <ThemedText style={styles.price}>₹{item.discountedPrice ?? item.price}</ThemedText>
          {!!item.discountedPrice ? (
            <ThemedText style={styles.originalPrice}>₹{item.price}</ThemedText>
          ) : null}
        </View>
        {!!item.shortDescription ? (
          <ThemedText themeColor="textSecondary" style={styles.itemDesc} numberOfLines={2}>
            {item.shortDescription}
          </ThemedText>
        ) : null}
      </View>
      <MenuItemAddColumn item={item} onPress={onAdd} busy={addingItemId === item._id} />
    </View>
  );
});

export default function RestaurantDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const add = useAddToCartMutation();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const rid = restaurantId ?? '';
  const restaurantQ = useRestaurantByIdQuery(rid);
  const menuQ = useMenuByRestaurantQuery(rid);
  const combosQ = useCombosByRestaurantQuery(rid);
  const menuReady = Boolean(menuQ.data);
  const reviewsQ = useRestaurantReviewsQuery(rid, 5, menuReady);
  const reviews = useMemo(() => (Array.isArray(reviewsQ.data) ? reviewsQ.data : []), [reviewsQ.data]);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const couponsQ = useCouponsByRestaurantQuery(rid, showOffersModal);
  const restaurantLoading = restaurantQ.isLoading && !restaurantQ.data;
  const menuLoading = menuQ.isLoading && !menuQ.data;
  const restaurant: any = restaurantQ.data ?? null;
  const items = useMemo(() => (menuQ.data ?? []) as MenuItem[], [menuQ.data]);
  const combosData = useMemo(() => (combosQ.data ?? []) as ComboItem[], [combosQ.data]);
  const coupons: Coupon[] = (couponsQ.data?.coupons ?? []) as Coupon[];
  const couponCount: number = showOffersModal ? (couponsQ.data?.count ?? 0) : 0;
  const error = (restaurantQ.error as any)?.message ?? (menuQ.error as any)?.message ?? (combosQ.error as any)?.message ?? null;
  const { cart } = useCart();
  const cartCount = getCartItemCount(cart);
  const cartTotal = getCartDisplayTotal(cart);
  const cartRestaurantName = getCartRestaurantName(cart) ?? restaurant?.restaurantName;
  const cartBottom = useFloatingCartBottom();
  const scrollBottomPadding = useFloatingCartScrollPadding(cartCount > 0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodType, setSelectedFoodType] = useState<string | null>(null);
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Offers Modal State — coupons load when modal opens

  // Customize / Addon State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // In-memory Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Search
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = it.itemName.toLowerCase().includes(query);
        const matchesDesc = it.shortDescription?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }
      // Food type
      if (selectedFoodType) {
        if (it.foodType !== selectedFoodType) return false;
      }
      // Bestseller (isRecommended)
      if (showRecommendedOnly) {
        if (!it.isRecommended) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedFoodType, showRecommendedOnly]);

  // Recommended Items Filter
  const recommendedItems = useMemo(() => {
    return filteredItems.filter((it) => it.isRecommended);
  }, [filteredItems]);

  // Mock User Past Orders
  const userPastOrders = useMemo(() => {
    if (filteredItems.length === 0) return [];
    return filteredItems.slice(0, Math.min(2, filteredItems.length)).map((it, idx) => ({
      ...it,
      pastOrderText: idx === 0 ? 'You ordered 2 months ago' : 'You ordered 5 months ago',
    }));
  }, [filteredItems]);

  // Combos (Most Ordered Together) filtered by selected food type
  const mostOrderedTogether = useMemo(() => {
    return combosData.filter((combo) => {
      if (selectedFoodType && combo.foodType !== selectedFoodType) return false;
      return true;
    });
  }, [combosData, selectedFoodType]);

  // Group by Category
  const groupedItems = useMemo(() => {
    const groups: Record<string, { categoryName: string; items: MenuItem[] }> = {};
    filteredItems.forEach((it) => {
      const catName = (it as any).categoryId?.categoryName ?? 'Menu';
      if (!groups[catName]) {
        groups[catName] = {
          categoryName: catName,
          items: [],
        };
      }
      groups[catName].items.push(it);
    });
    return Object.values(groups);
  }, [filteredItems]);

  const handleAddToCart = useCallback(async (item: MenuItem) => {
    if (!item._id || !rid || addingItemId) return;
    setAddingItemId(String(item._id));
    try {
      await add.mutateAsync({
        restaurantId: String(rid),
        menuItemId: String(item._id),
        quantity: 1,
      });
      toast.success(`${item.itemName} added to cart`, 'Added');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to add item to cart';
      toast.error(String(msg));
    } finally {
      setAddingItemId(null);
    }
  }, [add, addingItemId, rid]);

  const handleAddClick = useCallback((item: MenuItem) => {
    if (item.addons && item.addons.length > 0) {
      setCustomizingItem(item);
      setSelectedAddons({});
      setQuantity(1);

      const sizes = item.addons.filter(
        (ad) => ad.name.startsWith('Portion:') || ad.name.startsWith('Size:')
      );
      if (sizes.length > 0) {
        setSelectedSize(sizes[0].name);
      } else {
        setSelectedSize('');
      }
    } else {
      void handleAddToCart(item);
    }
  }, [handleAddToCart]);

  const handleAddCustomizedToCart = async () => {
    if (!customizingItem || !rid) return;
    try {
      const addonsPayload: { name: string; price: number }[] = [];

      if (selectedSize) {
        const matched = customizingItem.addons?.find((ad: any) => ad.name === selectedSize);
        if (matched) {
          addonsPayload.push({
            name: selectedSize,
            price: matched.price,
          });
        }
      }

      Object.keys(selectedAddons)
        .filter((name) => selectedAddons[name])
        .forEach((name) => {
          const matched = customizingItem.addons?.find((ad: any) => ad.name === name);
          if (matched) {
            addonsPayload.push({
              name,
              price: matched.price,
            });
          }
        });

      await add.mutateAsync({
        restaurantId: String(rid),
        menuItemId: String(customizingItem._id),
        quantity,
        addons: addonsPayload,
      });
      setCustomizingItem(null);
      toast.success(`${customizingItem.itemName} added to cart`, 'Added');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to add item to cart';
      toast.error(String(msg));
    }
  };

  const isCategoryCollapsed = (catName: string) => collapsedCategories[catName] ?? true;

  const toggleCategory = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !(prev[catName] ?? true),
    }));
  };

  const toggleAddon = (addonName: string) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonName]: !prev[addonName],
    }));
  };

  const customizedTotalPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const basePrice = customizingItem.discountedPrice ?? customizingItem.price;
    let addonsPrice = 0;
    if (customizingItem.addons) {
      customizingItem.addons.forEach((ad: any) => {
        if (ad.name === selectedSize) {
          addonsPrice += ad.price;
        } else if (selectedAddons[ad.name]) {
          addonsPrice += ad.price;
        }
      });
    }
    return (basePrice + addonsPrice) * quantity;
  }, [customizingItem, selectedSize, selectedAddons, quantity]);

  const sizeAddons = useMemo(() => {
    if (!customizingItem?.addons) return [];
    return customizingItem.addons.filter(
      (ad) => ad.name.startsWith('Portion:') || ad.name.startsWith('Size:')
    );
  }, [customizingItem]);

  const extraAddons = useMemo(() => {
    if (!customizingItem?.addons) return [];
    return customizingItem.addons.filter(
      (ad) => !ad.name.startsWith('Portion:') && !ad.name.startsWith('Size:')
    );
  }, [customizingItem]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Zomato Header Bar */}
        <View style={[styles.headerBar, { backgroundColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          
          <View style={styles.headerSearchContainer}>
            <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.headerSearchInput, { color: theme.text }]}
              placeholder={`Search in ${restaurant?.restaurantName || 'restaurant'}...`}
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.headerActions}>
            <FavoriteHeart restaurantId={rid} variant="header" />
            <Pressable style={styles.headerActionBtn}>
              <Ionicons name="share-social-outline" size={22} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: scrollBottomPadding }}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            {restaurantLoading ? (
              <View style={{ alignItems: 'center', marginTop: 32 }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText themeColor="textSecondary" style={{ marginTop: 12 }}>Loading restaurant…</ThemedText>
              </View>
            ) : error ? (
              <ThemedView type="backgroundElement" style={styles.errorCard}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <Pressable
                  onPress={() => {
                    void Promise.all([restaurantQ.refetch(), menuQ.refetch()]);
                  }}
                  style={styles.retryBtn}
                >
                  <ThemedText style={styles.retryText}>Retry</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <>
                {/* Zomato Restaurant Detail Card */}
                <View style={[styles.restaurantCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.titleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <ThemedText style={[styles.restaurantName, { color: theme.text }]}>
                        {restaurant?.restaurantName}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.cuisinesText}>
                        {(restaurant?.cuisines ?? []).slice(0, 3).join(' · ') || 'Restaurant'}
                      </ThemedText>
                    </View>
                    <View style={styles.ratingBox}>
                      <View style={styles.ratingBadge}>
                        <ThemedText style={styles.ratingNumber}>
                          {Number(restaurant?.averageRating ?? 0).toFixed(1)} ⭐
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.ratingCount}>
                        {restaurant?.totalRatings ? `${restaurant.totalRatings} ratings` : 'New'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={14} color={theme.primary} />
                    <ThemedText themeColor="textSecondary" style={styles.infoText}>
                      1 km · Kalyan
                    </ThemedText>
                  </View>
                  <View style={[styles.infoRow, { marginTop: 6 }]}>
                    <Ionicons name="time" size={14} color="#0f8a5f" />
                    <ThemedText themeColor="textSecondary" style={styles.infoText}>
                      {restaurant?.averageDeliveryTime ?? 30} mins · Schedule for later ▾
                    </ThemedText>
                  </View>

                  <Pressable
                    onPress={() => setShowOffersModal(true)}
                    style={styles.offerBanner}
                  >
                    <Ionicons name="pricetag" size={16} color={theme.primary} />
                    <ThemedText style={styles.offerText}>
                      {showOffersModal && couponCount > 0
                        ? `${couponCount} offer${couponCount > 1 ? 's' : ''} available — Tap to view`
                        : 'Tap to view offers'}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={theme.primary} style={{ marginLeft: 'auto' }} />
                  </Pressable>
                </View>

                {reviews.length > 0 ? (
                  <View style={[styles.reviewsSection, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={[styles.reviewsTitle, { color: theme.text }]}>What people say</ThemedText>
                    {reviews.slice(0, 3).map((review: any, idx: number) => (
                      <View key={review?._id ?? `review-${idx}`} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <ThemedText style={styles.reviewRating}>
                            ⭐ {Number(review?.restaurantRating ?? review?.foodRating ?? 0).toFixed(1)}
                          </ThemedText>
                          {review?.createdAt ? (
                            <ThemedText themeColor="textSecondary" style={styles.reviewDate}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </ThemedText>
                          ) : null}
                        </View>
                        {review?.reviewText ? (
                          <ThemedText themeColor="textSecondary" style={styles.reviewText} numberOfLines={3}>
                            {review.reviewText}
                          </ThemedText>
                        ) : (
                          <ThemedText themeColor="textSecondary" style={styles.reviewText}>
                            Great experience!
                          </ThemedText>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Zomato Filter Pills Scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersScroll}
                >
                  <Pressable
                    onPress={() => setSelectedFoodType(selectedFoodType === 'veg' ? null : 'veg')}
                    style={[
                      styles.filterPill,
                      selectedFoodType === 'veg' && { borderColor: '#0f8a5f', backgroundColor: '#eefcf7' },
                    ]}
                  >
                    <View style={[styles.filterDot, { backgroundColor: '#0f8a5f', borderRadius: 999 }]} />
                    <ThemedText
                      style={[
                        styles.filterPillText,
                        selectedFoodType === 'veg' && { color: '#0f8a5f', fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      Veg
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedFoodType(selectedFoodType === 'egg' ? null : 'egg')}
                    style={[
                      styles.filterPill,
                      selectedFoodType === 'egg' && { borderColor: '#d97706', backgroundColor: '#fefbeb' },
                    ]}
                  >
                    <View style={[styles.filterDot, { backgroundColor: '#d97706', borderRadius: 999 }]} />
                    <ThemedText
                      style={[
                        styles.filterPillText,
                        selectedFoodType === 'egg' && { color: '#d97706', fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      Egg
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedFoodType(selectedFoodType === 'nonveg' ? null : 'nonveg')}
                    style={[
                      styles.filterPill,
                      selectedFoodType === 'nonveg' && { borderColor: '#e23744', backgroundColor: '#fef2f2' },
                    ]}
                  >
                    <View
                      style={[
                        styles.filterDot,
                        {
                          width: 0,
                          height: 0,
                          borderLeftWidth: 4,
                          borderRightWidth: 4,
                          borderBottomWidth: 8,
                          borderStyle: 'solid',
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderBottomColor: '#e23744',
                          backgroundColor: 'transparent',
                        },
                      ]}
                    />
                    <ThemedText
                      style={[
                        styles.filterPillText,
                        selectedFoodType === 'nonveg' && { color: '#e23744', fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      Non-Veg
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowRecommendedOnly(!showRecommendedOnly)}
                    style={[
                      styles.filterPill,
                      showRecommendedOnly && { borderColor: theme.primary, backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name={showRecommendedOnly ? 'star' : 'star-outline'}
                      size={12}
                      color={showRecommendedOnly ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.filterPillText,
                        showRecommendedOnly && { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      Bestsellers
                    </ThemedText>
                  </Pressable>
                </ScrollView>

                {/* Grouped Category Accordion */}
                <View style={{ marginTop: Spacing.two }}>
                  {menuLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
                        Loading menu…
                      </ThemedText>
                    </View>
                  ) : null}

                  {/* Your Orders and Collections Accordion */}
                  {!selectedFoodType && !searchQuery && userPastOrders.length > 0 && (
                    <View style={styles.categorySection}>
                      <Pressable
                        onPress={() => toggleCategory('PastOrders')}
                        style={styles.categoryHeader}
                      >
                        <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                          Your Orders and Collections ({userPastOrders.length})
                        </ThemedText>
                        <Ionicons
                          name={isCategoryCollapsed('PastOrders') ? 'chevron-down' : 'chevron-up'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                      
                      {!isCategoryCollapsed('PastOrders') && (
                        <View style={styles.categoryList}>
                          {userPastOrders.map((it) => (
                            <View key={`past-${it._id}`} style={styles.menuRow}>
                              {/* Left Details */}
                              <View style={styles.itemLeft}>
                                <FoodTypeBadge type={it.foodType} />
                                <ThemedText style={[styles.itemName, { color: theme.text }]}>
                                  {it.itemName}
                                </ThemedText>
                                
                                <ThemedText themeColor="textSecondary" style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                                  {it.pastOrderText}
                                </ThemedText>

                                <View style={styles.priceRow}>
                                  <ThemedText style={[styles.price, { color: theme.text }]}>
                                    ₹{it.discountedPrice ?? it.price}
                                  </ThemedText>
                                </View>
                              </View>

                              <MenuItemAddColumn
                                item={it}
                                onPress={handleAddClick}
                                busy={addingItemId === it._id}
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Most ordered together section */}
                  {!searchQuery && mostOrderedTogether.length > 0 && (
                    <View style={styles.categorySection}>
                      <Pressable
                        onPress={() => toggleCategory('Combos')}
                        style={styles.categoryHeader}
                      >
                        <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                          Most ordered together ({mostOrderedTogether.length})
                        </ThemedText>
                        <Ionicons
                          name={isCategoryCollapsed('Combos') ? 'chevron-down' : 'chevron-up'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>

                      {!isCategoryCollapsed('Combos') && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.combosScroll}
                        >
                          {mostOrderedTogether.map((combo) => (
                            <View key={combo.id} style={[styles.comboCard, { backgroundColor: theme.backgroundElement }]}>
                              <View style={styles.comboImageContainer}>
                                <Image source={{ uri: combo.image }} style={styles.comboImage} contentFit="cover" transition={200} />
                                <View style={styles.comboTagBadge}>
                                  <ThemedText style={styles.comboTagBadgeText}>{combo.tag}</ThemedText>
                                </View>
                              </View>
                              <View style={styles.comboDetails}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <FoodTypeBadge type={combo.foodType} />
                                  <ThemedText style={[styles.comboTitle, { color: theme.text }]} numberOfLines={1}>
                                    {combo.title}
                                  </ThemedText>
                                </View>
                                <View style={styles.comboFooter}>
                                  <ThemedText style={styles.comboPrice}>₹{combo.price}</ThemedText>
                                  <Pressable
                                    onPress={() => {
                                      if (combo.mainItem) {
                                        handleAddClick(combo.mainItem);
                                      }
                                    }}
                                    style={styles.comboAddBtn}
                                  >
                                    <ThemedText style={styles.comboAddBtnText}>ADD +</ThemedText>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Recommended for you Accordion Section */}
                  {recommendedItems.length > 0 && (
                    <View style={styles.categorySection}>
                      <Pressable
                        onPress={() => toggleCategory('Recommended')}
                        style={styles.categoryHeader}
                      >
                        <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                          Recommended ({recommendedItems.length})
                        </ThemedText>
                        <Ionicons
                          name={isCategoryCollapsed('Recommended') ? 'chevron-down' : 'chevron-up'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                      
                      {!isCategoryCollapsed('Recommended') && (
                        <View style={styles.categoryList}>
                          {recommendedItems.map((it) => (
                            <MenuItemRow
                              key={`rec-${it._id}`}
                              item={it}
                              addingItemId={addingItemId}
                              onAdd={handleAddClick}
                              showRecommendedBadge
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {groupedItems.length === 0 ? (
                    <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 32 }}>
                      No items match your filters.
                    </ThemedText>
                  ) : (
                    groupedItems.map((group) => {
                      const isCollapsed = isCategoryCollapsed(group.categoryName);
                      return (
                        <View key={group.categoryName} style={styles.categorySection}>
                          <Pressable
                            onPress={() => toggleCategory(group.categoryName)}
                            style={styles.categoryHeader}
                          >
                            <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                              {group.categoryName} ({group.items.length})
                            </ThemedText>
                            <Ionicons
                              name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                              size={18}
                              color={theme.textSecondary}
                            />
                          </Pressable>

                          {!isCollapsed && (
                            <View style={styles.categoryList}>
                              {group.items.map((it) => (
                                <MenuItemRow
                                  key={it._id}
                                  item={it}
                                  addingItemId={addingItemId}
                                  onAdd={handleAddClick}
                                  showRecommendedBadge={Boolean(it.isRecommended)}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Zomato Customize Addons Drawer Modal */}
      <Modal
        visible={customizingItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomizingItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setCustomizingItem(null)} />
          <View style={styles.modalContent}>
            {customizingItem?.images && customizingItem.images[0] ? (
              <Image
                source={{ uri: customizingItem.images[0] }}
                style={styles.modalItemImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.modalItemImage, { backgroundColor: '#f3f3f3', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="fast-food-outline" size={48} color="#cccccc" />
              </View>
            )}

            <View style={styles.modalItemDetails}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FoodTypeBadge type={customizingItem?.foodType} />
                  <ThemedText style={styles.modalItemName}>{customizingItem?.itemName}</ThemedText>
                </View>
                <Pressable onPress={() => setCustomizingItem(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
              {!!customizingItem?.shortDescription && (
                <ThemedText style={styles.modalItemDesc}>{customizingItem.shortDescription}</ThemedText>
              )}
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }}>
              {sizeAddons.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ThemedText style={styles.sectionTitle}>Quantity</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#586062', marginBottom: 12 }}>
                    Required • Select any 1 option
                  </ThemedText>
                  {sizeAddons.map((addon) => {
                    const isSelected = selectedSize === addon.name;
                    const basePrice = customizingItem?.discountedPrice ?? customizingItem?.price ?? 0;
                    const displayPrice = basePrice + addon.price;
                    const displayName = addon.name.replace(/^(Portion|Size):\s*/i, '');
                    return (
                      <Pressable
                        key={addon.name}
                        onPress={() => setSelectedSize(addon.name)}
                        style={styles.addonRow}
                      >
                        <View style={styles.addonInfo}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? theme.primary : theme.textSecondary}
                          />
                          <ThemedText style={styles.addonName}>{displayName}</ThemedText>
                        </View>
                        <ThemedText style={[styles.addonPrice, { color: theme.text }]}>₹{displayPrice}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {extraAddons.length > 0 && (
                <View>
                  <ThemedText style={styles.sectionTitle}>Add Extras (Optional)</ThemedText>
                  {extraAddons.map((addon) => {
                    const isSelected = selectedAddons[addon.name] ?? false;
                    return (
                      <Pressable
                        key={addon.name}
                        onPress={() => toggleAddon(addon.name)}
                        style={styles.addonRow}
                      >
                        <View style={styles.addonInfo}>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? theme.primary : theme.textSecondary}
                          />
                          <ThemedText style={styles.addonName}>{addon.name}</ThemedText>
                        </View>
                        <ThemedText style={styles.addonPrice}>+₹{addon.price}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.qtyContainer}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.qtyBtn}
                >
                  <ThemedText style={styles.qtyBtnText}>-</ThemedText>
                </Pressable>
                <ThemedText style={styles.qtyText}>{quantity}</ThemedText>
                <Pressable
                  onPress={() => setQuantity((q) => q + 1)}
                  style={styles.qtyBtn}
                >
                  <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                </Pressable>
              </View>

              <Pressable
                onPress={handleAddCustomizedToCart}
                style={styles.addCustomBtn}
              >
                <ThemedText style={styles.addCustomBtnText}>
                  Add item - ₹{customizedTotalPrice}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Offers Bottom Sheet Modal */}
      <Modal
        visible={showOffersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOffersModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowOffersModal(false)} />
          <View style={[styles.offersSheet, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.offersHeader}>
              <View>
                <ThemedText style={styles.offersTitle}>Offers & Coupons</ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {couponCount} offer{couponCount !== 1 ? 's' : ''} available
                </ThemedText>
              </View>
              <Pressable onPress={() => setShowOffersModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {coupons.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Ionicons name="pricetag-outline" size={48} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary" style={{ marginTop: 12, textAlign: 'center' }}>
                    No offers available right now
                  </ThemedText>
                </View>
              ) : (
                coupons.map((coupon) => {
                  const discountLabel =
                    coupon.discountType === 'FLAT'
                      ? `₹${coupon.discountValue} OFF`
                      : `${coupon.discountValue}% OFF`;
                  const maxLabel =
                    coupon.discountType === 'PERCENTAGE' && coupon.maximumDiscount
                      ? ` up to ₹${coupon.maximumDiscount}`
                      : '';
                  const expiryDate = new Date(coupon.validTo).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  });

                  return (
                    <View key={coupon._id} style={[styles.couponCard, { borderColor: `${theme.primary}40`, backgroundColor: theme.backgroundElement }]}>
                      {/* Top row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={styles.couponCodeBadge}>
                          <ThemedText style={styles.couponCodeText}>{coupon.couponCode}</ThemedText>
                        </View>
                        <Pressable
                          onPress={() => {
                            Clipboard.setString(coupon.couponCode);
                            toast.success(`Code "${coupon.couponCode}" copied`, 'Copied');
                          }}
                          style={styles.copyBtn}
                        >
                          <Ionicons name="copy-outline" size={14} color={theme.primary} />
                          <ThemedText style={[styles.copyBtnText, { color: theme.primary }]}>COPY</ThemedText>
                        </Pressable>
                      </View>

                      {/* Discount highlight */}
                      <ThemedText style={[styles.couponDiscount, { color: theme.primary }]}>
                        {discountLabel}{maxLabel}
                      </ThemedText>

                      {/* Title & description */}
                      <ThemedText style={[styles.couponTitle, { color: theme.text }]}>
                        {coupon.title}
                      </ThemedText>
                      {!!coupon.description && (
                        <ThemedText themeColor="textSecondary" style={styles.couponDesc}>
                          {coupon.description}
                        </ThemedText>
                      )}

                      {/* Footer */}
                      <View style={styles.couponFooter}>
                        <ThemedText themeColor="textSecondary" style={styles.couponFooterText}>
                          Min. order ₹{coupon.minimumOrderAmount}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.couponFooterText}>
                          Valid till {expiryDate}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FloatingCartBar
        visible={cartCount > 0 && !customizingItem && !showOffersModal}
        itemCount={cartCount}
        total={cartTotal}
        restaurantName={cartRestaurantName}
        onPress={() => router.push('/cart')}
        bottom={cartBottom}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
    gap: 8,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },
  hero: { height: 130, width: '100%' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  restaurantCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  restaurantName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  cuisinesText: {
    fontSize: 13,
    marginTop: 2,
  },
  ratingBox: {
    alignItems: 'flex-end',
  },
  ratingBadge: {
    backgroundColor: '#0f8a5f',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  ratingNumber: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  ratingCount: {
    fontSize: 10,
    color: '#586062',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f3f3',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,90,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 6,
  },
  offerText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#ff5a00',
  },
  reviewsSection: {
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.2)',
  },
  reviewsTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    marginBottom: 10,
  },
  reviewCard: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(228,190,177,0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewRating: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  reviewDate: { fontSize: 11 },
  reviewText: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  filtersScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
    marginRight: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#586062',
  },
  filterDot: {
    width: 6,
    height: 6,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  categoryList: {
    marginTop: 8,
    gap: 16,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    gap: 16,
  },
  itemLeft: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#a0a0a0',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemActionText: {
    fontSize: 11,
    color: '#586062',
  },
  itemRight: {
    width: 112,
    alignItems: 'center',
  },
  addBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: -14,
    paddingBottom: 2,
  },
  dishImage: {
    width: 104,
    height: 104,
    borderRadius: 12,
  },
  noPhotoImage: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor: '#f3f3f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 84,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff5a00',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ff5a00',
    fontSize: 12,
  },
  customisableText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#ff5a00',
    textAlign: 'center',
  },
  badgeContainer: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    padding: 2,
    marginBottom: 2,
  },
  badgeDot: {
    width: 6,
    height: 6,
  },
  errorCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  errorText: { color: '#E5484D' },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { color: '#ff5a00', fontFamily: 'PlusJakartaSans_700Bold' },

  // Customize Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#1a1c1c',
  },
  modalBody: {
    padding: 16,
    maxHeight: 280,
  },
  modalItemImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalItemDetails: {
    padding: 16,
    gap: 4,
  },
  modalItemName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#1a1c1c',
  },
  modalItemDesc: {
    fontSize: 12,
    color: '#586062',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1a1c1c',
    marginTop: 12,
    marginBottom: 8,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  addonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addonName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#1a1c1c',
  },
  addonPrice: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#ff5a00',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
    backgroundColor: '#ffffff',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  qtyBtn: {
    paddingHorizontal: 6,
  },
  qtyBtnText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#ff5a00',
  },
  qtyText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1a1c1c',
  },
  addCustomBtn: {
    backgroundColor: '#ff5a00',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 16,
    alignItems: 'center',
  },
  addCustomBtnText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  combosScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  comboCard: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginRight: 12,
    overflow: 'hidden',
  },
  comboImageContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  comboImage: {
    width: '100%',
    height: '100%',
  },
  comboTagBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comboTagBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  comboDetails: {
    padding: 10,
    gap: 6,
  },
  comboTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    flex: 1,
  },
  comboFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  comboPrice: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#1a1c1c',
  },
  comboAddBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff5a00',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  comboAddBtnText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ff5a00',
  },

  // Offers Bottom Sheet
  offersSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  offersTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },

  // Coupon Card
  couponCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderStyle: 'dashed',
  },
  couponCodeBadge: {
    backgroundColor: 'rgba(255,90,0,0.1)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  couponCodeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ff5a00',
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff5a00',
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  couponDiscount: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  couponTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  couponDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
  },
  couponFooterText: {
    fontSize: 11,
  },
});

