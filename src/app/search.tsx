import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { storageGetItem, storageSetItem, storageRemoveItem } from '@/lib/storage';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { ShopCard } from '@/components/shop-card';
import { useThemeContext } from '@/context/ThemeContext';
import { CASE_CATEGORY_META, CASE_SHOP_CATEGORIES } from '@/constants/caseHome';
import { useGlobalSearchQuery, useTrendingSearchesQuery } from '@/hooks/queries/search';
import { useRecommendedRestaurantsQuery } from '@/hooks/queries/restaurants';
import { useProfileQuery } from '@/hooks/queries/profile';
import { cartKeys, useAddToCartMutation } from '@/hooks/queries/cart';
import { fetchWallet } from '@/services/wallet';
import { toast } from '@/lib/toast';

type SearchRestaurant = {
  _id: string;
  restaurantName: string;
  cuisines?: string[];
  averageRating?: number;
  logo?: string;
  averageDeliveryTime?: number;
  distanceKm?: number;
  minimumOrderAmount?: number;
  isOpen?: boolean;
};

type SearchFood = {
  _id: string;
  itemName: string;
  description?: string;
  price: number;
  foodType?: 'veg' | 'nonveg' | 'egg';
  images?: string[];
  addons?: Array<{ name: string; price: number; isAvailable: boolean }>;
  restaurantId: {
    _id: string;
    restaurantName: string;
    averageRating?: number;
    isOpen?: boolean;
    logo?: string;
  };
};

