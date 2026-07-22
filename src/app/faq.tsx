import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { useCaseFaqQuery, useCaseSupportQuery } from '@/hooks/queries/case';

export default function FaqScreen() {
  const router = useRouter();
  const faqQ = useCaseFaqQuery();
  const supportQ = useCaseSupportQuery();
  const faqs = faqQ.data ?? [];
  const support = supportQ.data;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.title}>FAQ & support</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {support?.supportWhatsapp || support?.supportPhone ? (
            <Animated.View entering={FadeInDown.duration(280)} style={styles.contactCard}>
              <Text style={styles.cardTitle}>Contact CASE</Text>
              {support.supportPhone ? (
                <PressableScale onPress={() => Linking.openURL(`tel:${support.supportPhone}`)} style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={CaseUi.orange} />
                  <Text style={styles.contactText}>Call {support.supportPhone}</Text>
                </PressableScale>
              ) : null}
              {support.supportWhatsapp ? (
                <PressableScale
                  onPress={() => Linking.openURL(`https://wa.me/${String(support.supportWhatsapp).replace(/[^\d]/g, '')}`)}
                  style={styles.contactRow}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={CaseUi.orange} />
                  <Text style={styles.contactText}>WhatsApp support</Text>
                </PressableScale>
              ) : null}
            </Animated.View>
          ) : null}

          {faqs.map((f, i) => {
            const q = 'q' in f ? f.q : f.question;
            const a = 'a' in f ? f.a : f.answer;
            return (
              <Animated.View key={i} entering={FadeInDown.delay(60 + i * 40).duration(260)} style={styles.card}>
                <Text style={styles.cardTitle}>{q}</Text>
                <Text style={styles.cardBody}>{a}</Text>
              </Animated.View>
            );
          })}

          <PressableScale onPress={() => router.push('/support')} style={styles.link}>
            <Text style={styles.linkText}>Open a support ticket ›</Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  contactCard: { borderRadius: 14, padding: 14, backgroundColor: CaseUi.orangeSoft },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  contactText: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_600SemiBold' },
  card: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  cardTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  cardBody: { color: CaseUi.muted, marginTop: 6, lineHeight: 20, fontFamily: 'PlusJakartaSans_500Medium' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
