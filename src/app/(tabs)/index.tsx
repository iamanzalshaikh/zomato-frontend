import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  ScrollView,
  Text,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchRestaurants, fetchRecommendedRestaurants, fetchRestaurantById, type Restaurant, type PaginationMeta } from '@/services/restaurants';
import { fetchMenuItemsByRestaurant, fetchCombosByRestaurant } from '@/services/menu';
import { restaurantKeys } from '@/hooks/queries/restaurants';
import { menuKeys } from '@/hooks/queries/menu';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/hooks/use-cart';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys } from '@/hooks/queries/cart';
import { useFilterStore } from '@/lib/filterStore';
import { apiFetch } from '@/lib/apiFetch';
import { useProfileQuery } from '@/hooks/queries/profile';
import { FavoriteHeart } from '@/components/favorite-heart';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notifications';
import { useRestaurantOfferBadges } from '@/hooks/use-restaurant-offers';
import { perfScreen } from '@/lib/perf';

const CATEGORIES = [
  { name: 'All', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80' },
  { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80' },
  { name: 'Cake', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&auto=format&fit=crop&q=80' },
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80' },
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&auto=format&fit=crop&q=80' },
  { name: 'Dessert', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=150&auto=format&fit=crop&q=80' }
];

// const SORT_OPTIONS: { label: string; value: 'rating' | 'deliveryTime' | 'distance' | 'newest' }[] = [
//   { label: 'Rating', value: 'rating' },
//   { label: 'Time', value: 'deliveryTime' },
//   { label: 'Distance', value: 'distance' },
//   { label: 'Newest', value: 'newest' },
// ];

// Fallback gourmet food images matching index
const getRestaurantImage = (item: Restaurant, index: number) => {
  const fromApi = item.bannerImages?.[0] || item.logo;
  if (typeof fromApi === 'string' && fromApi.length > 0) return { uri: fromApi };
  
  const fallbacks = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80'
  ];
  return { uri: fallbacks[index % fallbacks.length] };
};

interface RestaurantItemProps {
  item: Restaurant;
  index: number;
  theme: any;
  offerBadge?: string | null;
  onPress: () => void;
}

const RestaurantItem = memo(({ item, index, theme, offerBadge, onPress }: RestaurantItemProps) => {
  const rating = Number(item.averageRating ?? 0);
  const ratingColor = rating >= 4.0 ? '#24963F' : (rating >= 3.0 ? '#9ACD32' : '#8A8D91');

  const priceForTwo = (item.minimumOrderAmount && item.minimumOrderAmount > 0)
    ? item.minimumOrderAmount
    : 200;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.94, transform: [{ scale: 0.992 }] } : undefined)}
    >
      <ThemedView type="backgroundElement" style={styles.rCard}>
        {/* Restaurant Food Banner */}
        <View style={styles.rHero}>
          <Image
            source={getRestaurantImage(item, index)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          {/* Semi-transparent dark overlay to pop text & badges */}
          <View style={styles.imageOverlay} />

          <View style={styles.badgeContainer}>
            {offerBadge ? (
              <View style={[styles.promoBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.promoBadgeText}>{offerBadge}</Text>
              </View>
            ) : null}
            <View style={styles.glassBadge}>
              <Text style={styles.glassBadgeText}>Free Delivery</Text>
            </View>
          </View>

          <FavoriteHeart restaurantId={item._id} style={styles.favoriteButton} size={18} />

          {/* Zomato-style Distance/Time Overlay Badge at bottom right of image */}
          <View style={styles.timeDistancePill}>
            <Text style={styles.timeDistanceText}>
              {item.averageDeliveryTime ?? 30} min | {(item.distanceKm ?? 1.4).toFixed(1)} km
            </Text>
          </View>
        </View>

        {/* Zomato-style Card Body details */}
        <View style={styles.rBody}>
          <View style={styles.rTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rName, { color: theme.text }]}>{item.restaurantName}</Text>
              <Text style={[styles.rCuisines, { color: theme.textSecondary }]} numberOfLines={1}>
                {(item.cuisines ?? []).join(', ') || 'Fast Food, Snacks, Beverages'}
              </Text>
            </View>
            
            {/* Zomato Green/Grey Rating Pill */}
            <View style={[styles.ratingPill, { backgroundColor: ratingColor }]}>
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              <Text style={styles.ratingStar}>★</Text>
            </View>
          </View>

          <View style={styles.rPriceRow}>
            <Text style={[styles.rPriceText, { color: theme.textSecondary }]}>
              ₹{priceForTwo} for two
            </Text>
          </View>

          {/* Separator line */}
          <View style={styles.cardSeparator} />

          {/* Zomato safety / volume footer tag */}
          <View style={styles.cardFooterTag}>
            <Text style={styles.cardFooterIcon}>🛡️</Text>
            <Text style={[styles.cardFooterText, { color: theme.textSecondary }]} numberOfLines={1}>
              QuickBite delivery partner follows all safety protocols
            </Text>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
});

RestaurantItem.displayName = 'RestaurantItem';

/**
 * Wrapper that provides a stable onPress callback so React.memo on RestaurantItem
 * actually prevents re-renders when the parent HomeScreen re-renders.
 * (Hooks cannot be called inside renderItem callbacks, so a component is needed.)
 */
interface RestaurantListItemProps {
  item: Restaurant;
  index: number;
  theme: any;
  offerBadges: Record<string, string | null>;
  onPressRestaurant: (restaurantId: string) => void;
}

const RestaurantListItem = memo(({ item, index, theme, offerBadges, onPressRestaurant }: RestaurantListItemProps) => {
  const handlePress = useCallback(() => {
    onPressRestaurant(item._id);
  }, [item._id, onPressRestaurant]);

  return (
    <RestaurantItem
      item={item}
      index={index}
      theme={theme}
      offerBadge={offerBadges[item._id] ?? null}
      onPress={handlePress}
    />
  );
});

RestaurantListItem.displayName = 'RestaurantListItem';

interface CategoryChipProps {
  category: { name: string; image: string };
  isSelected: boolean;
  onSelect: (name: string) => void;
  theme: any;
}

const CategoryChip = memo(({ category, isSelected, onSelect, theme }: CategoryChipProps) => {
  const handlePress = useCallback(() => {
    onSelect(category.name);
  }, [category.name, onSelect]);

  return (
    <Pressable onPress={handlePress} style={styles.categoryItem}>
      <View style={[
        styles.categoryIcon,
        { backgroundColor: theme.backgroundSelected },
        isSelected && { borderColor: theme.primary, borderWidth: 2.5, backgroundColor: theme.primarySoft }
      ]}>
        <Image
          source={{ uri: category.image }}
          style={styles.categoryImage}
          contentFit="cover"
          transition={200}
        />
      </View>
      <Text style={[
        styles.categoryText,
        { color: theme.text },
        isSelected && { color: theme.primary, fontFamily: 'PlusJakartaSans_850ExtraBold', fontWeight: '800' }
      ]}>
        {category.name}
      </Text>
    </Pressable>
  );
});

CategoryChip.displayName = 'CategoryChip';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { cart } = useCart();
  const qc = useQueryClient();
  const profileQ = useProfileQuery();
  const user = profileQ.data;
  const unreadNotifications = useUnreadNotificationCount();

  const defaultAddress = useMemo(() => {
    const list = user?.addresses ?? [];
    return list.find((a: any) => a.isDefault) ?? list[0];
  }, [user?.addresses]);

  const locationLocality = useMemo(() => {
    if (!defaultAddress) return 'Connaught Place';
    const firstPart = defaultAddress.fullAddress.split(',')[0]?.trim();
    if (firstPart === 'Current location' && defaultAddress.fullAddress.split(',').length > 1) {
      return defaultAddress.fullAddress.split(',')[1]?.trim();
    }
    return firstPart || defaultAddress.label || 'Connaught Place';
  }, [defaultAddress]);

  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Active filters from Zustand Store
  const {
    activeSort,
    activeMinRating,
    activeOffers,
    activeNearAndFast,
    activeNoPackaging,
    activeCuisine,
    setActiveSort,
    setActiveMinRating,
    setActiveOffers,
    setActiveNearAndFast,
    setActiveNoPackaging,
    setActiveCuisine,
    resetFilters,
  } = useFilterStore();

  const handleSelectCuisine = useCallback((name: string) => {
    setActiveCuisine(name === 'All' ? null : name);
  }, [setActiveCuisine]);

  const [recommendedItems, setRecommendedItems] = useState<Restaurant[]>([]);

  const offerRestaurantIds = useMemo(
    () => [...recommendedItems.map((r) => r._id), ...items.map((r) => r._id)],
    [recommendedItems, items],
  );
  const offerBadges = useRestaurantOfferBadges(offerRestaurantIds);

  // Filters Modal State
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'sort' | 'rating' | 'offers'>('sort');
  
  // Temp Modal states
  const [tempSort, setTempSort] = useState<'rating' | 'deliveryTime' | 'distance' | 'newest'>('rating');
  const [tempMinRating, setTempMinRating] = useState<number | null>(null);
  const [tempOffers, setTempOffers] = useState(false);

  // Animated Modal transitions
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(500), []);

  useEffect(() => {
    if (showFiltersModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [showFiltersModal, fadeAnim, slideAnim]);


  const cartCount = useMemo(() => getCartItemCount(cart), [cart]);
  const cartTotal = useMemo(() => getCartDisplayTotal(cart), [cart]);
  const cartRestaurantName = useMemo(() => getCartRestaurantName(cart), [cart]);
  const tabBarHeight = useTabBarHeight();
  const listBottomPadding = cartCount > 0 ? tabBarHeight + 88 : tabBarHeight + Spacing.four;
  const cartBarBottom = tabBarHeight + 12;

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 450);
    return () => clearTimeout(handler);
  }, [query]);

  // Load restaurants based on search, pagination, and filters
  const fetchRestaurantsList = async (pageNumber: number, isInitial: boolean = false, isRefresh: boolean = false) => {
    try {
      if (pageNumber === 1) {
        if (!isRefresh) setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      let fetchedRestaurants: Restaurant[] = [];
      let totalPagesCount = 1;

      // Check if text query is active
      if (debouncedQuery.trim().length > 0) {
        const qs = `?${new URLSearchParams({
          q: debouncedQuery.trim(),
          page: String(pageNumber),
          limit: '10',
        }).toString()}`;
        const body = await apiFetch<{
          success: true;
          message: string;
          data: { restaurants: Restaurant[]; pagination: PaginationMeta };
        }>(`/restaurants/search${qs}`);
        fetchedRestaurants = body.data.restaurants;
        totalPagesCount = body.data.pagination.totalPages;
      } else {
        // Build params for the browse route
        const params: any = {
          page: pageNumber,
          limit: 10,
          sort: activeNearAndFast ? 'deliveryTime' : activeSort,
        };

        if (activeCuisine) {
          params.cuisine = activeCuisine;
        }
        if (activeMinRating !== null) {
          params.minRating = activeMinRating;
        }

        const data = await fetchRestaurants(params);
        fetchedRestaurants = data.restaurants;
        totalPagesCount = data.pagination.totalPages;
      }

      // Apply client-side "Near & Fast" logic (delivery time <= 35)
      if (activeNearAndFast) {
        fetchedRestaurants = fetchedRestaurants.filter(r => (r.averageDeliveryTime ?? 30) <= 35);
      }

      // Apply client-side "No packaging charges" logic (packagingCharge === 0)
      if (activeNoPackaging) {
        fetchedRestaurants = fetchedRestaurants.filter(r => !(r as any).packagingCharge || (r as any).packagingCharge === 0);
      }

      if (pageNumber === 1) {
        setItems(fetchedRestaurants);
      } else {
        setItems(prev => [...prev, ...fetchedRestaurants]);
      }

      setPage(pageNumber);
      setHasMore(pageNumber < totalPagesCount);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load restaurants');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch recommended restaurants
  const fetchRecommended = async () => {
    try {
      const data = await fetchRecommendedRestaurants();
      setRecommendedItems(data);
    } catch (e) {
      console.log('Error fetching recommended:', e);
    }
  };

  // Re-fetch on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRestaurantsList(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeSort, activeMinRating, activeOffers, activeNearAndFast, activeNoPackaging, activeCuisine]);

  // Fetch recommended items on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecommended();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRestaurantsList(1, false, true),
      fetchRecommended(),
      qc.invalidateQueries({ queryKey: cartKeys.all }),
    ]);
    setRefreshing(false);
  };

  // Scroll to end (Load More)
  const onLoadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      void fetchRestaurantsList(page + 1);
    }
  };

  const openRestaurant = useCallback(
    (restaurantId: string) => {
      void qc.prefetchQuery({
        queryKey: restaurantKeys.byId(restaurantId),
        queryFn: () => fetchRestaurantById(restaurantId),
        staleTime: 3 * 60 * 1000,
      });
      void qc.prefetchQuery({
        queryKey: menuKeys.byRestaurant(restaurantId),
        queryFn: () => fetchMenuItemsByRestaurant(restaurantId),
        staleTime: 2 * 60 * 1000,
      });
      void qc.prefetchQuery({
        queryKey: menuKeys.combos(restaurantId),
        queryFn: () => fetchCombosByRestaurant(restaurantId),
        staleTime: 2 * 60 * 1000,
      });
      router.push({
        pathname: '/restaurant/[restaurantId]',
        params: { restaurantId },
      });
    },
    [qc, router],
  );

  const renderRestaurantItem = useCallback(({ item, index }: { item: Restaurant; index: number }) => (
    <RestaurantListItem
      item={item}
      index={index}
      theme={theme}
      offerBadges={offerBadges}
      onPressRestaurant={openRestaurant}
    />
  ), [theme, offerBadges, openRestaurant]);

  // Filters Modal Helper functions
  const openFiltersModal = () => {
    setTempSort(activeSort);
    setTempMinRating(activeMinRating);
    setTempOffers(activeOffers);
    setShowFiltersModal(true);
  };

  const applyModalFilters = () => {
    setActiveSort(tempSort);
    setActiveMinRating(tempMinRating);
    setActiveOffers(tempOffers);
    setShowFiltersModal(false);
  };

  const clearModalFilters = () => {
    setTempSort('rating');
    setTempMinRating(null);
    setTempOffers(false);
  };

  // Cycle sorting options
  // (Unused helper; keep removed to satisfy lint)

  // const currentSortLabel = SORT_OPTIONS.find(o => o.value === activeSort)?.label ?? 'Sort';

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {!!error && (
          <ThemedView type="backgroundElement" style={styles.errorCard}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable onPress={() => fetchRestaurantsList(1)} style={styles.retryBtn}>
              <ThemedText style={[styles.retryText, { color: theme.primary }]}>Retry</ThemedText>
            </Pressable>
          </ThemedView>
        )}

        <FlatList
          data={activeOffers ? items.filter((r) => Boolean(offerBadges[r._id])) : items}
          keyExtractor={(r) => r._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingMoreText, { color: theme.textSecondary }]}>Loading more restaurants...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Finding delicious options near you...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 44 }}>🥪</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No restaurants match your search or filters.</Text>
                <Pressable
                  onPress={() => {
                    setQuery('');
                    resetFilters();
                  }}
                  style={[styles.clearBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.clearBtnText}>Reset Filters</Text>
                </Pressable>
              </View>
            )
          }
          ListHeaderComponent={
            <View style={{ paddingTop: Spacing.one, paddingBottom: Spacing.two }}>
              
              {/* Delivering to (Zomato-style Header) */}
              <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deliveringLabel, { color: theme.textSecondary }]}>
                    Delivering to
                  </Text>
                  <Pressable onPress={() => router.push('/(onboarding)/location')} style={styles.locationRow}>
                    <Text style={[styles.locationIcon, { color: theme.primary }]}>📍</Text>
                    <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                      {locationLocality}
                    </Text>
                    <Text style={[styles.locationChevron, { color: theme.textSecondary }]}>▼</Text>
                  </Pressable>
                </View>
                
                {/* Notification Icon */}
                <Pressable
                  onPress={() => router.push('/notifications')}
                  style={[styles.roundIcon, { backgroundColor: theme.backgroundSelected }]}
                >
                  <Ionicons name="notifications-outline" size={20} color={theme.text} />
                  {unreadNotifications > 0 ? (
                    <View style={styles.dot}>
                      <Text style={styles.dotText}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                
                {/* User Avatar with Orange Accent Border */}
                <Pressable
                  onPress={() => router.push('/(tabs)/profile')}
                  style={[
                    styles.avatar,
                    {
                      borderColor: theme.primary,
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  {user?.profileImage ? (
                    <Image
                      source={{ uri: user.profileImage }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
                        {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Zomato-style Search Bar & Filter button row */}
              <View style={styles.searchRowContainer}>
                <Pressable
                  onPress={() => router.push('/(tabs)/explore')}
                  style={[styles.searchBar, { backgroundColor: theme.backgroundSelected, flex: 1, marginTop: 0 }]}
                >
                  <Text style={styles.searchEmoji}>🔍</Text>
                  <Text style={[styles.searchInput, { color: theme.textSecondary, paddingTop: Platform.OS === 'ios' ? 2 : 0 }]}>
                    Search for restaurants, cuisines or dishes...
                  </Text>
                </Pressable>
                <Pressable 
                  onPress={openFiltersModal}
                  style={[styles.filterSearchBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <Ionicons name="options-outline" size={22} color={theme.primary} />
                </Pressable>
              </View>

              {/* Horizontal Scroll of Promo Offer Banners (Demo Offer Cards) */}
              <View style={styles.promoRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14 }}
                >
                  {/* Offer Card 1: Orange/Red Brand Gradient Special */}
                  <View style={[styles.promoCard, { backgroundColor: '#ff5a00' }]}>
                    <View style={styles.promoContent}>
                      <Text style={styles.promoTag}>FIRST ORDER SPECIAL</Text>
                      <Text style={styles.promoTitle}>50% OFF</Text>
                      <Text style={styles.promoSub}>Up to ₹150 on your first order</Text>
                      <Pressable style={styles.promoBtn}>
                        <Text style={[styles.promoBtnText, { color: '#ff5a00' }]}>Claim Now</Text>
                      </Pressable>
                    </View>
                    <View style={styles.promoBgSymbol}>
                      <Text style={{ fontSize: 90, color: 'rgba(255,255,255,0.15)' }}>🍲</Text>
                    </View>
                  </View>

                  {/* Offer Card 2: Dark Grey QuickBite Pro */}
                  <View style={[styles.promoCard, { backgroundColor: '#41484a' }]}>
                    <View style={styles.promoContent}>
                      <Text style={styles.promoTag}>QUICKBITE PRO</Text>
                      <Text style={styles.promoTitle}>Free Delivery</Text>
                      <Text style={styles.promoSub}>On all orders above ₹299</Text>
                      <Pressable style={[styles.promoBtn, { backgroundColor: '#ff5a00' }]}>
                        <Text style={[styles.promoBtnText, { color: '#ffffff' }]}>Join Pro</Text>
                      </Pressable>
                    </View>
                    <View style={styles.promoBgSymbol}>
                      <Text style={{ fontSize: 90, color: 'rgba(255,255,255,0.08)' }}>🛵</Text>
                    </View>
                  </View>
                </ScrollView>
              </View>

              {/* What's on your mind? Section */}
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>What&apos;s on your mind?</Text>
                <Pressable onPress={() => Alert.alert('Cuisines', 'Scroll to explore dishes!')}>
                  <Text style={[styles.seeAll, { color: theme.primary }]}>See all ›</Text>
                </Pressable>
              </View>

              {/* Interactive Category Circles */}
              <View style={styles.categoriesRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  {CATEGORIES.map((c) => {
                    const isSelected = c.name === 'All' ? activeCuisine === null : activeCuisine === c.name;
                    return (
                      <CategoryChip
                        key={c.name}
                        category={c}
                        isSelected={isSelected}
                        onSelect={handleSelectCuisine}
                        theme={theme}
                      />
                    );
                  })}
                </ScrollView>
              </View>

              {/* Horizontal Scroll of Active Filter Chips positioned right above RECOMMENDED section */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
                style={styles.filterContainer}
              >
                {/* Near & Fast */}
                <Pressable
                  onPress={() => setActiveNearAndFast(!activeNearAndFast)}
                  style={[
                    styles.filterChip,
                    activeNearAndFast && [styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]
                  ]}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: theme.text },
                    activeNearAndFast && { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}>
                    ⚡ Near & Fast {activeNearAndFast && '✕'}
                  </Text>
                </Pressable>

                {/* No packaging charges */}
                <Pressable
                  onPress={() => setActiveNoPackaging(!activeNoPackaging)}
                  style={[
                    styles.filterChip,
                    activeNoPackaging && [styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]
                  ]}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: theme.text },
                    activeNoPackaging && { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}>
                    No packaging charges {activeNoPackaging && '✕'}
                  </Text>
                </Pressable>

                {/* Quick Rating Chip */}
                {activeMinRating !== null && (
                  <Pressable
                    onPress={() => setActiveMinRating(null)}
                    style={[styles.filterChip, styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}
                  >
                    <Text style={[styles.filterChipText, { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Rating {activeMinRating}+ ✕
                    </Text>
                  </Pressable>
                )}

                {/* Quick Offers Chip */}
                {activeOffers && (
                  <Pressable
                    onPress={() => setActiveOffers(false)}
                    style={[styles.filterChip, styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}
                  >
                    <Text style={[styles.filterChipText, { color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Offers ✕
                    </Text>
                  </Pressable>
                )}
              </ScrollView>

              {/* RECOMMENDED FOR YOU Section */}
              {recommendedItems.length > 0 && (
                <View style={{ marginTop: Spacing.four, marginBottom: Spacing.two }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
                    RECOMMENDED FOR YOU
                  </Text>
                  
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 14, paddingRight: 16 }}
                  >
                    {recommendedItems.map((item, index) => {
                      const rating = Number(item.averageRating ?? 0);
                      const ratingColor = rating >= 4.0 ? '#24963F' : (rating >= 3.0 ? '#9ACD32' : '#8A8D91');
                      const discountText = offerBadges[item._id];
                      
                      return (
                        <Pressable
                          key={`rec-${item._id}`}
                          onPress={() => openRestaurant(item._id)}
                          style={styles.recCard}
                        >
                          <View style={styles.recHero}>
                            <Image
                              source={getRestaurantImage(item, index)}
                              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                              contentFit="cover"
                              transition={200}
                            />
                            <View style={styles.imageOverlayRec} />
                            
                            {discountText ? (
                              <View style={styles.recPromoBadge}>
                                <Text style={styles.recPromoBadgeText}>{discountText}</Text>
                              </View>
                            ) : null}

                            {/* Rating badge */}
                            <View style={[styles.recRatingPill, { backgroundColor: ratingColor }]}>
                              <Text style={styles.recRatingText}>★ {rating.toFixed(1)}</Text>
                            </View>
                          </View>

                          {/* Details */}
                          <View style={styles.recDetails}>
                            <Text style={[styles.recName, { color: theme.text }]} numberOfLines={1}>
                              {item.restaurantName}
                            </Text>
                            <View style={styles.recSubtitleRow}>
                              <Text style={[styles.recSubtitleText, { color: theme.textSecondary }]}>
                                ⚡ Near & Fast
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Header for Restaurants list with filter chips above it */}
              <View style={[styles.sectionRow, { marginTop: Spacing.three, marginBottom: Spacing.two }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Featured Restaurants
                </Text>
              </View>
            </View>
          }
          renderItem={renderRestaurantItem}
        />

        {/* Filters Bottom Sheet Modal */}
        <Modal
          visible={modalVisible}
          animationType="none"
          transparent={true}
          onRequestClose={() => setShowFiltersModal(false)}
        >
          <View style={styles.modalOverlay}>
            {/* Backdrop clickable overlay */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFiltersModal(false)}>
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }]} />
            </Pressable>

            {/* Slide up content container */}
            <Animated.View style={[
              styles.modalContent, 
              { 
                backgroundColor: theme.background,
                transform: [{ translateY: slideAnim }] 
              }
            ]}>
              
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filters and sorting</Text>
                <Pressable onPress={clearModalFilters}>
                  <Text style={[styles.modalClearAll, { color: theme.primary }]}>Clear All</Text>
                </Pressable>
              </View>

              {/* Body */}
              <View style={styles.modalBody}>
                {/* Left tab column */}
                <View style={[styles.tabCol, { backgroundColor: theme.backgroundSelected }]}>
                  
                  {/* Sort By tab */}
                  <Pressable 
                    onPress={() => setActiveModalTab('sort')}
                    style={[styles.tabBtn, activeModalTab === 'sort' && styles.tabBtnActive]}
                  >
                    {activeModalTab === 'sort' && <View style={[styles.indicatorLine, { backgroundColor: theme.primary }]} />}
                    <Text style={[styles.tabText, { color: theme.text }, activeModalTab === 'sort' && { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }]}>
                      Sort By
                    </Text>
                  </Pressable>

                  {/* Rating tab */}
                  <Pressable 
                    onPress={() => setActiveModalTab('rating')}
                    style={[styles.tabBtn, activeModalTab === 'rating' && styles.tabBtnActive]}
                  >
                    {activeModalTab === 'rating' && <View style={[styles.indicatorLine, { backgroundColor: theme.primary }]} />}
                    <Text style={[styles.tabText, { color: theme.text }, activeModalTab === 'rating' && { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }]}>
                      Rating
                    </Text>
                  </Pressable>

                  {/* Offers tab */}
                  <Pressable 
                    onPress={() => setActiveModalTab('offers')}
                    style={[styles.tabBtn, activeModalTab === 'offers' && styles.tabBtnActive]}
                  >
                    {activeModalTab === 'offers' && <View style={[styles.indicatorLine, { backgroundColor: theme.primary }]} />}
                    <Text style={[styles.tabText, { color: theme.text }, activeModalTab === 'offers' && { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }]}>
                      Offers
                    </Text>
                  </Pressable>

                </View>

                {/* Right content column */}
                <View style={styles.contentCol}>
                  {activeModalTab === 'sort' && (
                    <View style={{ gap: 16 }}>
                      {/* Relevance (rating desc) */}
                      <Pressable onPress={() => setTempSort('rating')} style={styles.radioOption}>
                        <View style={[styles.radioCircle, tempSort === 'rating' && { borderColor: theme.primary }]}>
                          {tempSort === 'rating' && <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Relevance</Text>
                      </Pressable>

                      {/* Distance: Low to High */}
                      <Pressable onPress={() => setTempSort('distance')} style={styles.radioOption}>
                        <View style={[styles.radioCircle, tempSort === 'distance' && { borderColor: theme.primary }]}>
                          {tempSort === 'distance' && <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Distance: Low to High</Text>
                      </Pressable>

                      {/* Rating: High to Low */}
                      <Pressable onPress={() => setTempSort('rating')} style={styles.radioOption}>
                        <View style={[styles.radioCircle, tempSort === 'rating' && { borderColor: theme.primary }]}>
                          {tempSort === 'rating' && <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Rating: High to Low</Text>
                      </Pressable>

                      {/* Delivery Time: Low to High */}
                      <Pressable onPress={() => setTempSort('deliveryTime')} style={styles.radioOption}>
                        <View style={[styles.radioCircle, tempSort === 'deliveryTime' && { borderColor: theme.primary }]}>
                          {tempSort === 'deliveryTime' && <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Delivery Time: Low to High</Text>
                      </Pressable>

                      {/* Newest */}
                      <Pressable onPress={() => setTempSort('newest')} style={styles.radioOption}>
                        <View style={[styles.radioCircle, tempSort === 'newest' && { borderColor: theme.primary }]}>
                          {tempSort === 'newest' && <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Newest</Text>
                      </Pressable>
                    </View>
                  )}

                  {activeModalTab === 'rating' && (
                    <View style={{ gap: 16 }}>
                      {/* Rated 3.5+ */}
                      <Pressable onPress={() => setTempMinRating(r => r === 3.5 ? null : 3.5)} style={styles.checkboxOption}>
                        <View style={[styles.checkboxBox, tempMinRating === 3.5 && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                          {tempMinRating === 3.5 && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Rated 3.5+</Text>
                      </Pressable>

                      {/* Rated 4.0+ */}
                      <Pressable onPress={() => setTempMinRating(r => r === 4.0 ? null : 4.0)} style={styles.checkboxOption}>
                        <View style={[styles.checkboxBox, tempMinRating === 4.0 && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                          {tempMinRating === 4.0 && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Rated 4.0+</Text>
                      </Pressable>
                    </View>
                  )}

                  {activeModalTab === 'offers' && (
                    <View style={{ gap: 16 }}>
                      {/* Buy 1 Get 1 */}
                      <Pressable onPress={() => setTempOffers(prev => !prev)} style={styles.checkboxOption}>
                        <View style={[styles.checkboxBox, tempOffers && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                          {tempOffers && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Buy 1 Get 1 and more</Text>
                      </Pressable>

                      {/* Deals of the Day */}
                      <Pressable onPress={() => setTempOffers(prev => !prev)} style={styles.checkboxOption}>
                        <View style={[styles.checkboxBox, tempOffers && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                          {tempOffers && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>Deals of the Day</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: theme.backgroundSelected }]}>
                <Pressable onPress={() => setShowFiltersModal(false)} style={styles.closeBtn}>
                  <Text style={[styles.closeBtnText, { color: theme.text }]}>Close</Text>
                </Pressable>
                <Pressable onPress={applyModalFilters} style={[styles.applyBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.applyBtnText}>Show results</Text>
                </Pressable>
              </View>

            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>

      <FloatingCartBar
        visible={cartCount > 0}
        itemCount={cartCount}
        total={cartTotal}
        restaurantName={cartRestaurantName}
        onPress={() => router.push('/cart')}
        bottom={cartBarBottom}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  errorText: { color: '#E5484D' },
  retryBtn: { marginTop: Spacing.two, alignSelf: 'flex-start' },
  retryText: { fontFamily: 'PlusJakartaSans_700Bold' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  deliveringLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 16,
  },
  locationText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
  },
  locationChevron: {
    fontSize: 10,
    marginLeft: 2,
  },
  roundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dot: {
    position: 'absolute',
    right: 4,
    top: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff5a00',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    lineHeight: 11,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
  },

  searchBar: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchEmoji: { fontSize: 16, opacity: 0.7 },
  micIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },

  // Promo Banners Row
  promoRow: {
    marginTop: 18,
  },
  promoCard: {
    width: 290,
    height: 140,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  promoContent: {
    zIndex: 2,
    flex: 1,
    justifyContent: 'center',
  },
  promoTag: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.8,
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
    marginTop: 3,
    lineHeight: 30,
  },
  promoSub: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  promoBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  promoBtnText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
  },
  promoBgSymbol: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 1,
  },

  // Filters scroll chips styling
  filterContainer: {
    marginTop: 10,
    maxHeight: 44,
    marginBottom: 6,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 24,
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.22)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
  },

  sectionRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  categoriesRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  categoryIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    textAlign: 'center',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },

  // Zomato Card Styling
  rCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  rHero: {
    height: 170,
    width: '100%',
    justifyContent: 'space-between',
    padding: 12,
    position: 'relative',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'flex-start',
    zIndex: 2,
  },
  promoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
  },
  glassBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
  },
  favoriteButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  timeDistancePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 2,
  },
  timeDistanceText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },

  rBody: {
    padding: 14,
  },
  rTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  rName: {
    fontFamily: 'PlusJakartaSans_850ExtraBold',
    fontSize: 16,
    fontWeight: '800',
  },
  rCuisines: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    fontWeight: '800',
  },
  ratingStar: {
    color: '#ffffff',
    fontSize: 11,
  },
  rPriceRow: {
    marginTop: 6,
  },
  rPriceText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(127,127,127,0.08)',
    marginVertical: 10,
  },
  cardFooterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFooterIcon: {
    fontSize: 12,
  },
  cardFooterText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans_500Medium',
    flex: 1,
  },

  // Pagination loading styles
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  clearBtnText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },

  // Sticky Cart
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    fontWeight: '800',
  },
  cartLabel: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
  cartTotal: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    fontWeight: '800',
  },
  recCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
  },
  recHero: {
    height: 120,
    width: 140,
    justifyContent: 'space-between',
    padding: 8,
    position: 'relative',
  },
  imageOverlayRec: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
  },
  recPromoBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    zIndex: 2,
  },
  recPromoBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
  },
  recRatingPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 2,
  },
  recRatingText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 9.5,
    fontWeight: '800',
  },
  recDetails: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  recName: {
    fontFamily: 'PlusJakartaSans_750Bold',
    fontSize: 13,
    fontWeight: '700',
  },
  recSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  recSubtitleText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  searchRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  filterSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    display: 'flex',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127,127,127,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
  },
  modalClearAll: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  tabCol: {
    width: '35%',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(127,127,127,0.08)',
  },
  contentCol: {
    width: '65%',
    height: '100%',
    padding: 20,
  },
  tabBtn: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  indicatorLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8A8D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8A8D91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.3)',
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontWeight: '800',
  },
});
