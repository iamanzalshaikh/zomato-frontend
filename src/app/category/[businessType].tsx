import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { ShopCard } from '@/components/shop-card';
import { ProductCard } from '@/components/product-card';
import { BlinkitCategoryLoader } from '@/components/blinkit-loaders';
import { RouteLoadingOverlay } from '@/components/route-loading-overlay';
import {
  CASE_CATEGORY_META,
  CASE_HOME_CATEGORY_ROW,
  type CaseCategoryId,
} from '@/constants/caseHome';
import { CaseUi } from '@/constants/caseUi';
import type { MenuItemAttributes } from '@/constants/categoryFields';
import { caseKeys, useCaseBannersQuery, useCaseBootstrapQuery, useCaseMerchantsQuery } from '@/hooks/queries/case';
import { useCart } from '@/hooks/use-cart';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import {
  fetchCaseBanners,
  fetchCaseMerchantMenu,
  fetchCaseMerchants,
} from '@/services/case';
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
  categoryName?: string;
};

const SCREEN_W = Dimensions.get('window').width;

function SafeCategoryImage({
  uri,
  style,
  icon = 'image-outline',
}: {
  uri?: string | null;
  style: any;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFF1' }]}>
        <Ionicons name={icon} size={18} color="#A1A1AA" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} contentFit="cover" onError={() => setFailed(true)} />;
}

const CAROUSEL_SLIDES: Record<
  string,
  { title: string; sub: string; colors: [string, string]; image: string }[]
