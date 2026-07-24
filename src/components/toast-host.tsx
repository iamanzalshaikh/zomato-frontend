import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useToastStore, type ToastType } from '@/lib/toast';

const ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'alert-circle',
};

const COLORS: Record<ToastType, { bg: string; accent: string }> = {
  success: { bg: '#0f2d1f', accent: '#3dd68c' },
  error: { bg: '#2d1215', accent: '#ff6b6b' },
  info: { bg: '#1a2230', accent: '#5b9dff' },
  warning: { bg: '#2d2410', accent: '#ffc857' },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!current) return null;

  const palette = COLORS[current.type];

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16).stiffness(180)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.host, { top: insets.top + 10 }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismiss} style={[styles.card, { backgroundColor: palette.bg }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${palette.accent}22` }]}>
          <Ionicons name={ICON[current.type]} size={22} color={palette.accent} />
        </View>
        <View style={styles.textWrap}>
          {!!current.title && <Text style={styles.title}>{current.title}</Text>}
          <Text style={styles.message} numberOfLines={3}>
            {current.message}
          </Text>
        </View>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.45)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  message: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
});
