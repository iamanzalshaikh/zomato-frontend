import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CaseUi } from '@/constants/caseUi';
import { formatProductMeta, type MenuItemAttributes } from '@/constants/categoryFields';

export type ProductCardItem = {
  id: string;
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
};

type Props = {
  item: ProductCardItem;
  width?: number;
  variant?: 'case' | 'blinkit';
  onPress?: () => void;
  onAdd?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ProductCard = memo(function ProductCard({
  item,
  width = 148,
  variant = 'case',
  onPress,
  onAdd,
}: Props) {
  const tags = formatProductMeta(item.businessType, item.attributes, item.foodType);
  const image =
    item.image ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80';
  const blinkit = variant === 'blinkit';
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={[animStyle, { width }, styles.card]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
        {item.discountPct ? (
          <View style={[styles.offBadge, blinkit && styles.offBadgeBlinkit]}>
            <Text style={styles.offText}>{item.discountPct}% OFF</Text>
          </View>
        ) : null}
        <Pressable style={styles.heart} hitSlop={8}>
          <Ionicons name="heart-outline" size={14} color={CaseUi.ink} />
        </Pressable>
      </View>

      {tags[0] ? (
        <View style={styles.tagPill}>
          <Text style={styles.tagPillText} numberOfLines={1}>
            {tags[0]}
          </Text>
        </View>
      ) : null}

      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
      {item.storeName ? (
        <Text style={styles.store} numberOfLines={1}>
          {item.storeName}
        </Text>
      ) : null}

      <View style={styles.bottom}>
        <View style={{ flex: 1, paddingRight: 6 }}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, blinkit && styles.priceBlinkit]}>
              J${Math.round(item.price)}
            </Text>
            {item.originalPrice && item.originalPrice > item.price ? (
              <Text style={styles.was}>J${Math.round(item.originalPrice)}</Text>
            ) : null}
          </View>
          {item.discountPct ? (
            <Text style={styles.offLabel}>{item.discountPct}% OFF</Text>
          ) : null}
          <View style={styles.etaRow}>
            <Ionicons name="time-outline" size={11} color={CaseUi.muted} />
            <Text style={styles.eta}>{item.deliveryMins ?? 20} mins</Text>
          </View>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onAdd?.();
          }}
          style={[styles.addBtn, blinkit && styles.addBtnBlinkit]}
          hitSlop={6}
        >
          {blinkit ? (
            <Text style={styles.addText}>ADD</Text>
          ) : (
            <Ionicons name="add" size={20} color={CaseUi.white} />
          )}
        </Pressable>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.xl,
    padding: 10,
    ...CaseUi.cardShadow,
  },
  imageWrap: {
    height: 112,
    borderRadius: CaseUi.radius.lg,
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
    marginBottom: 8,
  },
  image: { width: '100%', height: '100%' },
  offBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: CaseUi.orange,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offBadgeBlinkit: { backgroundColor: CaseUi.orange },
  offText: {
    color: CaseUi.white,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: CaseUi.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  tagPillText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: CaseUi.orangeDeep,
  },
  name: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: CaseUi.ink,
    minHeight: 34,
    lineHeight: 17,
  },
  store: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
  },
  bottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  price: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  priceBlinkit: { color: CaseUi.ink },
  was: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: CaseUi.muted,
    textDecorationLine: 'line-through',
  },
  offLabel: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: CaseUi.success,
  },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  eta: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: CaseUi.muted },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...CaseUi.liftShadow,
  },
  addBtnBlinkit: {
    width: 56,
    height: 34,
    borderRadius: 10,
    backgroundColor: CaseUi.white,
    borderWidth: 1.5,
    borderColor: CaseUi.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  addText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: CaseUi.success,
  },
});
