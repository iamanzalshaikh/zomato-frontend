import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Share,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Blinkit, CaseUi } from '@/constants/caseUi';
import { type MenuItem, type ComboItem } from '@/services/menu';
import { type Coupon } from '@/services/coupons';
import { useTheme } from '@/hooks/use-theme';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { useStorePageQuery } from '@/hooks/queries/restaurants';
import { FavoriteHeart } from '@/components/favorite-heart';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { StoreDetailSkeleton } from '@/components/skeleton';
import { useCart } from '@/hooks/use-cart';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { toast } from '@/lib/toast';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';
import { useThemeContext } from '@/context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const MenuItemRow = memo(function MenuItemRow({
  item,
  addingItemId,
  onAdd,
  onPress,
  showRecommendedBadge,
}: {
  item: MenuItem;
  addingItemId: string | null;
  onAdd: (item: MenuItem) => void;
  onPress?: (item: MenuItem) => void;
  showRecommendedBadge?: boolean;
}) {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const busy = addingItemId === item._id;
  const hasAddons = Boolean(item.addons?.length);
  const isOutOfStock = item.isAvailable === false;

  const calories = useMemo(() => Math.floor((item.price * 0.7) % 350) + 180, [item._id]);
  const spiceRating = useMemo(() => (item.itemName.toLowerCase().includes('spicy') || item.itemName.toLowerCase().includes('bbq') ? 2 : 0), [item.itemName]);
  const starsCount = useMemo(() => Number(4 + (Number(item._id.charCodeAt(0) % 10) / 10)).toFixed(1), [item._id]);

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.menuCard,
        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#2D2D34' : '#F0F0F0' },
        isOutOfStock && { opacity: 0.55 },
        pressed && { opacity: 0.88 },
      ]}
    >
      {/* Left: Compact thumbnail */}
      <View style={styles.menuCardLeft}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.menuCardImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.menuCardImg, styles.noPhotoImageContainer, { backgroundColor: isDark ? '#2D2D34' : '#F3F4F6' }]}>
            <Ionicons name="fast-food-outline" size={22} color={isDark ? '#4E4E52' : '#cccccc'} />
          </View>
        )}
      </View>

      {/* Center: Info details */}
      <View style={styles.menuCardRight}>
        <View style={styles.badgeRow}>
          <FoodTypeBadge type={item.foodType} />
          {(showRecommendedBadge || item.isRecommended) && (
            <View style={styles.popularCardBadge}>
              <ThemedText style={styles.popularCardBadgeText}>Popular</ThemedText>
            </View>
          )}
          {spiceRating > 0 && (
            <View style={styles.spicyBadge}>
              <ThemedText style={styles.spicyBadgeText}>🌶️ Spicy</ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={[styles.menuCardName, { color: colors.text }]} numberOfLines={2}>
          {item.itemName}
        </ThemedText>

        <View style={styles.metaRatingRow}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <ThemedText style={[styles.metaRatingText, { color: colors.text }]}>{starsCount}</ThemedText>
          <View style={styles.metaDotDivider} />
          <ThemedText style={[styles.metaCaloriesText, { color: colors.textSecondary }]}>{calories} kcal</ThemedText>
        </View>

        {!!item.shortDescription && (
          <ThemedText themeColor="textSecondary" style={styles.menuCardDesc} numberOfLines={1}>
            {item.shortDescription}
          </ThemedText>
        )}

        <View style={styles.menuCardPriceRow}>
          <ThemedText style={[styles.menuCardPrice, { color: colors.text }]}>J${item.discountedPrice ?? item.price}</ThemedText>
          {!!item.discountedPrice && (
            <ThemedText style={styles.menuCardOriginalPrice}>J${item.price}</ThemedText>
          )}
        </View>
      </View>

      {/* Right: ADD / Notify button — separate tap area so it doesn't trigger card navigation */}
      <View style={styles.menuCardAddArea}>
        {isOutOfStock ? (
          <Pressable
            style={styles.notifyBtn}
            onPress={(e) => { e.stopPropagation?.(); toast.success("We'll notify you once available!", 'Alert Set'); }}
          >
            <Ionicons name="notifications-outline" size={12} color={CaseUi.orange} />
          </Pressable>
        ) : (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onAdd(item); }}
            style={[styles.menuCardAddCircle, busy && { opacity: 0.7 }]}
            disabled={busy}
            hitSlop={6}
          >
            {busy ? (
              <ActivityIndicator size="small" color={CaseUi.orange} />
            ) : (
              <Ionicons name="add" size={20} color={CaseUi.orange} />
            )}
          </Pressable>
        )}
        {hasAddons && !isOutOfStock && (
          <ThemedText style={styles.menuCardCustomisable}>cust.</ThemedText>
        )}
      </View>
    </Pressable>
  );
});

