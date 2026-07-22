import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { formatProductMeta, type MenuItemAttributes } from '@/constants/categoryFields';
import { useCaseMerchantMenuQuery } from '@/hooks/queries/case';
import { useMenuByRestaurantQuery } from '@/hooks/queries/menu';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { useCart } from '@/hooks/use-cart';
import { useFloatingCartBottom, useFloatingCartScrollPadding } from '@/hooks/use-floating-cart-inset';
import { getCartDisplayTotal, getCartItemCount, getCartRestaurantName } from '@/lib/cartDisplay';
import { toast } from '@/lib/toast';
import { type MenuItem } from '@/services/menu';

const SCREEN_W = Dimensions.get('window').width;
const CARD_GAP = 12;
const H_PAD = 16;
const CARD_W = (SCREEN_W - H_PAD * 2 - CARD_GAP) / 2;

export default function StoreCategoryScreen() {
  const router = useRouter();
  const { restaurantId, category } = useLocalSearchParams<{ restaurantId: string; category?: string }>();
  const rid = restaurantId ?? '';

  const menuQ = useMenuByRestaurantQuery(rid);
  const caseMenuQ = useCaseMerchantMenuQuery(rid);
  const businessType = caseMenuQ.data?.businessType;
  const storeName = caseMenuQ.data?.restaurantName ?? 'Store';
  const attrsById = useMemo(() => {
    const map: Record<string, MenuItemAttributes | null> = {};
    (caseMenuQ.data?.items ?? []).forEach((it) => {
      map[it.id] = it.attributes ?? null;
    });
    return map;
  }, [caseMenuQ.data]);
  const add = useAddToCartMutation();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(category ?? 'All');

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (caseMenuQ.data?.categories ?? []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [caseMenuQ.data]);

  const items = useMemo(() => (menuQ.data ?? []) as MenuItem[], [menuQ.data]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    items.forEach((it) => {
      const rawCategory = (it as any).categoryId;
      const catName =
        rawCategory?.categoryName ?? categoryNameMap[String(rawCategory ?? '')] ?? 'Menu';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(it);
    });
    return groups;
  }, [items, categoryNameMap]);

  const categoryNames = useMemo(() => Object.keys(groupedItems), [groupedItems]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return groupedItems[selectedCategory] ?? [];
  }, [selectedCategory, groupedItems, items]);

  const { cart } = useCart();
  const cartCount = useMemo(() => getCartItemCount(cart), [cart]);
  const cartTotal = useMemo(() => getCartDisplayTotal(cart), [cart]);
  const cartRestaurantName = useMemo(() => getCartRestaurantName(cart), [cart]);
  const cartBottom = useFloatingCartBottom();
  const scrollBottomPadding = useFloatingCartScrollPadding(cartCount > 0);

  const handleAdd = useCallback(
    async (item: MenuItem) => {
      if (item.addons && item.addons.length > 0) {
        router.push({ pathname: '/product-detail', params: { restaurantId: rid, itemId: item._id } });
        return;
      }
      setAddingItemId(String(item._id));
      try {
        await add.mutateAsync({ restaurantId: rid, menuItemId: String(item._id), quantity: 1 });
        toast.success(`${item.itemName} added to cart`, 'Added');
      } catch (e: any) {
        toast.error(String(e?.message ?? 'Failed to add item'));
      } finally {
        setAddingItemId(null);
      }
    },
    [add, rid, router],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View entering={FadeInDown.duration(260)} style={styles.headerBar}>
          <PressableScale onPress={() => router.back()} style={styles.headerBackBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedCategory === 'All' ? storeName : selectedCategory}
            </Text>
            <Text style={styles.headerSub}>{visibleItems.length} items</Text>
          </View>
          <PressableScale style={styles.headerIcon} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={20} color={CaseUi.ink} />
          </PressableScale>
        </Animated.View>

        <View style={styles.pillRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', ...categoryNames]}
            keyExtractor={(name) => name}
            contentContainerStyle={styles.pillRowContent}
            renderItem={({ item: name }) => {
              const isActive = selectedCategory === name;
              return (
                <PressableScale
                  onPress={() => setSelectedCategory(name)}
                  style={[styles.pill, isActive && styles.pillActive]}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{name}</Text>
                </PressableScale>
              );
            }}
          />
        </View>

        {menuQ.isLoading ? (
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <SkeletonBlock width="100%" height={CARD_W - 20} radius={12} />
                <SkeletonBlock width="90%" height={13} style={{ marginTop: 8 }} />
                <SkeletonBlock width="50%" height={13} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            key="store-category-grid-2"
            data={visibleItems}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={{
              paddingHorizontal: H_PAD,
              paddingTop: 14,
              paddingBottom: scrollBottomPadding,
            }}
            ListEmptyComponent={
              <EmptyState icon="basket-outline" title="No items here" subtitle="Nothing in this category yet." />
            }
            renderItem={({ item, index }) => {
              const price = item.discountedPrice ?? item.price;
              const hasDiscount =
                Boolean(item.discountedPrice) && item.discountedPrice !== item.price;
              const pct =
                hasDiscount && item.price > 0
                  ? Math.round(((item.price - price) / item.price) * 100)
                  : 0;
              const tags = formatProductMeta(
                businessType,
                attrsById[String(item._id)] ?? (item as any).attributes,
                item.foodType,
              );
              const soldOut = item.isAvailable === false;
              return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 25).duration(240)}>
                <PressableScale
                  onPress={() =>
                    router.push({
                      pathname: '/product-detail',
                      params: { restaurantId: rid, itemId: item._id },
                    })
                  }
                  style={styles.card}
                >
                  <View style={styles.imageWrap}>
                    {item.images?.[0] ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[styles.cardImage, styles.imagePlaceholder]}>
                        <Ionicons name="cube-outline" size={28} color={CaseUi.muted} />
                      </View>
                    )}
                    {pct > 0 ? (
                      <View style={styles.offBadge}>
                        <Text style={styles.offText}>{pct}% OFF</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardName} numberOfLines={2}>
                    {item.itemName}
                  </Text>
                  {tags[0] ? (
                    <Text style={styles.cardTag} numberOfLines={1}>
                      {tags[0]}
                    </Text>
                  ) : null}
                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.cardPrice}>J${Math.round(price)}</Text>
                      {hasDiscount ? (
                        <Text style={styles.cardWas}>J${Math.round(item.price)}</Text>
                      ) : null}
                    </View>
                    <PressableScale
                      onPress={() => handleAdd(item)}
                      style={[styles.addBtn, (addingItemId === item._id || soldOut) && { opacity: 0.6 }]}
                      disabled={addingItemId === item._id || soldOut}
                    >
                      {addingItemId === item._id ? (
                        <ActivityIndicator size="small" color={CaseUi.orange} />
                      ) : soldOut ? (
                        <Text style={styles.soldOut}>OUT</Text>
                      ) : (
                        <Text style={styles.addText}>ADD</Text>
                      )}
                    </PressableScale>
                  </View>
                </PressableScale>
                </Animated.View>
              );
            }}
          />
        )}
      </SafeAreaView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBackBtn: { padding: 4 },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: CaseUi.ink,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
    marginTop: 1,
  },
  pillRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  pillRowContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CaseUi.field,
  },
  pillActive: {
    backgroundColor: CaseUi.orange,
  },
  pillText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: CaseUi.ink,
  },
  pillTextActive: {
    color: CaseUi.white,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: H_PAD,
    paddingTop: 14,
  },
  skeletonCard: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    padding: 10,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_W,
    backgroundColor: CaseUi.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    padding: 10,
    ...CaseUi.softShadow,
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
    marginBottom: 8,
  },
  cardImage: {
    width: '100%',
    height: CARD_W - 20,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: CaseUi.orange,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  offText: {
    color: CaseUi.white,
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  cardName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.ink,
    minHeight: 34,
  },
  cardTag: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
  },
  cardBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    color: CaseUi.ink,
  },
  cardWas: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    minWidth: 52,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CaseUi.success,
    backgroundColor: CaseUi.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  addText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: CaseUi.success,
  },
  soldOut: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: CaseUi.muted,
  },
});
