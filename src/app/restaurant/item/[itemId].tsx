import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type MenuItem } from '@/services/menu';
import { useTheme } from '@/hooks/use-theme';
import { cartKeys, useAddToCartMutation } from '@/hooks/queries/cart';
import { useMenuItemQuery } from '@/hooks/queries/menu';

export default function MenuItemDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const add = useAddToCartMutation();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  const id = itemId ?? '';
  const [adding, setAdding] = useState(false);
  const q = useMenuItemQuery(id);
  const busy = q.isLoading;
  const item = (q.data ?? null) as MenuItem | null;
  const error = (q.error as any)?.message ?? null;

  const hero = useMemo(() => {
    const fromApi = item?.images?.[0];
    if (typeof fromApi === 'string' && fromApi.length > 0) return { uri: fromApi };
    return { uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80' };
  }, [item]);

  async function onAddToCart() {
    if (!item?._id || !item.restaurantId) return;
    try {
      setAdding(true);
      await add.mutateAsync({
        restaurantId: String(item.restaurantId),
        menuItemId: String(item._id),
        quantity: 1,
        itemName: item.itemName,
        price: Number(item.discountedPrice ?? item.price ?? 0),
      });
      await qc.invalidateQueries({ queryKey: cartKeys.all });
      router.push('/cart');
    } catch {
      // show inline error panel
    } finally {
      setAdding(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.six }}>
          <ImageBackground source={hero} style={styles.hero} resizeMode="cover">
            <View style={styles.heroShade} />
            <View style={styles.heroBar}>
              <Pressable onPress={() => router.back()} style={styles.heroBtn}>
                <ThemedText style={styles.heroBtnText}>‹</ThemedText>
              </Pressable>
            </View>
          </ImageBackground>

          <ThemedView style={styles.sheet}>
            {busy ? (
              <ThemedText themeColor="textSecondary">Loading…</ThemedText>
            ) : error ? (
              <ThemedView type="backgroundElement" style={styles.errorCard}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <Pressable onPress={() => q.refetch()} style={styles.retryBtn}>
                  <ThemedText style={styles.retryText}>Retry</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <>
                <ThemedText style={styles.title}>{item?.itemName}</ThemedText>
                {!!item?.description && (
                  <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
                    {item.description}
                  </ThemedText>
                )}
                <View style={styles.priceRow}>
                  <ThemedText style={styles.price}>₹{item?.discountedPrice ?? item?.price}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {item?.preparationTimeMinutes ?? 15} min
                  </ThemedText>
                </View>

                <Pressable disabled={adding} onPress={onAddToCart} style={[styles.primaryBtn, adding && { opacity: 0.75 }]}>
                  <ThemedText style={styles.primaryBtnText}>{adding ? 'Adding…' : 'Add to cart'}</ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  hero: { height: 280, width: '100%' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroBar: { position: 'absolute', top: 14, left: 16, right: 16, flexDirection: 'row' },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnText: { color: '#fff', fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold' },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#1a1c1c' },
  priceRow: { marginTop: Spacing.three, flexDirection: 'row', justifyContent: 'space-between' },
  price: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#ff5a00', fontSize: 18 },
  primaryBtn: {
    marginTop: Spacing.four,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ff5a00',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  errorText: { color: '#E5484D' },
  retryBtn: { marginTop: Spacing.two, alignSelf: 'flex-start' },
  retryText: { color: '#ff5a00', fontFamily: 'PlusJakartaSans_700Bold' },
});
