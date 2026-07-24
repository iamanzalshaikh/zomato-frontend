import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Solid-color fallback — avoids ExpoLinearGradient when native module is missing. */
export function SafeGradient({
  colors,
  style,
  children,
}: {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return <View style={[style, { backgroundColor: colors[0] ?? '#ff5a00' }]}>{children}</View>;
}
