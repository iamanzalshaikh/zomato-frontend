import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { saveGetAnythingDraft } from '@/lib/caseCheckout';
import { toast } from '@/lib/toast';

export default function GetAnythingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const [tip, setTip] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('300');

  const handleContinue = async () => {
    if (!note.trim()) {
      toast.warning('Describe what you need', 'Get Anything');
      return;
    }
    await saveGetAnythingDraft({
      note: note.trim(),
      tip: Number(tip) || 0,
      estimatedPrice: Math.max(0, Number(estimatedPrice) || 300),
    });
    router.push({ pathname: '/checkout', params: { mode: 'get-anything' } });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
            </PressableScale>
            <View style={styles.headerText}>
              <Text style={styles.title}>Get Anything</Text>
              <Text style={styles.subtitle}>Tell us what you need — we&apos;ll pick it up for you</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + Math.max(insets.bottom, 8) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(300)} style={styles.heroCard}>
              <Ionicons name="sparkles" size={28} color={CaseUi.orange} />
              <Text style={styles.heroText}>
                From snacks to supplies — describe your request and CASE will handle the rest.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
              <Text style={styles.label}>What do you need?</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. 2 Red Bull from campus shop, pain relief tablets…"
                placeholderTextColor={CaseUi.muted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={styles.textarea}
              />

              <Text style={styles.label}>Estimated item cost (J$)</Text>
              <TextInput
                value={estimatedPrice}
                onChangeText={setEstimatedPrice}
                keyboardType="decimal-pad"
                placeholder="300"
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Tip for rider (optional)</Text>
              <TextInput
                value={tip}
                onChangeText={setTip}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />
            </Animated.View>
          </ScrollView>

          <PressableScale
            onPress={handleContinue}
            style={[styles.cta, { marginBottom: 12 + Math.max(insets.bottom, 8) }]}
          >
            <Text style={styles.ctaText}>Continue to checkout</Text>
          </PressableScale>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: CaseUi.field },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  subtitle: { marginTop: 2, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: CaseUi.orangeSoft,
  },
  heroText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.ink },
  label: { marginBottom: 8, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 18,
    color: CaseUi.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 18,
    color: CaseUi.ink,
  },
  cta: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: CaseUi.orange,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
