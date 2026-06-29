import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { storageGetItem, storageSetItem, storageRemoveItem } from '@/lib/storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGlobalSearchQuery, useTrendingSearchesQuery } from '@/hooks/queries/search';
import { useRecommendedRestaurantsQuery } from '@/hooks/queries/restaurants';
import { cartKeys, useAddToCartMutation } from '@/hooks/queries/cart';

type SearchRestaurant = {
  _id: string;
  restaurantName: string;
  cuisines?: string[];
  averageRating?: number;
  logo?: string;
  averageDeliveryTime?: number;
  distanceKm?: number;
  minimumOrderAmount?: number;
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
  theme: any;
  onPress: () => void;
}

const RestaurantSearchItem = memo(({ item, theme, onPress }: RestaurantSearchItemProps) => (
  <Pressable onPress={onPress}>
    <ThemedView type="backgroundElement" style={styles.restaurantRowCard}>
      <Image
        source={item.logo && item.logo.length > 0
          ? { uri: item.logo }
          : { uri: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150&auto=format&fit=crop&q=80' }
        }
        style={styles.restaurantRowImage}
        transition={200}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText style={styles.restaurantRowName}>{item.restaurantName}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.restaurantRowSub}>
          {(item.cuisines ?? []).slice(0, 3).join(' • ') || 'Indian • Fast Food'}
        </ThemedText>
        <View style={styles.restaurantMetadataRow}>
          <View style={styles.badgeRatingPill}>
            <ThemedText style={styles.badgeRatingText}>⭐ {(item.averageRating ?? 4.4).toFixed(1)}</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.restaurantMetadataText}>
            {item.averageDeliveryTime ?? 30} mins • {item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : '1.2 km'}
          </ThemedText>
        </View>
        <View style={styles.promoOfferRow}>
          <ThemedText style={[styles.promoOfferText, { color: theme.primary }]}>
            🏷️ FLAT 50% OFF | Use code FIRST50
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  </Pressable>
));
RestaurantSearchItem.displayName = 'RestaurantSearchItem';

interface FoodSearchItemProps {
  item: SearchFood;
  theme: any;
  onAddPress: () => void;
  onRestaurantPress: () => void;
}

