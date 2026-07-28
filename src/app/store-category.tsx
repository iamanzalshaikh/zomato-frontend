import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
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
import { useAddToCartMutation, useUpdateCartItemMutation, useRemoveCartItemMutation } from '@/hooks/queries/cart';
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
  const updateCartLine = useUpdateCartItemMutation();
  const removeCartLine = useRemoveCartItemMutation();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(category ?? 'All');

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (caseMenuQ.data?.categories ?? []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [caseMenuQ.data]);

  // Derived from the already-fetched CASE menu (same shape useMenuByRestaurantQuery
  // would normalize to) instead of a second, duplicate /case/merchants/:id/menu call.
  const items = useMemo(
    () =>
      (caseMenuQ.data?.items ?? []).map(
        (item): MenuItem => ({
          _id: item._id || item.id,
          restaurantId: item.restaurantId,
          categoryId: item.categoryId,
          itemName: item.itemName,
          description: item.description,
          images: item.images,
          price: item.discountedPrice != null ? item.discountedPrice : item.price,
          discountedPrice: item.discountedPrice ?? undefined,
          foodType: item.foodType,
          isAvailable: item.isAvailable !== false && !item.isSoldOut,
          addons: item.addons,
        }),
      ),
    [caseMenuQ.data],
  );

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

  const cartQtyByMenuId = useMemo(() => {
    const map = new Map<string, { lineId: string; qty: number }>();
    for (const line of cart?.items ?? []) {
      const lineStore = String((line as { restaurantId?: string }).restaurantId ?? '');
      if (rid && lineStore && lineStore !== rid) continue;
      const mid = String(line.menuItemId || '').trim();
      if (!mid) continue;
      const prev = map.get(mid);
      const qty = Number(line.quantity || 0);
      if (prev) map.set(mid, { lineId: prev.lineId, qty: prev.qty + qty });
      else map.set(mid, { lineId: String(line._id), qty });
    }
    return map;
  }, [cart?.items, rid]);

  const handleAdd = useCallback(
    async (item: MenuItem) => {
      if (item.addons && item.addons.length > 0) {
        router.push({ pathname: '/product-detail', params: { restaurantId: rid, itemId: item._id } });
        return;
      }
      setAddingItemId(String(item._id));
      try {
        await add.mutateAsync({
          restaurantId: rid,
          menuItemId: String(item._id),
          quantity: 1,
          itemName: item.itemName,
          price: Number(item.discountedPrice ?? item.price ?? 0),
        });
        toast.success(`${item.itemName} added to cart`, 'Added');
      } catch (e: any) {
        toast.error(String(e?.message ?? 'Failed to add item'));
      } finally {
        setAddingItemId(null);
      }
    },
    [add, rid, router],
  );

  const handleChangeQty = useCallback(
    async (item: MenuItem, lineId: string, nextQty: number) => {
      const itemKey = String(item._id);
      setAddingItemId(itemKey);
      try {
        if (nextQty <= 0) await removeCartLine.mutateAsync({ itemId: lineId });
        else await updateCartLine.mutateAsync({ itemId: lineId, quantity: nextQty });
      } catch (e: any) {
        toast.error(String(e?.message ?? 'Could not update cart'));
      } finally {
        setAddingItemId((cur) => (cur === itemKey ? null : cur));
      }
    },
    [removeCartLine, updateCartLine],
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

        {caseMenuQ.isLoading ? (
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
                    {(() => {
                      const line = cartQtyByMenuId.get(String(item._id));
                      const qty = line?.qty ?? 0;
                      const busy = addingItemId === String(item._id);
                      if (soldOut) {
                        return (
                          <View style={[styles.addBtn, { opacity: 0.6 }]}>
                            <Text style={styles.soldOut}>OUT</Text>
                          </View>
                        );
                      }
                      if (qty > 0 && line?.lineId) {
                        return (
                          <View style={styles.qtyPill}>
                            <Pressable
                              hitSlop={8}
                              disabled={busy}
                              onPress={() => void handleChangeQty(item, line.lineId, qty - 1)}
                              style={styles.qtyPillBtn}
                            >
                              <Ionicons name="remove" size={14} color={CaseUi.orange} />
                            </Pressable>
                            <Text style={styles.qtyPillText}>{qty}</Text>
                            <Pressable
                              hitSlop={8}
                              disabled={busy}
                              onPress={() => void handleChangeQty(item, line.lineId, qty + 1)}
                              style={styles.qtyPillBtn}
                            >
                              <Ionicons name="add" size={14} color={CaseUi.orange} />
                            </Pressable>
                          </View>
                        );
                      }
                      return (
                        <PressableScale
                          onPress={() => handleAdd(item)}
                          style={[styles.addBtn, busy && { opacity: 0.6 }]}
                          disabled={busy}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={CaseUi.orange} />
                          ) : (
                            <Text style={styles.addText}>ADD</Text>
                          )}
                        </PressableScale>
                      );
                    })()}
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
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.white,
    paddingHorizontal: 2,
  },
  qtyPillBtn: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyPillText: {
    minWidth: 16,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: CaseUi.orange,
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
