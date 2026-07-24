import { memo, useEffect } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** A number that pop-scales whenever its value changes — cart quantities, totals, counts. */
export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  style,
  prefix = '',
}: {
  value: number | string;
  style?: TextStyle;
  prefix?: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.22, { duration: 110 }),
      withSpring(1, { damping: 10, stiffness: 260 }),
    );
  }, [value, scale]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.Text style={[style, anim]}>
      {prefix}
      {value}
    </Animated.Text>
  );
});

/** Small pill badge (cart count, unread notifications) that pops in/out with a spring. */
export const AnimatedBadge = memo(function AnimatedBadge({
  count,
  style,
  textStyle,
}: {
  count: number;
  style?: object;
  textStyle?: TextStyle;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = count > 0 ? withSpring(1, { damping: 12, stiffness: 260 }) : withTiming(0, { duration: 150 });
  }, [count, scale]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badge, style, anim]}>
      <Text style={[styles.badgeText, textStyle]}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A00',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});
