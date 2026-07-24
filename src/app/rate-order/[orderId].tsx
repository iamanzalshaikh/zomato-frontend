import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { CASE_CHECKOUT_ENABLED } from '@/config/features';
import { createReview } from '@/services/reviews';
import { createCaseReview } from '@/services/caseOrders';
import { toast } from '@/lib/toast';

const RATING_LABELS: Record<number, string> = {
  1: 'Not great',
  2: 'Could be better',
  3: 'It was okay',
  4: 'Pretty good',
  5: 'Loved it!',
};

export default function RateOrderScreen() {
  const router = useRouter();
  const { orderId, merchantId } = useLocalSearchParams<{ orderId: string; merchantId?: string }>();
  const id = orderId ?? '';

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  const m = useMutation({
    mutationFn: async () => {
      const r = Math.max(1, Math.min(5, rating));
      if (CASE_CHECKOUT_ENABLED) {
        return createCaseReview({
          orderId: id,
          merchantId: merchantId || undefined,
          overallRating: r,
          merchantRating: r,
          riderRating: r,
          comment: text.trim() || undefined,
        });
      }
      return createReview({
        orderId: id,
        foodRating: r,
        restaurantRating: r,
        deliveryRating: r,
        reviewText: text.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Thanks for your feedback!', 'Review submitted');
      router.replace('/(tabs)/orders');
    },
    onError: (e: Error) => toast.error(e.message, 'Error'),
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.iconCircle}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Rate your order</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
            <Text style={styles.orderLabel}>Order #{id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.heading}>How was your experience?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <PressableScale key={n} onPress={() => setRating(n)} hitSlop={6} scaleTo={0.85}>
                  <Animated.View entering={ZoomIn.delay(n * 40).springify().damping(14)}>
                    <Ionicons
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={38}
                      color={n <= rating ? CaseUi.orange : CaseUi.line}
                    />
                  </Animated.View>
                </PressableScale>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>

            <Text style={styles.label}>Tell us more (optional)</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What did you like or what could improve?"
              placeholderTextColor={CaseUi.muted}
              style={styles.textarea}
              multiline
            />

            <PressableScale
              disabled={m.isPending || !id}
              onPress={() => m.mutate()}
              style={[styles.primaryBtn, (m.isPending || !id) && { opacity: 0.7 }]}
            >
              <Text style={styles.primaryText}>{m.isPending ? 'Submitting…' : 'Submit review'}</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  body: { padding: 16 },
  card: {
    borderRadius: CaseUi.radius.lg,
    padding: 20,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    alignItems: 'center',
    ...CaseUi.softShadow,
  },
  orderLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  heading: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, marginTop: 6 },
  starsRow: { flexDirection: 'row', gap: 6, marginTop: 20 },
  ratingLabel: { marginTop: 10, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orange },
  label: { alignSelf: 'flex-start', marginTop: 22, marginBottom: 8, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: CaseUi.ink },
  textarea: {
    width: '100%',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.ink,
    backgroundColor: CaseUi.field,
  },
  primaryBtn: {
    width: '100%',
    marginTop: 20,
    backgroundColor: CaseUi.orange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
});
