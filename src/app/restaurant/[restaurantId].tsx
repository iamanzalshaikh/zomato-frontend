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
import { useMenuByRestaurantQuery, useCombosByRestaurantQuery } from '@/hooks/queries/menu';
import { useRestaurantByIdQuery } from '@/hooks/queries/restaurants';
import { useCouponsByRestaurantQuery } from '@/hooks/queries/coupons';
import { useCaseMerchantMenuQuery } from '@/hooks/queries/case';
import { FavoriteHeart } from '@/components/favorite-heart';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { StoreDetailSkeleton } from '@/components/skeleton';
import { useRestaurantReviewsQuery } from '@/hooks/queries/reviews';
import { useCart } from '@/hooks/use-cart';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { toast } from '@/lib/toast';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';
import { useThemeContext } from '@/context/ThemeContext';

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
            <ActivityIndicator size="small" color={CaseUi.orange} />
          ) : (
            <ThemedText style={styles.addBtnText}>ADD</ThemedText>
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
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const busy = addingItemId === item._id;
  const hasAddons = Boolean(item.addons?.length);

  return (
    <View style={[styles.menuRow, { borderBottomColor: isDark ? '#27272A' : '#f8f8f8' }]}>
      {/* Left: Thumbnail image */}
      {item.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.dishImageLeft} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.noPhotoImageLeft, { backgroundColor: isDark ? '#27272A' : '#f8f8f8' }]}>
          <Ionicons name="fast-food-outline" size={24} color={isDark ? '#4E4E52' : '#cccccc'} />
        </View>
      )}

      {/* Middle: Info */}
      <View style={styles.itemLeft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FoodTypeBadge type={item.foodType} />
          <ThemedText style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {item.itemName}
          </ThemedText>
        </View>

        <View style={styles.priceRow}>
          <ThemedText style={[styles.price, { color: colors.text }]}>J${item.discountedPrice ?? item.price}</ThemedText>
          {!!item.discountedPrice ? (
            <ThemedText style={styles.originalPrice}>J${item.price}</ThemedText>
          ) : null}
        </View>

        {showRecommendedBadge ? (
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <View style={styles.bestsellerBadge}>
              <ThemedText style={styles.bestsellerBadgeText}>Bestseller ‣</ThemedText>
            </View>
          </View>
        ) : null}

        {!!item.shortDescription ? (
          <ThemedText themeColor="textSecondary" style={styles.itemDesc} numberOfLines={2}>
            {item.shortDescription}
          </ThemedText>
        ) : null}
      </View>

      {/* Right: Add button circular */}
      <View style={styles.addBlockRight}>
        <Pressable
          onPress={() => onAdd(item)}
          style={[styles.addCircleBtn, busy && { opacity: 0.65 }]}
          disabled={busy}
          hitSlop={8}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={22} color="#FFFFFF" />
          )}
        </Pressable>
        {hasAddons ? (
          <ThemedText style={[styles.customisableTextRight, { color: CaseUi.orange }]}>Customisable</ThemedText>
        ) : null}
      </View>
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
  const caseMenuQ = useCaseMerchantMenuQuery(rid);
  const combosQ = useCombosByRestaurantQuery(rid);
  const menuReady = Boolean(menuQ.data);
  const reviewsQ = useRestaurantReviewsQuery(rid, 5, menuReady);
  const reviews = useMemo(() => (Array.isArray(reviewsQ.data) ? reviewsQ.data : []), [reviewsQ.data]);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const couponsQ = useCouponsByRestaurantQuery(rid, showOffersModal);
  const restaurantLoading = restaurantQ.isLoading && !restaurantQ.data;
  const menuLoading = menuQ.isLoading && !menuQ.data;
  const restaurant: any = restaurantQ.data ?? null;
  const { colors: themeColors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const isCatalogVertical = false;
  const businessType = restaurant?.businessType?.toUpperCase() || 'RESTAURANT';
  const isRestaurant = businessType === 'RESTAURANT';
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
  const [activeMenuCat, setActiveMenuCat] = useState<string>('All');
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

  // categoryId often arrives as a bare id string (case-server menu payload);
  // resolve real names from the case menu's separate categories list.
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (caseMenuQ.data?.categories ?? []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [caseMenuQ.data]);

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
      {/* Floating Back Button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.floatingBackBtn, { top: Math.max(insets.top, 12) + 6 }]}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </Pressable>

      {restaurantLoading ? (
        <StoreDetailSkeleton />
      ) : error ? (
        <ThemedView type="backgroundElement" style={[styles.errorCard, { margin: Spacing.three, marginTop: Math.max(insets.top, 12) + 60 }]}>
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
      ) : isCatalogVertical ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          >
            <View style={styles.catalogHero}>
              {restaurant?.bannerImages?.[0] || restaurant?.logo ? (
                <Image
                  source={{ uri: restaurant.bannerImages?.[0] ?? restaurant.logo }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.catalogHeroPlaceholder]}>
                  <Ionicons name="storefront-outline" size={44} color={Blinkit.muted} />
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.28)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </View>

            <View style={styles.catalogVendorBar}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <ThemedText style={styles.catalogStoreName}>
                  {restaurant?.restaurantName}
                </ThemedText>
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Ionicons name="star" size={14} color={CaseUi.orange} />
                  <ThemedText style={styles.catalogMeta}>
                    {Number(restaurant?.averageRating ?? 0).toFixed(1)}
                    {restaurant?.totalRatings ? ` (${restaurant.totalRatings})` : ''}
                  </ThemedText>
                  <View style={styles.metaDot} />
                  <Ionicons name="time-outline" size={14} color={CaseUi.muted} />
                  <ThemedText style={styles.catalogMeta}>
                    {restaurant?.averageDeliveryTime ?? 25} mins
                  </ThemedText>
                </View>
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                  <View
                    style={[
                      styles.catalogStatusBadge,
                      {
                        backgroundColor:
                          restaurant?.isOpen === false ? '#FEE2E2' : CaseUi.successSoft,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.catalogStatusText,
                        {
                          color: restaurant?.isOpen === false ? '#B91C1C' : CaseUi.success,
                        },
                      ]}
                    >
                      {restaurant?.isOpen === false ? 'Closed' : 'Open'}
                    </ThemedText>
                  </View>
                  {restaurant?.minimumOrderAmount ? (
                    <ThemedText style={[styles.catalogMeta, { marginLeft: 10 }]}>
                      Min. J${restaurant.minimumOrderAmount}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <FavoriteHeart restaurantId={rid} variant="header" size={24} />
            </View>

            <Pressable onPress={() => setShowOffersModal(true)} style={styles.catalogOfferBanner}>
              <View style={styles.offerIconCircle}>
                <Ionicons name="pricetag" size={14} color={CaseUi.orange} />
              </View>
              <ThemedText style={styles.catalogOfferText}>
                {showOffersModal && couponCount > 0
                  ? `${couponCount} offer${couponCount > 1 ? 's' : ''} available`
                  : 'Tap to view offers'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
            </Pressable>

            {/* Popular products strip — fills empty store preview */}
            {!menuLoading && filteredItems.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <ThemedText style={[styles.catalogSectionTitle, { marginHorizontal: 16 }]}>
                  Popular products
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}
                >
                  {filteredItems.slice(0, 10).map((it) => {
                    const price = it.discountedPrice ?? it.price;
                    return (
                      <Pressable
                        key={it._id}
                        style={styles.catalogProductCard}
                        onPress={() =>
                          router.push({
                            pathname: '/product-detail',
                            params: { restaurantId: rid, itemId: it._id },
                          })
                        }
                      >
                        {it.images?.[0] ? (
                          <Image
                            source={{ uri: it.images[0] }}
                            style={styles.catalogProductImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.catalogProductImg, styles.catalogHeroPlaceholder]}>
                            <Ionicons name="cube-outline" size={22} color={CaseUi.muted} />
                          </View>
                        )}
                        <ThemedText style={styles.catalogProductName} numberOfLines={2}>
                          {it.itemName}
                        </ThemedText>
                        <ThemedText style={styles.catalogProductPrice}>
                          J${Math.round(price)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.catalogCategoriesSection}>
              <ThemedText style={styles.catalogSectionTitle}>Categories</ThemedText>
              {menuLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                  <ActivityIndicator size="small" color={CaseUi.orange} />
                </View>
              ) : groupedItems.length === 0 ? (
                <ThemedText style={styles.catalogEmpty}>
                  This store hasn&apos;t listed any products yet.
                </ThemedText>
              ) : (
                <View style={styles.catalogListCard}>
                  {groupedItems.map((group, idx) => (
                    <Pressable
                      key={group.categoryName}
                      onPress={() =>
                        router.push({
                          pathname: '/store-category',
                          params: { restaurantId: rid, category: group.categoryName },
                        })
                      }
                      style={[
                        styles.catalogCategoryRow,
                        idx === groupedItems.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.catalogCategoryIcon}>
                        <ThemedText style={styles.catalogCategoryIconText}>
                          {group.categoryName.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.catalogCategoryName}>
                          {group.categoryName}
                        </ThemedText>
                        <ThemedText style={styles.catalogCategoryCount}>
                          {group.items.length} item{group.items.length === 1 ? '' : 's'}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            stickyHeaderIndices={[2]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          >
            {/* 0. Cover Banner Section */}
            <View style={styles.bannerContainer}>
              {restaurant?.bannerImages?.[0] || restaurant?.logo ? (
                <Image
                  source={{ uri: restaurant.bannerImages?.[0] ?? restaurant.logo }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
                  <Ionicons name="storefront-outline" size={44} color={CaseUi.muted} />
                </View>
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.4)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Store Logo floating over banner */}
              <View style={[styles.bannerLogoContainer, { borderColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                {restaurant?.logo ? (
                  <Image source={{ uri: restaurant.logo }} style={styles.bannerLogo} contentFit="contain" />
                ) : (
                  <Ionicons name="storefront" size={28} color={CaseUi.muted} />
                )}
              </View>

              {/* Open/Closed Badge on banner */}
              <View
                style={[
                  styles.bannerStatusBadge,
                  { backgroundColor: restaurant?.isOpen === false ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)' },
                ]}
              >
                <View style={styles.bannerStatusDot} />
                <ThemedText style={styles.bannerStatusText}>
                  {restaurant?.isOpen === false ? 'Closed' : 'Open'}
                </ThemedText>
              </View>
            </View>

            {/* 1. Store Details Info, Rating Columns, and Coupon Cards */}
            <View style={[styles.detailsSection, { backgroundColor: theme.background }]}>
              {/* Store Name */}
              <ThemedText style={[styles.storeTitle, { color: theme.text }]}>
                {restaurant?.restaurantName}
              </ThemedText>

              {/* Ratings & Metrics Column Grid */}
              <View style={[styles.metricsContainer, { borderColor: isDark ? '#2D2D34' : '#E4E4E7' }]}>
                {/* Rating */}
                <View style={styles.metricCol}>
                  <ThemedText style={[styles.metricValue, { color: theme.text }]}>
                    ⭐ {Number(restaurant?.averageRating ?? 0).toFixed(1)}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricSub}>
                    ({restaurant?.totalRatings ?? 0} ratings)
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricLabel}>
                    Rating
                  </ThemedText>
                </View>

                {/* Vertical Line */}
                <View style={[styles.metricDivider, { backgroundColor: isDark ? '#2C2C32' : '#E4E4E7' }]} />

                {/* Delivery Time */}
                <View style={styles.metricCol}>
                  <ThemedText style={[styles.metricValue, { color: theme.text }]}>
                    {restaurant?.averageDeliveryTime ?? 25} mins
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricSub}>
                    Avg Prep & Del
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricLabel}>
                    Delivery time
                  </ThemedText>
                </View>

                {/* Vertical Line */}
                <View style={[styles.metricDivider, { backgroundColor: isDark ? '#2C2C32' : '#E4E4E7' }]} />

                {/* Delivery Fee / Min Order */}
                <View style={styles.metricCol}>
                  <ThemedText style={[styles.metricValue, { color: theme.text }]}>
                    JMD 120
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricSub}>
                    {restaurant?.minimumOrderAmount ? `Min J$${restaurant.minimumOrderAmount}` : 'No minimum'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.metricLabel}>
                    Delivery fee
                  </ThemedText>
                </View>
              </View>

              {/* Dynamic Coupon Offer Card */}
              {coupons.length > 0 ? (
                <Pressable
                  onPress={() => setShowOffersModal(true)}
                  style={[
                    styles.offerPromoCard,
                    { backgroundColor: isDark ? '#2D201A' : '#FFF5EE', borderColor: isDark ? '#5C3826' : '#FFE0CC' },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText style={[styles.offerPromoTitle, { color: isDark ? '#FF9F64' : '#E05A10' }]}>
                      {coupons[0].discountType === 'PERCENTAGE'
                        ? `Flat ${coupons[0].discountValue}% OFF${coupons[0].maximumDiscount ? ` up to JMD ${coupons[0].maximumDiscount}` : ''}`
                        : `Flat JMD ${coupons[0].discountValue} OFF`}
                    </ThemedText>
                    <ThemedText style={[styles.offerPromoSub, { color: isDark ? '#D1A38C' : '#8A583C' }]}>
                      Use code: {coupons[0].couponCode}
                    </ThemedText>
                  </View>
                  <View style={[styles.offerPromoPercentCircle, { backgroundColor: CaseUi.orange }]}>
                    <ThemedText style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>%</ThemedText>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setShowOffersModal(true)}
                  style={[
                    styles.offerPromoCard,
                    { backgroundColor: isDark ? '#2D201A' : '#FFF5EE', borderColor: isDark ? '#5C3826' : '#FFE0CC' },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText style={[styles.offerPromoTitle, { color: isDark ? '#FF9F64' : '#E05A10' }]}>
                      Flat 20% OFF up to JMD 300
                    </ThemedText>
                    <ThemedText style={[styles.offerPromoSub, { color: isDark ? '#D1A38C' : '#8A583C' }]}>
                      Use code: FIRST20
                    </ThemedText>
                  </View>
                  <View style={[styles.offerPromoPercentCircle, { backgroundColor: CaseUi.orange }]}>
                    <ThemedText style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>%</ThemedText>
                  </View>
                </Pressable>
              )}

              {/* Professional Search Input inside details container */}
              <View style={[styles.inStoreSearchWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F8F9FA', borderColor: isDark ? '#2D2D34' : '#E9ECEF' }]}>
                <Ionicons name="search" size={20} color={isDark ? '#8E8E93' : '#6C757D'} />
                <TextInput
                  style={[styles.inStoreSearchInput, { color: theme.text }]}
                  placeholder={`Search in ${restaurant?.restaurantName || 'store'}...`}
                  placeholderTextColor={isDark ? '#8E8E93' : '#6C757D'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Ionicons name="mic" size={20} color={isDark ? '#8E8E93' : '#6C757D'} style={{ marginLeft: 'auto' }} />
              </View>

              {/* Quick Filters Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 12, paddingBottom: 4 }}
              >
                {isRestaurant && (
                  <>
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
                  </>
                )}

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
            </View>

            {/* 2. Sticky Category Icons Ribbon (floating scroll view index 2) */}
            <View style={[styles.stickyRibbonContainer, { backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? '#27272A' : '#E4E4E7' }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ribbonScrollContent}
              >
                {categoriesList.map((catName) => {
                  const isActive = activeMenuCat === catName;
                  const nameCount = catName === 'All'
                    ? filteredItems.length
                    : (groupedItems.find((g) => g.categoryName === catName)?.items.length ?? 0);
                  
                  // Emoji Resolver
                  let emoji = '🍱';
                  const lowerCat = catName.toLowerCase();
                  if (lowerCat.includes('burger')) emoji = '🍔';
                  else if (lowerCat.includes('pizza')) emoji = '🍕';
                  else if (lowerCat.includes('chicken') || lowerCat.includes('wing')) emoji = '🍗';
                  else if (lowerCat.includes('beverage') || lowerCat.includes('drink') || lowerCat.includes('juice') || lowerCat.includes('soda')) emoji = '🥤';
                  else if (lowerCat.includes('wrap') || lowerCat.includes('roll') || lowerCat.includes('sandwich')) emoji = '🌯';
                  else if (lowerCat.includes('dessert') || lowerCat.includes('cake') || lowerCat.includes('sweet') || lowerCat.includes('ice cream')) emoji = '🍰';
                  else if (lowerCat.includes('sides') || lowerCat.includes('fries') || lowerCat.includes('salad')) emoji = '🍟';
                  else if (lowerCat.includes('grocery') || lowerCat.includes('fruit') || lowerCat.includes('veg') || lowerCat.includes('produce')) emoji = '🍎';
                  else if (lowerCat.includes('pharmacy') || lowerCat.includes('medicine') || lowerCat.includes('pill') || lowerCat.includes('tablet')) emoji = '💊';
                  else if (lowerCat.includes('supplement') || lowerCat.includes('vitamin') || lowerCat.includes('wellness')) emoji = '⚗️';
                  else if (lowerCat.includes('skincare') || lowerCat.includes('cream') || lowerCat.includes('lotion')) emoji = '🧴';
                  else if (lowerCat.includes('first aid') || lowerCat.includes('bandage') || lowerCat.includes('care')) emoji = '🩹';
                  else if (lowerCat.includes('electronics') || lowerCat.includes('phone') || lowerCat.includes('cable') || lowerCat.includes('charger')) emoji = '🔌';
                  else if (lowerCat.includes('flower') || lowerCat.includes('bouquet') || lowerCat.includes('gift')) emoji = '💐';
                  else if (lowerCat.includes('clothing') || lowerCat.includes('shirt') || lowerCat.includes('wear')) emoji = '👕';
                  else if (lowerCat.includes('book') || lowerCat.includes('stationery') || lowerCat.includes('pen')) emoji = '📚';
                  else if (lowerCat.includes('cleaning') || lowerCat.includes('laundry') || lowerCat.includes('wash')) emoji = '🧺';
                  else if (lowerCat.includes('baby') || lowerCat.includes('diaper')) emoji = '🍼';
                  else if (lowerCat.includes('all')) emoji = '🏠';

                  return (
                    <Pressable
                      key={catName}
                      onPress={() => setActiveMenuCat(catName)}
                      style={styles.ribbonTabBtn}
                    >
                      <View
                        style={[
                          styles.ribbonTabIconWrap,
                          {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isActive ? CaseUi.orange : (isDark ? '#2C2C30' : '#E4E4E7'),
                          },
                        ]}
                      >
                        <ThemedText style={{ fontSize: 24 }}>{emoji}</ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.ribbonTabText,
                          { color: isActive ? CaseUi.orange : theme.text },
                          isActive && { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                        ]}
                        numberOfLines={1}
                      >
                        {catName}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Products List */}
            <View style={[styles.menuListSheet, { backgroundColor: theme.background, marginTop: Spacing.one }]}>
              {menuLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
                    Loading menu…
                  </ThemedText>
                </View>
              ) : null}

              {/* Your Orders and Collections Section (only on 'All' tab) */}
              {activeMenuCat === 'All' && !selectedFoodType && !searchQuery && userPastOrders.length > 0 && (
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
                        <MenuItemRow
                          key={`past-${it._id}`}
                          item={it}
                          addingItemId={addingItemId}
                          onAdd={handleAddClick}
                          showRecommendedBadge={Boolean(it.isRecommended)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Most ordered together section (only on 'All' tab) */}
              {activeMenuCat === 'All' && !searchQuery && mostOrderedTogether.length > 0 && (
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
                              <ThemedText style={[styles.comboPrice, { color: theme.text }]}>J${combo.price}</ThemedText>
                              <Pressable
                                onPress={() => {
                                  if (combo.mainItem) {
                                    handleAddClick(combo.mainItem);
                                  }
                                }}
                                style={styles.comboAddBtn}
                              >
                                <ThemedText style={styles.comboAddBtnText}>ADD</ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Recommended for you Section (only on 'All' tab) */}
              {activeMenuCat === 'All' && recommendedItems.length > 0 && (
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

              {categoriesToRender.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 32 }}>
                  No items match your filters.
                </ThemedText>
              ) : (
                categoriesToRender.map((group) => {
                  const isAllTab = activeMenuCat === 'All';
                  const isCollapsed = !isAllTab ? false : isCategoryCollapsed(group.categoryName);
                  return (
                    <View key={group.categoryName} style={styles.categorySection}>
                      {isAllTab ? (
                        <Pressable
                          onPress={() => toggleCategory(group.categoryName)}
                          style={styles.categoryHeader}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                              {group.categoryName} ({group.items.length})
                            </ThemedText>
                          </View>
                          <Ionicons
                            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                            size={18}
                            color={theme.textSecondary}
                          />
                        </Pressable>
                      ) : (
                        <View style={styles.categoryHeader}>
                          <ThemedText style={[styles.categoryTitle, { color: theme.text }]}>
                            {group.categoryName} ({group.items.length})
                          </ThemedText>
                        </View>
                      )}

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
          </ScrollView>
        )}

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
                        <ThemedText style={[styles.addonPrice, { color: theme.text }]}>J${displayPrice}</ThemedText>
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
                        <ThemedText style={styles.addonPrice}>+J${addon.price}</ThemedText>
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
                  Add item - J${customizedTotalPrice}
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
                      ? `J$${coupon.discountValue} OFF`
                      : `${coupon.discountValue}% OFF`;
                  const maxLabel =
                    coupon.discountType === 'PERCENTAGE' && coupon.maximumDiscount
                      ? ` up to J$${coupon.maximumDiscount}`
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
                          Min. order J${coupon.minimumOrderAmount}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
    gap: 8,
    backgroundColor: CaseUi.white,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CaseUi.field,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CaseUi.line,
    paddingHorizontal: 12,
    height: 40,
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.orange,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  customisableText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.orange,
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
  catalogHero: {
    width: '100%',
    height: 180,
    backgroundColor: CaseUi.field,
  },
  catalogHeroPlaceholder: {
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogHeroShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  catalogVendorBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: CaseUi.white,
  },
  catalogStoreName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
    letterSpacing: -0.3,
  },
  catalogMeta: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
    marginLeft: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 8,
  },
  catalogStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  catalogStatusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  catalogOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CaseUi.orangeSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 4,
    gap: 10,
  },
  offerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CaseUi.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogOfferText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.orangeDeep,
  },
  catalogCategoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
  },
  catalogSectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: CaseUi.ink,
    marginBottom: 12,
  },
  catalogEmpty: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  catalogListCard: {
    backgroundColor: CaseUi.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    overflow: 'hidden',
  },
  catalogCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  catalogCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CaseUi.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogCategoryIconText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: CaseUi.success,
  },
  catalogCategoryName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  catalogCategoryCount: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  catalogProductCard: {
    width: 112,
    backgroundColor: CaseUi.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    padding: 8,
  },
  catalogProductImg: {
    width: '100%',
    height: 88,
    borderRadius: 10,
    backgroundColor: CaseUi.field,
  },
  catalogProductName: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: CaseUi.ink,
    minHeight: 28,
  },
  catalogProductPrice: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: CaseUi.orange,
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
    paddingHorizontal: 16,
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
    borderWidth: 1.5,
    borderColor: '#0C831F',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  comboAddBtnText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#0C831F',
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
  stickyTabsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  menuTabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  menuTabButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  menuListSheet: {
    flex: 1,
  },
  bannerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  bannerLogoContainer: {
    position: 'absolute',
    bottom: -30,
    left: 16,
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },
  bannerLogo: {
    width: '100%',
    height: '100%',
  },
  bannerStatusBadge: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 2,
  },
  bannerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  bannerStatusText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  detailsSection: {
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 16,
  },
  storeTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginTop: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 16,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  metricSub: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 32,
  },
  offerPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  offerPromoTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  offerPromoSub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
  },
  offerPromoPercentCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inStoreSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 10,
  },
  inStoreSearchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    padding: 0,
  },
  stickyRibbonContainer: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  ribbonScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  ribbonTabBtn: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  ribbonTabIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ribbonTabText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    textAlign: 'center',
  },
  dishImageLeft: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#f3f3f3',
  },
  noPhotoImageLeft: {
    width: 76,
    height: 76,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestsellerBadge: {
    backgroundColor: '#FFEAD2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestsellerBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: '#E05A10',
  },
  addBlockRight: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  addCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: CaseUi.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  customisableTextRight: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },
});

