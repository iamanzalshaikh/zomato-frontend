import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useFavoritesQuery, useToggleFavoriteMutation } from '@/hooks/queries/favorites';
import { ShopCard } from '@/components/shop-card';

export default function FavoritesListScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const favsQuery = useFavoritesQuery();
  const toggleFavMut = useToggleFavoriteMutation();
  const items = Array.isArray(favsQuery.data) ? favsQuery.data : [];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <View>
            <Text style={styles.headerTitle}>Favourites</Text>
            <Text style={styles.headerSubtitle}>
              {items.length > 0 ? `${items.length} saved place${items.length !== 1 ? 's' : ''}` : 'Your saved stores'}
            </Text>
          </View>
        </View>

        {favsQuery.isLoading ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonBlock width={52} height={52} radius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBlock width="55%" height={14} />
                  <SkeletonBlock width="30%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item: any) => String(item._id ?? item.id)}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 24, paddingHorizontal: 16 }}
            ListEmptyComponent={
              <EmptyState icon="heart-outline" title="No favourites yet" subtitle="Tap the heart on any store to save it here." />
            }
            renderItem={({ item, index }: { item: any; index: number }) => {
              const id = String(item._id ?? item.id);
              // Normalize merchant schema for ShopCard
              const merchant = { ...item, id };
              return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
                  <ShopCard
                    merchant={merchant}
                    index={index}
                    variant="list"
                    onPress={(shopId) => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: shopId } })}
                  />
                </Animated.View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: CaseUi.field },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: CaseUi.ink },
  meta: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted, marginTop: 2 },
});
