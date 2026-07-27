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
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useThemeContext } from '@/context/ThemeContext';
import { PressableScale } from '@/components/pressable-scale';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { ShopCard } from '@/components/shop-card';
import { fetchCaseMerchants } from '@/services/case';
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
    eyebrow: '⚡ CAMPUS SPECIAL',
    badgeBg: '#FF5A00',
    title: 'Free Delivery Today',
    sub: 'On every campus food & store order above J$500',
    cta: 'Order Now',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80',
    gradientColors: ['transparent', 'rgba(15, 8, 5, 0.25)', 'rgba(15, 8, 5, 0.92)'],
    action: 'RESTAURANT' as CaseCategoryId,
  },
  {
    id: 'grocery',
    eyebrow: '🛒 FLASH GROCERY',
    badgeBg: '#10B981',
    title: 'Fresh Groceries, Fast',
    sub: 'Snacks, drinks & dorm staples dropped in minutes',
    cta: 'Browse Grocery',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&auto=format&fit=crop&q=80',
    gradientColors: ['transparent', 'rgba(4, 28, 16, 0.25)', 'rgba(4, 28, 16, 0.92)'],
    action: 'GROCERY' as CaseCategoryId,
  },
  {
    id: 'pharmacy',
    eyebrow: '💊 EXPRESS PHARMACY',
    badgeBg: '#0EA5E9',
    title: 'Pharmacy & Wellness',
    sub: 'Rx, first-aid & wellness essentials delivered to dorms',
    cta: 'Shop Pharmacy',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=900&auto=format&fit=crop&q=80',
    gradientColors: ['transparent', 'rgba(5, 15, 35, 0.25)', 'rgba(5, 15, 35, 0.92)'],
    action: 'PHARMACY' as CaseCategoryId,
  },
  {
    id: 'store',
    eyebrow: 'ðŸ›ï¸ CAMPUS STORE',
    badgeBg: '#8B5CF6',
    title: 'Tech, Supplies & Gear',
    sub: 'Dorm essentials, cables & stationery dropped fast',
    cta: 'Browse Store',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&auto=format&fit=crop&q=80',
    gradientColors: ['transparent', 'rgba(25, 10, 45, 0.25)', 'rgba(25, 10, 45, 0.92)'],
    action: 'STORE' as CaseCategoryId,
  },
];

const GET_ANYTHING_IMG = require('../../../assets/flowimages/stitch_quickbite_food_delivery_app_user_panel/stitch_quickbite_food_delivery_app_user_panel/warm_flat_style_illustration_of_a_food_delivery_rider_on_a_scooter_driving/screen.png');

