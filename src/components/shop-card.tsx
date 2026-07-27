import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { CaseUi } from '@/constants/caseUi';
import { CASE_DEFAULT_DELIVERY_MINS, getMerchantLogoUri, CASE_CATEGORY_META, type CaseCategoryId } from '@/constants/caseHome';
import { FavoriteHeart } from '@/components/favorite-heart';
import type { CaseMerchant } from '@/services/case';
import { useThemeContext } from '@/context/ThemeContext';

type Props = {
  merchant: CaseMerchant;
  index?: number;
  /** horizontal = image-forward scroll card · list = full-width row · compact = denser row */
  variant?: 'horizontal' | 'list' | 'compact';
  width?: number;
  /** Coupon/offer label surfaced from useRestaurantOfferBadges, e.g. "50% OFF" */
  offerBadge?: string | null;
  onPress: (id: string) => void;
};

export const ShopCard = memo(function ShopCard({
  merchant,
  index = 0,
  variant = 'horizontal',
  width = 156,
  offerBadge,
  onPress,
}: Props) {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const mins = merchant.averageDeliveryTime ?? CASE_DEFAULT_DELIVERY_MINS;
  const open = merchant.isOpen !== false;
  const rating = merchant.averageRating ?? 0;
  const hasRating = rating > 0;
  const logo = getMerchantLogoUri(merchant, index);
  const cover = merchant.bannerImages?.[0] || logo;
  const minOrderLabel = merchant.minimumOrderAmount ? `Min J$${merchant.minimumOrderAmount}` : null;

  if (variant === 'list') {
    const catMeta = merchant.businessType ? CASE_CATEGORY_META[merchant.businessType.toUpperCase() as CaseCategoryId] : null;
    const catLabel = catMeta?.short || merchant.businessType;
    return (
      <Pressable
        onPress={() => onPress(merchant.id)}
        style={({ pressed }) => [
          styles.listCard,
          {
            backgroundColor: isDark ? '#18181C' : CaseUi.white,
            borderColor: isDark ? '#282830' : CaseUi.line,
          },
          pressed && styles.pressed,
        ]}
      >
        {/* Banner image wrapper */}
        <View style={styles.listImageWrap}>
          <Image 
            source={{ uri: cover }} 
            style={styles.listImage} 
            contentFit="cover" 
            transition={200}
            cachePolicy="memory-disk"
            placeholder={isDark ? '#18181C' : CaseUi.field}
          />
          
          {/* Overlay badge (Gold ticket/icon) on top-left of banner */}
          {offerBadge && open ? (
            <View style={styles.listTopLeftBadge}>
              <Ionicons name="pricetags" size={10} color="#E05A10" style={{ marginRight: 4 }} />
              <Text style={styles.listTopLeftBadgeText} numberOfLines={1}>{offerBadge}</Text>
            </View>
          ) : null}

          {/* Overlay closed shade */}
          {!open ? (
            <View style={styles.listClosedShade}>
              <Text style={styles.listClosedText}>CLOSED</Text>
            </View>
          ) : null}

          {/* Overlay heart on top-right */}
          <View style={styles.listHeartWrap}>
            <FavoriteHeart restaurantId={merchant.id} size={15} variant="overlay" />
          </View>
        </View>

        {/* Bottom details block */}
        <View style={styles.listBodyRow}>
          {/* Circular logo */}
          <View style={[styles.listLogoCircle, { borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
            <Image 
              source={{ uri: logo }} 
              style={styles.listLogoImg} 
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={isDark ? '#18181C' : CaseUi.field}
            />
          </View>

          {/* Main Info Columns */}
          <View style={styles.listInfoCol}>
            {/* Row 1: Name and Heart/Action */}
            <View style={styles.listNameRow}>
              <Text style={[styles.listNameText, { color: colors.text }]} numberOfLines={1}>
                {merchant.restaurantName}
              </Text>
            </View>

            {/* Row 2: Description */}
            <Text style={[styles.listDescText, { color: colors.textSecondary }]} numberOfLines={1}>
              {(merchant.cuisines && merchant.cuisines.length > 0 ? merchant.cuisines.join(', ') : null) || `Special selection of premium items from our ${catLabel ?? 'store'}`}
            </Text>

            {/* Row 3: Meta items & rating */}
            <View style={styles.listMetaRow}>
              {/* Delivery time with clock icon */}
              <View style={styles.listMetaItem}>
                <Ionicons name="time" size={11} color="#888888" style={{ marginRight: 3 }} />
                <Text style={[styles.listMetaText, { color: colors.textSecondary }]}>{mins} min</Text>
              </View>

              <Text style={[styles.listMetaDot, { color: colors.textSecondary }]}>•</Text>

              {/* Delivery price / min order with bicycle icon */}
              <View style={styles.listMetaItem}>
                <Ionicons name="bicycle" size={11} color="#888888" style={{ marginRight: 3 }} />
                <Text style={[styles.listMetaText, { color: colors.textSecondary }]}>
                  {minOrderLabel ? minOrderLabel.replace('Min ', '') : 'J$120'}
                </Text>
              </View>

              <Text style={[styles.listMetaDot, { color: colors.textSecondary }]}>•</Text>

              {/* Green rating badge */}
              {hasRating ? (
                <View style={styles.listGreenRatingPill}>
                  <Ionicons name="star" size={9} color="#FFFFFF" style={{ marginRight: 2 }} />
                  <Text style={styles.listGreenRatingText}>{rating.toFixed(1)}</Text>
                </View>
              ) : (
                <View style={styles.listRatingNewPill}>
                  <Text style={styles.listRatingNewText}>NEW</Text>
                </View>
              )}

              {/* Ellipsis Vertical on far right */}
              <View style={styles.listEllipsisWrap}>
                <Ionicons name="ellipsis-vertical" size={13} color="#888888" />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={() => onPress(merchant.id)}
        style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}
      >
        <Image 
          source={{ uri: logo }} 
          style={styles.compactLogo} 
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={isDark ? '#18181C' : CaseUi.field}
        />
        <View style={styles.listBody}>
          <Text style={styles.nameSm} numberOfLines={1}>{merchant.restaurantName}</Text>
          <View style={styles.metaRow}>
            {hasRating ? (
              <>
                <Ionicons name="star" size={11} color={CaseUi.orange} />
                <Text style={styles.meta}>{rating.toFixed(1)}</Text>
                <Text style={styles.dot}>·</Text>
              </>
            ) : null}
            <Text style={styles.meta}>{mins} mins</Text>
          </View>
          <View style={[styles.openPill, !open && styles.closedPill]}>
            <Text style={[styles.openText, !open && styles.closedText]}>
              {open ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(merchant.id)}
      style={({ pressed }) => [
        { width },
        styles.hCard,
        {
          backgroundColor: isDark ? '#18181C' : CaseUi.white,
          borderColor: isDark ? '#282830' : 'rgba(0,0,0,0.06)',
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.coverWrap}>
        <Image 
          source={{ uri: cover }} 
          style={styles.cover} 
          contentFit="cover" 
          transition={200}
          cachePolicy="memory-disk"
          placeholder={isDark ? '#18181C' : CaseUi.field}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.68)']}
          locations={[0.4, 1]}
          style={styles.coverScrim}
        />
        {offerBadge && open ? (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText} numberOfLines={1}>{offerBadge}</Text>
          </View>
        ) : null}
        <View style={styles.heartFab}>
          <FavoriteHeart restaurantId={merchant.id} size={15} variant="overlay" />
        </View>
        {!open ? (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedOverlayText}>CLOSED</Text>
          </View>
        ) : (
          <View style={styles.coverMetaRow}>
            {hasRating ? (
              <View style={styles.coverRatingPill}>
                <Ionicons name="star" size={9} color="#FFFFFF" />
                <Text style={styles.coverRatingText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
            <Text style={styles.coverEta}>{mins} min</Text>
          </View>
        )}
      </View>
      <View style={styles.hBody}>
        <Text style={[styles.nameSm, { color: colors.text }]} numberOfLines={1}>
          {merchant.restaurantName}
        </Text>
        <Text style={[styles.fee, { color: colors.textSecondary }]} numberOfLines={1}>
          {minOrderLabel ?? 'No minimum order'}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hCard: {
    backgroundColor: CaseUi.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  coverWrap: { height: 114, backgroundColor: CaseUi.field },
  cover: { width: '100%', height: '100%' },
  coverScrim: { ...StyleSheet.absoluteFill },
  ribbon: {
    position: 'absolute',
    top: 8,
    left: 0,
    backgroundColor: CaseUi.orange,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    maxWidth: '78%',
  },
  ribbonText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  heartFab: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  closedOverlay: {
    position: 'absolute',
    left: 10,
    bottom: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedOverlayText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.4 },
  coverMetaRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverRatingText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  coverEta: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' },
  hBody: { padding: 10 },
  name: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: CaseUi.ink,
  },
  nameSm: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.ink,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaDotGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: CaseUi.muted },
  dot: { color: CaseUi.muted, fontSize: 10 },
  fee: {
    marginTop: 3,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: CaseUi.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingPillText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  newPill: {
    backgroundColor: CaseUi.orangeSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newPillText: { color: CaseUi.orange, fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  openLabel: { marginTop: 5, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.success },
  closedLabel: { marginTop: 5, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.danger },
  openPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CaseUi.success,
    backgroundColor: CaseUi.successSoft,
  },
  closedPill: { borderColor: CaseUi.danger, backgroundColor: '#FEE2E2' },
  openText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: CaseUi.success,
  },
  closedText: { color: CaseUi.danger },
  listCard: {
    flexDirection: 'column',
    borderRadius: 20,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 0,
    ...CaseUi.cardShadow,
  },
  listImageWrap: {
    width: '100%',
    height: 160,
    backgroundColor: CaseUi.field,
    position: 'relative',
  },
  listImage: { width: '100%', height: '100%' },
  listClosedShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listClosedText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.8 },
  listTopLeftBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 10,
  },
  listTopLeftBadgeText: {
    color: '#111111',
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  listHeartWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  listBodyRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  listLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  listLogoImg: {
    width: '100%',
    height: '100%',
  },
  listInfoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listNameText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
  listDescText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  listMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listMetaText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
  },
  listMetaDot: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  listGreenRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#267E3E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listGreenRatingText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  listRatingNewPill: {
    backgroundColor: '#FFECE2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listRatingNewText: {
    color: CaseUi.orange,
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  listEllipsisWrap: {
    marginLeft: 'auto',
    paddingLeft: 8,
  },
  compactCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    marginBottom: 8,
  },
  listLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: CaseUi.field },
  compactLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: CaseUi.field },
  listBody: { flex: 1, justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  pressed: { opacity: 0.92 },
  catTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  catTagText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  metaDivider: {
    fontSize: 10,
    marginHorizontal: 2,
  },
});
