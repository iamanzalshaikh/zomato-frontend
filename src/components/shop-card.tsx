import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { CaseUi } from '@/constants/caseUi';
import { CASE_DEFAULT_DELIVERY_MINS, getMerchantLogoUri } from '@/constants/caseHome';
import { FavoriteHeart } from '@/components/favorite-heart';
import type { CaseMerchant } from '@/services/case';

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
  const mins = merchant.averageDeliveryTime ?? CASE_DEFAULT_DELIVERY_MINS;
  const open = merchant.isOpen !== false;
  const rating = merchant.averageRating ?? 0;
  const hasRating = rating > 0;
  const logo = getMerchantLogoUri(merchant, index);
  const cover = merchant.bannerImages?.[0] || logo;
  const minOrderLabel = merchant.minimumOrderAmount ? `Min J$${merchant.minimumOrderAmount}` : null;

  if (variant === 'list') {
    return (
      <Pressable
        onPress={() => onPress(merchant.id)}
        style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
      >
        <View style={styles.listImageWrap}>
          <Image source={{ uri: cover }} style={styles.listImage} contentFit="cover" transition={200} />
          {!open ? (
            <View style={styles.listClosedShade}>
              <Text style={styles.listClosedText}>CLOSED</Text>
            </View>
          ) : null}
          {offerBadge && open ? (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText} numberOfLines={1}>{offerBadge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.listBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>{merchant.restaurantName}</Text>
            <FavoriteHeart restaurantId={merchant.id} size={17} variant="header" />
          </View>
          <View style={styles.metaRow}>
            {hasRating ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={10} color="#FFFFFF" />
                <Text style={styles.ratingPillText}>{rating.toFixed(1)}</Text>
              </View>
            ) : (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>New</Text>
              </View>
            )}
            <View style={styles.metaDotGroup}>
              <Ionicons name="time-outline" size={12} color={CaseUi.muted} />
              <Text style={styles.meta}>{mins} mins</Text>
            </View>
            {minOrderLabel ? <Text style={styles.meta}>· {minOrderLabel}</Text> : null}
          </View>
          {open ? (
            <Text style={styles.openLabel}>Open now</Text>
          ) : (
            <Text style={styles.closedLabel}>Currently closed</Text>
          )}
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
        <Image source={{ uri: logo }} style={styles.compactLogo} contentFit="cover" />
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
      style={({ pressed }) => [{ width }, styles.hCard, pressed && styles.pressed]}
    >
      <View style={styles.coverWrap}>
        <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={200} />
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
        <Text style={styles.nameSm} numberOfLines={1}>
          {merchant.restaurantName}
        </Text>
        <Text style={styles.fee} numberOfLines={1}>
          {minOrderLabel ?? 'No minimum order'}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hCard: {
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.lg,
    borderWidth: 1,
    borderColor: CaseUi.line,
    overflow: 'hidden',
    ...CaseUi.cardShadow,
  },
  coverWrap: { height: 106, backgroundColor: CaseUi.field },
  cover: { width: '100%', height: '100%' },
  coverScrim: { ...StyleSheet.absoluteFill },
  ribbon: {
    position: 'absolute',
    top: 10,
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
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: CaseUi.radius.lg,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    marginBottom: 12,
    ...CaseUi.cardShadow,
  },
  listImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
  },
  listImage: { width: '100%', height: '100%' },
  listClosedShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listClosedText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.4 },
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
});
