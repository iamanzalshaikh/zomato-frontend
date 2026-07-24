import { memo, useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CaseUi } from '@/constants/caseUi';
import { useThemeContext } from '@/context/ThemeContext';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export const SkeletonBlock = memo(function SkeletonBlock({
  width = '100%',
  height = 16,
  radius = 10,
  style,
}: Props) {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  const [blockWidth, setBlockWidth] = useState(typeof width === 'number' ? width : 0);
  const sweep = useSharedValue(-1);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [sweep]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value * blockWidth }],
  }));

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDark ? '#222228' : CaseUi.field,
          width: width as number | `${number}%`,
          height,
          borderRadius: radius,
        },
        style,
      ]}
      onLayout={(e) => setBlockWidth(e.nativeEvent.layout.width)}
    >
      {blockWidth > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, anim]}>
          <LinearGradient
            colors={
              isDark
                ? ['transparent', 'rgba(255,255,255,0.08)', 'transparent']
                : ['transparent', 'rgba(255,255,255,0.55)', 'transparent']
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

export function StoreDetailSkeleton() {
  return (
    <View style={styles.storeWrap}>
      <SkeletonBlock width="100%" height={180} radius={0} />
      <View style={styles.pad}>
        <SkeletonBlock width="55%" height={24} />
        <View style={styles.row}>
          <SkeletonBlock width={80} height={14} />
          <SkeletonBlock width={70} height={14} />
        </View>
        <SkeletonBlock width={64} height={22} radius={999} style={{ marginTop: 10 }} />
        <SkeletonBlock width="100%" height={48} radius={14} style={{ marginTop: 16 }} />
        <SkeletonBlock width="40%" height={18} style={{ marginTop: 22 }} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.catRow}>
            <SkeletonBlock width={48} height={48} radius={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBlock width="50%" height={14} />
              <SkeletonBlock width="30%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CategoryListSkeleton() {
  return (
    <View style={styles.pad}>
      <SkeletonBlock width="100%" height={92} radius={16} />
      <View style={[styles.row, { marginTop: 18 }]}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} width={124} height={160} radius={14} />
        ))}
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.shopRow}>
          <SkeletonBlock width={44} height={44} radius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HomeSkeleton() {
  const { colors } = useThemeContext();
  return (
    <View style={[styles.homePad, { backgroundColor: 'transparent' }]}>
      {/* Category tiles */}
      <View style={[styles.row, { marginTop: 14, justifyContent: 'space-between' }]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <SkeletonBlock width={60} height={60} radius={22} />
            <SkeletonBlock width={44} height={10} radius={4} />
          </View>
        ))}
      </View>

      {/* Banner promo card */}
      <SkeletonBlock width="100%" height={160} radius={24} style={{ marginTop: 20 }} />

      {/* Section title */}
      <SkeletonBlock width="45%" height={18} style={{ marginTop: 24 }} />

      {/* Horizontal shop cards */}
      <View style={[styles.row, { marginTop: 12 }]}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} width={140} height={168} radius={22} />
        ))}
      </View>

      {/* List cards */}
      <SkeletonBlock width="100%" height={88} radius={18} style={{ marginTop: 20 }} />
      <SkeletonBlock width="100%" height={88} radius={18} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: CaseUi.field,
  },
  storeWrap: { flex: 1 },
  pad: { padding: 16, gap: 10 },
  homePad: { paddingHorizontal: 16, paddingTop: 8 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
});