> = {
  ALL: [
    {
      title: 'Campus Favourites',
      sub: 'Everything, one place, delivered fast',
      colors: ['#E8F8EE', '#D4F0DE'],
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Quick Campus Delivery',
      sub: 'Dorm-to-dorm drops in 20 minutes',
      colors: ['#FFF1E8', '#FFE4D6'],
      image: 'https://images.unsplash.com/photo-1580901369227-31df36d2994f?w=400',
    },
  ],
  RESTAURANT: [
    {
      title: 'Hungry?',
      sub: 'Order from campus kitchens near you',
      colors: ['#E8F8EE', '#C8EED6'],
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Late Night Craving?',
      sub: 'Get pizza & burgers delivered until 2 AM',
      colors: ['#FFEBEB', '#FFD2D2'],
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    },
    {
      title: 'Student Discounts',
      sub: 'Enjoy up to 25% off selected partner menus',
      colors: ['#EAE5FF', '#D8CFFF'],
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
    },
  ],
  PHARMACY: [
    {
      title: 'Feeling under the weather?',
      sub: 'Trusted campus pharmacies, delivered',
      colors: ['#F0E8FF', '#E0D4FF'],
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Daily Wellness & Rx',
      sub: 'Vitamins, supplements & first-aid essentials',
      colors: ['#E8F8EE', '#D4F0DE'],
      image: 'https://images.unsplash.com/photo-1587854692152-cf660f4c54a8?w=400',
    },
    {
      title: 'First-Aid Needs',
      sub: 'Bandages, antiseptics & pain relief delivered',
      colors: ['#E3F2FD', '#BBDEFB'],
      image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400',
    },
  ],
  GROCERY: [
    {
      title: 'Fresh Groceries',
      sub: 'Straight to your door',
      colors: ['#E8F8EE', '#D4F0DE'],
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Snacks & Dorm Staples',
      sub: 'Chilled drinks, chips & convenience items',
      colors: ['#FFF8E1', '#FFECB3'],
      image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400',
    },
  ],
  STORE: [
    {
      title: 'Everything You Need',
      sub: 'Campus stores delivered',
      colors: ['#E8F0FF', '#D4E0FF'],
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Academic & Tech Gear',
      sub: 'Pens, notebooks, cables & chargers',
      colors: ['#F3E5F5', '#E1BEE7'],
      image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400',
    },
  ],
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

function PromoCarousel({
  slides,
}: {
  slides: { title: string; sub: string; colors: [string, string]; image: string }[];
}) {
  const { activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        scrollRef.current?.scrollTo({ x: next * (SCREEN_W - 28), animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <View style={styles.carouselContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 28));
          setActiveIndex(index);
        }}
        contentContainerStyle={{ gap: 0 }}
      >
        {slides.map((slide, idx) => (
          <View key={idx} style={[styles.slideCard, { backgroundColor: isDark ? '#221F2A' : slide.colors[0], width: SCREEN_W - 28 }]}>
            <Image source={{ uri: slide.image }} style={styles.slideBgImg} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.58)']} style={styles.slideGradient}>
              <View style={styles.slideTextCol}>
                <Text style={[styles.slideTitle, { color: '#FFFFFF' }]} numberOfLines={2}>{slide.title}</Text>
                <Text style={[styles.slideSub, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>{slide.sub}</Text>
              </View>
              <View style={styles.slideChip}>
                <Text style={styles.slideChipText}>Explore</Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      {slides.length > 1 ? (
        <View style={styles.carouselDots}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.carouselDot,
                idx === activeIndex
                  ? { backgroundColor: CaseUi.orange, width: 14 }
                  : { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', width: 6 }
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const LIST_FILTERS = ['Filter', 'Sort', 'Fastest', 'Offers'] as const;

export default function CategoryListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const { businessType: raw, view } = useLocalSearchParams<{ businessType: string; view?: string }>();
  const initial = ((raw ?? 'ALL').toUpperCase() || 'ALL') as CaseCategoryId;
  const [active, setActive] = useState<CaseCategoryId>(
    initial === 'GET_ANYTHING' ? 'ALL' : initial,
  );
  /** Full shop list mode — like "All Pharmacies" reference */
  const [viewAllLocal, setViewAllLocal] = useState(false);
  const isViewAll = view === 'all' || viewAllLocal;
  const [listFilter, setListFilter] = useState<(typeof LIST_FILTERS)[number]>('Filter');
  const [productChip, setProductChip] = useState<string | null>(null);
  const [loadMoreProducts, setLoadMoreProducts] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!routeLoading) return;
    const timer = setTimeout(() => setRouteLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [routeLoading]);

  const meta = CASE_CATEGORY_META[active] ?? CASE_CATEGORY_META.ALL;
  const bootstrapQ = useCaseBootstrapQuery();
  const categoryBannersQ = useCaseBannersQuery(
    active === 'ALL' ? 'HOME' : 'CATEGORY',
    active === 'ALL' ? null : active,
  );
  const slides = useMemo(() => {
    const fromApi = (categoryBannersQ.data ?? bootstrapQ.data?.banners ?? [])
      .filter((b) => b.imageUrl)
      .slice(0, 4)
      .map((b) => ({
        title: b.title,
        sub: b.subtitle || `Best ${meta.label.toLowerCase()} picks`,
        colors: ['#FFF1E8', '#FFE4D6'] as [string, string],
        image: b.imageUrl,
      }));
    return fromApi.length ? fromApi : CAROUSEL_SLIDES[active] ?? CAROUSEL_SLIDES.ALL;
  }, [categoryBannersQ.data, bootstrapQ.data?.banners, active, meta.label]);
  const queryType = active === 'ALL' ? null : active;
  const merchantsQ = useCaseMerchantsQuery(queryType, { limit: 40 });
  const shops = useMemo(() => {
    const shopsRaw = merchantsQ.data?.items ?? [];
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
  }, [merchantsQ.data?.items, listFilter]);

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
    queries: shops.slice(0, 2).map((m, index) => ({
      queryKey: caseKeys.menu(m.id),
      queryFn: () => fetchCaseMerchantMenu(m.id),
      enabled: shops.length > 0 && !isViewAll && (index < 1 || loadMoreProducts),
      staleTime: 10 * 60_000,
      refetchOnMount: false,
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
        
        const catObj = menu.categories?.find((c) => c.id === it.categoryId);
        const categoryName = catObj?.name ?? '';

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
          categoryName,
        });
      });
    });
    return out;
  }, [menusQ, shops, active]);

  const filteredProducts = useMemo(() => {
    if (!productChip) return products;
    const lowerChip = productChip.toLowerCase();
    return products.filter((p) => {
      const matchCat = p.categoryName?.toLowerCase().includes(lowerChip);
      const matchName = p.name.toLowerCase().includes(lowerChip);
      return matchCat || matchName;
    });
  }, [products, productChip]);

  const filteredShops = useMemo(() => {
    if (!productChip) return shops;
    const activeShopIds = new Set(
      filteredProducts.map((p) => p.restaurantId)
    );
    return shops.filter((m) => activeShopIds.has(m.id));
  }, [shops, filteredProducts, productChip]);

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

    if (id === 'ALL') return;

    void queryClient.prefetchQuery({
      queryKey: caseKeys.merchants({ businessType: id, search: undefined, page: undefined, limit: 40 }),
      queryFn: () => fetchCaseMerchants({ businessType: id, limit: 40 }),
      staleTime: 15 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: caseKeys.banners({ placement: 'CATEGORY', businessType: id }),
      queryFn: () => fetchCaseBanners({ placement: 'CATEGORY', businessType: id }),
      staleTime: 2 * 60 * 1000,
    });
  };

  // Add-to-cart from category product rows
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

  const title = isViewAll
    ? allShopsTitle
    : active === 'ALL'
      ? 'All Categories'
      : meta.label;

  const openProductChip = (name: string) => {
    if (productChip === name) {
      setProductChip(null);
    } else {
      setProductChip(name);
    }
  };

  const openProductDetail = (p: ProductRow) => {
    router.push({
      pathname: '/product-detail',
      params: { restaurantId: p.restaurantId, itemId: p.id },
    });
  };

  const onBack = () => {
    if (isViewAll) {
      if (view === 'all') {
        router.back();
        return;
      }
      setViewAllLocal(false);
      return;
    }
    router.back();
  };

  const openAllShopsList = () => {
    setViewAllLocal(true);
    router.setParams({ view: 'all' });
  };

  const isMenusLoading = menusQ.some((mq) => mq.isLoading && !mq.data);

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

        {/* Search — hidden in full list mode for cleaner filter row */}
        {!isViewAll ? (
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
        ) : null}

        {/* Ribbon: business types only on ALL · product chips on vertical pages */}
        {!isViewAll && active === 'ALL' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ribbon}
            style={{ flexGrow: 0, height: 104 }}
          >
            {CASE_HOME_CATEGORY_ROW.map((id) => {
              const m = CASE_CATEGORY_META[id];
              const on = active === id;
              return (
                <Pressable key={id} style={styles.ribItem} onPress={() => switchCat(id)}>
                  <View
                    style={[styles.ribTile, { backgroundColor: m.color }, on && styles.ribTileOn]}
                  >
                    <SafeCategoryImage uri={m.image} style={styles.ribImg} icon="grid-outline" />
                  </View>
                  <Text style={[styles.ribLabel, on && styles.ribLabelOn]} numberOfLines={1}>
                    {m.short}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!isViewAll && active !== 'ALL' && productRibbon.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ribbon}
            style={{ flexGrow: 0, height: 104 }}
          >
            {productRibbon.map((chip) => {
              const on = productChip === chip.name;
              return (
                <Pressable
                  key={chip.name}
                  style={styles.ribItem}
                  onPress={() => openProductChip(chip.name)}
                >
                  <View style={[styles.ribTile, on && styles.ribTileOn, { borderRadius: 12 }]}>
                    <SafeCategoryImage uri={chip.image} style={styles.ribImg} icon="pricetag-outline" />
                  </View>
                  <Text style={[styles.ribLabel, on && styles.ribLabelOn]} numberOfLines={2}>
                    {chip.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* All Pharmacies / All Restaurants list mode */}
        {isViewAll ? (
          <View style={styles.listModeWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
              nestedScrollEnabled
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
                decelerationRate={Platform.OS === 'ios' ? 'fast' : 'normal'}
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 14,
                  paddingTop: 8,
                  paddingBottom: scrollBottomPadding,
                }}
              >
                <Text style={styles.listCount}>
                  {filteredShops.length} {active === 'PHARMACY' ? 'pharmacies' : 'shops'} near you
                </Text>
                {filteredShops.map((m, i) => (
                  <ShopCard
                    key={m.id}
                    merchant={m}
                    index={i}
                    variant="list"
                    onPress={(id) => {
                      setRouteLoading(true);
                      router.push(`/restaurant/${id}`);
                    }}
                  />
                ))}
                {filteredShops.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="storefront-outline" size={36} color={CaseUi.muted} />
                    <Text style={styles.emptyTitle}>No shops yet</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        ) : merchantsQ.isLoading ? (
          <BlinkitCategoryLoader />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate={Platform.OS === 'ios' ? 'fast' : 'normal'}
            scrollEventThrottle={48}
            onScroll={(e) => {
              if (loadMoreProducts) return;
              if (e.nativeEvent.contentOffset.y > 180) setLoadMoreProducts(true);
            }}
            contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          >
            {/* Working Promo Carousel */}
            <PromoCarousel slides={slides} />

            {/* ——— ALL ——— */}
            {active === 'ALL' ? (
              <>
                <Section title="Top Stores" onSeeAll={() => switchCat('RESTAURANT')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hPad}
                >
                  {filteredShops.slice(0, 12).map((m, i) => (
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
                {isMenusLoading && filteredProducts.length === 0 ? (
                  <ProductSkeletonRow />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hPad}
                  >
                    {filteredProducts.slice(0, 12).map((p, i) => (
                      <Animated.View
                        key={`${p.restaurantId}-${p.id}`}
                        entering={FadeInRight.delay(i * 25).duration(280)}
                      >
                        <ProductCard
                          item={p}
                          width={124}
                          onPress={() => openProductDetail(p)}
                          onAdd={() => onAdd(p)}
                        />
                      </Animated.View>
                    ))}
                  </ScrollView>
                )}

                <Section title="More to explore" />
                <View style={styles.listPad}>
                  {filteredShops.slice(0, 8).map((m, i) => (
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
                  onSeeAll={() => openAllShopsList()}
                />
                <View style={styles.listPad}>
                  {filteredShops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {filteredShops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => openAllShopsList()}>
                      <Text style={styles.seeAllBtnText}>
                        View all {filteredShops.length} restaurants
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={CaseUi.orange} />
                    </Pressable>
                  ) : null}
                </View>
                <Section title="Popular Dishes" onSeeAll={() => router.push('/search')} />
                {isMenusLoading && filteredProducts.length === 0 ? (
                  <ProductSkeletonRow />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                    {filteredProducts.slice(0, 12).map((p) => (
                      <Pressable
                        key={`${p.restaurantId}-${p.id}`}
                        style={styles.dishCard}
                        onPress={() => openProductDetail(p)}
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
                )}
              </>
            ) : null}

            {/* ——— PHARMACY ——— */}
            {active === 'PHARMACY' ? (
              <>
                <Section title="Popular products" onSeeAll={() => router.push('/search')} />
                {isMenusLoading && filteredProducts.length === 0 ? (
                  <ProductSkeletonRow />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hPad}
                  >
                    {filteredProducts.slice(0, 10).map((p) => (
                      <ProductCard
                        key={`${p.restaurantId}-${p.id}`}
                        item={p}
                        width={124}
                        onPress={() => openProductDetail(p)}
                        onAdd={() => onAdd(p)}
                      />
                    ))}
                  </ScrollView>
                )}

                <Section
                  title="Shop by Pharmacy"
                  onSeeAll={() => openAllShopsList()}
                  seeAllLabel="See all"
                />
                <View style={styles.listPad}>
                  {filteredShops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {filteredShops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => openAllShopsList()}>
                      <Text style={styles.seeAllBtnText}>
                        View all {filteredShops.length} pharmacies
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
                {isMenusLoading && filteredProducts.length === 0 ? (
                  <ProductSkeletonRow />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hPad}
                  >
                    {filteredProducts.slice(0, 10).map((p) => (
                      <ProductCard
                        key={`${p.restaurantId}-${p.id}`}
                        item={p}
                        width={124}
                        onPress={() => openProductDetail(p)}
                        onAdd={() => onAdd(p)}
                      />
                    ))}
                  </ScrollView>
                )}

                <Section title="Shop by Grocery" onSeeAll={() => openAllShopsList()} />
                <View style={styles.listPad}>
                  {filteredShops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {filteredShops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => openAllShopsList()}>
                      <Text style={styles.seeAllBtnText}>
                        View all {filteredShops.length} grocery shops
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
                <Section title="Top Stores" onSeeAll={() => openAllShopsList()} />
                <View style={styles.listPad}>
                  {filteredShops.slice(0, 5).map((m, i) => (
                    <ShopCard
                      key={m.id}
                      merchant={m}
                      index={i}
                      variant="list"
                      onPress={(id) => router.push(`/restaurant/${id}`)}
                    />
                  ))}
                  {filteredShops.length > 5 ? (
                    <Pressable style={styles.seeAllBtn} onPress={() => openAllShopsList()}>
                      <Text style={styles.seeAllBtnText}>View all {filteredShops.length} stores</Text>
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
                        const shop = filteredShops[i % Math.max(filteredShops.length, 1)];
                        if (shop) {
                          router.push({
                            pathname: '/store-category',
                            params: { restaurantId: shop.id, category: tile.name },
                          });
                        }
                      }}
                    >
                      <SafeCategoryImage uri={tile.image} style={styles.circleImg} icon="grid-outline" />
                      <Text style={styles.circleLabel} numberOfLines={2}>
                        {tile.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Section title="Popular products" />
                {isMenusLoading && filteredProducts.length === 0 ? (
                  <ProductSkeletonRow />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                    {filteredProducts.slice(0, 10).map((p) => (
                      <ProductCard
                        key={`${p.restaurantId}-${p.id}`}
                        item={p}
                        width={124}
                        onPress={() => openProductDetail(p)}
                        onAdd={() => onAdd(p)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : null}

            {filteredShops.length === 0 && !merchantsQ.isLoading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={36} color={CaseUi.muted} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>Campus partners are joining soon.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

        <RouteLoadingOverlay visible={routeLoading} label="Loading category picks..." />
        <FloatingCartBar
        visible={cartCount > 0}
        itemCount={cartCount}
        total={cartTotal}
        restaurantName={cartRestaurantName}
        onPress={() => router.push('/(tabs)/cart')}
        bottom={cartBottom}
      />
    </ThemedView>
  );
}

function ProductSkeletonRow() {
  const { colors } = useThemeContext();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
      {[1, 2, 3].map((id) => (
        <View key={id} style={[styles.skeCard, { backgroundColor: colors.border || '#F4F4F5' }]}>
          <View style={[styles.skeImg, { backgroundColor: colors.inputBg || '#E4E4E7' }]} />
          <View style={[styles.skeLine, { backgroundColor: colors.inputBg || '#E4E4E7', width: '80%' }]} />
          <View style={[styles.skeLine, { backgroundColor: colors.inputBg || '#E4E4E7', width: '50%' }]} />
        </View>
      ))}
    </ScrollView>
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
    fontSize: 17,
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
    fontSize: 12.5,
    color: CaseUi.muted,
  },
  ribbon: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 10 },
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
  listModeWrap: { flex: 1 },
  filterScroll: { flexGrow: 0, maxHeight: 56 },
  listScroll: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 24,
    gap: 8,
  },
  filterChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 36,
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
    fontSize: 16,
    color: CaseUi.ink,
  },
  seeAll: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: CaseUi.orange },
  hPad: { paddingHorizontal: 14, gap: 12 },
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
  skeCard: { width: 124, height: 160, borderRadius: 16, padding: 8, gap: 8 },
  skeImg: { width: '100%', height: 90, borderRadius: 12 },
  skeLine: { height: 10, borderRadius: 4 },
  carouselContainer: {
    marginHorizontal: 14,
    marginTop: 6,
    position: 'relative',
    height: 104,
    marginBottom: 2,
  },
  slideCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 104,
  },
  slideGradient: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
  },
  slideBgImg: {
    ...StyleSheet.absoluteFill,
  },
  slideTextCol: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  slideTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    lineHeight: 20,
  },
  slideSub: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11.5,
    lineHeight: 15,
  },
  slideChip: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  slideChipText: {
    color: CaseUi.ink,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 6,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselDot: {
    height: 6,
    borderRadius: 3,
  },
});
