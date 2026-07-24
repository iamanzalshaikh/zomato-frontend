import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { useCaseOrderQuery, useUploadCaseReceiptsMutation } from '@/hooks/queries/caseOrders';
import { openCaseReceiptPdf } from '@/lib/caseReceipt';
import { toast } from '@/lib/toast';

export default function BankTransferScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';
  const orderQ = useCaseOrderQuery(id);
  const uploadMut = useUploadCaseReceiptsMutation();
  const [url, setUrl] = useState('');
  const order = orderQ.data;

  async function submit() {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) {
      toast.warning('Paste a valid receipt image URL (https://…)', 'Receipt');
      return;
    }
    try {
      await uploadMut.mutateAsync({ orderId: id, receiptUrls: [trimmed] });
      toast.success('Receipt uploaded — awaiting verification', 'Payment');
      router.replace({ pathname: '/order/[orderId]', params: { orderId: id } });
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    }
  }

  async function openReceiptPdf() {
    try {
      await openCaseReceiptPdf(id);
    } catch {
      /* toast in helper */
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <PressableScale onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.title}>Bank transfer</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
            <View style={styles.cardIconRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="business" size={20} color={CaseUi.orange} />
              </View>
              <Text style={styles.cardTitle}>Order {order?.orderNumber ?? id.slice(-8).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardTotal}>Total J${Number(order?.grandTotal ?? 0).toFixed(0)}</Text>
            <Text style={styles.cardHint}>
              Transfer the amount to the CASE campus account, then paste your receipt image URL below. An admin will
              verify payment.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(300)}>
            <Text style={styles.label}>Receipt image URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              placeholder="https://…"
              placeholderTextColor={CaseUi.muted}
              style={styles.input}
            />

            <PressableScale onPress={submit} disabled={uploadMut.isPending} style={[styles.cta, uploadMut.isPending && { opacity: 0.7 }]}>
              <Text style={styles.ctaText}>{uploadMut.isPending ? 'Uploading…' : 'Submit receipt'}</Text>
            </PressableScale>

            <PressableScale onPress={openReceiptPdf} style={styles.linkBtn}>
              <Text style={styles.linkAccent}>Download / share receipt PDF</Text>
            </PressableScale>

            <PressableScale
              onPress={() => router.replace({ pathname: '/order/[orderId]', params: { orderId: id } })}
              style={styles.linkBtn}
            >
              <Text style={styles.linkMuted}>Skip for now — view order</Text>
            </PressableScale>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  body: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 16, backgroundColor: CaseUi.orangeSoft },
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cardTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  cardTotal: { color: CaseUi.ink, marginTop: 10, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  cardHint: { color: CaseUi.muted, marginTop: 8, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 8, color: CaseUi.ink },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 8,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
    color: CaseUi.ink,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  cta: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: CaseUi.orange,
  },
  ctaText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkAccent: { color: CaseUi.orange, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  linkMuted: { color: CaseUi.muted, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
});
