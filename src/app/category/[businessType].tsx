import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { ShopCard } from '@/components/shop-card';
import { ProductCard } from '@/components/product-card';
import { CategoryListSkeleton } from '@/components/skeleton';
import {
  CASE_CATEGORY_META,
  CASE_HOME_CATEGORY_ROW,
  type CaseCategoryId,
} from '@/constants/caseHome';
import { CaseUi } from '@/constants/caseUi';
import type { MenuItemAttributes } from '@/constants/categoryFields';
import { caseKeys, useCaseMerchantsQuery } from '@/hooks/queries/case';
import { useCart } from '@/hooks/use-cart';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { fetchCaseMerchantMenu } from '@/services/case';
import { useThemeContext } from '@/context/ThemeContext';

type ProductRow = {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  storeName?: string;
  businessType?: string;
  foodType?: string | null;
  attributes?: MenuItemAttributes | null;
  deliveryMins?: number;
  discountPct?: number;
};

const PROMO: Record<
  string,
  { title: string; sub: string; colors: [string, string]; image: string }
> = {
  ALL: {
    title: 'Campus favourites',
    sub: 'Everything, one place, delivered fast',
    colors: ['#E8F8EE', '#D4F0DE'],
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&auto=format&fit=crop&q=80',
  },
  RESTAURANT: {
    title: 'Hungry?',
    sub: 'Order from campus kitchens near you',
    colors: ['#E8F8EE', '#C8EED6'],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
  PHARMACY: {
    title: 'Feeling under the weather?',
    sub: 'Trusted campus pharmacies, delivered',
    colors: ['#F0E8FF', '#E0D4FF'],
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
  },
  GROCERY: {
    title: 'Fresh groceries',
    sub: 'Straight to your door',
    colors: ['#E8F8EE', '#D4F0DE'],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
  },
  STORE: {
    title: 'Everything you need',
    sub: 'Campus stores delivered',
    colors: ['#E8F0FF', '#D4E0FF'],
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80',
  },
};

const PHARMACY_SUBS = [
  { name: 'Pain Relief', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120' },
  { name: 'Cold & Flu', image: 'https://images.unsplash.com/photo-1587854692152-cf660f4c54a8?w=120' },
  { name: 'Vitamins', image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=120' },
  { name: 'Skin Care', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=120' },
  { name: 'Baby Care', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=120' },
  { name: 'First Aid', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=120' },
];

const RESTAURANT_SUBS = [
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120' },
  { name: 'Chicken', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=120' },
  { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120' },
  { name: 'Local', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120' },
  { name: 'Drinks', image: 'https://images.unsplash.com/photo-1437418746479-eb914271e95f?w=120' },
];

const GROCERY_SUBS = [
  { name: 'Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef4644b9?w=120' },
  { name: 'Dairy', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=120' },
  { name: 'Snacks', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=120' },
  { name: 'Drinks', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=120' },
  { name: 'Household', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=120' },
];

const STORE_SUBS = [
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=120' },
  { name: 'Home', image: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=120' },
  { name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=120' },
  { name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=120' },
  { name: 'Stationery', image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=120' },
];

const PRODUCT_RIBBON: Partial<Record<CaseCategoryId, { name: string; image: string }[]>> = {
  PHARMACY: PHARMACY_SUBS,
  RESTAURANT: RESTAURANT_SUBS,
  GROCERY: GROCERY_SUBS,
  STORE: STORE_SUBS,
};

const LIST_FILTERS = ['Filter', 'Sort', 'Fastest', 'Offers'] as const;

export default function CategoryListingScreen() {
  const router = useRouter();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const { businessType: raw } = useLocalSearchParams<{ businessType: string }>();
  const initial = ((raw ?? 'ALL').toUpperCase() || 'ALL') as CaseCategoryId;
  const [active, setActive] = useState<CaseCategoryId>(
    initial === 'GET_ANYTHING' ? 'ALL' : initial,
  );
  /** Full shop list mode — like "All Pharmacies" reference */
  const [viewAllShops, setViewAllShops] = useState(false);
  const [listFilter, setListFilter] = useState<(typeof LIST_FILTERS)[number]>('Filter');
  const [productChip, setProductChip] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) return;
    const next = raw.toUpperCase() as CaseCategoryId;
    if (next === 'GET_ANYTHING') {
      router.replace('/get-anything');
      return;
    }
    setActive(next);
    setViewAllShops(false);
    setProductChip(null);
  }, [raw, router]);

  const meta = CASE_CATEGORY_META[active] ?? CASE_CATEGORY_META.ALL;
  const promo = PROMO[active] ?? PROMO.ALL;
  const queryType = active === 'ALL' ? null : active;
  const merchantsQ = useCaseMerchantsQuery(queryType, { limit: 80 });
  const shopsRaw = merchantsQ.data?.items ?? [];

  const shops = useMemo(() => {
    let list = [...shopsRaw];
    if (listFilter === 'Fastest') {
      list.sort((a, b) => (a.averageDeliveryTime ?? 99) - (b.averageDeliveryTime ?? 99));
    } else if (listFilter === 'Offers' || listFilter === 'Sort') {
      list.sort(
        (a, b) =>
          Number((b as { averageRating?: number }).averageRating ?? 0) -
          Number((a as { averageRating?: number }).averageRating ?? 0),
      );
    }
    return list;
  }, [shopsRaw, listFilter]);

  const productRibbon = PRODUCT_RIBBON[active] ?? [];
  const allShopsTitle =
    active === 'PHARMACY'
      ? 'All Pharmacies'
      : active === 'RESTAURANT'
        ? 'All Restaurants'
        : active === 'GROCERY'
          ? 'All Groceries'
          : active === 'STORE'
            ? 'All Stores'
            : 'All Shops';

  const menusQ = useQueries({
    queries: shops.slice(0, 8).map((m) => ({
      queryKey: caseKeys.menu(m.id),
      queryFn: () => fetchCaseMerchantMenu(m.id),
      enabled: shops.length > 0 && !viewAllShops,
      staleTime: 3 * 60_000,
    })),
  });

  const products = useMemo(() => {
    const out: ProductRow[] = [];
    menusQ.forEach((mq, i) => {
      const merchant = shops[i];
      const menu = mq.data;
      if (!merchant || !menu) return;
      menu.items.forEach((it) => {
        const price = it.discountedPrice ?? it.price;
        const original = it.discountedPrice ? it.price : null;
        const pct =
          original && original > price ? Math.round(((original - price) / original) * 100) : undefined;
        out.push({
          id: it.id,
          restaurantId: merchant.id,
          name: it.itemName,
          price,
          originalPrice: original,
          image: it.images?.[0],
          storeName: merchant.restaurantName,
          businessType: merchant.businessType ?? active,
          foodType: it.foodType,
          attributes: (it as { attributes?: MenuItemAttributes }).attributes ?? null,
          deliveryMins: merchant.averageDeliveryTime,
          discountPct: pct && pct > 0 ? pct : undefined,
        });
      });
    });
    return out;
  }, [menusQ, shops, active]);

  const aisleTiles = useMemo(() => {
    const map = new Map<string, string | null>();
    menusQ.forEach((mq) => {
      const menu = mq.data;
      if (!menu) return;
      const byCat = new Map<string, string | null>();
      menu.items.forEach((it) => {
        const cid = String(it.categoryId ?? '');
        if (cid && !byCat.has(cid) && it.images?.[0]) byCat.set(cid, it.images[0]);
      });
      (menu.categories ?? []).forEach((c) => {
        if (!map.has(c.name)) map.set(c.name, byCat.get(c.id) ?? null);
      });
    });
    const imgs = products.map((p) => p.image).filter(Boolean) as string[];
    let i = 0;
    return Array.from(map.entries())
      .slice(0, 8)
      .map(([name, img]) => ({
        name,
        image: img || imgs[i++ % Math.max(imgs.length, 1)] || meta.image,
      }));
  }, [menusQ, products, meta.image]);

  const { cart } = useCart();
  const addToCart = useAddToCartMutation();
  const cartCount = getCartItemCount(cart);
  const cartTotal = getCartDisplayTotal(cart);
  const cartRestaurantName = getCartRestaurantName(cart);
  const cartBottom = useFloatingCartBottom();
  const scrollBottomPadding = useFloatingCartScrollPadding(cartCount > 0);

  const switchCat = (id: CaseCategoryId) => {
    if (id === 'GET_ANYTHING') {
      router.push('/get-anything');
      return;
    }
    setActive(id);
    router.setParams({ businessType: id });
  };

  const onAdd = async (p: ProductRow) => {
    try {
      await addToCart.mutateAsync({
        restaurantId: p.restaurantId,
        menuItemId: p.id,
        quantity: 1,
        itemName: p.name,
        price: p.price,
        restaurantName: p.storeName,
      });
    } catch {
      router.push(`/restaurant/${p.restaurantId}`);
    }
  };

  const title = viewAllShops
    ? allShopsTitle
    : active === 'ALL'
      ? 'All Categories'
      : meta.label;
  const freeDeliveryGap = Math.max(0, 500 - cartTotal);

  const openProductChip = (name: string) => {
    setProductChip(name);
    const shop = shops[0];
    if (shop) {
      router.push({
        pathname: '/store-category',
        params: { restaurantId: shop.id, category: name },
      });
    }
  };

  const onBack = () => {
    if (viewAllShops) {
      setViewAllShops(false);
      return;
    }
    router.back();
  };

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
            <Ionicons name="cart-outline" size={20} color={colors.text} />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Search */}
        <Pressable
          style={[
            styles.search,
            {
              backgroundColor: isDark ? '#18181C' : CaseUi.field,
              borderColor: isDark ? '#27272A' : CaseUi.line,
            },
          ]}
          onPress={() => router.push('/search')}
        >
          <Ionicons name="search" size={15} color={colors.textSecondary} />
          <Text style={[styles.searchPh, { color: colors.textSecondary }]}>Search in {title}…</Text>
          <Ionicons name="mic-outline" size={15} color={CaseUi.orange} />
        </Pressable>

        {/* Ribbon: business types only on ALL · product chips on vertical pages */}
        {!viewAllShops && active === 'ALL' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ribbon}
          >
            {CASE_HOME_CATEGORY_ROW.map((id) => {
              const m = CASE_CATEGORY_META[id];
              const on = active === id;
              return (
                <Pressable key={id} style={styles.ribItem} onPress={() => switchCat(id)}>
                  <View
                    style={[styles.ribTile, { backgroundColor: m.color }, on && styles.ribTileOn]}
                  >
                    <Image source={{ uri: m.image }} style={styles.ribImg} contentFit="cover" />
                  </View>
                  <Text style={[styles.ribLabel, on && styles.ribLabelOn]} numberOfLines={1}>
                    {m.short}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!viewAllShops && active !== 'ALL' && productRibbon.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ribbon}
          >
            {productRibbon.map((chip) => {
              const on = productChip === chip.name;
              return (
                <Pressable
                  key={chip.name}
                  style={styles.ribItem}
                  onPress={() => openProductChip(chip.name)}
                >
                  <View style={[styles.ribTile, on && styles.ribTileOn]}>
                    <Image source={{ uri: chip.image }} style={styles.ribImg} contentFit="cover" />
                  </View>
                  <Text style={[styles.ribLabel, on && styles.ribLabelOn]} numberOfLines={1}>
                    {chip.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* All Pharmacies / All Restaurants list mode */}
        {viewAllShops ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {LIST_FILTERS.map((f) => {
                const on = listFilter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setListFilter(f)}
                    style={[styles.filterChip, on && styles.filterChipOn]}
                  >
                    {f === 'Filter' ? (
                      <Ionicons
                        name="options-outline"
                        size={13}
                        color={on ? CaseUi.white : CaseUi.ink}
                        style={{ marginRight: 4 }}
                      />
                    ) : null}
                    <Text style={[styles.filterText, on && styles.filterTextOn]}>{f}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {merchantsQ.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={CaseUi.orange} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 14,
                  paddingTop: 8,
                  paddingBottom: scrollBottomPadding,
                }}
              >
                <Text style={styles.listCount}>
                  {shops.length} {active === 'PHARMACY' ? 'pharmacies' : 'shops'} near you
                </Text>
                {shops.map((m, i) => (
                  <ShopCard
                    key={m.id}
                    merchant={m}
                    index={i}
                    variant="list"
                    onPress={(id) => router.push(`/restaurant/${id}`)}
                  />
                ))}
                {shops.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="storefront-outline" size={36} color={CaseUi.muted} />
                    <Text style={styles.emptyTitle}>No shops yet</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </>
        ) : merchantsQ.isLoading ? (
          <CategoryListSkeleton />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          >
            {/* Pastel promo */}
            <Animated.View entering={FadeInDown.duration(320)} style={styles.promoWrap}>
              <LinearGradient colors={promo.colors} style={styles.promo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoSub}>{promo.sub}</Text>
                </View>
                <Image source={{ uri: promo.image }} style={styles.promoImg} contentFit="cover" />
              </LinearGradient>
            </Animated.View>

            {/* ——— ALL ——— */}
            {active === 'ALL' ? (
              <>
                <Section title="Top Stores" onSeeAll={() => switchCat('RESTAURANT')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hPad}
                >
                  {shops.slice(0, 12).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      width={124}
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                </ScrollView>

                <Section title="Popular near you" onSeeAll={() => router.push('/search')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hPad}
                >
                  {products.slice(0, 12).map((p, i) => (
                    <Animated.View
                      key={`${p.restaurantId}-${p.id}`}
                      entering={FadeInRight.delay(i * 25).duration(280)}
                    >
                      <ProductCard
                        item={p}
                        width={124}
                        onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                        onAdd={() => onAdd(p)}
                      />
                    </Animated.View>
                  ))}
                </ScrollView>

                <Section title="More to explore" />
                <View style={styles.listPad}>
                  {shops.slice(0, 8).map((m, i) => (
                    <ShopCard
                      key={`more-${m.id}`}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {/* ——— RESTAURANT ——— */}
            {active === 'RESTAURANT' ? (
              <>
                <Section
                  title="Top Rated Restaurants"
                  onSeeAll={() => setViewAllShops(true)}
                />
                <View style={styles.listPad}>
                  {shops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {shops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => setViewAllShops(true)}>
                      <Text style={styles.seeAllBtnText}>
                        View all {shops.length} restaurants
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
                    </Pressable>
                  ) : null}
                </View>
                <Section title="Popular Dishes" onSeeAll={() => router.push('/search')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                  {products.slice(0, 12).map((p) => (
                    <Pressable
                      key={`${p.restaurantId}-${p.id}`}
                      style={styles.dishCard}
                      onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                    >
                      <Image
                        source={{
                          uri:
                            p.image ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
                        }}
                        style={styles.dishImg}
                        contentFit="cover"
                      />
                      <Text style={styles.dishName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.dishStore} numberOfLines={1}>
                        {p.storeName}
                      </Text>
                      <Text style={styles.dishPrice}>J${Math.round(p.price)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ——— PHARMACY ——— */}
            {active === 'PHARMACY' ? (
              <>
                <Section title="Popular products" onSeeAll={() => router.push('/search')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hPad}
                >
                  {products.slice(0, 10).map((p) => (
                    <ProductCard
                      key={`${p.restaurantId}-${p.id}`}
                      item={p}
                      width={124}
                      onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                      onAdd={() => onAdd(p)}
                    />
                  ))}
                </ScrollView>

                <Section
                  title="Shop by Pharmacy"
                  onSeeAll={() => setViewAllShops(true)}
                  seeAllLabel="See all"
                />
                <View style={styles.listPad}>
                  {shops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {shops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => setViewAllShops(true)}>
                      <Text style={styles.seeAllBtnText}>
                        View all {shops.length} pharmacies
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}

            {/* ——— GROCERY ——— (same pattern as Pharmacy) */}
            {active === 'GROCERY' ? (
              <>
                <Section title="Popular products" onSeeAll={() => router.push('/search')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hPad}
                >
                  {products.slice(0, 10).map((p) => (
                    <ProductCard
                      key={`${p.restaurantId}-${p.id}`}
                      item={p}
                      width={124}
                      onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                      onAdd={() => onAdd(p)}
                    />
                  ))}
                </ScrollView>

                <Section title="Shop by Grocery" onSeeAll={() => setViewAllShops(true)} />
                <View style={styles.listPad}>
                  {shops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {shops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => setViewAllShops(true)}>
                      <Text style={styles.seeAllBtnText}>
                        View all {shops.length} grocery shops
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}

            {/* ——— STORE ——— */}
            {active === 'STORE' ? (
              <>
                <Section title="Top Stores" onSeeAll={() => setViewAllShops(true)} />
                <View style={styles.listPad}>
                  {shops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {shops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => setViewAllShops(true)}>
                      <Text style={styles.seeAllBtnText}>View all {shops.length} stores</Text>
                      <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
                    </Pressable>
                  ) : null}
                </View>
                <Section title="Popular Categories" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                  {(aisleTiles.length > 0 ? aisleTiles : STORE_SUBS).map((tile, i) => (
                    <Pressable
                      key={tile.name}
                      style={styles.circleCat}
                      onPress={() => {
                        const shop = shops[i % Math.max(shops.length, 1)];
                        if (shop) {
                          router.push({
                            pathname: '/store-category',
                            params: { restaurantId: shop.id, category: tile.name },
                          });
                        }
                      }}
                    >
                      <Image source={{ uri: tile.image }} style={styles.circleImg} contentFit="cover" />
                      <Text style={styles.circleLabel} numberOfLines={2}>
                        {tile.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Section title="Popular products" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                  {products.slice(0, 10).map((p) => (
                    <ProductCard
                      key={`${p.restaurantId}-${p.id}`}
                      item={p}
                      width={124}
                      onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                      onAdd={() => onAdd(p)}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {shops.length === 0 && !merchantsQ.isLoading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={36} color={CaseUi.muted} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>Campus partners are joining soon.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <FloatingCartBar
        visible={cartCount > 0}
        itemCount={cartCount}
        total={cartTotal}
        restaurantName={
          freeDeliveryGap > 0
            ? `Extra J$${Math.round(freeDeliveryGap)} to free delivery`
            : cartRestaurantName
        }
        onPress={() => router.push('/(tabs)/cart')}
        bottom={cartBottom}
      />
    </ThemedView>
  );
}

function Section({
  title,
  onSeeAll,
  seeAllLabel = 'See all',
}: {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) {
  const { colors } = useThemeContext();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAll}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 2,
    gap: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: 'PlusJakartaSans_700Bold' },
  search: {
    marginHorizontal: 14,
    marginTop: 4,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchPh: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
  },
  ribbon: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 10 },
  ribItem: { width: 64, alignItems: 'center' },
  ribTile: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: CaseUi.field,
  },
  ribTileOn: { borderColor: CaseUi.orange },
  ribImg: { width: '100%', height: '100%' },
  ribLabel: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
    textAlign: 'center',
  },
  ribLabelOn: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  filterRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  filterChipOn: {
    backgroundColor: CaseUi.orange,
    borderColor: CaseUi.orange,
  },
  filterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: CaseUi.ink,
  },
  filterTextOn: { color: CaseUi.white },
  listCount: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
    marginBottom: 10,
  },
  seeAllBtn: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.25)',
    backgroundColor: CaseUi.orangeSoft,
  },
  seeAllBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.orange,
  },
  promoWrap: { paddingHorizontal: 14, marginTop: 10 },
  promo: {
    borderRadius: 16,
    padding: 14,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: CaseUi.ink,
  },
  promoSub: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
  promoImg: { width: 64, height: 72, borderRadius: 12 },
  sectionHead: {
    marginTop: 18,
    marginHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  seeAll: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: CaseUi.orange },
  hPad: { paddingHorizontal: 14, gap: 10 },
  listPad: { paddingHorizontal: 14 },
  dishCard: { width: 88, alignItems: 'center' },
  dishImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CaseUi.field,
  },
  dishName: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: CaseUi.ink,
    textAlign: 'center',
  },
  dishStore: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 9,
    color: CaseUi.muted,
    textAlign: 'center',
  },
  dishPrice: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    color: CaseUi.orange,
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
  },
  subCard: {
    width: '47%',
    backgroundColor: CaseUi.field,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  subImg: { width: 56, height: 56, borderRadius: 12 },
  subLabel: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: CaseUi.ink,
  },
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  groceryImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: CaseUi.field },
  offTag: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 10,
    color: CaseUi.orange,
  },
  groceryName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.ink,
  },
  groceryStore: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  groceryPrice: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: CaseUi.ink,
  },
  was: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
    textDecorationLine: 'line-through',
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCat: { width: 76, alignItems: 'center' },
  circleImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CaseUi.field,
  },
  circleLabel: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: CaseUi.ink,
    textAlign: 'center',
    minHeight: 28,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: CaseUi.ink,
  },
  emptySub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
});
