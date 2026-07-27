import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { CaseUi } from '@/constants/caseUi';
import { ProductCustomizer } from '@/components/product-customizer';
import { formatProductMeta, getCategoryFields, type MenuItemAttributes } from '@/constants/categoryFields';
import { useCaseMerchantMenuQuery } from '@/hooks/queries/case';
import { useMenuItemQuery, useMenuByRestaurantQuery } from '@/hooks/queries/menu';
import { useRestaurantByIdQuery } from '@/hooks/queries/restaurants';
import { useAddToCartMutation } from '@/hooks/queries/cart';
import { useCart } from '@/hooks/use-cart';
import { getCartItemCount } from '@/lib/cartDisplay';
import { toast } from '@/lib/toast';
import { SkeletonBlock } from '@/components/skeleton';
import { useThemeContext } from '@/context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Helper: Horizontal Products Carousel (Clean Minimal Style)
function HorizontalProducts({
  title,
  items,
  restaurantId,
  isDark,
  colors,
}: {
  title: string;
  items: any[];
  restaurantId: string;
  isDark: boolean;
  colors: any;
}) {
  const router = useRouter();
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16 }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
        {items.map((it, idx) => (
          <Pressable
            key={`${it._id}-${idx}`}
            style={[styles.similarCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => router.push({ pathname: '/product-detail', params: { restaurantId, itemId: it._id } })}
          >
            <View style={styles.similarCardImgWrap}>
              <Image source={{ uri: it.images?.[0] || 'https://via.placeholder.com/120' }} style={styles.similarCardImg} contentFit="contain" />
              <Pressable style={styles.similarAddBtn} onPress={(e) => { e.stopPropagation(); }}>
                <Text style={styles.similarAddBtnText}>ADD</Text>
              </Pressable>
            </View>
            <View style={styles.similarCardBody}>
              <Text style={[styles.similarCardName, { color: colors.text }]} numberOfLines={2}>{it.itemName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Text style={[styles.similarCardPrice, { color: colors.text }]}>JMD {it.discountedPrice ?? it.price}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const { restaurantId, itemId } = useLocalSearchParams<{ restaurantId: string; itemId: string }>();
  const rid = restaurantId ?? '';
  
  const itemQ = useMenuItemQuery(itemId ?? '');
  const caseMenuQ = useCaseMerchantMenuQuery(rid);
  const restaurantQ = useRestaurantByIdQuery(rid);
  const menuQ = useMenuByRestaurantQuery(rid);
  
  const item: any = itemQ.data ?? null;
  const store = restaurantQ.data ?? null;
  const add = useAddToCartMutation();
  const businessType = caseMenuQ.data?.businessType;
  
  const { cart } = useCart();
  const cartCount = getCartItemCount(cart);
  
  const caseAttrs = useMemo(() => {
    const found = caseMenuQ.data?.items?.find((i) => i.id === itemId || i._id === itemId);
    return (found?.attributes ?? item?.attributes ?? null) as MenuItemAttributes | null;
  }, [caseMenuQ.data, itemId, item]);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const basePrice = item?.discountedPrice ?? item?.price ?? 0;
  const hasDiscount = Boolean(item?.discountedPrice) && item.discountedPrice !== item.price;
  const discountPercent = hasDiscount ? Math.round(((item.price - item.discountedPrice) / item.price) * 100) : 0;
  
  const totalPrice = (basePrice + customPrice) * quantity;

  const handleAddToCart = async () => {
    if (!item || !rid) return;
    setSubmitting(true);
    try {
      await add.mutateAsync({
        restaurantId: rid,
        menuItemId: String(item._id),
        quantity,
      });
      toast.success(`${item.itemName} added to cart`);
    } catch (e: any) {
      toast.error(String(e?.message ?? 'Failed to add item'));
    } finally {
      setSubmitting(false);
    }
  };

  if (itemQ.isLoading || restaurantQ.isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <SkeletonBlock width={40} height={40} radius={20} />
          </View>
          <SkeletonBlock width={SCREEN_WIDTH} height={300} radius={0} />
          <View style={{ padding: 16, gap: 16 }}>
            <SkeletonBlock width="70%" height={24} />
            <SkeletonBlock width="30%" height={16} />
            <SkeletonBlock width="100%" height={80} radius={12} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const images: string[] = item?.images?.length ? item.images : [];
  const similarItems = (menuQ.data ?? []).filter((i: any) => i._id !== itemId).slice(0, 8);

  const dividerStyle = { height: 8, backgroundColor: isDark ? '#000000' : '#F4F4F5' };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        {/* Standardized Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item?.itemName ?? 'Product Detail'}
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          
          {/* 1. Hero Gallery */}
          <Animated.View entering={FadeIn.duration(280)} style={styles.heroWrap}>
            {images.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
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
                {images.length > 1 && (
                  <View style={styles.dotsRow}>
                    {images.map((_, i) => (
                      <View key={i} style={[styles.dot, i === activeImage ? { backgroundColor: CaseUi.ink, width: 6 } : { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
                <Ionicons name="cube-outline" size={64} color={CaseUi.muted} />
              </View>
            )}
          </Animated.View>

          {/* 2. Core Product Info */}
          <Animated.View entering={FadeInDown.delay(40).duration(320)} style={styles.infoBlock}>
            {/* Badges Row */}
            {((getCategoryFields(businessType).productLabels.showFoodType && item?.foodType) || item?.isRecommended) ? (
              <View style={styles.foodTypeRow}>
                {getCategoryFields(businessType).productLabels.showFoodType && item?.foodType && (
                  <>
                    <View style={[styles.foodTypeDot, { backgroundColor: item.foodType.toLowerCase().includes('veg') && !item.foodType.toLowerCase().includes('non') ? '#16A34A' : '#DC2626' }]} />
                    <Text style={[styles.foodTypeLabel, { color: item.foodType.toLowerCase().includes('veg') && !item.foodType.toLowerCase().includes('non') ? '#16A34A' : '#DC2626' }]}>
                      {item.foodType}
                    </Text>
                  </>
                )}
                {item?.isRecommended && (
                  <View style={styles.recoBadge}><Text style={styles.recoBadgeText}>★ Recommended</Text></View>
                )}
              </View>
            ) : null}

            <Text style={[styles.name, { color: colors.text }]} numberOfLines={3}>{item?.itemName}</Text>
            
            {/* Unit size */}
            <Text style={styles.unitText}>{caseAttrs?.weight || caseAttrs?.packSize || '1 Unit'}</Text>

            {/* Premium Price Card */}
            <LinearGradient
              colors={isDark ? ['#2A1A00', '#1C1C1E'] : ['#FFF6F0', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.priceCard}
            >
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Price</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    <Text style={styles.price}>JMD <Text style={styles.priceAmount}>{Math.round(basePrice + customPrice)}</Text></Text>
                    {hasDiscount && (
                      <Text style={styles.wasPrice}>JMD {Math.round(item.price)}</Text>
                    )}
                  </View>
                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>

                {/* ADD button / Quantity Selector */}
                {item?.isAvailable === false ? (
                  <Text style={styles.soldOutText}>Out of stock</Text>
                ) : (
                  <View style={styles.addControl}>
                    {quantity > 1 ? (
                      <View style={styles.qtyControlRow}>
                        <Pressable style={styles.qtyBtn} onPress={() => setQuantity(q => q - 1)}>
                          <Ionicons name="remove" size={18} color="#FFF" />
                        </Pressable>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
                          <Ionicons name="add" size={18} color="#FFF" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.addBtnSmall} onPress={() => setQuantity(2)}>
                        <Text style={styles.addBtnSmallText}>+ ADD</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={dividerStyle} />

          {/* 3. Trust Banner — orange tinted */}
          <LinearGradient
            colors={isDark ? ['#2A1A00', '#1C1000'] : ['#FFF6F0', '#FFF9F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.trustBanner}
          >
            <View style={styles.trustIconWrap}>
              <Ionicons name="flash" size={18} color={CaseUi.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustTitle, { color: colors.text }]}>
                Delivery in {item?.preparationTimeMinutes ? item.preparationTimeMinutes + 15 : '20-30'} mins
              </Text>
              <Text style={styles.trustSub}>Fastest delivery in your area</Text>
            </View>
            <View style={styles.trustRightBadge}>
              <Text style={styles.trustRightText}>Express</Text>
            </View>
          </LinearGradient>

          <View style={dividerStyle} />

          {/* 4. Why shop from us */}
          <View style={styles.whyShopBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Why shop from {store?.restaurantName || 'SD Services'}?</Text>
            <View style={styles.whyShopGrid}>
              {businessType?.toLowerCase().includes('restaurant') || businessType?.toLowerCase().includes('food') ? (
                // Restaurant / Food
                [
                  { icon: 'restaurant', label: 'Freshly Prepared', color: '#EF4444', bg: '#FEF2F2' },
                  { icon: 'shield-checkmark', label: 'Top Hygiene', color: '#10B981', bg: '#ECFDF5' },
                  { icon: 'flash', label: 'Fast Delivery', color: '#F59E0B', bg: '#FFFBEB' },
                  { icon: 'heart', label: 'Loved by Many', color: '#EC4899', bg: '#FDF2F8' },
                ].map((item, i) => (
                  <View key={i} style={[styles.whyShopCard, { backgroundColor: isDark ? '#2D2D34' : item.bg }]}>
                    <View style={[styles.whyShopIconWrap, { backgroundColor: isDark ? '#3A3A42' : item.bg }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={[styles.whyShopText, { color: colors.text }]}>{item.label}</Text>
                  </View>
                ))
              ) : businessType?.toLowerCase().includes('pharmacy') ? (
                // Pharmacy
                [
                  { icon: 'medkit', label: 'Genuine Medicines', color: '#3B82F6', bg: '#EFF6FF' },
                  { icon: 'shield-checkmark', label: 'Safe Packaging', color: '#10B981', bg: '#ECFDF5' },
                  { icon: 'flash', label: 'Fast Delivery', color: '#F59E0B', bg: '#FFFBEB' },
                  { icon: 'document-text', label: 'Verified Sellers', color: '#8B5CF6', bg: '#F5F3FF' },
                ].map((item, i) => (
                  <View key={i} style={[styles.whyShopCard, { backgroundColor: isDark ? '#2D2D34' : item.bg }]}>
                    <View style={[styles.whyShopIconWrap, { backgroundColor: isDark ? '#3A3A42' : item.bg }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={[styles.whyShopText, { color: colors.text }]}>{item.label}</Text>
                  </View>
                ))
              ) : (
                // Grocery & Default
                [
                  { icon: 'flash', label: 'Superfast Delivery', color: '#F59E0B', bg: '#FFFBEB' },
                  { icon: 'shield-checkmark', label: 'Best Quality', color: '#10B981', bg: '#ECFDF5' },
                  { icon: 'refresh', label: 'Easy Returns', color: '#6366F1', bg: '#EEF2FF' },
                  { icon: 'pricetag', label: 'Best Price', color: CaseUi.orange, bg: CaseUi.orangeSoft },
                ].map((item, i) => (
                  <View key={i} style={[styles.whyShopCard, { backgroundColor: isDark ? '#2D2D34' : item.bg }]}>
                    <View style={[styles.whyShopIconWrap, { backgroundColor: isDark ? '#3A3A42' : item.bg }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={[styles.whyShopText, { color: colors.text }]}>{item.label}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={dividerStyle} />

          {/* 5. Dynamic Product Customization */}
          <ProductCustomizer 
            businessType={businessType || 'STORE'} 
            basePrice={basePrice} 
            onPriceChange={setCustomPrice} 
          />
          <View style={dividerStyle} />

          {/* 6. Product Details Accordions */}
          <View style={styles.detailsBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Details</Text>
            
            <View style={[styles.detailsCard, { backgroundColor: isDark ? '#2D2D34' : '#F9F9FA', borderColor: isDark ? '#3A3A42' : '#F3F4F6' }]}>
              {!!(item?.description || item?.shortDescription) && (
                <View style={styles.detailDescRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={[styles.detailValueDesc, { color: colors.textSecondary }]}>{item?.description || item?.shortDescription}</Text>
                </View>
              )}
              
              <View style={styles.detailGrid}>
                {businessType?.toLowerCase().includes('restaurant') || businessType?.toLowerCase().includes('food') ? (
                  <>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Preparation</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{item?.preparationTimeMinutes ? `${item.preparationTimeMinutes} mins` : '15-20 mins'}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Calories</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{caseAttrs?.weight ? `${caseAttrs.weight} kcal` : 'View pack'}</Text>
                    </View>
                  </>
                ) : businessType?.toLowerCase().includes('pharmacy') ? (
                  <>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Prescription</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{caseAttrs?.requiresPrescription ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Precautions</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>Consult physician</Text>
                    </View>
                    <View style={[styles.detailGridItem, { width: '100%' }]}>
                      <Text style={styles.detailLabel}>Manufacturer</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{caseAttrs?.brand || 'Standard Manufacturer'}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Unit / Weight</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{caseAttrs?.weight || caseAttrs?.packSize || '1 Unit'}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Brand</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{caseAttrs?.brand || 'Local'}</Text>
                    </View>
                    <View style={[styles.detailGridItem, { width: '100%' }]}>
                      <Text style={styles.detailLabel}>Shelf Life</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>Refer to packaging</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={dividerStyle} />

          {/* 7. Similar Products */}
          {similarItems.length > 0 && (
            <View style={[styles.sectionContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FAFAFA', paddingTop: 20 }]}>
              <HorizontalProducts title="Similar Products" items={similarItems} restaurantId={rid} isDark={isDark} colors={colors} />
            </View>
          )}
          
        </ScrollView>

        {/* Sticky Bottom Action Bar - Shown when quantity > 1 or addons selected (for demonstration, we show it always for quick checkout) */}
        <View style={[styles.bottomBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopColor: isDark ? '#2D2D34' : '#F3F4F6' }]}>
          <Pressable
            onPress={handleAddToCart}
            disabled={submitting || item?.isAvailable === false}
            style={[styles.bottomAddBtn, submitting && { opacity: 0.7 }, (item?.isAvailable === false) && { backgroundColor: '#ECECEC' }]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.bottomAddBtnText, (item?.isAvailable === false) && { color: '#6F6F6F' }]}>
                    {item?.isAvailable === false ? 'Out of Stock' : `${quantity} Item${quantity > 1 ? 's' : ''}`}
                  </Text>
                  {item?.isAvailable !== false && (
                    <Text style={styles.bottomAddSubText}>| JMD {totalPrice}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.bottomAddBtnText, (item?.isAvailable === false) && { color: '#6F6F6F' }]}>
                    {item?.isAvailable === false ? '' : 'Add to Cart'}
                  </Text>
                  {item?.isAvailable !== false && <Ionicons name="chevron-forward" size={16} color="#FFF" />}
                </View>
              </View>
            )}
          </Pressable>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: CaseUi.orange,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },

  heroWrap: {
    width: SCREEN_WIDTH,
    backgroundColor: '#F9F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  heroImage: { width: SCREEN_WIDTH, height: 280 },
  heroImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  infoBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  foodTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  foodTypeDot: { width: 8, height: 8, borderRadius: 4 },
  foodTypeLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
  recoBadge: { backgroundColor: '#FFF9C4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  recoBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#B45309' },

  name: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, lineHeight: 24, marginBottom: 4 },
  unitText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: '#7E8587', marginBottom: 16 },

  priceCard: { borderRadius: 14, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,90,0,0.12)' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  priceLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#7E8587', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: CaseUi.orange },
  priceAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: CaseUi.orange },
  wasPrice: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: '#A0A0A0', textDecorationLine: 'line-through', marginBottom: 6 },
  discountBadge: { alignSelf: 'flex-start', backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  discountBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#FFF' },
  soldOutText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#EF4444' },

  addControl: { alignItems: 'flex-end', justifyContent: 'center' },
  addBtnSmall: { width: 80, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: CaseUi.orange, backgroundColor: CaseUi.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  addBtnSmallText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: CaseUi.orange },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', width: 90, height: 38, borderRadius: 10, backgroundColor: CaseUi.orange, justifyContent: 'space-between', paddingHorizontal: 8, ...CaseUi.liftShadow },
  qtyBtn: { padding: 4 },
  qtyText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#FFF' },

  trustBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  trustIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: CaseUi.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  trustTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, marginBottom: 2 },
  trustSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#7E8587' },
  trustRightBadge: { backgroundColor: CaseUi.orange, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trustRightText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#FFF' },

  whyShopBlock: { paddingHorizontal: 16, paddingVertical: 20 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, marginBottom: 16 },
  whyShopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyShopCard: { width: '47%', borderRadius: 12, padding: 14, gap: 8 },
  whyShopIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  whyShopText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },

  variantsBlock: { paddingHorizontal: 16, paddingVertical: 20 },
  customSection: { marginBottom: 16 },
  customSectionTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: '#7E8587', marginBottom: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  optionName: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 },
  optionPrice: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInnerDot: { width: 8, height: 8, borderRadius: 4 },
  checkboxSquare: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  detailsBlock: { paddingHorizontal: 16, paddingVertical: 16 },
  detailsCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  detailDescRow: { marginBottom: 16 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailGridItem: { width: '47%', marginBottom: 4 },
  detailLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#7E8587', marginBottom: 2 },
  detailValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
  detailValueDesc: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, lineHeight: 18 },

  sectionContainer: { paddingVertical: 20 },
  similarCard: { width: 130, marginRight: 4 },
  similarCardImgWrap: { width: '100%', height: 100, backgroundColor: '#F9F9FA', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  similarCardImg: { width: '100%', height: '100%' },
  similarAddBtn: { position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: CaseUi.orange },
  similarAddBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: CaseUi.orange },
  similarCardBody: { paddingTop: 8, paddingHorizontal: 4 },
  similarCardName: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, lineHeight: 16, height: 32 },
  similarCardPrice: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  bottomAddBtn: { height: 52, borderRadius: 14, backgroundColor: CaseUi.orange, alignItems: 'center', justifyContent: 'center', ...CaseUi.liftShadow },
  bottomAddBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#FFF' },
  bottomAddSubText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#FFF', opacity: 0.9 },
});
