import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { ShopCard } from '@/components/shop-card';
import { ProductCard, type ProductCardItem } from '@/components/product-card';
import { HomeSkeleton } from '@/components/skeleton';
import {
  CASE_CATEGORY_META,
  CASE_DEFAULT_DELIVERY_MINS,
  CASE_HOME_CATEGORY_ROW,
  type CaseCategoryId,
} from '@/constants/caseHome';
import { CaseUi } from '@/constants/caseUi';
import type { MenuItemAttributes } from '@/constants/categoryFields';
import { caseKeys, useCaseBootstrapQuery, useCaseMerchantsQuery } from '@/hooks/queries/case';
import { useCaseOrdersQuery } from '@/hooks/queries/caseOrders';
import { useProfileQuery } from '@/hooks/queries/profile';
import { useRestaurantOfferBadges } from '@/hooks/use-restaurant-offers';
import { useCart } from '@/hooks/use-cart';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notifications';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { getSelectedDeliveryPointName } from '@/lib/caseCheckout';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { fetchCaseMerchantMenu } from '@/services/case';
import { fetchWallet } from '@/services/wallet';
import { useAddToCartMutation } from '@/hooks/queries/cart';

const SCREEN_W = Dimensions.get('window').width;
const PAD = 16;
const PROMO_W = SCREEN_W - PAD * 2;
const PAGE_BG = '#FBF7F2';

const PROMOS = [
  {
    id: 'free-del',
    title: 'Free delivery today',
    sub: 'On every campus order above J$500',
    cta: 'Start ordering',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&auto=format&fit=crop&q=80',
    action: 'ALL' as CaseCategoryId,
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy, dropped off',
    sub: 'Rx & wellness essentials to your dorm',
    cta: 'Shop pharmacy',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=700&auto=format&fit=crop&q=80',
    action: 'PHARMACY' as CaseCategoryId,
  },
  {
    id: 'grocery',
    title: 'Fresh groceries, fast',
    sub: 'Campus-essential staples in minutes',
    cta: 'Browse grocery',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&auto=format&fit=crop&q=80',
    action: 'GROCERY' as CaseCategoryId,
  },
];

const GET_ANYTHING_IMG = require('../../../assets/flowimages/stitch_quickbite_food_delivery_app_user_panel/stitch_quickbite_food_delivery_app_user_panel/warm_flat_style_illustration_of_a_food_delivery_rider_on_a_scooter_driving/screen.png');

const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'REJECTED']);

