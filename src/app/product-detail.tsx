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
import { useThemeContext } from '@/context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
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
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Product Details</Text>
          <Pressable
            style={styles.headerBtn}
            onPress={async () => {
              try {
                await Share.share({
                  message: `Check out ${item?.itemName ?? 'this product'} on Multivendor App!`,
                });
              } catch (e) {
                console.log(e);
              }
            }}
            hitSlop={8}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.text} />
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
                      style={[styles.heroImage, { backgroundColor: isDark ? '#141417' : CaseUi.white }]}
                      contentFit="contain"
                      transition={200}
                    />
                  ))}
                </ScrollView>
                {images.length > 1 ? (
                  <View style={styles.dotsRow}>
                    {images.map((_, i) => {
                      const isActive = i === activeImage;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            isActive
                              ? { backgroundColor: CaseUi.orange, width: 14 }
                              : { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }
                          ]}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.heroImage, styles.heroImagePlaceholder, { backgroundColor: isDark ? '#141417' : CaseUi.field }]}>
                <Ionicons name="cube-outline" size={56} color={CaseUi.muted} />
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.body}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {item?.itemName}
            </Text>

            <View style={styles.priceRatingRow}>
              <View style={styles.priceRowCompact}>
                <Text style={[styles.price, { color: colors.text }]}>JMD {Math.round(basePrice)}</Text>
                {hasDiscount ? (
                  <Text style={styles.was}>JMD {Math.round(item.price)}</Text>
                ) : null}
              </View>
              {hasRating ? (
                <View style={styles.ratingRowCompact}>
                  <Ionicons name="star" size={13} color="#00B365" style={{ marginRight: 3 }} />
                  <Text style={[styles.ratingTextGreen, { color: colors.text }]}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#00B365' }}>{rating}</Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', color: isDark ? '#A1A1AA' : '#7E8587' }}> ({ratingCount ?? '320+'})</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.ratingRowCompact}>
                  <Ionicons name="star" size={13} color="#00B365" style={{ marginRight: 3 }} />
                  <Text style={[styles.ratingTextGreen, { color: colors.text }]}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#00B365' }}>4.4</Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', color: isDark ? '#A1A1AA' : '#7E8587' }}> (320+)</Text>
                  </Text>
                </View>
              )}
            </View>

            {!!item?.description ? (
              <Text style={[styles.descriptionText, { color: isDark ? '#A1A1AA' : '#5E6668' }]}>
                {item.description}
              </Text>
            ) : !!item?.shortDescription ? (
              <Text style={[styles.descriptionText, { color: isDark ? '#A1A1AA' : '#5E6668' }]}>
                {item.shortDescription}
              </Text>
            ) : null}

            <View style={[styles.sectionDivider, { backgroundColor: isDark ? '#2D2D34' : '#E9ECEF' }]} />

            {sizeAddons.length > 0 || extraAddons.length > 0 ? (
              <View style={styles.customizeContainer}>
                <Text style={[styles.customizeTitle, { color: colors.text }]}>Customize</Text>

                {sizeAddons.length > 0 ? (
                  <View style={styles.customSection}>
                    <Text style={styles.customSectionTitle}>Choose Size</Text>
                    {sizeAddons.map((addon: any) => {
                      const on = selectedSize === addon.name;
                      return (
                        <Pressable
                          key={addon.name}
                          onPress={() => setSelectedSize(addon.name)}
                          style={styles.optionRow}
                        >
                          <View style={[styles.radioCircle, { borderColor: on ? CaseUi.orange : (isDark ? '#3A3A3C' : '#C7C7CC') }]}>
                            {on && <View style={[styles.radioInnerDot, { backgroundColor: CaseUi.orange }]} />}
                          </View>
                          <Text style={[styles.optionName, { color: colors.text }]}>
                            {addon.name.replace(/^(Portion|Size):\s*/i, '')}
                          </Text>
                          {addon.price ? (
                            <Text style={[styles.optionPrice, { color: colors.text }]}>JMD {addon.price}</Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {extraAddons.length > 0 ? (
                  <View style={styles.customSection}>
                    <Text style={styles.customSectionTitle}>Add Extras</Text>
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
                          <View
                            style={[
                              styles.checkboxSquare,
                              {
                                borderColor: on ? CaseUi.orange : (isDark ? '#3A3A3C' : '#C7C7CC'),
                                backgroundColor: on ? CaseUi.orange : 'transparent',
                              },
                            ]}
                          >
                            {on && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                          </View>
                          <Text style={[styles.optionName, { color: colors.text }]}>{addon.name}</Text>
                          <Text style={[styles.optionPrice, { color: colors.text }]}>JMD {addon.price}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: isDark ? '#141417' : CaseUi.white, borderTopColor: isDark ? '#27272A' : CaseUi.line, paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.footerQtyContainer}>
            <Pressable
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={styles.footerQtyBtn}
              hitSlop={8}
            >
              <Ionicons name="remove" size={16} color={CaseUi.ink} />
            </Pressable>
            <Text style={styles.footerQtyText}>{quantity}</Text>
            <Pressable
              onPress={() => setQuantity((q) => q + 1)}
              style={styles.footerQtyBtn}
              hitSlop={8}
            >
              <Ionicons name="add" size={16} color={CaseUi.ink} />
            </Pressable>
          </View>

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
                  : `Add to Cart`}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 18,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  body: { paddingHorizontal: 18, paddingTop: 16 },
  name: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
    letterSpacing: -0.3,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  optionName: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },
  optionPrice: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: CaseUi.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CaseUi.line,
  },
  addBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: CaseUi.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
  },
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  priceRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingTextGreen: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  customizeContainer: {
    marginTop: 12,
  },
  customizeTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    marginBottom: 14,
  },
  customSection: {
    marginBottom: 20,
  },
  customSectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#7E8587',
    marginBottom: 8,
  },
  footerQtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 16,
  },
  footerQtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerQtyText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: CaseUi.ink,
    minWidth: 16,
    textAlign: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionDivider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  descriptionText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
