import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CaseUi } from '@/constants/caseUi';
import { formatProductMeta, type MenuItemAttributes } from '@/constants/categoryFields';
import { useThemeContext } from '@/context/ThemeContext';

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
  width = 160,
  variant = 'case',
  onPress,
  onAdd,
}: Props) {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const tags = formatProductMeta(item.businessType, item.attributes, item.foodType);
  const image =
    item.image ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={[
        animStyle,
        { width },
        styles.card,
        {
          backgroundColor: isDark ? '#18181C' : CaseUi.white,
          borderColor: isDark ? '#282830' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={styles.imageWrap}>
        <Image 
          source={{ uri: image }} 
          style={styles.image} 
          contentFit="cover" 
          transition={0}
          cachePolicy="memory-disk"
          placeholder={isDark ? '#18181C' : CaseUi.field}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.38)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {item.discountPct ? (
          <View style={styles.offBadge}>
            <Text style={styles.offText}>{item.discountPct}% OFF</Text>
          </View>
        ) : null}
        <Pressable style={styles.heartFab} hitSlop={8}>
          <Ionicons name="heart-outline" size={14} color="#1A120C" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {tags[0] ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText} numberOfLines={1}>
              {tags[0]}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.storeName ? (
          <Text style={[styles.store, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.storeName}
          </Text>
        ) : null}

        <View style={styles.bottom}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>
                J${Math.round(item.price)}
              </Text>
              {item.originalPrice && item.originalPrice > item.price ? (
                <Text style={styles.was}>J${Math.round(item.originalPrice)}</Text>
              ) : null}
            </View>
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
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            hitSlop={6}
          >
            <Ionicons name="add" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: CaseUi.white,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrap: {
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CaseUi.field,
    marginBottom: 6,
  },
  image: { width: '100%', height: '100%' },
  offBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: CaseUi.orange,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.3,
  },
  heartFab: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  body: { paddingHorizontal: 2 },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: CaseUi.orangeSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  tagPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: CaseUi.orangeDeep,
  },
  name: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: CaseUi.ink,
    minHeight: 16,
    lineHeight: 16,
  },
  store: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: CaseUi.muted,
  },
  bottom: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  price: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    color: CaseUi.ink,
  },
  was: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: CaseUi.muted,
    textDecorationLine: 'line-through',
  },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  eta: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: CaseUi.muted },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CaseUi.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CaseUi.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
  },
});
