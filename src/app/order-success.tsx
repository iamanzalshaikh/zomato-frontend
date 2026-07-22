import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SuccessMoment } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, payment } = useLocalSearchParams<{ orderId?: string; payment?: string }>();
  const id = orderId ?? '';
  const paidOnline = payment === 'ONLINE';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SuccessMoment
          title={paidOnline ? 'Payment successful!' : 'Order placed!'}
          subtitle={
            paidOnline
              ? 'Your payment was confirmed. The restaurant will start preparing your order.'
              : 'Your food is being prepared. You can track delivery status anytime.'
          }
        >
          {id ? <Text style={styles.orderId}>Order #{id.slice(-8).toUpperCase()}</Text> : null}

          <Animated.View entering={FadeInDown.delay(400).duration(320)} style={styles.actions}>
            {id ? (
              <PressableScale
                onPress={() => router.replace({ pathname: '/order/track/[orderId]', params: { orderId: id } })}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Track order</Text>
              </PressableScale>
            ) : null}

            <PressableScale onPress={() => router.replace('/(tabs)/orders')} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>View my orders</Text>
            </PressableScale>

            <PressableScale onPress={() => router.replace('/(tabs)')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Back to home</Text>
            </PressableScale>
          </Animated.View>
        </SuccessMoment>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  orderId: {
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: CaseUi.muted,
  },
  actions: { width: '100%', marginTop: 28, gap: 12 },
  primaryBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: CaseUi.orange },
  primaryBtnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 },
  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.white,
  },
  secondaryBtnText: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orange },
});
