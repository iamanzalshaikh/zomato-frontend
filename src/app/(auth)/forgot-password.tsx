import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { forgotPassword, resetPassword } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    if (!email.trim()) {
      Alert.alert('Email', 'Enter your registered email.');
      return;
    }
    try {
      setBusy(true);
      await forgotPassword(email.trim().toLowerCase());
      setStep('reset');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (otp.length !== 6 || password.length < 6) {
      Alert.alert('Invalid', 'Enter 6-digit OTP and password (min 6 chars).');
      return;
    }
    try {
      setBusy(true);
      await resetPassword({ email: email.trim().toLowerCase(), otp, newPassword: password });
      Alert.alert('Success', 'Password updated. Please login.');
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topRow}>
            <PressableScale onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
            </PressableScale>
          </View>

          <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
            <View style={styles.iconRing}>
              <Ionicons name="key-outline" size={30} color={CaseUi.orange} />
            </View>
            <Text style={styles.title}>{step === 'email' ? 'Reset password' : 'Check your email'}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email and we’ll send you a one-time code'
                : `Enter the code sent to ${email.trim().toLowerCase()} and choose a new password`}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={step === 'email'}
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={CaseUi.muted}
              style={[styles.input, step !== 'email' && styles.inputDisabled]}
            />

            {step === 'reset' ? (
              <Animated.View entering={FadeIn.duration(250)}>
                <Text style={[styles.label, styles.labelGap]}>6-digit OTP</Text>
                <TextInput
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={CaseUi.muted}
                  style={styles.input}
                />
                <Text style={[styles.label, styles.labelGap]}>New password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  secureTextEntry
                  placeholderTextColor={CaseUi.muted}
                  style={styles.input}
                />
              </Animated.View>
            ) : null}

            <PressableScale
              disabled={busy}
              onPress={step === 'email' ? sendOtp : reset}
              style={[styles.btn, busy && { opacity: 0.7 }]}
            >
              <Text style={styles.btnText}>
                {busy ? 'Please wait…' : step === 'email' ? 'Send OTP' : 'Update password'}
              </Text>
            </PressableScale>

            {step === 'reset' ? (
              <PressableScale onPress={sendOtp} disabled={busy} style={styles.resendLink}>
                <Text style={styles.resendText}>Resend code</Text>
              </PressableScale>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topRow: { paddingHorizontal: 16, paddingTop: 6 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', paddingHorizontal: 32, marginTop: 12, marginBottom: 24 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: CaseUi.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: CaseUi.muted,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: CaseUi.white,
    borderRadius: CaseUi.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.cardShadow,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: CaseUi.ink,
    marginBottom: 8,
  },
  labelGap: { marginTop: 16 },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  inputDisabled: { opacity: 0.6 },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: CaseUi.orange,
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
  },
  resendLink: { alignItems: 'center', marginTop: 14 },
  resendText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.orange,
  },
});