function greetingForHour(h: number) {
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function activeOrderCopy(status: string) {
  const s = status.toUpperCase();
  if (s === 'PREPARING') return { label: 'Being prepared', icon: 'flame-outline' as const };
  if (['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(s)) {
    return { label: 'On the way to you', icon: 'bicycle-outline' as const };
  }
  if (s === 'CONFIRMED') return { label: 'Restaurant confirmed', icon: 'checkmark-circle-outline' as const };
  return { label: 'Order in progress', icon: 'time-outline' as const };
}

function SectionHeader({
  title,
  subtitle,
  actionLabel = 'See all',
  onAction,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <PressableScale onPress={onAction} hitSlop={10} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={CaseUi.orange} />
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

function CategoryTile({
  id,
  selected,
  onPress,
  index,
}: {
  id: CaseCategoryId;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const meta = CASE_CATEGORY_META[id];
  return (
    <Animated.View entering={FadeInRight.delay(60 + index * 35).duration(320)}>
      <PressableScale
        onPress={onPress}
        style={styles.catItem}
        scaleTo={0.92}
      >
        <View
          style={[
            styles.catTile,
            { backgroundColor: selected ? CaseUi.orange : meta.color },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={26}
            color={selected ? '#FFFFFF' : CaseUi.ink}
          />
        </View>
        <Text style={[styles.catLabel, selected && styles.catLabelOn]} numberOfLines={1}>
          {meta.short}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

function ShopGrid({
  shops,
  onPress,
}: {
  shops: Parameters<typeof ShopCard>[0]['merchant'][];
  onPress: (id: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {shops.map((m, i) => (
        <Animated.View
          key={m.id}
          entering={FadeInUp.delay(Math.min(i, 8) * 30).duration(280)}
          style={styles.gridCell}
        >
          <ShopCard merchant={m} index={i} variant="compact" onPress={onPress} />
        </Animated.View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { cart } = useCart();
  const addToCart = useAddToCartMutation();
  const profileQ = useProfileQuery();
  const user = profileQ.data;
  const bootstrapQ = useCaseBootstrapQuery();
  const allMerchantsQ = useCaseMerchantsQuery(null, { limit: 30 });
  const ordersQ = useCaseOrdersQuery();
  const unreadCount = useUnreadNotificationCount(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pointName, setPointName] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CaseCategoryId>('ALL');
  const [promoIndex, setPromoIndex] = useState(0);
  const promoRef = useRef<ScrollView>(null);
  const promoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const walletQ = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    void getSelectedDeliveryPointName().then(setPointName);
  }, [bootstrapQ.dataUpdatedAt]);

  useEffect(() => {
    promoTimer.current = setInterval(() => {
      setPromoIndex((i) => {
        const next = (i + 1) % PROMOS.length;
        promoRef.current?.scrollTo({ x: next * (PROMO_W + 12), animated: true });
        return next;
      });
    }, 4600);
    return () => {
      if (promoTimer.current) clearInterval(promoTimer.current);
    };
  }, []);

  const deliveryPointName =
    pointName ?? bootstrapQ.data?.deliveryPoints?.[0]?.name ?? 'Select delivery point';
  const walletBalance = Number(walletQ.data?.balance ?? walletQ.data?.walletBalance ?? 0);
  const deliveryMins = CASE_DEFAULT_DELIVERY_MINS;
  const popularShops = useMemo(
    () => allMerchantsQ.data?.items ?? [],
    [allMerchantsQ.data?.items],
  );
  const loadingHome = allMerchantsQ.isLoading && popularShops.length === 0;

  const firstName = user?.fullName?.trim()?.split(/\s+/)[0] || 'there';
  const greet = greetingForHour(new Date().getHours());

  const activeOrder = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.find((o) => !TERMINAL_STATUSES.has(String(o.orderStatus ?? '').toUpperCase())) ?? null;
  }, [ordersQ.data]);

  const shopsByType = useMemo(() => {
    const map: Record<string, typeof popularShops> = {};
    popularShops.forEach((m) => {
      const t = (m.businessType ?? 'STORE').toUpperCase();
      if (!map[t]) map[t] = [];
      map[t].push(m);
    });
    return map;
  }, [popularShops]);

  const popularIds = useMemo(() => popularShops.slice(0, 12).map((m) => m.id), [popularShops]);
  const offerBadges = useRestaurantOfferBadges(popularIds);

  const productMenusQ = useQueries({
    queries: popularShops.slice(0, 8).map((m) => ({
      queryKey: caseKeys.menu(m.id),
      queryFn: () => fetchCaseMerchantMenu(m.id),
      enabled: popularShops.length > 0,
      staleTime: 3 * 60_000,
    })),
  });

  const productsWithRestaurant = useMemo(() => {
    const out: (ProductCardItem & { restaurantId: string })[] = [];
    productMenusQ.forEach((q, i) => {
      const merchant = popularShops[i];
      const menu = q.data;
      if (!merchant || !menu?.items?.length) return;
      menu.items.slice(0, 3).forEach((it) => {
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
          storeName: menu.restaurantName || merchant.restaurantName,
          businessType: menu.businessType || merchant.businessType,
          foodType: it.foodType,
          attributes: (it as { attributes?: MenuItemAttributes }).attributes ?? null,
          deliveryMins: merchant.averageDeliveryTime ?? deliveryMins,
          discountPct: pct && pct > 0 ? pct : undefined,
        });
      });
    });
    return out.slice(0, 16);
  }, [productMenusQ, popularShops, deliveryMins]);

  const cartCount = getCartItemCount(cart);
  const cartTotal = getCartDisplayTotal(cart);
  const cartRestaurantName = getCartRestaurantName(cart);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([bootstrapQ.refetch(), allMerchantsQ.refetch(), walletQ.refetch(), ordersQ.refetch()]);
    setRefreshing(false);
  }, [bootstrapQ, allMerchantsQ, walletQ, ordersQ]);

  const openMerchant = useCallback(
    (id: string) => router.push(`/restaurant/${id}`),
    [router],
  );

  const openCategory = (id: CaseCategoryId) => {
    setActiveCat(id);
    if (id === 'GET_ANYTHING') {
      router.push('/get-anything');
      return;
    }
    router.push({ pathname: '/category/[businessType]', params: { businessType: id } });
  };

  const onAddProduct = async (item: ProductCardItem & { restaurantId: string }) => {
    try {
      await addToCart.mutateAsync({
        restaurantId: item.restaurantId,
        menuItemId: item.id,
        quantity: 1,
        itemName: item.name,
        price: item.price,
        restaurantName: item.storeName,
      });
    } catch {
      router.push(`/restaurant/${item.restaurantId}`);
    }
  };

  const onPromoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / (PROMO_W + 12));
    if (i !== promoIndex && i >= 0 && i < PROMOS.length) setPromoIndex(i);
  };

  return (
    <ThemedView style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={['#241005', '#FF6A1A', PAGE_BG]}
        locations={[0, 0.42, 1]}
        style={styles.heroWash}
      />
      <View pointerEvents="none" style={styles.glowBig} />
      <View pointerEvents="none" style={styles.glowSmall} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + (cartCount > 0 ? 80 : 20) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CaseUi.orange} />
          }
        >
          {/* Utility row */}
          <Animated.View entering={FadeInDown.duration(360)} style={styles.utilityRow}>
            <PressableScale
              onPress={() =>
                router.push(
                  CASE_CHECKOUT_ENABLED ? '/(onboarding)/delivery-point' : '/(onboarding)/location',
                )
              }
              style={styles.locPill}
            >
              <Ionicons name="location" size={13} color="#FFFFFF" />
              <Text style={styles.locPillText} numberOfLines={1}>
                {deliveryPointName}
              </Text>
              <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.85)" />
            </PressableScale>

            <View style={styles.utilityRight}>
              <PressableScale
                style={styles.walletPill}
                onPress={() => router.push('/wallet')}
                accessibilityLabel={`Wallet balance J$${walletBalance.toFixed(0)}`}
              >
                <Ionicons name="wallet" size={13} color={CaseUi.orange} />
                <Text style={styles.walletAmt}>J${walletBalance.toFixed(0)}</Text>
              </PressableScale>
              <PressableScale
                style={styles.iconBtn}
                onPress={() => router.push('/notifications')}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={17} color={CaseUi.ink} />
                {unreadCount > 0 ? (
                  <Animated.View entering={ZoomIn.duration(200)} style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </Animated.View>
                ) : null}
              </PressableScale>
              <PressableScale
                style={styles.avatar}
                onPress={() => router.push('/(tabs)/profile')}
                accessibilityLabel="Profile"
              >
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarLetter}>
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
                  </Text>
                )}
              </PressableScale>
            </View>
          </Animated.View>

          {/* Greeting headline */}
          <Animated.View entering={FadeInDown.delay(40).duration(380)} style={styles.greetBlock}>
            <Text style={styles.greetLine}>
              {greet}, {firstName} <Text style={styles.greetWave}>👋</Text>
            </Text>
            <Text style={styles.greetSub}>
              {activeOrder ? 'Your order is on its way' : 'What are you craving today?'}
            </Text>
          </Animated.View>

          {/* Floating search bar */}
          <Animated.View entering={FadeInDown.delay(80).duration(360)}>
            <PressableScale
              style={styles.search}
              onPress={() => router.push('/search')}
              scaleTo={0.985}
            >
              <View style={styles.searchIconWrap}>
                <Ionicons name="search" size={18} color={CaseUi.orange} />
              </View>
              <Text style={styles.searchPh} numberOfLines={1}>
                Search food, grocery, pharmacy…
              </Text>
              <View style={styles.micWrap}>
                <Ionicons name="mic-outline" size={17} color={CaseUi.muted} />
              </View>
            </PressableScale>
          </Animated.View>

          {/* Active order tracker */}
          {activeOrder ? (
            <Animated.View entering={FadeInDown.delay(100).duration(340)}>
              <PressableScale
                style={styles.trackCard}
                onPress={() => router.push({ pathname: '/order/track/[orderId]', params: { orderId: activeOrder.id } })}
              >
                <View style={styles.trackIconWrap}>
                  <Ionicons name={activeOrderCopy(activeOrder.orderStatus).icon} size={20} color={CaseUi.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>{activeOrderCopy(activeOrder.orderStatus).label}</Text>
                  <Text style={styles.trackSub} numberOfLines={1}>
                    Order #{String(activeOrder.orderNumber ?? activeOrder.id).slice(-6).toUpperCase()}
                    {activeOrder.deliveryPoint?.name ? ` · ${activeOrder.deliveryPoint.name}` : ''}
                  </Text>
                </View>
                <View style={styles.trackCta}>
                  <Text style={styles.trackCtaText}>Track</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </View>
              </PressableScale>
            </Animated.View>
          ) : null}

          {loadingHome ? (
            <HomeSkeleton />
          ) : (
            <>
              {/* Categories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
                style={styles.catScroll}
              >
                {CASE_HOME_CATEGORY_ROW.map((id, i) => (
                  <CategoryTile
                    key={id}
                    id={id}
                    index={i}
                    selected={activeCat === id}
                    onPress={() => openCategory(id)}
                  />
                ))}
              </ScrollView>

              {/* Promo carousel — full-bleed image cards */}
              <Animated.View entering={FadeIn.delay(80).duration(400)} style={styles.promoBlock}>
                <ScrollView
                  ref={promoRef}
                  horizontal
                  decelerationRate="fast"
                  snapToInterval={PROMO_W + 12}
                  snapToAlignment="start"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: PAD, gap: 12 }}
                  onMomentumScrollEnd={onPromoScroll}
                >
                  {PROMOS.map((p) => (
                    <PressableScale key={p.id} onPress={() => openCategory(p.action)} style={{ width: PROMO_W }}>
                      <View style={styles.promo}>
                        <Image source={{ uri: p.image }} style={styles.promoBg} contentFit="cover" />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.86)']}
                          locations={[0, 0.45, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.promoCopy}>
                          <Text style={styles.promoEyebrow}>Campus offer</Text>
                          <Text style={styles.promoTitle}>{p.title}</Text>
                          <Text style={styles.promoSub}>{p.sub}</Text>
                          <View style={styles.promoCta}>
                            <Text style={styles.promoCtaText}>{p.cta}</Text>
                            <Ionicons name="arrow-forward" size={13} color={CaseUi.ink} />
                          </View>
                        </View>
                      </View>
                    </PressableScale>
                  ))}
                </ScrollView>
                <View style={styles.dots}>
                  {PROMOS.map((p, i) => (
                    <View key={p.id} style={[styles.dot, i === promoIndex && styles.dotOn]} />
                  ))}
                </View>
              </Animated.View>

              {popularShops.length === 0 ? (
                <Animated.View entering={FadeInUp.duration(400)} style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="storefront-outline" size={32} color={CaseUi.orange} />
                  </View>
                  <Text style={styles.emptyTitle}>No shops nearby yet</Text>
                  <Text style={styles.emptySub}>
                    Pick a campus delivery point — we’ll show food, grocery, pharmacy & stores.
                  </Text>
                  <PressableScale
                    style={styles.emptyCta}
                    onPress={() =>
                      router.push(
                        CASE_CHECKOUT_ENABLED ? '/(onboarding)/delivery-point' : '/(onboarding)/location',
                      )
                    }
                  >
                    <Text style={styles.emptyCtaText}>Choose delivery point</Text>
                  </PressableScale>
                </Animated.View>
              ) : (
                <>
                  <SectionHeader
                    title="Popular near you"
                    subtitle="Trending across campus right now"
                    delay={120}
                    onAction={() => openCategory('ALL')}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hPad}
                  >
                    {popularShops.slice(0, 12).map((m, i) => (
                      <Animated.View key={m.id} entering={FadeInRight.delay(40 + i * 28).duration(300)}>
                        <ShopCard
                          merchant={m}
                          index={i}
                          width={156}
                          offerBadge={offerBadges[m.id]}
                          onPress={openMerchant}
                        />
                      </Animated.View>
                    ))}
                  </ScrollView>

                  {productsWithRestaurant.length > 0 ? (
                    <>
                      <SectionHeader
                        title="Trending dishes"
                        subtitle="Fresh picks, ready to order"
                        delay={140}
                        onAction={() => router.push('/search')}
                      />
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hPad}
                      >
                        {productsWithRestaurant.map((p, i) => (
                          <Animated.View
                            key={`${p.restaurantId}-${p.id}`}
                            entering={FadeInRight.delay(30 + i * 24).duration(300)}
                          >
                            <ProductCard
                              item={p}
                              width={148}
                              onPress={() => router.push(`/restaurant/${p.restaurantId}`)}
                              onAdd={() => onAddProduct(p)}
                            />
                          </Animated.View>
                        ))}
                      </ScrollView>
                    </>
                  ) : null}

                  {(shopsByType.RESTAURANT?.length ?? 0) > 0 ? (
                    <>
                      <SectionHeader
                        title="Top-rated restaurants"
                        subtitle="Highest rated by students like you"
                        delay={160}
                        onAction={() => openCategory('RESTAURANT')}
                      />
                      <View style={styles.listPad}>
                        {shopsByType.RESTAURANT!.slice(0, 4).map((m, i) => (
                          <ShopCard
                            key={m.id}
                            merchant={m}
                            index={i}
                            variant="list"
                            offerBadge={offerBadges[m.id]}
                            onPress={openMerchant}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {(shopsByType.GROCERY?.length ?? 0) > 0 ? (
                    <>
                      <SectionHeader
                        title="Groceries near you"
                        subtitle="Campus-essential staples"
                        delay={180}
                        onAction={() => openCategory('GROCERY')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.GROCERY!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </>
                  ) : null}

                  {(shopsByType.PHARMACY?.length ?? 0) > 0 ? (
                    <>
                      <SectionHeader
                        title="Pharmacy essentials"
                        subtitle="Health & wellness, delivered"
                        delay={200}
                        onAction={() => openCategory('PHARMACY')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.PHARMACY!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </>
                  ) : null}

                  {(shopsByType.STORE?.length ?? 0) > 0 ? (
                    <>
                      <SectionHeader
                        title="Campus stores"
                        subtitle="Stationery, tech & more"
                        delay={220}
                        onAction={() => openCategory('STORE')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.STORE!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </>
                  ) : null}
                </>
              )}

              <Animated.View entering={FadeInUp.delay(140).duration(400)}>
                <PressableScale style={styles.getAnything} onPress={() => router.push('/get-anything')}>
                  <LinearGradient
                    colors={[CaseUi.orangeSoft, '#FFE4CC']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Image source={GET_ANYTHING_IMG} style={styles.getImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.getEyebrow}>Campus request</Text>
                    <Text style={styles.getTitle}>Need something else?</Text>
                    <Text style={styles.getSub}>Custom pickup & delivery anywhere on campus</Text>
                  </View>
                  <View style={styles.getCta}>
                    <Ionicons name="arrow-forward" size={16} color={CaseUi.white} />
                  </View>
                </PressableScale>
              </Animated.View>
            </>
          )}
        </ScrollView>

        <FloatingCartBar
          visible={cartCount > 0}
          itemCount={cartCount}
          total={cartTotal}
          restaurantName={cartRestaurantName}
          onPress={() => router.push('/(tabs)/cart')}
          bottom={tabBarHeight - 8}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  heroWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  glowBig: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glowSmall: {
    position: 'absolute',
    top: 90,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  safe: { flex: 1 },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 4,
    gap: 10,
  },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: SCREEN_W * 0.42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  locPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  utilityRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  walletAmt: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: CaseUi.ink },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CaseUi.white,
  },
  badgeText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 8,
    color: CaseUi.white,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: CaseUi.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  avatarLetter: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.orange,
    fontSize: 14,
  },
  greetBlock: { paddingHorizontal: PAD, marginTop: 20 },
  greetLine: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  greetWave: { fontSize: 24 },
  greetSub: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  search: {
    marginHorizontal: PAD,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: CaseUi.white,
    ...CaseUi.cardShadow,
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPh: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: CaseUi.muted,
  },
  micWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCard: {
    marginHorizontal: PAD,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CaseUi.radius.lg,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  trackIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.ink },
  trackSub: { marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: CaseUi.muted },
  trackCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CaseUi.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackCtaText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11 },
  catScroll: { marginTop: 20 },
  catRow: { paddingHorizontal: PAD, gap: 16 },
  catItem: { width: 68, alignItems: 'center' },
  catTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    marginTop: 7,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: CaseUi.muted,
    textAlign: 'center',
  },
  catLabelOn: {
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  promoBlock: { marginTop: 20 },
  promo: {
    height: 168,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  promoBg: { ...StyleSheet.absoluteFill },
  promoCopy: { padding: 20 },
  promoEyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  promoTitle: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  promoSub: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  promoCta: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CaseUi.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  promoCtaText: {
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CaseUi.line,
  },
  dotOn: {
    width: 18,
    backgroundColor: CaseUi.orange,
  },
  sectionHead: {
    marginTop: 28,
    marginHorizontal: PAD,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: CaseUi.ink,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  seeAll: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.orange,
  },
  hPad: { paddingHorizontal: PAD, gap: 12, paddingBottom: 2 },
  listPad: { paddingHorizontal: PAD },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridCell: { width: '50%', paddingHorizontal: 5 },
  empty: {
    marginHorizontal: PAD,
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: CaseUi.field,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: CaseUi.ink,
  },
  emptySub: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: CaseUi.muted,
  },
  emptyCta: {
    marginTop: 18,
    backgroundColor: CaseUi.orange,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: CaseUi.white,
  },
  getAnything: {
    marginHorizontal: PAD,
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  getImg: { width: 56, height: 56, borderRadius: 16 },
  getEyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: CaseUi.orangeDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  getTitle: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  getSub: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
  },
  getCta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orange,
  },
});
