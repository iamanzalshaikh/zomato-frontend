import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { useToggleFavoriteMutation } from '@/hooks/queries/favorites';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { toast } from '@/lib/toast';

type Props = {
  restaurantId: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
  variant?: 'overlay' | 'header';
};

export function FavoriteHeart({ restaurantId, style, size = 22, variant = 'overlay' }: Props) {
  const theme = useTheme();
  const ids = useFavoritesStore((s) => s.ids);
  const toggleLocal = useFavoritesStore((s) => s.toggleLocal);
  const toggle = useToggleFavoriteMutation();
  const isFavorite = ids.has(restaurantId);

  const onPress = () => {
    const had = ids.has(restaurantId);
    toggleLocal(restaurantId);
    toggle.mutate(
      { restaurantId, has: had },
      {
        onSuccess: () => {
          toast.success(had ? 'Removed from favorites' : 'Saved to favorites', had ? 'Removed' : 'Saved');
        },
        onError: () => {
          toggleLocal(restaurantId);
          toast.error('Could not update favorites');
        },
      },
    );
  };

  const color = isFavorite ? '#FF3B30' : '#1A120C';

  return (
    <Pressable
      onPress={onPress}
      style={[variant === 'overlay' ? styles.overlayBtn : styles.headerBtn, style]}
      hitSlop={8}
    >
      <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