const FoodSearchItem = memo(({ item, theme, onAddPress, onRestaurantPress }: FoodSearchItemProps) => (
  <ThemedView type="backgroundElement" style={styles.foodRowCard}>
    <Image
      source={item.images && item.images.length > 0 && item.images[0]
        ? { uri: item.images[0] }
        : { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80' }
      }
      style={styles.foodRowImage}
      transition={200}
    />
    <View style={{ flex: 1, gap: 4 }}>
      <View style={styles.foodTitleRow}>
        <View style={[styles.typeDot, { borderColor: item.foodType === 'veg' ? '#0f8a5f' : '#e23744' }]}>
          <View style={[styles.typeDotInner, { backgroundColor: item.foodType === 'veg' ? '#0f8a5f' : '#e23744' }]} />
        </View>
        <ThemedText style={styles.foodRowName} numberOfLines={1}>{item.itemName}</ThemedText>
      </View>
      <ThemedText style={styles.foodRowPrice}>₹{item.price}</ThemedText>
      <Pressable onPress={onRestaurantPress}>
        <ThemedText style={[styles.foodSellerText, { color: theme.primary }]}>
          by {item.restaurantId.restaurantName} ★ {(item.restaurantId.averageRating ?? 4.4).toFixed(1)} ›
        </ThemedText>
      </Pressable>
    </View>
    <View style={styles.addBtnContainer}>
      <Pressable onPress={onAddPress} style={[styles.addBtn, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}>
        <ThemedText style={[styles.addBtnText, { color: theme.primary }]}>ADD +</ThemedText>
      </Pressable>
    </View>
  </ThemedView>
));
FoodSearchItem.displayName = 'FoodSearchItem';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const addMutation = useAddToCartMutation();

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'dishes'>('restaurants');

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
      });
      await qc.invalidateQueries({ queryKey: cartKeys.all });
      Alert.alert('Added', `${item.itemName} added to your cart.`);
    } catch (e: any) {
      Alert.alert('Oops', e?.response?.data?.message ?? e?.message ?? 'Failed to add item');
    }
  };

  const getFoodImage = (item: SearchFood) => {
    if (item.images && item.images.length > 0 && item.images[0]) {
      return { uri: item.images[0] };
    }
    return { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80' };
  };

  const getRestaurantImage = (item: SearchRestaurant) => {
    if (item.logo && item.logo.length > 0) {
      return { uri: item.logo };
    }
    return { uri: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150&auto=format&fit=crop&q=80' };
  };

  const renderRestaurantItem = useCallback(({ item }: { item: SearchRestaurant }) => (
    <RestaurantSearchItem
      item={item}
      theme={theme}
      onPress={() => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: item._id } })}
    />
  ), [theme, router]);

  const renderFoodItem = useCallback(({ item }: { item: SearchFood }) => (
    <FoodSearchItem
      item={item}
      theme={theme}
      onAddPress={() => handleAddFoodDirect(item)}
      onRestaurantPress={() => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: item.restaurantId._id } })}
    />
  ), [theme, router, handleAddFoodDirect]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Dynamic craver title header */}
        <View style={styles.header}>
          <ThemedText style={styles.cravingTitle}>What are you craving today? 🍕</ThemedText>
        </View>

        {/* Search Bar with Magnifier, Voice mic & Clear */}
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search restaurants, cuisines, or dishes..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ('')} style={styles.iconPadding}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => Alert.alert('Voice Search', 'Listening feature coming soon!')} style={styles.iconPadding}>
              <Ionicons name="mic-outline" size={18} color={theme.primary} />
            </Pressable>
          )}
        </View>

        {/* Filter chips bar (Shown only when results are present) */}
        {debounced.trim().length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              onPress={() => setVegOnly(!vegOnly)}
              style={[styles.filterChip, vegOnly && [styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]]}
            >
              <ThemedText style={[styles.filterText, vegOnly && { color: theme.primary }]}>
                🟢 Veg Only {vegOnly && '✕'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setTopRated(!topRated)}
              style={[styles.filterChip, topRated && [styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]]}
            >
              <ThemedText style={[styles.filterText, topRated && { color: theme.primary }]}>
                ⭐ 4.0+ Rating {topRated && '✕'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setHasOffers(!hasOffers)}
              style={[styles.filterChip, hasOffers && [styles.filterChipActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]]}
            >
              <ThemedText style={[styles.filterText, hasOffers && { color: theme.primary }]}>
                🏷️ Flat Offers {hasOffers && '✕'}
              </ThemedText>
            </Pressable>
          </ScrollView>
        )}

        {/* Global error card */}
        {!!error && (
          <ThemedView type="backgroundElement" style={styles.errorCard}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}

        {/* CONDITIONAL LAYOUT STATES */}
        {debounced.trim().length === 0 ? (
          // STATE A: BEFORE TYPING SCREEN
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
                  <Pressable onPress={clearRecentSearches}>
                    <ThemedText style={styles.clearBtnText}>Clear All</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.recentList}>
                  {recentSearches.map((term, i) => (
                    <Pressable
                      key={`recent-${i}`}
                      onPress={() => {
                        setQ(term);
                        setDebounced(term);
                      }}
                      style={styles.recentItemRow}
                    >
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 10 }} />
                      <ThemedText style={styles.recentItemText}>{term}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Cravings Grid */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Popular Cravings</ThemedText>
              <View style={styles.gridContainer}>
                {POPULAR_CRAVINGS.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      setQ(item.name);
                      setDebounced(item.name);
                    }}
                    style={[styles.gridCard, { backgroundColor: theme.backgroundSelected }]}
                  >
                    <ThemedText style={styles.gridCardText}>{item.display}</ThemedText>
                    <Image source={{ uri: item.image }} style={styles.gridCardImage} transition={200} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Trending Search Tags */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Trending Searches</ThemedText>
              <View style={styles.tagsContainer}>
                {trendingList.length > 0 ? (
                  trendingList.slice(0, 8).map((t, idx) => (
                    <Pressable
                      key={`trend-${idx}`}
                      onPress={() => {
                        setQ(t.query);
                        setDebounced(t.query);
                      }}
                      style={[styles.tagChip, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <ThemedText style={styles.tagChipText}>🔥 {t.query}</ThemedText>
                    </Pressable>
                  ))
                ) : (
                  // Fallbacks if no search trending scores yet
                  ['Biryani', 'Margherita', 'Garlic Bread', 'Smoothie', 'Protein Bowl'].map((name) => (
                    <Pressable
                      key={`fallback-${name}`}
                      onPress={() => {
                        setQ(name);
                        setDebounced(name);
                      }}
                      style={[styles.tagChip, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <ThemedText style={styles.tagChipText}>🔥 {name}</ThemedText>
                    </Pressable>
                  ))
                )}
              </View>
            </View>

            {recommended.length > 0 ? (
              <View style={styles.sectionContainer}>
                <ThemedText style={styles.sectionTitle}>Recommended for you</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
                  {recommended.slice(0, 8).map((r: any) => (
                    <Pressable
                      key={r._id}
                      onPress={() =>
                        router.push({
                          pathname: '/restaurant/[restaurantId]',
                          params: { restaurantId: String(r._id) },
                        })
                      }
                      style={[styles.recCard, { backgroundColor: theme.backgroundSelected }]}
                    >
                      {r.logo ? (
                        <Image source={{ uri: r.logo }} style={styles.recImage} transition={200} />
                      ) : (
                        <View style={[styles.recImage, styles.recImagePlaceholder]}>
                          <Ionicons name="restaurant" size={28} color={theme.textSecondary} />
                        </View>
                      )}
                      <ThemedText style={styles.recName} numberOfLines={1}>
                        {r.restaurantName}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.recMeta} numberOfLines={1}>
                        ⭐ {Number(r.averageRating ?? 0).toFixed(1)} · {r.averageDeliveryTime ?? 30} min
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          // STATE B & C: RESULTS LIST
          <View style={{ flex: 1 }}>
            {/* Custom Tab Selector */}
            <View style={[styles.tabsContainer, { borderBottomColor: theme.backgroundSelected }]}>
              <Pressable
                onPress={() => setActiveTab('restaurants')}
                style={[styles.tabButton, activeTab === 'restaurants' && [styles.tabButtonActive, { borderBottomColor: theme.primary }]]}
              >
                <ThemedText
                  style={[
                    styles.tabButtonText,
                    activeTab === 'restaurants' && [styles.tabButtonTextActive, { color: theme.primary }],
                  ]}
                >
                  Restaurants ({filteredRestaurants.length})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('dishes')}
                style={[styles.tabButton, activeTab === 'dishes' && [styles.tabButtonActive, { borderBottomColor: theme.primary }]]}
              >
                <ThemedText
                  style={[
                    styles.tabButtonText,
                    activeTab === 'dishes' && [styles.tabButtonTextActive, { color: theme.primary }],
                  ]}
                >
                  Dishes ({filteredFoods.length})
                </ThemedText>
              </Pressable>
            </View>

            {/* Main results list */}
            {busy ? (
              <View style={styles.emptyResultsState}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText themeColor="textSecondary" style={{ marginTop: 12 }}>
                  Searching menus and kitchens...
                </ThemedText>
              </View>
            ) : activeTab === 'restaurants' ? (
              // RESTAURANT RESULTS
              <FlatList
                data={filteredRestaurants}
                keyExtractor={(r) => r._id}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={() => searchQuery.refetch()} />}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={
                  <View style={styles.emptyResultsState}>
                    <ThemedText themeColor="textSecondary">No restaurants match your search.</ThemedText>
                  </View>
                }
                renderItem={renderRestaurantItem}
              />
            ) : (
              // FOOD ITEMS (DISHES) RESULTS
              <FlatList
                data={filteredFoods}
                keyExtractor={(f) => f._id}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={busy} onRefresh={() => searchQuery.refetch()} />}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={
                  <View style={styles.emptyResultsState}>
                    <ThemedText themeColor="textSecondary">No dishes match your search.</ThemedText>
                  </View>
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
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  header: { marginBottom: Spacing.two },
  cravingTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.25)',
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    paddingVertical: 4,
  },
  iconPadding: { padding: 4 },

  // Filters
  filterContainer: {
    marginTop: 8,
    maxHeight: 40,
    marginBottom: 8,
    flexGrow: 0,
  },
  filterScroll: {
    gap: 10,
    paddingRight: Spacing.four,
    alignItems: 'center',
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: { borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Sections
  sectionContainer: { marginTop: Spacing.two, marginBottom: Spacing.three },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginBottom: 8,
  },
  clearBtnText: { fontSize: 12, color: '#ff5a00', fontFamily: 'PlusJakartaSans_700Bold' },

  // Recent searches layout
  recentList: { gap: 10 },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  recentItemText: { fontSize: 14, color: '#313535', fontFamily: 'PlusJakartaSans_500Medium' },

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
    borderColor: 'rgba(228,190,177,0.15)',
  },
  gridCardText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
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
    borderColor: 'rgba(228,190,177,0.15)',
  },
  tagChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },

  recScroll: { gap: 12, paddingTop: 8, paddingRight: 4 },
  recCard: {
    width: 140,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.2)',
  },
  recImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 8 },
  recImagePlaceholder: {
    backgroundColor: 'rgba(228,190,177,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
  recMeta: { marginTop: 4, fontSize: 11 },

  // Tab View selectors
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomWidth: 2.5 },
  tabButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#8A8D91',
  },
  tabButtonTextActive: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },

  // Results Layout
  restaurantRowCard: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.2)',
  },
  restaurantRowImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#f0f0f0' },
  restaurantRowName: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  restaurantRowSub: { fontSize: 11, marginTop: -2 },
  restaurantMetadataRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  badgeRatingPill: {
    backgroundColor: '#24963F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRatingText: { color: '#ffffff', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  restaurantMetadataText: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' },
  promoOfferRow: { marginTop: 4 },
  promoOfferText: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' },

  // Dishes rows
  foodRowCard: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(228,190,177,0.2)',
    alignItems: 'center',
  },
  foodRowImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#f0f0f0' },
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
  foodRowName: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', flex: 1 },
  foodRowPrice: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  foodSellerText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
  addBtnContainer: { justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  addBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },

  emptyResultsState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  // Error Card
  errorCard: {
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  errorText: { color: '#E5484D', fontSize: 13 },
});