const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'REJECTED']);
const styles = StyleSheet.create({
  root: { flex: 1 },
  heroBgContainer: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    height: 440,
    overflow: 'hidden',
  },
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowBig: {
    position: 'absolute',
    top: 60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glowSmall: {
    position: 'absolute',
    top: 210,
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
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  locPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: CaseUi.ink,
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
    borderColor: CaseUi.line,
  },
  badgeText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 8,
    color: '#FFFFFF',
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
  greetBlock: { paddingHorizontal: PAD, marginTop: 12 },
  greetLine: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.6,
    color: CaseUi.ink,
  },
  greetWave: {},
  greetSub: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: CaseUi.muted,
  },
  search: {
    marginHorizontal: PAD,
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: CaseUi.field,
    ...CaseUi.cardShadow,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPh: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
  },
  micWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
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
  catSectionContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catFixedWrap: {
    paddingLeft: PAD,
    paddingRight: 4,
  },
  catDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginRight: 4,
    alignSelf: 'center',
  },
  catScrollContent: {
    paddingRight: PAD,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
  },
  catItem: { width: 64, alignItems: 'center' },
  catTile: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  catTileSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.06 }],
    shadowOpacity: 0.16,
    elevation: 4,
  },
  catLabel: {
    marginTop: 5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: CaseUi.muted,
    textAlign: 'center',
  },
  catLabelOn: {
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  promoBlock: { marginTop: 16, marginHorizontal: PAD },
  promo: {
    height: 140,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  promoBg: { ...StyleSheet.absoluteFill },
  promoCopy: { padding: 18 },
  promoBadgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  promoSub: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
  },
  promoBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CaseUi.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promoCtaText: {
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
  },
  cardEmbeddedDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardDotOn: {
    width: 16,
    borderRadius: 8,
  },
  sectionHead: {
    marginTop: 16,
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
  hPad: { paddingLeft: PAD, paddingRight: PAD, gap: 12, paddingBottom: 2 },
  listPad: { paddingHorizontal: PAD },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridCell: { width: '50%', paddingHorizontal: 5 },
  empty: {
    marginHorizontal: PAD,
    marginTop: 16,
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
    color: '#FFFFFF',
  },
  getAnything: {
    marginHorizontal: PAD,
    marginTop: 16,
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
  // ── Active order sticky banner ──────────────────────────────────────────────
  activeOrderBanner: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...CaseUi.cardShadow,
  },
  activeOrderBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activeOrderIconDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activeOrderBannerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: CaseUi.ink,
  },
  activeOrderBannerSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
    marginTop: 1,
  },
  activeOrderBannerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CaseUi.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  activeOrderBannerTrackText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
});


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
  const { colors } = useThemeContext();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
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
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const enteringAnim = id === 'ALL'
    ? FadeIn.delay(40).duration(300)
    : FadeInRight.delay(40 + index * 25).duration(300);

  return (
    <Animated.View entering={enteringAnim} style={styles.catItem}>
      <PressableScale
        onPress={onPress}
        style={styles.catItem}
        scaleTo={0.92}
      >
        <View
          style={[
            styles.catTile,
            { backgroundColor: selected ? meta.color : isDark ? '#1C1C22' : meta.bg },
            selected && styles.catTileSelected,
            isDark && !selected && { borderWidth: 1, borderColor: '#2A2A32' },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={24}
            color={selected ? '#FFFFFF' : meta.color}
          />
        </View>
        <Text style={[styles.catLabel, { color: isDark ? '#E5E5EA' : CaseUi.ink }, selected && styles.catLabelOn]} numberOfLines={1}>
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
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const { cart } = useCart();
  const addToCart = useAddToCartMutation();
  const profileQ = useProfileQuery();
  const user = profileQ.data;
  const bootstrapQ = useCaseBootstrapQuery();
  const allMerchantsQ = useCaseMerchantsQuery(null, { limit: 30 });
  
  const [activeCat, setActiveCat] = useState<CaseCategoryId>('ALL');
  
  // Fetch category-specific merchants when category changes
  const categoryMerchantsQ = useCaseMerchantsQuery(
    activeCat === 'ALL' ? null : activeCat,
    { limit: 40, enabled: activeCat !== 'ALL' }
  );
  
  // Load all queries immediately for faster initial load
  const ordersQ = useCaseOrdersQuery();
  const unreadCount = useUnreadNotificationCount(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pointName, setPointName] = useState<string | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [loadMoreProducts, setLoadMoreProducts] = useState(false);
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
    const timer = setTimeout(() => {
      setLoadMoreProducts(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

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
  const popularShops = useMemo(() => {
    if (activeCat === 'ALL') {
      return allMerchantsQ.data?.items ?? [];
    }
    return categoryMerchantsQ.data?.items ?? [];
  }, [activeCat, allMerchantsQ.data?.items, categoryMerchantsQ.data?.items]);
  
  const loadingHome = activeCat === 'ALL' 
    ? (allMerchantsQ.isLoading && popularShops.length === 0)
    : (categoryMerchantsQ.isLoading && popularShops.length === 0);

  const firstName = user?.fullName?.trim()?.split(/\s+/)[0] || 'there';
  const greet = greetingForHour(new Date().getHours());

  const activeOrders = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.filter((o) => !TERMINAL_STATUSES.has(String(o.orderStatus ?? '').toUpperCase()));
  }, [ordersQ.data]);

  const activeOrder = activeOrders[0] ?? null;

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

  const shopsForProducts = useMemo(() => {
    const list = activeCat === 'ALL'
      ? popularShops
      : popularShops.filter((m) => (m.businessType ?? 'STORE').toUpperCase() === activeCat);
    return list.slice(0, 8);
  }, [popularShops, activeCat]);

  const productMenusQ = useQueries({
    queries: shopsForProducts.map((m, index) => ({
      queryKey: caseKeys.menu(m.id),
      queryFn: () => fetchCaseMerchantMenu(m.id),
      enabled: shopsForProducts.length > 0 && (index < 2 || loadMoreProducts),
      staleTime: 10 * 60_000, // 10 minutes - menu data changes less frequently
      gcTime: 30 * 60_000, // 30 minutes
      placeholderData: (prev: any) => prev,
    })),
  });

  const productsWithRestaurant = useMemo(() => {
    const out: (ProductCardItem & { restaurantId: string })[] = [];
    productMenusQ.forEach((q, i) => {
      const merchant = shopsForProducts[i];
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
  }, [productMenusQ, shopsForProducts, deliveryMins]);

  const cartCount = getCartItemCount(cart);
  const cartTotal = getCartDisplayTotal(cart);
  const cartRestaurantName = getCartRestaurantName(cart);
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      bootstrapQ.refetch(),
      allMerchantsQ.refetch(),
      walletQ.refetch(),
      ordersQ.refetch(),
      queryClient.invalidateQueries({ queryKey: caseKeys.all }),
    ]);
    setRefreshing(false);
  }, [bootstrapQ, allMerchantsQ, walletQ, ordersQ, queryClient]);

  const openMerchant = useCallback(
    (id: string) => {
      // Prefetch merchant menu data before navigation
      queryClient.prefetchQuery({
        queryKey: caseKeys.menu(id),
        queryFn: () => fetchCaseMerchantMenu(id),
      });
      router.push(`/restaurant/${id}`);
    },
    [router, queryClient],
  );

  const openCategory = (id: CaseCategoryId) => {
    setActiveCat(id);
    // No need to prefetch - categoryMerchantsQ will automatically fetch when activeCat changes
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + (cartCount > 0 && activeOrder ? 132 : cartCount > 0 || activeOrder ? 80 : 20) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CaseUi.orange} />
          }
        >
          <View style={styles.heroBgContainer} pointerEvents="none">
            <LinearGradient
              colors={
                isDark
                  ? ['#1C1C24', '#141417', colors.background]
                  : ['#FF7A00', '#FF8C20', colors.background]
              }
              locations={[0, 0.42, 1]}
              style={styles.heroWash}
            />
            <View style={[styles.glowBig, isDark && { backgroundColor: 'rgba(255,255,255,0.02)' }]} />
            <View style={[styles.glowSmall, isDark && { backgroundColor: 'rgba(255,255,255,0.01)' }]} />
          </View>

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
                style={[styles.walletPill, { backgroundColor: isDark ? '#1C1C22' : colors.cardBg }]}
                onPress={() => router.push('/wallet')}
                accessibilityLabel={`Wallet balance J$${walletBalance.toFixed(0)}`}
              >
                <Ionicons name="wallet" size={13} color={CaseUi.orange} />
                <Text style={[styles.walletAmt, { color: isDark ? '#FFFFFF' : CaseUi.ink }]}>J${walletBalance.toFixed(0)}</Text>
              </PressableScale>
              <PressableScale
                style={[styles.iconBtn, { backgroundColor: isDark ? '#1C1C22' : colors.cardBg }]}
                onPress={() => router.push('/notifications')}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={17} color={isDark ? '#FFFFFF' : CaseUi.ink} />
                {unreadCount > 0 ? (
                  <Animated.View entering={ZoomIn.duration(200)} style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </Animated.View>
                ) : null}
              </PressableScale>
              <PressableScale
                style={[styles.avatar, { backgroundColor: isDark ? '#1C1C22' : colors.cardBg }]}
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
              What are you craving today?
            </Text>
          </Animated.View>

          {/* Floating search bar */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(360)}
            style={{ marginHorizontal: PAD, marginTop: 22, height: 44 }}
          >
            <PressableScale
              style={[
                styles.search,
                {
                  backgroundColor: isDark ? '#18181C' : colors.inputBg,
                  borderColor: isDark ? '#27272A' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
              onPress={() => router.push('/search')}
              scaleTo={0.985}
            >
              <View style={styles.searchIconWrap}>
                <Ionicons name="search" size={18} color={CaseUi.orange} />
              </View>
              <Text style={[styles.searchPh, { color: isDark ? '#A0A0A0' : CaseUi.muted }]} numberOfLines={1}>
                Search food, grocery, pharmacy...
              </Text>
              <View style={[styles.micWrap, { backgroundColor: isDark ? '#222228' : CaseUi.field }]}>
                <Ionicons name="mic-outline" size={17} color={CaseUi.orange} />
              </View>
            </PressableScale>
          </Animated.View>

          {/* Categories: Fixed 'ALL' button + Scrollable rest */}
          <Animated.View entering={FadeIn.delay(60).duration(350)} style={styles.catSectionContainer}>
                <View style={styles.catFixedWrap}>
                  <CategoryTile
                    id="ALL"
                    index={0}
                    selected={activeCat === 'ALL'}
                    onPress={() => openCategory('ALL')}
                  />
                </View>
                <View style={styles.catDivider} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catScrollContent}
                >
                  {(['RESTAURANT', 'GROCERY', 'PHARMACY', 'STORE', 'GET_ANYTHING'] as CaseCategoryId[]).map((id, i) => (
                    <CategoryTile
                      key={id}
                      id={id}
                      index={i + 1}
                      selected={activeCat === id}
                      onPress={() => openCategory(id)}
                    />
                  ))}
                </ScrollView>
              </Animated.View>

              {/* Promo carousel â€” full-bleed image cards */}
              <Animated.View entering={FadeIn.delay(80).duration(400)} style={styles.promoBlock}>
                <ScrollView
                  ref={promoRef}
                  horizontal
                  decelerationRate="fast"
                  snapToInterval={PROMO_W + 12}
                  snapToAlignment="start"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                  onMomentumScrollEnd={onPromoScroll}
                >
                  {PROMOS.map((p) => (
                    <PressableScale key={p.id} onPress={() => openCategory(p.action)} style={{ width: PROMO_W }}>
                      <View style={styles.promo}>
                        <Image source={{ uri: p.image }} style={styles.promoBg} contentFit="cover" />
                        <LinearGradient
                          colors={p.gradientColors as any}
                          locations={[0, 0.35, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.promoCopy}>
                          <View style={[styles.promoBadgePill, { backgroundColor: p.badgeBg }]}>
                            <Text style={styles.promoBadgeText}>{p.eyebrow}</Text>
                          </View>
                          <Text style={styles.promoTitle}>{p.title}</Text>
                          <Text style={styles.promoSub}>{p.sub}</Text>
                          <View style={styles.promoBottomRow}>
                            <View style={styles.promoCta}>
                              <Text style={styles.promoCtaText}>{p.cta}</Text>
                              <Ionicons name="arrow-forward" size={13} color={CaseUi.ink} />
                            </View>

                            {/* Embedded Pagination Indicator Pills INSIDE card bottom right */}
                            <View style={styles.cardEmbeddedDots}>
                              {PROMOS.map((item, i) => (
                                <View
                                  key={item.id}
                                  style={[
                                    styles.cardDot,
                                    i === promoIndex && [
                                      styles.cardDotOn,
                                      { backgroundColor: item.badgeBg },
                                    ],
                                  ]}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    </PressableScale>
                  ))}
                </ScrollView>
              </Animated.View>

              {loadingHome ? (
                <HomeSkeleton />
              ) : popularShops.length === 0 ? (
                <Animated.View
                  entering={FadeInUp.duration(400)}
                  style={[
                    styles.empty,
                    {
                      backgroundColor: isDark ? '#141417' : colors.inputBg,
                      borderColor: isDark ? '#27272A' : 'transparent',
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                >
                  <View style={[styles.emptyIcon, isDark && { backgroundColor: 'rgba(255,90,0,0.12)' }]}>
                    <Ionicons name="storefront-outline" size={32} color={CaseUi.orange} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No shops nearby yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Pick a campus delivery point â€” weâ€™ll show food, grocery, pharmacy & stores.
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
                <View style={{ width: '100%' }}>
                  <SectionHeader
                    title={activeCat === 'ALL' ? 'Popular near you' : CASE_CATEGORY_META[activeCat]?.label || 'Popular near you'}
                    subtitle={activeCat === 'ALL' ? 'Trending across campus right now' : `Best ${CASE_CATEGORY_META[activeCat]?.label?.toLowerCase() || 'items'} near you`}
                    delay={120}
                    onAction={() => {
                      if (activeCat === 'GET_ANYTHING') {
                        router.push('/get-anything');
                      } else {
                        const cat = activeCat === 'ALL' ? 'RESTAURANT' : activeCat;
                        router.push(`/category/${cat.toLowerCase()}`);
                      }
                    }}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hPad}
                  >
                    {(activeCat === 'ALL' ? popularShops : (shopsByType[activeCat] || [])).slice(0, 12).map((m, i) => (
                      <Animated.View
                        key={m.id}
                        entering={FadeInRight.delay(40 + i * 28).duration(300)}
                        style={{ width: 156 }}
                      >
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
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <SectionHeader
                        title="Explore Products"
                        subtitle="Discover what's popular across campus"
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
                            style={{ width: 148 }}
                          >
                            <ProductCard
                              item={p}
                              width={148}
                              onPress={() =>
                                router.push({
                                  pathname: '/product-detail',
                                  params: { restaurantId: p.restaurantId, itemId: p.id },
                                })
                              }
                              onAdd={() => onAddProduct(p)}
                            />
                          </Animated.View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {(activeCat === 'ALL' || activeCat === 'RESTAURANT') && (shopsByType.RESTAURANT?.length ?? 0) > 0 ? (
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <SectionHeader
                        title="Top-rated restaurants"
                        subtitle="Highest rated by students like you"
                        delay={160}
                        onAction={() => router.push('/category/restaurant')}
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
                    </View>
                  ) : null}

                  {(activeCat === 'ALL' || activeCat === 'GROCERY') && (shopsByType.GROCERY?.length ?? 0) > 0 ? (
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <SectionHeader
                        title="Groceries near you"
                        subtitle="Campus-essential staples"
                        delay={180}
                        onAction={() => router.push('/category/grocery')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.GROCERY!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </View>
                  ) : null}

                  {(activeCat === 'ALL' || activeCat === 'PHARMACY') && (shopsByType.PHARMACY?.length ?? 0) > 0 ? (
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <SectionHeader
                        title="Pharmacy essentials"
                        subtitle="Health & wellness, delivered"
                        delay={200}
                        onAction={() => router.push('/category/pharmacy')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.PHARMACY!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </View>
                  ) : null}

                  {(activeCat === 'ALL' || activeCat === 'STORE') && (shopsByType.STORE?.length ?? 0) > 0 ? (
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <SectionHeader
                        title="Campus stores"
                        subtitle="Stationery, tech & more"
                        delay={220}
                        onAction={() => router.push('/category/store')}
                      />
                      <View style={styles.listPad}>
                        <ShopGrid shops={shopsByType.STORE!.slice(0, 6)} onPress={openMerchant} />
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              <Animated.View entering={FadeInUp.delay(140).duration(400)}>
                <PressableScale
                  style={[
                    styles.getAnything,
                    isDark && { backgroundColor: '#1C1C22', borderColor: '#27272A', borderWidth: 1 },
                  ]}
                  onPress={() => router.push('/get-anything')}
                >
                  <LinearGradient
                    colors={isDark ? ['#24140A', '#1C120C'] : [CaseUi.orangeSoft, '#FFE4CC']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Image source={GET_ANYTHING_IMG} style={styles.getImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.getEyebrow}>Campus request</Text>
                    <Text style={[styles.getTitle, { color: isDark ? '#FFFFFF' : CaseUi.ink }]}>Need something else?</Text>
                    <Text style={[styles.getSub, { color: isDark ? '#A0A0A5' : CaseUi.muted }]}>Custom pickup & delivery anywhere on campus</Text>
                  </View>
                  <View style={[styles.getCta, { backgroundColor: colors.cardBg, ...CaseUi.softShadow }]}>
                    <Ionicons name="arrow-forward" size={16} color={colors.text} />
                  </View>
                </PressableScale>
              </Animated.View>
        </ScrollView>

        <FloatingCartBar
          visible={cartCount > 0}
          itemCount={cartCount}
          total={cartTotal}
          restaurantName={cartRestaurantName}
          onPress={() => router.push('/(tabs)/cart')}
          bottom={activeOrder ? 68 : 12}
        />

        {/* Slim sticky active-order tracking banner */}
        {activeOrder ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.activeOrderBanner,
              {
                backgroundColor: isDark ? '#1A1A1E' : '#FFFFFF',
                borderTopColor: isDark ? '#27272A' : CaseUi.line,
                borderColor: isDark ? '#27272A' : CaseUi.line,
              },
            ]}
          >
            <PressableScale
              onPress={() => router.push({ pathname: '/order/track/[orderId]', params: { orderId: String(activeOrder.id) } })}
              style={styles.activeOrderBannerInner}
            >
              <View style={[styles.activeOrderIconDot, { backgroundColor: CaseUi.orangeSoft }]}>
                <Ionicons name={activeOrderCopy(activeOrder.orderStatus).icon} size={16} color={CaseUi.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeOrderBannerTitle, { color: isDark ? '#FFFFFF' : CaseUi.ink }]}>
                  🚚 Order in Progress
                </Text>
                <Text style={[styles.activeOrderBannerSub, { color: isDark ? '#888888' : CaseUi.muted }]} numberOfLines={1}>
                  {activeOrder.restaurant?.restaurantName ?? 'Store'} · {activeOrderCopy(activeOrder.orderStatus).label}
                  {activeOrders.length > 1 ? ` (+${activeOrders.length - 1} more)` : ''}
                </Text>
              </View>
              <View style={styles.activeOrderBannerTrack}>
                <Text style={styles.activeOrderBannerTrackText}>Track</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </View>
            </PressableScale>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}