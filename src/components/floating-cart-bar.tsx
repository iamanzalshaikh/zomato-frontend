import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  itemCount: number;
  total: number;
  restaurantName?: string | null;
  onPress: () => void;
  /** Distance from screen bottom — use ~12 on tab screens, ~20 on full screens */
  bottom?: number;
};

export function FloatingCartBar({
  visible,
  itemCount,
  total,
  restaurantName,
  onPress,
  bottom = 12,
}: Props) {
  if (!visible || itemCount <= 0) return null;

  const label = itemCount === 1 ? '1 item' : `${itemCount} items`;
  const amount = Math.round(Number(total) || 0);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(14).stiffness(160)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.wrap, { bottom }]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${label}, J$${amount}`}
      >
        <View style={styles.left}>
          <View style={styles.badge}>
            <Ionicons name="bag-handle" size={18} color="#ff5a00" />
            <View style={styles.countPill}>
              <Text style={styles.countText}>{itemCount}</Text>
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={styles.heading}>View Cart</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {restaurantName ? `${restaurantName} · ${label}` : label}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.total}>J${amount}</Text>
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={14} color="#ffffff" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 200,
    elevation: 24,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff5a00',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#ff5a00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 8,
  },
  barPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ff5a00',
  },
  countText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 9,
  },
  copy: { flex: 1, gap: 1 },
  heading: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  sub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  total: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
  chevron: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
