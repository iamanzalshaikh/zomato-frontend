import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  itemCount: number;
  total: number;
  restaurantName?: string | null;
  onPress: () => void;
  /** Distance from screen bottom — use ~72 on tab screens, ~20 on full screens */
  bottom?: number;
};

export function FloatingCartBar({
  visible,
  itemCount,
  total,
  restaurantName,
  onPress,
  bottom = Platform.OS === 'ios' ? 88 : 76,
}: Props) {
  if (!visible || itemCount <= 0) return null;

  const label = itemCount === 1 ? '1 item' : `${itemCount} items`;

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
        accessibilityLabel="View cart"
      >
        <View style={styles.left}>
          <Animated.View entering={ZoomIn.duration(220)} style={styles.badge}>
            <Ionicons name="bag-handle" size={18} color="#ff5a00" />
            <View style={styles.countPill}>
              <Text style={styles.countText}>{itemCount}</Text>
            </View>
          </Animated.View>
          <View style={styles.copy}>
            <Text style={styles.heading}>View Cart</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {restaurantName ? `${restaurantName} · ${label}` : label}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.total}>J${Math.round(total)}</Text>
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
    left: 16,
    right: 16,
    zIndex: 50,
    elevation: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff5a00',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#ff5a00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 10,
  },
  barPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ff5a00',
  },
  countText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 10,
  },
  copy: { flex: 1, gap: 2 },
  heading: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sub: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  total: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
