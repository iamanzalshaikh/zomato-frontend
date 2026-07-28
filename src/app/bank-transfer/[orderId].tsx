import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { useOrderByIdQuery } from '@/hooks/queries/orderDetail';
import { useUploadCaseReceiptImageMutation } from '@/hooks/queries/caseOrders';
import { useOrderSocket } from '@/hooks/use-order-socket';
import {
  isAwaitingBankVerification,
  isBankPaymentSettled,
  needsBankReceiptUpload,
} from '@/lib/bankReceipt';
import { openCaseReceiptPdf } from '@/lib/caseReceipt';
import { toast } from '@/lib/toast';

type BankDetails = {
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  instructions?: string | null;
  transferReference?: string | null;
};

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} selectable>
          {value}
        </Text>
      </View>
      {onCopy ? (
        <PressableScale onPress={onCopy} style={styles.copyBtn} hitSlop={8}>
          <Ionicons name="copy-outline" size={18} color={CaseUi.orange} />
        </PressableScale>
      ) : null}
    </View>
  );
}

export default function BankTransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';
  const orderQ = useOrderByIdQuery(id);
  useOrderSocket(id);
  const uploadMut = useUploadCaseReceiptImageMutation();
  const [picked, setPicked] = useState<{
    uri: string;
    imageBase64: string;
    mimeType?: string | null;
    fileName?: string | null;
  } | null>(null);

  const order = orderQ.data as any;
  const bank: BankDetails = useMemo(() => order?.bankDetails ?? {}, [order?.bankDetails]);
  const canUpload = needsBankReceiptUpload(order ?? {});
  const awaitingVerify = isAwaitingBankVerification(order ?? {});
  const paymentDone = isBankPaymentSettled(order ?? {});

  useEffect(() => {
    if (!order || orderQ.isLoading) return;
    if (paymentDone || awaitingVerify || !canUpload) {
      router.replace({ pathname: '/order/[orderId]', params: { orderId: id } });
    }
  }, [order, orderQ.isLoading, paymentDone, awaitingVerify, canUpload, id, router]);

  const hasBankInfo = Boolean(
    bank.bankName || bank.accountName || bank.accountNumber || bank.transferReference,
  );

  async function copy(text: string, label: string) {
    try {
      await Clipboard.setStringAsync(text);
      toast.success(`${label} copied`, 'Copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  function fromAsset(asset: ImagePicker.ImagePickerAsset) {
    const imageBase64 = asset.base64 ?? '';
    if (__DEV__) {
      console.log('[receipt] picked', {
        uri: asset.uri?.slice(0, 48),
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        hasBase64: Boolean(imageBase64),
        base64Chars: imageBase64.length,
      });
    }
    if (!imageBase64) {
      toast.error('Could not read image data. Try another photo.', 'Receipt');
      return null;
    }
    return {
      uri: asset.uri,
      imageBase64,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName ?? `receipt-${Date.now()}.jpg`,
    };
  }

  async function pickReceipt() {
    if (__DEV__) console.log('[receipt] open gallery');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Allow photo access to upload your receipt', 'Permission');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.45,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) {
      if (__DEV__) console.log('[receipt] gallery canceled');
      return;
    }
    const next = fromAsset(result.assets[0]);
    if (next) setPicked(next);
  }

  async function takePhoto() {
    if (__DEV__) console.log('[receipt] open camera');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Allow camera access to photograph your receipt', 'Permission');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.45,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) {
      if (__DEV__) console.log('[receipt] camera canceled');
      return;
    }
    const next = fromAsset(result.assets[0]);
    if (next) setPicked(next);
  }

  async function submit() {
    if (!picked?.imageBase64) {
      toast.warning('Select or take a photo of your bank receipt first', 'Receipt');
      return;
    }
    if (__DEV__) {
      console.log('[receipt] submit pressed', {
        orderId: id,
        base64Chars: picked.imageBase64.length,
        mimeType: picked.mimeType,
      });
    }
    try {
      await uploadMut.mutateAsync({
        orderId: id,
        file: {
          imageBase64: picked.imageBase64,
          mimeType: picked.mimeType,
          uri: picked.uri,
          fileName: picked.fileName,
        },
      });
      toast.success('Receipt uploaded — awaiting verification', 'Payment');
      router.replace({ pathname: '/order/[orderId]', params: { orderId: id } });
    } catch (e: any) {
      if (__DEV__) console.warn('[receipt] submit error', e?.message, e?.status);
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

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 + Math.max(insets.bottom, 8) }]}
        >
          <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
            <View style={styles.cardIconRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="business" size={20} color={CaseUi.orange} />
              </View>
              <Text style={styles.cardTitle}>
                Order {order?.orderNumber ?? id.slice(-8).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.cardTotal}>
              Total J${Number(order?.grandTotal ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.cardHint}>
              Transfer the exact amount to the CASE campus account below, then upload a photo of
              your receipt. An admin will verify payment.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.bankCard}>
            <Text style={styles.sectionTitle}>Pay to this account</Text>
            {orderQ.isLoading ? (
              <ActivityIndicator color={CaseUi.orange} style={{ marginVertical: 12 }} />
            ) : hasBankInfo ? (
              <>
                {bank.bankName ? (
                  <DetailRow
                    label="Bank"
                    value={String(bank.bankName)}
                    onCopy={() => copy(String(bank.bankName), 'Bank name')}
                  />
                ) : null}
                {bank.accountName ? (
                  <DetailRow
                    label="Account name"
                    value={String(bank.accountName)}
                    onCopy={() => copy(String(bank.accountName), 'Account name')}
                  />
                ) : null}
                {bank.accountNumber ? (
                  <DetailRow
                    label="Account number"
                    value={String(bank.accountNumber)}
                    onCopy={() => copy(String(bank.accountNumber), 'Account number')}
                  />
                ) : null}
                <DetailRow
                  label="Reference (use this)"
                  value={String(bank.transferReference || order?.orderNumber || id)}
                  onCopy={() =>
                    copy(
                      String(bank.transferReference || order?.orderNumber || id),
                      'Transfer reference',
                    )
                  }
                />
                {bank.instructions ? (
                  <Text style={styles.instructions}>{bank.instructions}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.missingBank}>
                Bank details are not set yet. Ask admin to save them in CASE Ops → Bank (admin
                panel).
              </Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(300)}>
            {canUpload ? (
              <>
                <Text style={styles.label}>Receipt photo</Text>
                <View style={styles.pickRow}>
                  <PressableScale onPress={pickReceipt} style={styles.pickBtn}>
                    <Ionicons name="image-outline" size={20} color={CaseUi.orange} />
                    <Text style={styles.pickBtnText}>Gallery</Text>
                  </PressableScale>
                  <PressableScale onPress={takePhoto} style={styles.pickBtn}>
                    <Ionicons name="camera-outline" size={20} color={CaseUi.orange} />
                    <Text style={styles.pickBtnText}>Camera</Text>
                  </PressableScale>
                </View>

                {picked ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: picked.uri }} style={styles.preview} resizeMode="cover" />
                    <PressableScale onPress={() => setPicked(null)} style={styles.clearPreview}>
                      <Ionicons name="close" size={16} color="#FFF" />
                    </PressableScale>
                  </View>
                ) : (
                  <PressableScale onPress={pickReceipt} style={styles.uploadBox}>
                    <Ionicons name="cloud-upload-outline" size={28} color={CaseUi.orange} />
                    <Text style={styles.uploadText}>Tap to upload receipt</Text>
                    <Text style={styles.uploadSub}>JPG or PNG · max ~5MB</Text>
                  </PressableScale>
                )}

                <PressableScale
                  onPress={submit}
                  disabled={uploadMut.isPending || !picked}
                  style={[
                    styles.cta,
                    (uploadMut.isPending || !picked) && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.ctaText}>
                    {uploadMut.isPending ? 'Uploading…' : 'Submit receipt'}
                  </Text>
                </PressableScale>
              </>
            ) : (
              <View style={styles.uploadBox}>
                <Ionicons
                  name={paymentDone ? 'checkmark-circle' : 'time-outline'}
                  size={28}
                  color={CaseUi.orange}
                />
                <Text style={styles.uploadText}>
                  {paymentDone ? 'Payment confirmed' : 'Receipt already submitted'}
                </Text>
                <Text style={styles.uploadSub}>
                  {paymentDone
                    ? 'No upload needed — your payment is approved.'
                    : 'CASE is verifying your transfer.'}
                </Text>
              </View>
            )}

            <PressableScale onPress={openReceiptPdf} style={styles.linkBtn}>
              <Text style={styles.linkAccent}>Download / share order PDF</Text>
            </PressableScale>

            <PressableScale
              onPress={() =>
                router.replace({ pathname: '/order/[orderId]', params: { orderId: id } })
              }
              style={styles.linkBtn}
            >
              <Text style={styles.linkMuted}>
                {canUpload ? 'Skip for now — view order' : 'Back to order'}
              </Text>
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  body: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 16, backgroundColor: CaseUi.orangeSoft },
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink, flex: 1 },
  cardTotal: {
    color: CaseUi.ink,
    marginTop: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
  cardHint: {
    color: CaseUi.muted,
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 18,
  },
  bankCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CaseUi.line,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    marginTop: 2,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: CaseUi.ink,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  instructions: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: CaseUi.muted,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  missingBank: {
    fontSize: 13,
    lineHeight: 19,
    color: CaseUi.danger,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  label: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 8,
    color: CaseUi.ink,
  },
  pickRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  pickBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.ink,
  },
  uploadBox: {
    marginTop: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: CaseUi.line,
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 4,
    backgroundColor: CaseUi.field,
  },
  uploadText: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: CaseUi.ink,
  },
  uploadSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
  previewWrap: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    backgroundColor: CaseUi.field,
  },
  preview: { width: '100%', height: '100%' },
  clearPreview: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