const POPULAR_CRAVINGS = [
  { name: 'Biryani', display: 'Biryani Cravings', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&auto=format&fit=crop&q=80' },
  { name: 'Pizza', display: 'Cheesy Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80' },
  { name: 'Burgers', display: 'Juicy Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80' },
  { name: 'Cake', display: 'Sweet Cakes', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&auto=format&fit=crop&q=80' },
  { name: 'Dessert', display: 'Desserts & Sweets', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=150&auto=format&fit=crop&q=80' },
  { name: 'Kebab', display: 'Hot Kebabs', image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=150&auto=format&fit=crop&q=80' },
];

// ─── Memoized search result rows ───────────────────────────────────────────

interface RestaurantSearchItemProps {
  item: SearchRestaurant;
  index: number;
  onPress: () => void;
}

const RestaurantSearchItem = memo(({ item, index, onPress }: RestaurantSearchItemProps) => {
  const merchant = { ...item, id: item._id };
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(240)}>
      <ShopCard
        merchant={merchant as any}
        index={index}
        variant="list"
        onPress={onPress}
      />
    </Animated.View>
  );
});
RestaurantSearchItem.displayName = 'RestaurantSearchItem';

interface FoodSearchItemProps {
  item: SearchFood;
  index: number;
  onAddPress: () => void;
  onRestaurantPress: () => void;
}

const FoodSearchItem = memo(({ item, index, onAddPress, onRestaurantPress }: FoodSearchItemProps) => {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const isClosed = item.restaurantId?.isOpen === false;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(240)}>
      <View
        style={[
          styles.foodRowCard,
          {
            backgroundColor: isDark ? '#18181C' : CaseUi.white,
            borderColor: isDark ? '#282830' : CaseUi.line,
          },
          isClosed && styles.dimmed,
        ]}
      >
        <Image
          source={item.images && item.images.length > 0 && item.images[0]
            ? { uri: item.images[0] }
            : { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80' }
          }
          style={styles.foodRowImage}
          transition={200}
          contentFit="cover"
        />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.foodTitleRow}>
            <View style={[styles.typeDot, { borderColor: item.foodType === 'veg' ? CaseUi.success : CaseUi.danger }]}>
              <View style={[styles.typeDotInner, { backgroundColor: item.foodType === 'veg' ? CaseUi.success : CaseUi.danger }]} />
            </View>
            <Text style={[styles.foodRowName, { color: colors.text }]} numberOfLines={1}>{item.itemName}</Text>
          </View>
          <Text style={styles.foodRowPrice}>J${Math.round(item.price)}</Text>
          <PressableScale onPress={onRestaurantPress}>
            <Text style={[styles.foodSellerText, { color: colors.textSecondary }]} numberOfLines={1}>
              by {item.restaurantId.restaurantName} · {(item.restaurantId.averageRating ?? 4.4).toFixed(1)} ★
            </Text>
          </PressableScale>
        </View>
        <PressableScale
          onPress={onAddPress}
          disabled={isClosed}
          style={[
            styles.addBtn,
            isClosed && styles.addBtnDisabled,
            isClosed && { backgroundColor: isDark ? '#27272A' : CaseUi.field, borderColor: isDark ? '#3F3F46' : CaseUi.line },
          ]}
        >
          <Text style={[styles.addBtnText, isClosed && styles.addBtnTextDisabled]}>
            {isClosed ? 'CLOSED' : 'ADD'}
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
});
FoodSearchItem.displayName = 'FoodSearchItem';

export default function SearchScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const addMutation = useAddToCartMutation();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'dishes'>('restaurants');

  const profileQ = useProfileQuery();
  const user = profileQ.data;
  const walletQ = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    retry: false,
    staleTime: 60 * 1000,
  });
  const walletBalance = Number(walletQ.data?.balance ?? walletQ.data?.walletBalance ?? 0);

  // Filters State
  const [vegOnly, setVegOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);

  const loadRecentSearches = useCallback(async () => {
    try {
      const val = await storageGetItem('recent_searches');
      if (val) {
        setRecentSearches(JSON.parse(val));
      }
    } catch (e) {
      console.log('Error loading recent searches', e);
    }
  }, []);

  const saveSearch = useCallback(async (term: string) => {
    try {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
        const updated = [term, ...filtered].slice(0, 5);
        void storageSetItem('recent_searches', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.log('Error saving recent search', e);
    }
  }, []);

  useEffect(() => {
    // Hydrate recent searches from storage once on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async storage read
    void loadRecentSearches();
  }, [loadRecentSearches]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      if (q.trim().length >= 2) {
        void saveSearch(q.trim());
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q, saveSearch]);

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await storageRemoveItem('recent_searches');
    } catch (e) {
      console.log('Error clearing recent searches', e);
    }
  };

  const deleteRecentSearch = async (index: number) => {
    try {
      setRecentSearches((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        void storageSetItem('recent_searches', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.log('Error deleting recent search', e);
    }
  };

  // Queries
  const searchQuery = useGlobalSearchQuery(debounced);
  const trendingQuery = useTrendingSearchesQuery();
  const recommendedQuery = useRecommendedRestaurantsQuery();
  const recommended = useMemo(
    () => (Array.isArray(recommendedQuery.data) ? recommendedQuery.data : []),
    [recommendedQuery.data],
  );

  const trendingList = useMemo(() => {
    return trendingQuery.data ?? [];
  }, [trendingQuery.data]);

  const rawRestaurants = useMemo(
    () => ((searchQuery.data as any)?.search?.restaurants ?? []) as SearchRestaurant[],
    [searchQuery.data]
  );

  const rawFoods = useMemo(
    () => ((searchQuery.data as any)?.search?.foods ?? []) as SearchFood[],
    [searchQuery.data]
  );

  // Filtered lists
  const filteredRestaurants = useMemo(() => {
    return rawRestaurants.filter((r) => {
      if (topRated && (r.averageRating ?? 0) < 4.0) return false;
      return true;
    });
  }, [rawRestaurants, topRated]);

  const filteredFoods = useMemo(() => {
    return rawFoods.filter((f) => {
      if (vegOnly && f.foodType !== 'veg') return false;
      if (topRated && (f.restaurantId?.averageRating ?? 0) < 4.0) return false;
      return true;
    });
  }, [rawFoods, vegOnly, topRated]);

  const busy = searchQuery.isFetching;
  const error = (searchQuery.error as any)?.message ?? null;

  const handleAddFoodDirect = async (item: SearchFood) => {
    if (item.restaurantId?.isOpen === false) {
      toast.warning('This restaurant is currently closed.', 'Closed');
      return;
    }
    const hasSizesOrAddons = item.addons && item.addons.length > 0;
    if (hasSizesOrAddons) {
      Alert.alert(
        'Choice Required',
        `"${item.itemName}" has portion sizes or custom addons. Let's customize it on the restaurant page.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Customize',
            onPress: () => {
              router.push({
                pathname: '/restaurant/[restaurantId]',
                params: { restaurantId: item.restaurantId._id },
              });
            },
          },
        ]
      );
      return;
    }

    try {
      await addMutation.mutateAsync({
        restaurantId: item.restaurantId._id,
        menuItemId: item._id,
        quantity: 1,
        itemName: item.itemName,
        price: Number(item.price ?? 0),
        restaurantName: item.restaurantId.restaurantName,
      });
      await qc.invalidateQueries({ queryKey: cartKeys.all });
      toast.success(`${item.itemName} added to your cart`, 'Added');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to add item');
    }
  };

  const renderRestaurantItem = useCallback(({ item, index }: { item: SearchRestaurant; index: number }) => (
    <RestaurantSearchItem
      item={item}
      index={index}
      onPress={() => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: item._id } })}
    />
  ), [router]);

  const renderFoodItem = useCallback(({ item, index }: { item: SearchFood; index: number }) => (
    <FoodSearchItem
      item={item}
      index={index}
      onAddPress={() => handleAddFoodDirect(item)}
      onRestaurantPress={() => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: item.restaurantId._id } })}
    />
  ), [router, handleAddFoodDirect]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header: back button + search bar */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.headerRow}>
          <PressableScale
            onPress={() => router.back()}
            style={[styles.headerBackBtn, { backgroundColor: isDark ? '#1F1F24' : CaseUi.field }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </PressableScale>
          <View
            style={[
              styles.searchBarCompact,
              {
                backgroundColor: isDark ? '#18181C' : CaseUi.field,
                borderColor: isDark ? '#27272A' : CaseUi.line,
              },
            ]}
          >
            <Ionicons name="search" size={17} color={colors.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search restaurants, cuisines, or dishes..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {q.length > 0 ? (
              <PressableScale onPress={() => setQ('')} style={styles.iconPadding} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={CaseUi.muted} />
              </PressableScale>
            ) : (
              <PressableScale onPress={() => toast.info('Listening feature coming soon!', 'Voice search')} style={styles.iconPadding} hitSlop={6}>
                <Ionicons name="mic-outline" size={18} color={CaseUi.orange} />
              </PressableScale>
            )}
          </View>
        </Animated.View>

        {/* Category quick filters - only show when not searching */}
        {debounced.trim().length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
          >
            {CASE_SHOP_CATEGORIES.map((catId) => {
              const meta = CASE_CATEGORY_META[catId];
              return (
                <PressableScale
                  key={catId}
                  onPress={() =>
                    router.push({ pathname: '/category/[businessType]', params: { businessType: catId } })
                  }
                  style={[
                    styles.categoryFilterChip,
                    {
                      backgroundColor: isDark ? '#1C1C22' : meta.bg,
                      borderColor: isDark ? '#2A2A32' : 'rgba(0,0,0,0.04)',
                    },
                  ]}
                >
                  <View style={[
                    styles.categoryIconWrap,
                    { backgroundColor: isDark ? '#2A2A32' : meta.color }
                  ]}>
                    <Ionicons name={meta.icon} size={15} color={isDark ? '#FFFFFF' : '#FFFFFF'} />
                  </View>
                  <Text style={[styles.categoryFilterText, { color: isDark ? '#E5E5EA' : CaseUi.ink }]}>{meta.short}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}

        {/* Filter chips bar (Shown only when results are present) */}
        {debounced.trim().length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterScroll}
          >
            <PressableScale
              onPress={() => setVegOnly(!vegOnly)}
              style={[styles.filterChip, vegOnly && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, vegOnly && styles.filterTextActive]}>
                Veg Only {vegOnly && '✕'}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => setTopRated(!topRated)}
              style={[styles.filterChip, topRated && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, topRated && styles.filterTextActive]}>
                ⭐ 4.0+ Rating {topRated && '✕'}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => setHasOffers(!hasOffers)}
              style={[styles.filterChip, hasOffers && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, hasOffers && styles.filterTextActive]}>
                🏷️ Flat Offers {hasOffers && '✕'}
              </Text>
            </PressableScale>
          </ScrollView>
        )}

        {/* Global error card */}
        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={16} color={CaseUi.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CONDITIONAL LAYOUT STATES */}
        {debounced.trim().length === 0 ? (
          // STATE A: BEFORE TYPING SCREEN
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <Animated.View entering={FadeInDown.delay(40).duration(260)} style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Recent Searches</Text>
                  <PressableScale onPress={clearRecentSearches}>
                    <Text style={styles.clearBtnText}>Clear All</Text>
                  </PressableScale>
                </View>
                <View style={styles.recentList}>
                  {recentSearches.map((term, i) => (
                    <View key={`recent-${i}`} style={styles.recentItemRow}>
                      <PressableScale
                        onPress={() => {
                          setQ(term);
                          setDebounced(term);
                        }}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Ionicons name="time-outline" size={16} color={CaseUi.muted} style={{ marginRight: 10 }} />
                        <Text style={styles.recentItemText}>{term}</Text>
                      </PressableScale>
                      <PressableScale onPress={() => deleteRecentSearch(i)} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color={CaseUi.muted} />
                      </PressableScale>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Popular Cravings Grid */}
            <Animated.View entering={FadeInDown.delay(80).duration(260)} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Popular Cravings</Text>
              <View style={styles.gridContainer}>
                {POPULAR_CRAVINGS.map((item) => (
                  <PressableScale
                    key={item.name}
                    onPress={() => {
                      setQ(item.name);
                      setDebounced(item.name);
                    }}
                    style={styles.gridCard}
                  >
                    <Text style={styles.gridCardText}>{item.display}</Text>
                    <Image source={{ uri: item.image }} style={styles.gridCardImage} transition={200} contentFit="cover" />
                  </PressableScale>
                ))}
              </View>
            </Animated.View>

            {/* Trending Search Tags */}
            <Animated.View entering={FadeInDown.delay(120).duration(260)} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <View style={styles.tagsContainer}>
                {trendingList.length > 0 ? (
                  trendingList.slice(0, 8).map((t, idx) => (
                    <PressableScale
                      key={`trend-${idx}`}
                      onPress={() => {
                        setQ(t.query);
                        setDebounced(t.query);
                      }}
                      style={styles.tagChip}
                    >
                      <Text style={styles.tagChipText}>🔥 {t.query}</Text>
                    </PressableScale>
                  ))
                ) : (
                  // Fallbacks if no search trending scores yet
                  ['Biryani', 'Margherita', 'Garlic Bread', 'Smoothie', 'Protein Bowl'].map((name) => (
                    <PressableScale
                      key={`fallback-${name}`}
                      onPress={() => {
                        setQ(name);
                        setDebounced(name);
                      }}
                      style={styles.tagChip}
                    >
                      <Text style={styles.tagChipText}>🔥 {name}</Text>
                    </PressableScale>
                  ))
                )}
              </View>
            </Animated.View>

            {recommended.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(160).duration(260)} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Recommended for you</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
                  {recommended.slice(0, 8).map((r: any) => (
                    <PressableScale
                      key={r._id}
                      onPress={() =>
                        router.push({
                          pathname: '/restaurant/[restaurantId]',
                          params: { restaurantId: String(r._id) },
                        })
                      }
                      style={styles.recCard}
                    >
                      {r.logo ? (
                        <Image source={{ uri: r.logo }} style={styles.recImage} transition={200} contentFit="cover" />
                      ) : (
                        <View style={[styles.recImage, styles.recImagePlaceholder]}>
                          <Ionicons name="restaurant" size={28} color={CaseUi.muted} />
                        </View>
                      )}
                      <Text style={styles.recName} numberOfLines={1}>
                        {r.restaurantName}
                      </Text>
                      <Text style={styles.recMeta} numberOfLines={1}>
                        ⭐ {Number(r.averageRating ?? 0).toFixed(1)} · {r.averageDeliveryTime ?? 30} min
                      </Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </Animated.View>
            ) : null}
          </ScrollView>
        ) : (
          // STATE B & C: RESULTS LIST
          <View style={{ flex: 1 }}>
            {/* Custom Tab Selector */}
            <View style={styles.tabsContainer}>
              <PressableScale
                onPress={() => setActiveTab('restaurants')}
                style={[styles.tabButton, activeTab === 'restaurants' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, activeTab === 'restaurants' && styles.tabButtonTextActive]}>
                  Restaurants ({filteredRestaurants.length})
                </Text>
              </PressableScale>
              <PressableScale
                onPress={() => setActiveTab('dishes')}
                style={[styles.tabButton, activeTab === 'dishes' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, activeTab === 'dishes' && styles.tabButtonTextActive]}>
                  Dishes ({filteredFoods.length})
                </Text>
              </PressableScale>
            </View>

            {/* Main results list */}
            {busy ? (
              <View style={styles.skeletonList}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <SkeletonBlock width={70} height={70} radius={12} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <SkeletonBlock width="70%" height={15} />
                      <SkeletonBlock width="45%" height={11} />
                      <SkeletonBlock width="30%" height={11} />
                    </View>
                  </View>
                ))}
              </View>
            ) : activeTab === 'restaurants' ? (
              // RESTAURANT RESULTS
              <FlatList
                data={filteredRestaurants}
                keyExtractor={(r) => r._id}
                contentContainerStyle={{ padding: 4, paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={() => searchQuery.refetch()} tintColor={CaseUi.orange} />}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={
                  <EmptyState icon="restaurant-outline" title="No restaurants found" subtitle="Try a different search term." />
                }
                renderItem={renderRestaurantItem}
              />
            ) : (
              // FOOD ITEMS (DISHES) RESULTS
              <FlatList
                data={filteredFoods}
                keyExtractor={(f) => f._id}
                contentContainerStyle={{ padding: 4, paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={() => searchQuery.refetch()} tintColor={CaseUi.orange} />}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={
                  <EmptyState icon="fast-food-outline" title="No dishes found" subtitle="Try a different search term." />
                }
                renderItem={renderFoodItem}
              />
            )}
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingTop: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.field,
  },
  searchBarCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    justifyContent: 'center',
  },
  categoryFilterRow: {
    gap: 6,
    paddingBottom: 8,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: CaseUi.ink,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: CaseUi.ink,
    paddingVertical: 0,
  },
  iconPadding: { padding: 4 },

  // Filters
  filterContainer: {
    marginBottom: 0,
    maxHeight: 40,
    flexGrow: 0,
  },
  filterScroll: {
    gap: 10,
    paddingRight: 16,
    alignItems: 'center',
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: { borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft },
  filterText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  filterTextActive: { color: CaseUi.orange },

  // Sections
  sectionContainer: { marginTop: 4, marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
    marginBottom: 6,
  },
  clearBtnText: { fontSize: 12, color: CaseUi.orange, fontFamily: 'PlusJakartaSans_700Bold' },

  // Recent searches layout
  recentList: { gap: 10 },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  recentItemText: { fontSize: 14, color: CaseUi.ink, fontFamily: 'PlusJakartaSans_500Medium' },

  // Popular cravings grid layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  gridCard: {
    width: '48%',
    height: 70,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  gridCardText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
    maxWidth: '60%',
  },
  gridCardImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },

  // Trending search tags layout
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  tagChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink },

  recScroll: { gap: 12, paddingTop: 8, paddingRight: 4 },
  recCard: {
    width: 140,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  recImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 8, backgroundColor: CaseUi.field },
  recImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
  recMeta: { marginTop: 4, fontSize: 11, color: CaseUi.muted },

  // Tab View selectors
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
    marginBottom: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: CaseUi.orange },
  tabButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
  },
  tabButtonTextActive: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.orange },

  // Results Layout
  restaurantRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CaseUi.radius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  dimmed: { opacity: 0.65 },
  restaurantRowImage: { width: 68, height: 68, borderRadius: 12, backgroundColor: CaseUi.field },
  restaurantRowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  restaurantRowSub: { fontSize: 11, marginTop: -2, color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium' },
  restaurantMetadataRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  badgeRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: CaseUi.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRatingText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  restaurantMetadataText: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted },
  closedText: { marginTop: 4, fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.danger },

  // Dishes rows
  foodRowCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: CaseUi.radius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    alignItems: 'center',
    ...CaseUi.softShadow,
  },
  foodRowImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: CaseUi.field },
  foodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: {
    width: 12,
    height: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  typeDotInner: { width: 6, height: 6, borderRadius: 999 },
  foodRowName: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink, flex: 1 },
  foodRowPrice: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.orange },
  foodSellerText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  addBtn: {
    width: 56,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { borderColor: CaseUi.line, backgroundColor: CaseUi.field },
  addBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.orange },
  addBtnTextDisabled: { color: CaseUi.muted },

  skeletonList: { padding: 4, gap: 10 },
  skeletonRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },

  // Error Card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    backgroundColor: '#FEF2F2',
  },
  errorText: { color: CaseUi.danger, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 },
});
