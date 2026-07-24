import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { fetchCaseTerms } from '@/services/case';

export default function TermsScreen() {
  const router = useRouter();
  const termsQ = useQuery({
    queryKey: ['case', 'terms'],
    queryFn: fetchCaseTerms,
    staleTime: 30 * 60 * 1000,
  });

  const title = termsQ.data?.title ?? 'Terms of Service';
  const body =
    termsQ.data?.content ??
    termsQ.data?.body ??
    'CASE Delivery provides campus quick-commerce for College of Agriculture, Science and Education. By placing an order you agree to campus drop-off delivery, COD or bank-transfer payment, and the cancel/edit windows published in the app FAQ.';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        {termsQ.isLoading ? (
          <ActivityIndicator color={CaseUi.orange} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Animated.Text entering={FadeInDown.duration(280)} style={styles.text}>
              {body}
            </Animated.Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', flex: 1, color: CaseUi.ink },
  body: { padding: 16, paddingBottom: 40 },
  text: { fontSize: 14, lineHeight: 22, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted },
});
