import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { apiFetch } from '@/lib/apiFetch';
import { saveAuthFromResponse } from '@/lib/auth';

const YEARS = [
  { id: 'FIRST', label: 'First Year' },
  { id: 'SECOND', label: 'Second Year' },
  { id: 'THIRD', label: 'Third Year' },
  { id: 'FOURTH', label: 'Fourth Year' },
] as const;

const RESIDENCES = [
  { id: 'EAST_CAMPUS', label: 'East Campus' },
  { id: 'WEST_CAMPUS', label: 'West Campus' },
  { id: 'OFF_CAMPUS', label: 'Off Campus' },
] as const;

type YearId = (typeof YEARS)[number]['id'];
type ResidenceId = (typeof RESIDENCES)[number]['id'];
type StepId = 0 | 1 | 2 | 3;

const STEPS = [
  { id: 0 as const, title: 'Your name', sub: 'How should riders greet you?' },
  { id: 1 as const, title: 'Contact', sub: 'We’ll send a one-time code here' },
  { id: 2 as const, title: 'Campus', sub: 'Help us route your deliveries' },
  { id: 3 as const, title: 'Verify email', sub: 'Enter the 6-digit OTP' },
];

const SCREEN_W = Dimensions.get('window').width;

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<YearId | ''>('');
  const [residence, setResidence] = useState<ResidenceId | ''>('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const otpCode = useMemo(() => otp.join(''), [otp]);
  const progress = useSharedValue((0 + 1) / STEPS.length);

  useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, progress]);

  useEffect(() => {
    if (step !== 3 || resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendTimer, step]);

  const progressStyle = useAnimatedStyle(() => ({
    width: progress.value * (SCREEN_W - 40),
  }));

  function goTo(next: StepId, dir: 'forward' | 'back') {
    setError(null);
    setDirection(dir);
    setStep(next);
  }

  function validateStep(s: StepId): string | null {
    if (s === 0) {
      if (!firstName.trim() || !lastName.trim()) return 'Enter first and last name';
    }
    if (s === 1) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email';
      }
      if (!/^[0-9]{10}$/.test(phone.trim())) return 'Phone must be 10 digits';
    }
    if (s === 2) {
      if (!yearOfStudy) return 'Select your year of study';
      if (!residence) return 'Select your residence';
    }
    return null;
  }

  async function sendOtp() {
    try {
      setBusy(true);
      setError(null);
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          mobile: phone.trim(),
          purpose: 'signup',
        }),
      });
      setOtp(['', '', '', '', '', '']);
      setResendTimer(60);
      goTo(3, 'forward');
      setTimeout(() => otpRefs.current[0]?.focus(), 280);
    } catch (e: any) {
      const m = e?.message ?? 'Failed to send OTP';
      setError(m);
      Alert.alert('Signup', m);
    } finally {
      setBusy(false);
    }
  }

  async function onContinue() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    if (step === 2) {
      await sendOtp();
      return;
    }
    if (step < 3) goTo((step + 1) as StepId, 'forward');
  }

  async function verifySignup() {
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const body = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode,
          purpose: 'signup',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          mobile: phone.trim(),
          studentId: studentId.trim() || undefined,
          yearOfStudy,
          residence,
        }),
      });
      const route = await saveAuthFromResponse(body as any);
      Alert.alert('Welcome', 'Account created. Let’s pick your campus drop-off.');
      router.replace(route as Href);
    } catch (e: any) {
      const m = e?.message ?? 'Verification failed';
      setError(m);
      Alert.alert('OTP', m);
      setOtp(['', '', '', '', '', '']);
    } finally {
      setBusy(false);
    }
  }

  function onBack() {
    if (step === 0) {
      router.back();
      return;
    }
    goTo((step - 1) as StepId, 'back');
  }

  function onOtpChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6 - index).split('');
      setOtp((prev) => {
        const next = [...prev];
        chars.forEach((d, i) => {
          next[index + i] = d;
        });
        return next;
      });
      const focusAt = Math.min(index + chars.length, 5);
      otpRefs.current[focusAt]?.focus();
      return;
    }
    const digit = cleaned.slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  const meta = STEPS[step];
  const entering = direction === 'forward' ? FadeInRight.duration(280) : FadeInLeft.duration(280);
  const exiting = direction === 'forward' ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

  return (
    <ThemedView style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={['#FFE8DA', '#FFFFFF', '#FFFFFF']}
        locations={[0, 0.22, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top */}
          <View style={styles.topRow}>
            <PressableScale onPress={onBack} style={styles.iconBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
            </PressableScale>
            <Text style={styles.brand}>CASE Delivery</Text>
            <Text style={styles.stepCount}>
              {step + 1}/{STEPS.length}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>

          <View style={styles.dots}>
            {STEPS.map((s) => (
              <View
                key={s.id}
                style={[styles.dot, step >= s.id && styles.dotOn, step === s.id && styles.dotCurrent]}
              />
            ))}
          </View>

          <Animated.View
            key={`step-${step}`}
            entering={entering}
            exiting={exiting}
            style={styles.stepPane}
          >
            <Text style={styles.title}>{meta.title}</Text>
            <Text style={styles.sub}>
              {step === 3 ? `Sent to ${email.trim().toLowerCase()}` : meta.sub}
            </Text>

            {step === 0 && (
              <View style={styles.card}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="e.g. Anzal"
                  placeholderTextColor="#A3A3A3"
                  autoCorrect={false}
                  autoFocus
                  style={styles.input}
                />
                <Text style={[styles.label, styles.labelGap]}>Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="e.g. Shaikh"
                  placeholderTextColor="#A3A3A3"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            )}

            {step === 1 && (
              <View style={styles.card}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  textContentType="emailAddress"
                  style={styles.input}
                />
                <Text style={[styles.label, styles.labelGap]}>Telephone</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10 digits"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  style={styles.input}
                />
              </View>
            )}

            {step === 2 && (
              <View style={styles.card}>
                <Text style={styles.label}>Student ID / National</Text>
                <Text style={styles.hint}>Optional but recommended</Text>
                <TextInput
                  value={studentId}
                  onChangeText={setStudentId}
                  placeholder="Your ID"
                  placeholderTextColor="#A3A3A3"
                  autoCorrect={false}
                  style={styles.input}
                />

                <Text style={[styles.label, styles.labelGap]}>Year of study</Text>
                <View style={styles.chips}>
                  {YEARS.map((y) => {
                    const on = yearOfStudy === y.id;
                    return (
                      <Pressable
                        key={y.id}
                        onPress={() => setYearOfStudy(y.id)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{y.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, styles.labelGap]}>Residence</Text>
                <View style={styles.chips}>
                  {RESIDENCES.map((r) => {
                    const on = residence === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => setResidence(r.id)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.card}>
                <View style={styles.otpRow}>
                  {otp.map((d, i) => (
                    <TextInput
                      key={`otp-${i}`}
                      ref={(ref) => {
                        otpRefs.current[i] = ref;
                      }}
                      value={d}
                      onChangeText={(v) => onOtpChange(i, v)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      style={[styles.otp, d ? styles.otpOn : null]}
                    />
                  ))}
                </View>
                <Pressable
                  disabled={resendTimer > 0 || busy}
                  onPress={sendOtp}
                  style={styles.resend}
                >
                  <Text style={[styles.resendText, resendTimer > 0 && { color: CaseUi.muted }]}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </Text>
                </Pressable>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </Animated.View>

          <View style={styles.footer}>
            <PressableScale
              disabled={busy}
              onPress={step === 3 ? verifySignup : onContinue}
              scaleTo={0.985}
              style={[styles.cta, busy && { opacity: 0.7 }]}
            >
              <Text style={styles.ctaText}>
                {busy
                  ? 'Please wait…'
                  : step === 2
                    ? 'Send email OTP'
                    : step === 3
                      ? 'Create account'
                      : 'Continue'}
              </Text>
              {!busy ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
            </PressableScale>

            {step === 0 ? (
              <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
                <Text style={styles.loginMuted}>
                  Already have an account? <Text style={styles.loginAccent}>Login</Text>
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.secureNote}>Email OTP · no password</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(15,15,15,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: CaseUi.orange,
  },
  stepCount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: CaseUi.muted,
  },
  progressTrack: {
    marginTop: 14,
    marginHorizontal: 20,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,15,15,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: CaseUi.orange,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E4E4E4',
  },
  dotOn: { backgroundColor: '#FFB38A' },
  dotCurrent: {
    backgroundColor: CaseUi.orange,
    width: 18,
    borderRadius: 4,
  },
  stepPane: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: CaseUi.ink,
  },
  sub: {
    marginTop: 8,
    marginBottom: 22,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: CaseUi.muted,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,15,15,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: CaseUi.ink,
    marginBottom: 8,
  },
  labelGap: { marginTop: 16 },
  hint: {
    marginTop: -4,
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F6F6F6',
    borderWidth: 1,
    borderColor: 'rgba(15,15,15,0.06)',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: CaseUi.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F6F6F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipOn: {
    backgroundColor: '#FFF1E8',
    borderColor: CaseUi.orange,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: CaseUi.muted,
  },
  chipTextOn: {
    color: CaseUi.orange,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  otp: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(15,15,15,0.08)',
    backgroundColor: '#F6F6F6',
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
  },
  otpOn: {
    borderColor: CaseUi.orange,
    backgroundColor: '#FFFFFF',
  },
  resend: { marginTop: 18, alignItems: 'center' },
  resendText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: CaseUi.orange,
  },
  error: {
    marginTop: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#D32F2F',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 18,
    paddingTop: 8,
  },
  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: CaseUi.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: CaseUi.orange,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
  },
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginMuted: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: CaseUi.muted,
  },
  loginAccent: {
    color: CaseUi.orange,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  secureNote: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: CaseUi.muted,
  },
});
