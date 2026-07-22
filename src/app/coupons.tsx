import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { useCart } from '@/hooks/use-cart';
import { useApplyCouponMutation } from '@/hooks/queries/cart';
import { useCouponsByRestaurantQuery } from '@/hooks/queries/coupons';
import { setSelectedCouponCode } from '@/lib/caseCheckout';
import { toast } from '@/lib/toast';

export default function CouponsScreen() {
  const router = useRouter();
  const { cart } = useCart();
  const restaurantId = String((cart?.restaurantId as any)?._id ?? cart?.restaurantId ?? '');
  const couponsQ = useCouponsByRestaurantQuery(restaurantId);
  const apply = useApplyCouponMutation();

  const coupons = Array.isArray(couponsQ.data) ? couponsQ.data : [];

  async function onApply(code: string) {
    try {
      if (CASE_CHECKOUT_ENABLED) {
        await setSelectedCouponCode(code);
        toast.success(`Coupon ${code} will apply at checkout`, 'Applied');
      } else {
        await apply.mutateAsync({ couponCode: code });
        toast.success(`Coupon ${code} applied to cart`, 'Applied');
      }
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not apply coupon', 'Coupon');
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Apply coupon</Text>
        </View>

        {!restaurantId ? (
          <EmptyState icon="pricetag-outline" title="No active order" subtitle="Add items to cart from a store first." />
        ) : couponsQ.isLoading ? (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} width="100%" height={64} radius={14} />
            ))}
          </View>
        ) : (
          <FlatList
            data={coupons}
            keyExtractor={(item: any) => String(item._id ?? item.code)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState icon="pricetag-outline" title="No coupons available" subtitle="Check back soon for offers on this store." />
            }
            renderItem={({ item, index }: { item: any; index: number }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
                <PressableScale onPress={() => onApply(item.code)} style={styles.card}>
                  <View style={styles.codeBadge}>
                    <Ionicons name="pricetag" size={14} color={CaseUi.orange} />
                    <Text style={styles.code}>{item.code}</Text>
                  </View>
                  <Text style={styles.desc}>{item.description ?? `${item.discountType} — ${item.discountValue}`}</Text>
                </PressableScale>
              </Animated.View>
            )}
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
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  listContent: { padding: 16, paddingTop: 4, gap: 10 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  code: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: CaseUi.orange },
  desc: { marginTop: 6, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted },
});