export default function RestaurantDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const add = useAddToCartMutation();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const rid = restaurantId ?? '';

  // ── Single consolidated API call replacing 7 separate queries ──────────────
  const storePageQ = useStorePageQuery(rid);
  const storeData = storePageQ.data;

  const restaurantLoading = storePageQ.isLoading && !storeData;
  const restaurant: any = storeData?.restaurant ?? null;
  const { colors: themeColors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const businessType = restaurant?.businessType?.toUpperCase() || 'RESTAURANT';
  const isRestaurant = businessType === 'RESTAURANT';
  const items = useMemo(() => (storeData?.menu?.items ?? []) as MenuItem[], [storeData]);
  const combosData = useMemo(() => (storeData?.combos ?? []) as ComboItem[], [storeData]);
  const coupons: Coupon[] = useMemo(() => (storeData?.coupons ?? []) as Coupon[], [storeData]);
  const reviews = useMemo(() => (storeData?.reviews ?? []), [storeData]);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const couponCount: number = coupons.length;
  const error = (storePageQ.error as any)?.message ?? null;
  const { cart } = useCart();
  const cartCount = getCartItemCount(cart);
  const cartTotal = getCartDisplayTotal(cart);
  const cartRestaurantName = getCartRestaurantName(cart) ?? restaurant?.restaurantName;
  const cartBottom = useFloatingCartBottom();
  const scrollBottomPadding = useFloatingCartScrollPadding(cartCount > 0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuCat, setActiveMenuCat] = useState<string>('All');
  const [selectedFoodType, setSelectedFoodType] = useState<string | null>(null);
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [priceUnder500, setPriceUnder500] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Customize / Addon State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Accordion details bottom sheet state
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Auto-scrolling Banner Carousel ref & state
  const bannerScrollRef = useRef<ScrollView>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // In-memory Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = it.itemName.toLowerCase().includes(query);
        const matchesDesc = it.shortDescription?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }
      if (selectedFoodType) {
        if (it.foodType !== selectedFoodType) return false;
      }
      if (showRecommendedOnly) {
        if (!it.isRecommended) return false;
      }
      if (priceUnder500) {
        const priceVal = it.discountedPrice ?? it.price;
        if (priceVal >= 500) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedFoodType, showRecommendedOnly, priceUnder500]);

  // Recommended Items Filter
  const recommendedItems = useMemo(() => {
    return filteredItems.filter((it) => it.isRecommended);
  }, [filteredItems]);

  // Combos (Most Ordered Together) filtered by selected food type
  const mostOrderedTogether = useMemo(() => {
    return combosData.filter((combo) => {
      if (selectedFoodType && combo.foodType !== selectedFoodType) return false;
      return true;
    });
  }, [combosData, selectedFoodType]);

  // categoryId map
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (storeData?.menu?.categories ?? []).forEach((c: any) => {
      map[c.id] = c.name;
    });
    return map;
  }, [storeData]);

  // Group by Category
  const groupedItems = useMemo(() => {
    const groups: Record<string, { categoryName: string; items: MenuItem[] }> = {};
    filteredItems.forEach((it) => {
      const rawCategory = (it as any).categoryId;
      const catName =
        rawCategory?.categoryName ?? categoryNameMap[String(rawCategory ?? '')] ?? 'Menu';
      if (!groups[catName]) {
        groups[catName] = {
          categoryName: catName,
          items: [],
        };
      }
      groups[catName].items.push(it);
    });
    return Object.values(groups);
  }, [filteredItems, categoryNameMap]);

  const categoriesList = useMemo(() => {
    const names = groupedItems.map((g) => g.categoryName);
    return ['All', ...names];
  }, [groupedItems]);

  const categoriesToRender = useMemo(() => {
    const names = groupedItems.map((g) => g.categoryName);
    if (activeMenuCat === 'All' || !names.includes(activeMenuCat)) {
      return groupedItems;
    }
    return groupedItems.filter((g) => g.categoryName === activeMenuCat);
  }, [groupedItems, activeMenuCat]);

  // Carousel offer list
  const offersList = useMemo(() => {
    const base = [
      { discountType: 'PERCENTAGE', discountValue: 20, couponCode: 'KING20', title: '🎉 Flat 20% OFF', description: 'On orders above JMD 1,000' },
      { discountType: 'FLAT', discountValue: 120, couponCode: 'FREED25', title: '🚚 Free Delivery', description: 'On orders above JMD 2,500' },
      { discountType: 'PERCENTAGE', discountValue: 10, couponCode: 'STUDENT10', title: '🎓 Student Discount', description: 'Extra 10% OFF all orders' },
    ];
    if (coupons.length > 0) {
      return coupons.map((c, i) => ({
        discountType: c.discountType,
        discountValue: c.discountValue,
        couponCode: c.couponCode,
        title: c.title,
        description: c.description || 'Offers apply directly',
      }));
    }
    return base;
  }, [coupons]);

  useEffect(() => {
    if (offersList.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % offersList.length;
        bannerScrollRef.current?.scrollTo({ x: next * 272, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [offersList]);

  // Share store link utility
  const handleShareStore = async () => {
    try {
      await Share.share({
        message: `Order delicious food from ${restaurant?.restaurantName || 'CASE Store'} on CASE Delivery app!`,
      });
    } catch (e) {
      // ignore
    }
  };

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
      setSpecialInstructions('');

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
          addonsPayload.push({ name: selectedSize, price: matched.price });
        }
      }

      Object.keys(selectedAddons)
        .filter((name) => selectedAddons[name])
        .forEach((name) => {
          const matched = customizingItem.addons?.find((ad: any) => ad.name === name);
          if (matched) {
            addonsPayload.push({ name, price: matched.price });
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

  const isCategoryCollapsed = (catName: string) => collapsedCategories[catName] ?? false;

  const toggleCategory = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !(prev[catName] ?? false),
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
    return (Number(basePrice) + addonsPrice) * quantity;
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

  // Similar Stores nearby
  const similarStores = useMemo(() => {
    const list = storeData?.recommendedRestaurants ?? [];
    return list.filter((r: any) => r.id !== rid).slice(0, 4);
  }, [storeData, rid]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {restaurantLoading ? (
        <StoreDetailSkeleton />
      ) : error ? (
        <ThemedView type="backgroundElement" style={[styles.errorCard, { margin: Spacing.three, marginTop: Math.max(insets.top, 12) + 60 }]}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={() => void Promise.all([restaurantQ.refetch(), menuQ.refetch()])} style={styles.retryBtn}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </ThemedView>
      ) : (
        <View style={styles.mainContainer}>
          <ScrollView
            stickyHeaderIndices={[5]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding + 20 }}
          >
            {/* 1. Hero Header (40% Screen Height) */}
            <View style={styles.heroSection}>
              {restaurant?.galleryImages?.[0] || restaurant?.thumbnail || restaurant?.bannerImages?.[0] || restaurant?.logo ? (
                <Image source={{ uri: restaurant.galleryImages?.[0] ?? restaurant.thumbnail ?? restaurant.bannerImages?.[0] ?? restaurant.logo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.heroPlaceholderContainer]}>
                  <Ionicons name="storefront-outline" size={54} color={CaseUi.muted} />
                </View>
              )}
              <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

              {/* Floating safe navigation row */}
              <View style={[styles.heroActionsRow, { top: Math.max(insets.top, 10) }]}>
                <Pressable onPress={() => router.back()} style={styles.heroCircleBtn} hitSlop={12}>
                  <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <View style={styles.heroActionsRight}>
                  <FavoriteHeart restaurantId={rid} variant="header" size={22} />
                  <Pressable onPress={() => setShowAboutModal(true)} style={styles.heroCircleBtn} hitSlop={12}>
                    <Ionicons name="ellipsis-vertical-outline" size={22} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* Floating Store Card overlapping banner bottom */}
              <View style={styles.floatingCardContainer}>
                <View style={[styles.floatingStoreCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                  <View style={styles.storeCardTop}>
                    {restaurant?.thumbnail || restaurant?.logo ? (
                      <Image source={{ uri: restaurant.thumbnail ?? restaurant.logo }} style={styles.storeCardLogo} contentFit="contain" />
                    ) : (
                      <View style={[styles.storeCardLogo, { backgroundColor: isDark ? '#2C2C32' : '#F4F4F5', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="storefront" size={20} color={CaseUi.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.storeTitleWrapper}>
                        <ThemedText style={[styles.storeTitleText, { color: theme.text }]} numberOfLines={1}>
                          {restaurant?.restaurantName}
                        </ThemedText>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <ThemedText style={styles.verifiedPartnerText}>Verified Partner</ThemedText>
                      </View>

                      <View style={styles.storeRatingSub}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <ThemedText style={[styles.storeRatingVal, { color: theme.text }]}>
                          {Number(restaurant?.averageRating ?? 0).toFixed(1)}{' '}
                          <ThemedText style={{ color: theme.textSecondary, fontFamily: 'PlusJakartaSans_500Medium' }}>
                            ({restaurant?.totalRatings ?? 0} reviews)
                          </ThemedText>
                        </ThemedText>
                      </View>

                      <View style={styles.storeStatusHours}>
                        <View style={[styles.statusDot, { backgroundColor: restaurant?.isOpen === false ? '#EF4444' : '#10B981' }]} />
                        <ThemedText style={{ fontSize: 12, color: restaurant?.isOpen === false ? '#EF4444' : '#10B981', fontFamily: 'PlusJakartaSans_700Bold' }}>
                          {restaurant?.isOpen === false ? 'Closed' : `Open until ${restaurant?.closingTime || '11:00 PM'}`}
                        </ThemedText>
                        <Pressable onPress={() => router.push(`tel:${restaurant?.phone || '876'}`)} style={styles.callIconBtn}>
                          <Ionicons name="call" size={13} color={CaseUi.orange} />
                          <ThemedText style={{ color: CaseUi.orange, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>Call</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Spacer to support the overlapping store card */}
            <View style={{ height: 42 }} />

            {/* 2. Premium Info Chips Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsPillScroll}>
              <View style={[styles.metricPill, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <ThemedText style={[styles.metricPillText, { color: theme.text }]}>{Number(restaurant?.averageRating ?? 0).toFixed(1)} (2.4k)</ThemedText>
              </View>
              <View style={[styles.metricPill, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="time" size={13} color={CaseUi.orange} />
                <ThemedText style={[styles.metricPillText, { color: theme.text }]}>{restaurant?.averageDeliveryTime ?? 25} mins</ThemedText>
              </View>
              <View style={[styles.metricPill, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="bicycle" size={13} color="#10B981" />
                <ThemedText style={[styles.metricPillText, { color: theme.text }]}>JMD 120</ThemedText>
              </View>
              <View style={[styles.metricPill, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="cart" size={13} color="#6F6F6F" />
                <ThemedText style={[styles.metricPillText, { color: theme.text }]}>Min JMD {restaurant?.minimumOrderAmount ?? 500}</ThemedText>
              </View>
              <View style={[styles.metricPill, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="location" size={13} color="#6F6F6F" />
                <ThemedText style={[styles.metricPillText, { color: theme.text }]}>2.3 km</ThemedText>
              </View>
            </ScrollView>

            {/* 3. Store Highlight badges */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsScroll}>
              <View style={[styles.highlightPill, { backgroundColor: isDark ? 'rgba(255,90,0,0.1)' : 'rgba(255,90,0,0.05)', borderColor: isDark ? '#4A2A1A' : '#FFEBE0' }]}>
                <ThemedText style={{ color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>🏆 Best Seller</ThemedText>
              </View>
              <View style={[styles.highlightPill, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)', borderColor: isDark ? '#1C4A3A' : '#E6FBEF' }]}>
                <ThemedText style={{ color: '#10B981', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>🚚 Free Delivery</ThemedText>
              </View>
              <View style={[styles.highlightPill, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)', borderColor: isDark ? '#1A334E' : '#EBF5FF' }]}>
                <ThemedText style={{ color: '#3B82F6', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>🎓 Campus Fav</ThemedText>
              </View>
              <View style={[styles.highlightPill, { backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)', borderColor: isDark ? '#3D1C4A' : '#F5E6FF' }]}>
                <ThemedText style={{ color: '#8B5CF6', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>⚡ Fast Delivery</ThemedText>
              </View>
            </ScrollView>

            {/* 4. Offer Slider Carousel */}
            <View style={styles.offerCarouselContainer}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  setCarouselIndex(Math.round(x / 272));
                }}
                scrollEventThrottle={16}
              >
                {offersList.map((off, idx) => (
                  <View key={idx} style={[styles.offerCardItem, { backgroundColor: isDark ? '#2D201A' : '#FFF5EE', borderColor: isDark ? '#5C3826' : '#FFE0CC' }]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <ThemedText style={[styles.offerTitleText, { color: isDark ? '#FF9F64' : '#E05A10' }]}>{off.title}</ThemedText>
                      <ThemedText style={[styles.offerDescText, { color: isDark ? '#D1A38C' : '#8A583C' }]}>{off.description}</ThemedText>
                      <Pressable onPress={() => { Clipboard.setString(off.couponCode); toast.success(`Code ${off.couponCode} copied`, 'Coupon Copied'); }} style={styles.offerCardApply}>
                        <ThemedText style={{ color: CaseUi.orange, fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>Apply Coupon: {off.couponCode} ›</ThemedText>
                      </Pressable>
                    </View>
                    <View style={[styles.percentBadge, { backgroundColor: CaseUi.orange }]}>
                      <Ionicons name="pricetag" size={16} color="#FFF" />
                    </View>
                  </View>
                ))}
              </ScrollView>
              {/* Pagination Dots */}
              {offersList.length > 1 && (
                <View style={styles.carouselIndicatorRow}>
                  {offersList.map((_, i) => (
                    <View key={i} style={[styles.carouselDotIndicator, { backgroundColor: i === carouselIndex ? CaseUi.orange : '#E4E4E7', width: i === carouselIndex ? 16 : 6 }]} />
                  ))}
                </View>
              )}

              {/* Dynamic floating offers counts badge */}
              <Pressable onPress={() => setShowOffersModal(true)} style={styles.floatingOffersFAB}>
                <Ionicons name="pricetag" size={14} color="#FFF" />
                <ThemedText style={styles.floatingOffersFABText}>{offersList.length} Offers</ThemedText>
              </Pressable>
            </View>

            {/* 5. Sticky Search Area */}
            <View style={[styles.stickySearchAreaContainer, { backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? '#27272A' : '#E4E4E7' }]}>
              <View style={[styles.inStoreSearchBox, { backgroundColor: isDark ? '#18181C' : '#F5F5F7', borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                <Ionicons name="search" size={18} color="#6F6F6F" />
                <TextInput
                  style={[styles.searchTextInput, { color: theme.text }]}
                  placeholder={`Search in ${restaurant?.restaurantName || 'Store'}...`}
                  placeholderTextColor={isDark ? '#8E8E93' : '#6C757D'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Ionicons name="mic-outline" size={18} color={CaseUi.orange} />
              </View>
            </View>

            {/* 6. Sticky Category Filters Header */}
            <View style={[styles.stickyFiltersBar, { backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? '#27272A' : '#E4E4E7' }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickyFilterScroll}>
                <Pressable
                  onPress={() => { setSelectedFoodType(null); setShowRecommendedOnly(false); setPriceUnder500(false); }}
                  style={[styles.filterLabelChip, !selectedFoodType && !showRecommendedOnly && !priceUnder500 && styles.filterLabelChipActive]}
                >
                  <ThemedText style={[styles.filterLabelText, !selectedFoodType && !showRecommendedOnly && !priceUnder500 && styles.filterLabelTextActive, { color: theme.text }]}>All</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setShowRecommendedOnly(!showRecommendedOnly)}
                  style={[styles.filterLabelChip, showRecommendedOnly && styles.filterLabelChipActive]}
                >
                  <ThemedText style={[styles.filterLabelText, showRecommendedOnly && styles.filterLabelTextActive, { color: theme.text }]}>Popular</ThemedText>
                </Pressable>
                {isRestaurant && (
                  <>
                    <Pressable
                      onPress={() => setSelectedFoodType(selectedFoodType === 'veg' ? null : 'veg')}
                      style={[styles.filterLabelChip, selectedFoodType === 'veg' && styles.filterLabelChipActive]}
                    >
                      <ThemedText style={[styles.filterLabelText, selectedFoodType === 'veg' && styles.filterLabelTextActive, { color: theme.text }]}>Veg</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedFoodType(selectedFoodType === 'egg' ? null : 'egg')}
                      style={[styles.filterLabelChip, selectedFoodType === 'egg' && styles.filterLabelChipActive]}
                    >
                      <ThemedText style={[styles.filterLabelText, selectedFoodType === 'egg' && styles.filterLabelTextActive, { color: theme.text }]}>Egg</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedFoodType(selectedFoodType === 'nonveg' ? null : 'nonveg')}
                      style={[styles.filterLabelChip, selectedFoodType === 'nonveg' && styles.filterLabelChipActive]}
                    >
                      <ThemedText style={[styles.filterLabelText, selectedFoodType === 'nonveg' && styles.filterLabelTextActive, { color: theme.text }]}>Non Veg</ThemedText>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => setPriceUnder500(!priceUnder500)}
                  style={[styles.filterLabelChip, priceUnder500 && styles.filterLabelChipActive]}
                >
                  <ThemedText style={[styles.filterLabelText, priceUnder500 && styles.filterLabelTextActive, { color: theme.text }]}>Under JMD 500</ThemedText>
                </Pressable>
              </ScrollView>

              {/* Category tabs scroll */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsMenuScroll}>
                {categoriesList.map((catName) => {
                  const isActive = activeMenuCat === catName;
                  return (
                    <Pressable
                      key={catName}
                      onPress={() => setActiveMenuCat(catName)}
                      style={[styles.tabBtnMenu, isActive && styles.tabBtnMenuActive]}
                    >
                      <ThemedText style={[styles.tabBtnMenuText, isActive && styles.tabBtnMenuTextActive, { color: theme.textSecondary }]}>
                        {catName}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 7. Featured sections (Scroll carousels before main menu list) */}
            {activeMenuCat === 'All' && !searchQuery && (
              <View style={{ backgroundColor: theme.background }}>
                {/* Section A: Recommended / Featured for you */}
                {recommendedItems.length > 0 && (
                  <View style={styles.featuredContainer}>
                    <View style={styles.featuredHeaderRow}>
                      <ThemedText style={[styles.featuredTitleText, { color: theme.text }]}>⭐ Recommended</ThemedText>
                      <Pressable onPress={() => setActiveMenuCat(categoriesList[1] || 'All')}>
                        <ThemedText style={{ color: CaseUi.orange, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' }}>See all</ThemedText>
                      </Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScrollContent}>
                      {recommendedItems.slice(0, 8).map((it) => (
                        <Pressable
                          key={it._id}
                          style={[styles.featuredProductCard, { backgroundColor: theme.backgroundElement }]}
                          onPress={() => router.push({ pathname: '/product-detail', params: { restaurantId: rid, itemId: it._id } })}
                        >
                          <Image source={{ uri: it.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200' }} style={styles.featuredProductImg} contentFit="cover" />
                          <View style={styles.featuredProductDetails}>
                            <ThemedText style={[styles.featuredProductName, { color: theme.text }]} numberOfLines={1}>{it.itemName}</ThemedText>
                            <View style={styles.featuredProductFooter}>
                              <ThemedText style={[styles.featuredProductPrice, { color: theme.text }]}>J${it.discountedPrice ?? it.price}</ThemedText>
                              <Pressable onPress={() => handleAddClick(it)} style={[styles.featuredAddBtn, { backgroundColor: CaseUi.orange }]}>
                                <Ionicons name="add" size={14} color="#FFF" />
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Section B: Best Sellers horizontal list */}
                {filteredItems.length > 2 && (
                  <View style={styles.featuredContainer}>
                    <View style={styles.featuredHeaderRow}>
                      <ThemedText style={[styles.featuredTitleText, { color: theme.text }]}>🔥 Best Sellers</ThemedText>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScrollContent}>
                      {filteredItems.slice(0, 6).map((it) => (
                        <Pressable
                          key={it._id}
                          style={[styles.bestSellerCompactCard, { backgroundColor: theme.backgroundElement }]}
                          onPress={() => handleAddClick(it)}
                        >
                          <Image source={{ uri: it.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200' }} style={styles.bestSellerImg} contentFit="cover" />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.bestSellerName, { color: theme.text }]} numberOfLines={1}>{it.itemName}</ThemedText>
                            <ThemedText style={[styles.bestSellerPrice, { color: theme.text }]}>J${it.price}</ThemedText>
                          </View>
                          <Ionicons name="add-circle" size={24} color={CaseUi.orange} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Section C: Combo Deals */}
                {mostOrderedTogether.length > 0 && (
                  <View style={styles.featuredContainer}>
                    <View style={styles.featuredHeaderRow}>
                      <ThemedText style={[styles.featuredTitleText, { color: theme.text }]}>🎁 Combo Deals</ThemedText>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScrollContent}>
                      {mostOrderedTogether.map((combo) => (
                        <View key={combo.id} style={[styles.comboDealCard, { backgroundColor: theme.backgroundElement }]}>
                          <Image source={{ uri: combo.image }} style={styles.comboDealImg} contentFit="cover" />
                          <View style={styles.comboDealDetails}>
                            <ThemedText style={[styles.comboDealTitle, { color: theme.text }]} numberOfLines={1}>{combo.title}</ThemedText>
                            <View style={styles.comboDealFooter}>
                              <ThemedText style={[styles.comboDealPrice, { color: theme.text }]}>J${combo.price}</ThemedText>
                              <Pressable onPress={() => combo.mainItem && handleAddClick(combo.mainItem)} style={styles.comboDealAddBtn}>
                                <ThemedText style={styles.comboDealAddBtnText}>ADD</ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* 8. Full Menu Categorized Cards Area */}
            <View style={[styles.menuListSheet, { backgroundColor: theme.background, paddingTop: 10 }]}>
              {restaurantLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : null}

              {/* Empty Search Illustration */}
              {filteredItems.length === 0 && !restaurantLoading ? (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search-outline" size={64} color={CaseUi.muted} />
                  <ThemedText style={[styles.emptySearchTitle, { color: theme.text }]}>No products found</ThemedText>
                  <ThemedText style={styles.emptySearchSub}>Try searching with another keyword or resetting filters.</ThemedText>
                </View>
              ) : (
                categoriesToRender.map((group) => {
                  const isAllTab = activeMenuCat === 'All';
                  const isCollapsed = !isAllTab ? false : isCategoryCollapsed(group.categoryName);
                  return (
                    <View key={group.categoryName} style={styles.categorySection}>
                      <Pressable onPress={() => isAllTab && toggleCategory(group.categoryName)} style={styles.categoryHeader}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.categoryTitleText, { color: theme.text }]}>
                            {group.categoryName} ({group.items.length})
                          </ThemedText>
                        </View>
                        {isAllTab && <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={theme.textSecondary} />}
                      </Pressable>
                      {!isCollapsed && (
                        <View style={styles.categoryList}>
                          {group.items.map((it) => (
                            <MenuItemRow
                              key={it._id}
                              item={it}
                              addingItemId={addingItemId}
                              onAdd={handleAddClick}
                              onPress={(item) => router.push({ pathname: '/product-detail', params: { restaurantId: rid, itemId: item._id } })}
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

            {/* 9. Customer Reviews Panel */}
            {reviews.length > 0 && (
              <View style={[styles.reviewsPanelContainer, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.reviewsPanelHeader}>
                  <View>
                    <ThemedText style={[styles.reviewsPanelTitle, { color: theme.text }]}>Customer Reviews</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{reviews.length} total reviews verified</ThemedText>
                  </View>
                  <Pressable onPress={() => {}} style={styles.seeAllReviewsBtn}>
                    <ThemedText style={{ color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>See All ›</ThemedText>
                  </Pressable>
                </View>

                {/* Rating score and chart preview */}
                <View style={styles.scoreRowContainer}>
                  <View style={styles.scoreLargeColumn}>
                    <ThemedText style={[styles.scoreLargeNumber, { color: theme.text }]}>{Number(restaurant?.averageRating ?? 0).toFixed(1)}</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 2, marginVertical: 4 }}>
                      {[1,2,3,4,5].map(st => (
                        <Ionicons key={st} name="star" size={13} color="#F59E0B" />
                      ))}
                    </View>
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>Store Average</ThemedText>
                  </View>
                  <View style={styles.scoreBarsColumn}>
                    {[5,4,3,2,1].map((st) => {
                      const widths: Record<number, string> = { 5: '80%', 4: '15%', 3: '3%', 2: '1%', 1: '1%' };
                      return (
                        <View key={st} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 1.5 }}>
                          <ThemedText style={{ fontSize: 10, color: theme.textSecondary, width: 8 }}>{st}</ThemedText>
                          <View style={styles.scoreBarBg}>
                            <View style={[styles.scoreBarFill, { width: widths[st] as any, backgroundColor: CaseUi.orange }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Top 3 Reviews */}
                <View style={{ marginTop: 12 }}>
                  {reviews.slice(0, 3).map((rev: any, idx: number) => (
                    <View key={idx} style={[styles.reviewRowItem, { borderBottomColor: isDark ? '#2D2D34' : '#F4F4F5' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.reviewAvatarPill, { backgroundColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                          <ThemedText style={{ color: theme.text, fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{rev.userName?.charAt(0) || 'U'}</ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: theme.text }}>{rev.userName || 'User'}</ThemedText>
                          <View style={{ flexDirection: 'row', gap: 1, marginTop: 2 }}>
                            {[1,2,3,4,5].map(st => (
                              <Ionicons key={st} name="star" size={10} color={st <= rev.rating ? '#F59E0B' : '#E4E4E7'} />
                            ))}
                          </View>
                        </View>
                        <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>1 week ago</ThemedText>
                      </View>
                      {!!rev.review && <ThemedText style={{ fontSize: 12, color: theme.text, marginTop: 6, lineHeight: 16 }}>{rev.review}</ThemedText>}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 10. Store Information Accordion */}
            <View style={styles.accordionContainer}>
              <Pressable onPress={() => setShowAboutModal(true)} style={[styles.accordionRowBtn, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="information-circle-outline" size={20} color={CaseUi.orange} />
                <ThemedText style={[styles.accordionRowText, { color: theme.text }]}>About & Policies</ThemedText>
                <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
              </Pressable>
              <Pressable onPress={() => setShowAboutModal(true)} style={[styles.accordionRowBtn, { backgroundColor: theme.backgroundElement, marginTop: 8 }]}>
                <Ionicons name="time-outline" size={20} color={CaseUi.orange} />
                <ThemedText style={[styles.accordionRowText, { color: theme.text }]}>Opening Hours</ThemedText>
                <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
              </Pressable>
            </View>

            {/* 11. Similar Stores / You may also like */}
            {similarStores.length > 0 && (
              <View style={styles.similarStoresContainer}>
                <ThemedText style={[styles.similarStoresTitle, { color: theme.text }]}>You may also like</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {similarStores.map((storeItem: any) => (
                    <Pressable
                      key={storeItem.id}
                      style={[styles.similarStoreCard, { backgroundColor: theme.backgroundElement }]}
                      onPress={() => router.push(`/restaurant/${storeItem.id}`)}
                    >
                      <Image source={{ uri: storeItem.bannerImages?.[0] || storeItem.logo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200' }} style={styles.similarStoreImg} contentFit="cover" />
                      <View style={styles.similarStoreDetails}>
                        <ThemedText style={[styles.similarStoreName, { color: theme.text }]} numberOfLines={1}>{storeItem.restaurantName}</ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <ThemedText style={{ fontSize: 11, color: theme.text, fontFamily: 'PlusJakartaSans_700Bold' }}>{Number(storeItem.averageRating || 0).toFixed(1)}</ThemedText>
                          <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>· {storeItem.averageDeliveryTime || 25} mins</ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 12. Recently Viewed Stores */}
            <View style={styles.similarStoresContainer}>
              <ThemedText style={[styles.similarStoresTitle, { color: theme.text }]}>Recently Viewed</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {[
                  { id: '1', name: "Domino's Pizza", logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200', rating: '4.6' },
                  { id: '2', name: 'Healthy Place', logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200', rating: '4.5' },
                  { id: '3', name: 'MedPlus Pharmacy', logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200', rating: '4.7' },
                ].map((item) => (
                  <View key={item.id} style={[styles.similarStoreCard, { backgroundColor: theme.backgroundElement, width: 140 }]}>
                    <Image source={{ uri: item.logo }} style={styles.similarStoreImg} contentFit="cover" />
                    <View style={styles.similarStoreDetails}>
                      <ThemedText style={[styles.similarStoreName, { color: theme.text }]} numberOfLines={1}>{item.name}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <ThemedText style={{ fontSize: 11, color: theme.text, fontFamily: 'PlusJakartaSans_700Bold' }}>{item.rating}</ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

          </ScrollView>
        </View>
      )}

      {/* Customize Add-ons Bottom Sheet */}
      <Modal visible={customizingItem !== null} transparent animationType="slide" onRequestClose={() => setCustomizingItem(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setCustomizingItem(null)} />
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            {customizingItem?.images && customizingItem.images[0] ? (
              <Image source={{ uri: customizingItem.images[0] }} style={styles.modalItemImage} resizeMode="cover" />
            ) : (
              <View style={[styles.modalItemImage, { backgroundColor: isDark ? '#2C2C32' : '#f3f3f3', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="fast-food-outline" size={48} color={isDark ? '#586062' : '#cccccc'} />
              </View>
            )}

            <View style={styles.modalItemDetails}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FoodTypeBadge type={customizingItem?.foodType} />
                  <ThemedText style={[styles.modalItemName, { color: theme.text }]}>{customizingItem?.itemName}</ThemedText>
                </View>
                <Pressable onPress={() => setCustomizingItem(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
              <ThemedText style={styles.modalCaloriesBadge}>🔥 450 kcal · Premium Quality</ThemedText>
              {!!customizingItem?.shortDescription && <ThemedText style={styles.modalItemDesc}>{customizingItem.shortDescription}</ThemedText>}
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
              {sizeAddons.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Choose Portion Size (Required)</ThemedText>
                  {sizeAddons.map((addon) => {
                    const isSelected = selectedSize === addon.name;
                    const basePrice = customizingItem?.discountedPrice ?? customizingItem?.price ?? 0;
                    const displayPrice = Number(basePrice) + addon.price;
                    const displayName = addon.name.replace(/^(Portion|Size):\s*/i, '');
                    return (
                      <Pressable key={addon.name} onPress={() => setSelectedSize(addon.name)} style={styles.addonRow}>
                        <View style={styles.addonInfo}>
                          <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
                          <ThemedText style={[styles.addonName, { color: theme.text }]}>{displayName}</ThemedText>
                        </View>
                        <ThemedText style={[styles.addonPrice, { color: theme.text }]}>J${displayPrice}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {extraAddons.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Add Extras (Optional)</ThemedText>
                  {extraAddons.map((addon) => {
                    const isSelected = selectedAddons[addon.name] ?? false;
                    return (
                      <Pressable key={addon.name} onPress={() => toggleAddon(addon.name)} style={styles.addonRow}>
                        <View style={styles.addonInfo}>
                          <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
                          <ThemedText style={[styles.addonName, { color: theme.text }]}>{addon.name}</ThemedText>
                        </View>
                        <ThemedText style={[styles.addonPrice, { color: theme.text }]}>+J${addon.price}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View>
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Special Instructions (Optional)</ThemedText>
                <TextInput
                  style={[styles.specialInstructionsInput, { color: theme.text, borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}
                  placeholder="E.g., No onions, extra mayo, cheese melted..."
                  placeholderTextColor={isDark ? '#6F6F6F' : '#a0a0a0'}
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                  multiline
                  maxLength={120}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: theme.backgroundElement, borderTopColor: isDark ? '#2C2C32' : '#F4F4F5', paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={[styles.qtyContainer, { borderColor: isDark ? '#2C2C32' : '#E4E4E7', backgroundColor: isDark ? '#18181C' : '#FFFFFF' }]}>
                <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
                  <ThemedText style={[styles.qtyBtnText, { color: theme.text }]}>-</ThemedText>
                </Pressable>
                <ThemedText style={[styles.qtyText, { color: theme.text }]}>{quantity}</ThemedText>
                <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyBtn}>
                  <ThemedText style={[styles.qtyBtnText, { color: theme.primary }]}>+</ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={handleAddCustomizedToCart} style={[styles.addCustomBtn, { backgroundColor: CaseUi.orange }]}>
                <ThemedText style={styles.addCustomBtnText}>Add item • J${customizedTotalPrice}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Offers Bottom Sheet Modal */}
      <Modal visible={showOffersModal} transparent animationType="slide" onRequestClose={() => setShowOffersModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowOffersModal(false)} />
          <View style={[styles.offersSheet, { backgroundColor: theme.background }]}>
            <View style={styles.offersHeader}>
              <View>
                <ThemedText style={[styles.offersTitle, { color: theme.text }]}>Offers & Coupons</ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{couponCount || offersList.length} offer(s) available</ThemedText>
              </View>
              <Pressable onPress={() => setShowOffersModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {offersList.map((coupon, idx) => {
                const discountLabel = coupon.discountType === 'FLAT' ? `J$${coupon.discountValue} OFF` : `${coupon.discountValue}% OFF`;
                return (
                  <View key={idx} style={[styles.couponCard, { borderColor: `${theme.primary}40`, backgroundColor: theme.backgroundElement }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={styles.couponCodeBadge}>
                        <ThemedText style={styles.couponCodeText}>{coupon.couponCode}</ThemedText>
                      </View>
                      <Pressable onPress={() => { Clipboard.setString(coupon.couponCode); toast.success(`Code "${coupon.couponCode}" copied`, 'Copied'); }} style={styles.copyBtn}>
                        <Ionicons name="copy-outline" size={14} color={theme.primary} />
                        <ThemedText style={[styles.copyBtnText, { color: theme.primary }]}>COPY</ThemedText>
                      </Pressable>
                    </View>
                    <ThemedText style={[styles.couponDiscount, { color: theme.primary }]}>{discountLabel}</ThemedText>
                    <ThemedText style={[styles.couponTitle, { color: theme.text }]}>{coupon.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.couponDesc}>{coupon.description}</ThemedText>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* About & Policies Modal */}
      <Modal visible={showAboutModal} transparent animationType="slide" onRequestClose={() => setShowAboutModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowAboutModal(false)} />
          <View style={[styles.offersSheet, { backgroundColor: theme.background, maxHeight: '70%' }]}>
            <View style={styles.offersHeader}>
              <View>
                <ThemedText style={[styles.offersTitle, { color: theme.text }]}>About Store</ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{restaurant?.restaurantName}</ThemedText>
              </View>
              <Pressable onPress={() => setShowAboutModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={styles.aboutInfoBox}>
                <ThemedText style={[styles.aboutInfoTitle, { color: theme.text }]}>📖 About</ThemedText>
                <ThemedText style={[styles.aboutInfoText, { color: theme.textSecondary }]}>
                  {restaurant?.description || `${restaurant?.restaurantName} is serving premium quality products with custom campus delivery. We specialize in fast fulfillment and high customer satisfaction.`}
                </ThemedText>
              </View>

              <View style={styles.aboutInfoBox}>
                <ThemedText style={[styles.aboutInfoTitle, { color: theme.text }]}>🕐 Opening Hours</ThemedText>
                <ThemedText style={[styles.aboutInfoText, { color: theme.textSecondary }]}>
                  Daily: {restaurant?.openingTime || '8:00 AM'} - {restaurant?.closingTime || '11:00 PM'}
                </ThemedText>
              </View>

              <View style={styles.aboutInfoBox}>
                <ThemedText style={[styles.aboutInfoTitle, { color: theme.text }]}>📍 Delivery Info</ThemedText>
                <ThemedText style={[styles.aboutInfoText, { color: theme.textSecondary }]}>
                  Radius: {restaurant?.deliveryRadiusKm || 5} km · Average Prep Time: {restaurant?.averageDeliveryTime || 25} mins
                </ThemedText>
              </View>

              <View style={styles.aboutInfoBox}>
                <ThemedText style={[styles.aboutInfoTitle, { color: theme.text }]}>📞 Contact & Support</ThemedText>
                <ThemedText style={[styles.aboutInfoText, { color: theme.textSecondary }]}>
                  Email: {restaurant?.email || 'support@case.jm'} {'\n'}Phone: {restaurant?.phone || '876-000-0000'}
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Cart Bar (Enhanced custom version with progress indicator) */}
      {cartCount > 0 && !customizingItem && !showOffersModal && !showAboutModal && (
        <View style={[styles.floatingCartWrapper, { bottom: cartBottom }]}>
          <Pressable onPress={() => router.push('/cart')} style={styles.floatingCartBar}>
            <View style={styles.floatingCartLeft}>
              <View style={styles.cartIconCircle}>
                <Ionicons name="cart" size={18} color={CaseUi.orange} />
                <View style={styles.cartCountPill}>
                  <ThemedText style={styles.cartCountText}>{cartCount}</ThemedText>
                </View>
              </View>
              <View>
                <ThemedText style={styles.cartTitle}>{cartRestaurantName || 'Your Cart'}</ThemedText>
                <ThemedText style={styles.cartSub}>JMD {Math.round(cartTotal)}</ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThemedText style={styles.cartActionText}>View Cart</ThemedText>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </Pressable>
          {/* Progress bar to free delivery (JMD 2500 threshold) */}
          <View style={styles.cartProgressBarContainer}>
            <View style={[styles.cartProgressBarFill, { width: `${Math.min(100, (cartTotal / 2500) * 100)}%` }]} />
            <ThemedText style={styles.cartProgressText}>
              {cartTotal >= 2500 ? '🎉 Free delivery unlocked!' : `Add J$${Math.max(0, 2500 - Math.round(cartTotal))} more for Free Delivery`}
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContainer: { flex: 1 },
  errorCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(229,72,77,0.25)' },
  errorText: { color: '#E5484D' },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { color: '#ff5a00', fontFamily: 'PlusJakartaSans_700Bold' },

  // --- V3 Redesign Layout Styles ---
  heroSection: { height: SCREEN_HEIGHT * 0.40, position: 'relative' },
  heroPlaceholderContainer: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  heroActionsRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 30 },
  heroCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroActionsRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  floatingCardContainer: { position: 'absolute', bottom: -30, left: 16, right: 16, zIndex: 40 },
  floatingStoreCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6, borderWidth: 1 },
  storeCardTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  storeCardLogo: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ECECEC' },
  storeTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  storeTitleText: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', maxWidth: 120 },
  verifiedPartnerText: { fontSize: 10, color: '#10B981', fontFamily: 'PlusJakartaSans_700Bold', marginLeft: 2 },
  storeRatingSub: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  storeRatingVal: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  storeStatusHours: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  callIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 14, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: CaseUi.orangeSoft, borderRadius: 999 },

  metricsPillScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  metricPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  metricPillText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },

  highlightsScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  highlightPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },

  // Offer Carousel
  offerCarouselContainer: { paddingVertical: 10, position: 'relative' },
  offerCardItem: { width: 260, padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 12 },
  offerTitleText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  offerDescText: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' },
  offerCardApply: { marginTop: 4 },
  percentBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  carouselIndicatorRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
  carouselDotIndicator: { height: 6, borderRadius: 3 },
  floatingOffersFAB: { position: 'absolute', bottom: 12, right: 16, backgroundColor: CaseUi.orange, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 4, zIndex: 10 },
  floatingOffersFABText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },

  // Sticky Search
  stickySearchAreaContainer: { paddingHorizontal: 16, paddingVertical: 10, zIndex: 50 },
  inStoreSearchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchTextInput: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', padding: 0 },

  // Sticky Filter & Ribbon
  stickyFiltersBar: { zIndex: 50 },
  stickyFilterScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterLabelChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#ECECEC', backgroundColor: '#FFF' },
  filterLabelChipActive: { backgroundColor: CaseUi.orange, borderColor: CaseUi.orange },
  filterLabelText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  filterLabelTextActive: { color: '#FFF' },
  tabsMenuScroll: { paddingHorizontal: 16, gap: 16, paddingVertical: 8 },
  tabBtnMenu: { paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnMenuActive: { borderBottomColor: CaseUi.orange },
  tabBtnMenuText: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  tabBtnMenuTextActive: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_800ExtraBold' },

  // Featured sections
  featuredContainer: { paddingVertical: 10 },
  featuredHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  featuredTitleText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  featuredScrollContent: { paddingHorizontal: 16, gap: 12 },
  featuredProductCard: { width: 130, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ECECEC' },
  featuredProductImg: { width: '100%', height: 96 },
  featuredProductDetails: { padding: 8, gap: 4 },
  featuredProductName: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  featuredProductFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredProductPrice: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  featuredAddBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  bestSellerCompactCard: { width: 200, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ECECEC', flexDirection: 'row', alignItems: 'center', gap: 10 },
  bestSellerImg: { width: 44, height: 44, borderRadius: 8 },
  bestSellerName: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  bestSellerPrice: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 },

  comboDealCard: { width: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ECECEC' },
  comboDealImg: { width: '100%', height: 110 },
  comboDealDetails: { padding: 10, gap: 4 },
  comboDealTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  comboDealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comboDealPrice: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  comboDealAddBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, borderColor: '#10B981' },
  comboDealAddBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#10B981' },

  // Menu items list & cards
  menuListSheet: { flex: 1 },
  categorySection: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  categoryTitleText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  categoryList: { gap: 0 },

  // Redesigned Menu Card — compact Swiggy/Zomato-style rows
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 0,
    borderBottomWidth: 1,
  },
  menuCardLeft: { width: 70, height: 70, flexShrink: 0 },
  menuCardImg: { width: 70, height: 70, borderRadius: 12 },
  noPhotoImageContainer: { alignItems: 'center', justifyContent: 'center' },
  // Legacy - kept for compat but unused
  menuCardAddContainer: { display: 'none' },
  menuCardAddBtn: { backgroundColor: CaseUi.orange, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  menuCardAddText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  outOfStockBtn: { backgroundColor: '#ECECEC', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  outOfStockBtnText: { color: '#6F6F6F', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  menuCardCustomisable: { fontSize: 8, color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 2, textAlign: 'center' },
  menuCardRight: { flex: 1, gap: 2 },
  // Right-side ADD button area
  menuCardAddArea: { alignItems: 'center', width: 38, flexShrink: 0 },
  menuCardAddCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  popularCardBadge: { backgroundColor: CaseUi.orangeSoft, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  popularCardBadgeText: { fontSize: 9, color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold' },
  spicyBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  spicyBadgeText: { fontSize: 9, color: '#DC2626', fontFamily: 'PlusJakartaSans_700Bold' },
  menuCardName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 19 },
  metaRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRatingText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  metaDotDivider: { width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: '#a0a0a0' },
  metaCaloriesText: { fontSize: 10 },
  menuCardDesc: { fontSize: 11, lineHeight: 14, marginTop: 1 },
  menuCardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  menuCardPrice: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  menuCardOriginalPrice: { fontSize: 11, textDecorationLine: 'line-through', color: '#a0a0a0' },

  // Reviews Panel
  reviewsPanelContainer: { marginHorizontal: 16, marginVertical: 12, borderRadius: 20, padding: 16 },
  reviewsPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewsPanelTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  seeAllReviewsBtn: { paddingVertical: 4 },
  scoreRowContainer: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  scoreLargeColumn: { alignItems: 'center' },
  scoreLargeNumber: { fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  scoreBarsColumn: { flex: 1 },
  scoreBarBg: { flex: 1, height: 4, backgroundColor: '#E4E4E7', borderRadius: 2, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 2 },
  reviewRowItem: { paddingVertical: 10, borderBottomWidth: 1 },
  reviewAvatarPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Accordion Store info
  accordionContainer: { paddingHorizontal: 16, marginVertical: 10 },
  accordionRowBtn: { flexDirection: 'row', padding: 14, borderRadius: 14, alignItems: 'center', gap: 10 },
  accordionRowText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },

  // Similar stores
  similarStoresContainer: { paddingVertical: 12 },
  similarStoresTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', paddingHorizontal: 16, marginBottom: 10 },
  similarStoreCard: { width: 160, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#ECECEC', marginRight: 12 },
  similarStoreImg: { width: '100%', height: 96 },
  similarStoreDetails: { padding: 10 },
  similarStoreName: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },

  // Empty search state
  emptySearchContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptySearchTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 12 },
  emptySearchSub: { fontSize: 12, color: '#6F6F6F', textAlign: 'center', marginTop: 6 },

  // Customize Bottom Sheet Premium Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', overflow: 'hidden' },
  modalBody: { padding: 16 },
  modalItemImage: { width: '100%', height: 200, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalItemDetails: { padding: 16, gap: 4 },
  modalItemName: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  modalCaloriesBadge: { fontSize: 11, color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold' },
  modalItemDesc: { fontSize: 12, color: '#586062', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 12, marginBottom: 8 },
  addonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  addonInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addonName: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  addonPrice: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  specialInstructionsInput: { height: 64, borderRadius: 12, borderWidth: 1, padding: 10, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', textAlignVertical: 'top', marginTop: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 14 },
  qtyBtn: { paddingHorizontal: 8 },
  qtyBtnText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  qtyText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  addCustomBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, flex: 1, marginLeft: 16, alignItems: 'center' },
  addCustomBtnText: { color: '#FFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },

  // Offers modal
  offersSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 24 },
  offersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  offersTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  couponCard: { borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 8, borderStyle: 'dashed' },
  couponCodeBadge: { backgroundColor: 'rgba(255,90,0,0.1)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  couponCodeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#ff5a00', letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ff5a00', borderRadius: 6 },
  copyBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  couponDiscount: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  couponTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  couponDesc: { fontSize: 11, lineHeight: 15 },
  couponFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f3f3' },
  couponFooterText: { fontSize: 10 },

  // About Store
  aboutInfoBox: { gap: 4 },
  aboutInfoTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  aboutInfoText: { fontSize: 13, lineHeight: 18 },

  // Enhanced Floating Cart Bar
  floatingCartWrapper: { position: 'absolute', left: 14, right: 14, zIndex: 60, gap: 4 },
  floatingCartBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CaseUi.orange, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  floatingCartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cartCountPill: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1a1c1c', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: CaseUi.orange },
  cartCountText: { color: '#FFF', fontSize: 8, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cartTitle: { color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cartSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
  cartActionText: { color: '#FFF', fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cartProgressBarContainer: { backgroundColor: '#1A1C1C', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden' },
  cartProgressBarFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: 'rgba(255,90,0,0.35)' },
  cartProgressText: { color: '#FFF', fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold' },

  badgeContainer: { width: 14, height: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 3, padding: 1 },
  badgeDot: { width: 5, height: 5 },
});
