import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  label?: string;
};

function Dot({ delay = 0 }: { delay?: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.45);
  scale.value = withRepeat(withTiming(1.12, { duration: 620 }), -1, true);
  opacity.value = withRepeat(withTiming(1, { duration: 620 + delay }), -1, true);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function RouteLoadingOverlay({ visible, label = 'Loading experience...' }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>SD Services</Text>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.row}>
          <Dot delay={0} />
          <Dot delay={100} />
          <Dot delay={200} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(252,250,247,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    minWidth: 200,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,0,0.12)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: '#171717',
  },
  label: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B00',
  },
});
