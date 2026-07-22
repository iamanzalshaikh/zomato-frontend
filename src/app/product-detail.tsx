import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { CaseUi } from '@/constants/caseUi';
import { formatProductMeta, type MenuItemAttributes } from '@/constants/categoryFields';
import { useCaseMerchantMenuQuery } from '@/hooks/queries/case';
import { useMenuItemQuery } from '@/hooks/queries/menu';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { toast } from '@/lib/toast';
import { SkeletonBlock } from '@/components/skeleton';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId, itemId } = useLocalSearchParams<{ restaurantId: string; itemId: string }>();
  const rid = restaurantId ?? '';
  const itemQ = useMenuItemQuery(itemId ?? '');
  const caseMenuQ = useCaseMerchantMenuQuery(rid);
  const item: any = itemQ.data ?? null;
  const add = useAddToCartMutation();
  const businessType = caseMenuQ.data?.businessType;
  const caseAttrs = useMemo(() => {
    const found = caseMenuQ.data?.items?.find((i) => i.id === itemId || i._id === itemId);
    return (found?.attributes ?? item?.attributes ?? null) as MenuItemAttributes | null;
  }, [caseMenuQ.data, itemId, item]);
  const metaTags = useMemo(
    () => formatProductMeta(businessType, caseAttrs, item?.foodType),
    [businessType, caseAttrs, item?.foodType],
  );

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  const sizeAddons = useMemo(() => {
    if (!item?.addons) return [];
    return item.addons.filter(
      (ad: any) => ad.name.startsWith('Portion:') || ad.name.startsWith('Size:'),
    );
  }, [item]);

  const extraAddons = useMemo(() => {
    if (!item?.addons) return [];
    return item.addons.filter(
      (ad: any) => !ad.name.startsWith('Portion:') && !ad.name.startsWith('Size:'),
    );
  }, [item]);

  const basePrice = item?.discountedPrice ?? item?.price ?? 0;
  const hasDiscount = Boolean(item?.discountedPrice) && item.discountedPrice !== item.price;

  const aboutBullets = useMemo(() => {
    if (item?.description) {
      const parts = String(item.description)
        .split(/[.\n•]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 3);
      if (parts.length > 0) return parts.slice(0, 6);
    }
    return metaTags;
  }, [item, metaTags]);

  const unitLine =
    caseAttrs?.packSize ||
    caseAttrs?.unit ||
    caseAttrs?.weight ||
    item?.shortDescription ||
    null;

  const totalPrice = useMemo(() => {
    if (!item) return 0;
    let addonsPrice = 0;
    (item.addons ?? []).forEach((ad: any) => {
      if (ad.name === selectedSize) addonsPrice += ad.price;
      else if (selectedAddons[ad.name]) addonsPrice += ad.price;
    });
    return (basePrice + addonsPrice) * quantity;
  }, [item, basePrice, selectedSize, selectedAddons, quantity]);

  const handleAddToCart = async () => {
    if (!item || !rid) return;
    setSubmitting(true);
    try {
      const addonsPayload: { name: string; price: number }[] = [];
      if (selectedSize) {
        const matched = item.addons?.find((ad: any) => ad.name === selectedSize);
        if (matched) addonsPayload.push({ name: selectedSize, price: matched.price });
      }
      Object.keys(selectedAddons)
        .filter((name) => selectedAddons[name])
        .forEach((name) => {
          const matched = item.addons?.find((ad: any) => ad.name === name);
          if (matched) addonsPayload.push({ name, price: matched.price });
        });

      await add.mutateAsync({
        restaurantId: rid,
        menuItemId: String(item._id),
        quantity,
        addons: addonsPayload,
      });
      toast.success(`${item.itemName} added to cart`, 'Added');
    } catch (e: any) {
      toast.error(String(e?.message ?? 'Failed to add item'));
    } finally {
      setSubmitting(false);
    }
  };

  if (itemQ.isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <SkeletonBlock width={40} height={40} radius={20} />
            <SkeletonBlock width={140} height={18} radius={6} />
            <SkeletonBlock width={40} height={40} radius={20} />
          </View>
          <SkeletonBlock width={SCREEN_WIDTH} height={280} radius={0} />
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonBlock width="70%" height={22} />
            <SkeletonBlock width="40%" height={14} />
            <SkeletonBlock width="30%" height={24} />
            <SkeletonBlock width="100%" height={80} radius={12} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const images: string[] = item?.images?.length ? item.images : [];
  const hasRating = Number(item?.averageRating ?? 0) > 0;
  const rating = Number(item?.averageRating ?? 0).toFixed(1);
  const ratingCount = item?.totalRatings ? `${item.totalRatings}` : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={CaseUi.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Product Details</Text>
          <Pressable
            style={styles.headerBtn}
            onPress={() =>
              Share.share({
                message: `${item?.itemName ?? 'Product'} — J$${basePrice} on CASE Delivery`,
              }).catch(() => undefined)
            }
          >
            <Ionicons name="share-social-outline" size={20} color={CaseUi.ink} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <Animated.View entering={FadeIn.duration(280)}>
            {images.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
                  }
                >
                  {images.map((uri, i) => (
                    <Image
                      key={`${uri}-${i}`}
                      source={{ uri }}
                      style={styles.heroImage}
                      contentFit="contain"
                      transition={200}
                    />
                  ))}
                </ScrollView>
                {images.length > 1 ? (
                  <View style={styles.dotsRow}>
                    {images.map((_, i) => (
                      <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
                <Ionicons name="cube-outline" size={56} color={CaseUi.muted} />
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={2}>
                {item?.itemName}
              </Text>
              {hasRating ? (
                <Text style={styles.rating}>
                  {rating} ★{ratingCount ? ` (${ratingCount})` : ''}
                </Text>
              ) : null}
            </View>

            {unitLine ? <Text style={styles.unit}>{unitLine}</Text> : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>JMD {Math.round(basePrice)}</Text>
              {hasDiscount ? (
                <Text style={styles.was}>JMD {Math.round(item.price)}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.qtyBtn}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={18} color={CaseUi.orange} />
                </Pressable>
                <Text style={styles.qtyText}>{quantity}</Text>
                <Pressable
                  onPress={() => setQuantity((q) => q + 1)}
                  style={styles.qtyBtn}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={18} color={CaseUi.orange} />
                </Pressable>
              </View>
            </View>

            {aboutBullets.length > 0 ? (
              <>
                <Text style={styles.aboutTitle}>About this item</Text>
                {aboutBullets.map((line) => (
                  <View key={line} style={styles.bulletRow}>
                    <Ionicons name="checkmark" size={16} color={CaseUi.muted} />
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </>
            ) : null}

            {sizeAddons.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Size</Text>
                {sizeAddons.map((addon: any) => {
                  const on = selectedSize === addon.name;
                  return (
                    <Pressable
                      key={addon.name}
                      onPress={() => setSelectedSize(addon.name)}
                      style={styles.optionRow}
                    >
                      <Ionicons
                        name={on ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={on ? CaseUi.orange : CaseUi.muted}
                      />
                      <Text style={styles.optionName}>
                        {addon.name.replace(/^(Portion|Size):\s*/i, '')}
                      </Text>
                      {addon.price ? (
                        <Text style={styles.optionPrice}>+J${addon.price}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {extraAddons.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add extras</Text>
                {extraAddons.map((addon: any) => {
                  const on = selectedAddons[addon.name] ?? false;
                  return (
                    <Pressable
                      key={addon.name}
                      onPress={() =>
                        setSelectedAddons((prev) => ({ ...prev, [addon.name]: !prev[addon.name] }))
                      }
                      style={styles.optionRow}
                    >
                      <Ionicons
                        name={on ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={on ? CaseUi.success : CaseUi.muted}
                      />
                      <Text style={styles.optionName}>{addon.name}</Text>
                      <Text style={styles.optionPrice}>+J${addon.price}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            onPress={() => setLiked((v) => !v)}
            style={styles.heartBtn}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? CaseUi.danger : CaseUi.ink}
            />
          </Pressable>
          <Pressable
            onPress={handleAddToCart}
            disabled={submitting || item?.isAvailable === false || (sizeAddons.length > 0 && !selectedSize)}
            style={[styles.addBtn, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>
                {item?.isAvailable === false
                  ? 'Sold Out'
                  : quantity > 1
                    ? `Add to Cart · J$${Math.round(totalPrice)}`
                    : 'Add to Cart'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: CaseUi.white,
  },
  heroImagePlaceholder: {
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D8D8D8',
  },
  dotActive: {
    backgroundColor: CaseUi.orange,
    width: 8,
  },
  body: { paddingHorizontal: 18, paddingTop: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
    letterSpacing: -0.3,
  },
  rating: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#2E7D32',
  },
  unit: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  price: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
  },
  was: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: CaseUi.muted,
    textDecorationLine: 'line-through',
  },
  aboutTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: CaseUi.muted,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CaseUi.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  section: { marginTop: 22 },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  optionName: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: CaseUi.ink,
  },
  optionPrice: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.muted,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: CaseUi.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CaseUi.line,
  },
  heartBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...CaseUi.softShadow,
  },
  addBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: CaseUi.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
});
