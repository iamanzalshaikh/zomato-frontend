import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function ShimmerBlock({
  width,
  height,
  radius = 12,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) {
  const opacity = useSharedValue(0.45);
  opacity.value = withRepeat(withTiming(0.9, { duration: 850 }), -1, true);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, anim, { width, height, borderRadius: radius }]} />;
}

export function BlinkitHomeLoader() {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <ShimmerBlock width={64} height={64} radius={20} />
        <ShimmerBlock width={64} height={64} radius={20} />
        <ShimmerBlock width={64} height={64} radius={20} />
        <ShimmerBlock width={64} height={64} radius={20} />
      </View>
      <ShimmerBlock width="100%" height={148} radius={20} />
      <View style={styles.rowBetween}>
        <ShimmerBlock width="36%" height={20} radius={8} />
        <ShimmerBlock width={72} height={16} radius={8} />
      </View>
      <View style={styles.row}>
        <ShimmerBlock width={154} height={166} radius={16} />
        <ShimmerBlock width={154} height={166} radius={16} />
      </View>
    </View>
  );
}

export function BlinkitCategoryLoader() {
  return (
    <View style={styles.section}>
      <ShimmerBlock width="100%" height={112} radius={16} />
      <View style={styles.rowBetween}>
        <ShimmerBlock width="42%" height={18} radius={8} />
        <ShimmerBlock width={64} height={14} radius={8} />
      </View>
      <ShimmerBlock width="100%" height={132} radius={14} />
      <ShimmerBlock width="100%" height={132} radius={14} />
      <ShimmerBlock width="100%" height={132} radius={14} />
    </View>
  );
}

export function BlinkitSearchLoader() {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <ShimmerBlock width={96} height={30} radius={999} />
        <ShimmerBlock width={96} height={30} radius={999} />
        <ShimmerBlock width={96} height={30} radius={999} />
      </View>
      <ShimmerBlock width="100%" height={96} radius={14} />
      <ShimmerBlock width="100%" height={96} radius={14} />
      <ShimmerBlock width="100%" height={96} radius={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    paddingBottom: 20,
  },
  block: {
    backgroundColor: '#E9E9EC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
