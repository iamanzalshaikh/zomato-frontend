import { type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  /** How much to shrink on press — 0.96 (subtle) to 0.9 (pronounced). Default 0.97. */
  scaleTo?: number;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityRole?: string;
};

/** Consistent, spring-based press feedback used across every tappable card/button in the app. */
export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  scaleTo = 0.97,
  hitSlop,
  accessibilityLabel,
  accessibilityRole,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .hitSlop(hitSlop ?? 0)
    .onBegin(() => {
      scale.value = withSpring(scaleTo, { damping: 18, stiffness: 300 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 260 });
    })
    .onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[style, animatedStyle, disabled && { opacity: 0.65 }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole as never}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
