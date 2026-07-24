import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useWindowDimensions,
  Platform,
  Image,
  Alert,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import Reanimated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '@/lib/apiFetch';
import { saveAuthFromResponse } from '@/lib/auth';
import { getApiUrl } from '@/config/env';
import { CaseUi } from '@/constants/caseUi';
import { PressableScale } from '@/components/pressable-scale';
import { SD_LOGO, SD_LOGO_BLACK } from '@/constants/splashAssets';
import { useThemeContext } from '@/context/ThemeContext';

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; data?: { message?: string } };
  return err?.data?.message ?? err?.message ?? fallback;
}

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';

  const [email, setEmail] = useState(__DEV__ ? 'enganzalshaikh@gmail.com' : '');
  const [fullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const panelTranslateY = useMemo(() => new Animated.Value(0), []);
  const otpSendLockedRef = useRef(false);

  const otpCode = useMemo(() => otp.join(''), [otp]);
  const canResend = step === 'otp' && resendTimer === 0 && !busy;

  // Keyboard-aware panel animation
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const keyboardHeight = e.endCoordinates.height;
      Animated.timing(panelTranslateY, {
        toValue: -keyboardHeight,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    };

    const onHide = () => {
      Animated.timing(panelTranslateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [panelTranslateY]);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'otp') return;
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer, step]);

  const handleOtpChange = (value: string, index: number) => {
    // Strip non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly && value.length > 0) return;

    if (digitsOnly.length > 1) {
      // Paste scenario — distribute digits starting from the current box
      const newOtp = [...otp];
      const OTP_LENGTH = 6;
      const pasteDigits = digitsOnly.slice(0, OTP_LENGTH - index);
      pasteDigits.split('').forEach((digit, i) => {
        newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      // Focus the next empty box, or the last filled box
      const nextFocus = Math.min(index + pasteDigits.length, OTP_LENGTH - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Single character typed
    const newOtp = [...otp];
    newOtp[index] = digitsOnly.slice(0, 1);
    setOtp(newOtp);
    if (digitsOnly && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async () => {
    const emailTrim = email.trim();
    if (!emailTrim) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (otpSendLockedRef.current) return;
    otpSendLockedRef.current = true;

    setBusy(true);
    setError(null);
    try {
      if (__DEV__) console.log('📨 [AUTH] send-otp', { email: emailTrim, api: getApiUrl() });
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: emailTrim, purpose: 'login' }),
      });
      setMode('login');
      setStep('otp');
      setResendTimer(60);
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 404) {
        setError('No account found. Please sign up first.');
        Alert.alert('Account required', 'You need to create an account before logging in.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign up', onPress: () => router.push('/(auth)/register') },
        ]);
      } else {
        const msg = extractErrorMessage(e, 'Failed to send OTP — check backend is running at ' + getApiUrl());
        setError(msg);
        Alert.alert('Connection error', msg);
      }
    } finally {
      setBusy(false);
      otpSendLockedRef.current = false;
    }
  };

  const handleVerifyOtp = async () => {
    const emailTrim = email.trim();
    const code = otpCode;
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    if (otpSendLockedRef.current) return;
    otpSendLockedRef.current = true;

    setBusy(true);
    setError(null);
    try {
      const payload: any = { email: emailTrim, otp: code, purpose: mode };
      if (mode === 'signup' && fullName.trim()) payload.fullName = fullName.trim();
      if (__DEV__) console.log('✅ [AUTH] verify-otp', payload);
      const body = await apiFetch<{ success: true; message: string; data: any }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const nextRoute = await saveAuthFromResponse(body);
      router.replace(nextRoute as Href);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Verification failed';
      setError(String(msg));
      Alert.alert('Error', String(msg));
      setOtp(['', '', '', '', '', '']);
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } finally {
      setBusy(false);
      otpSendLockedRef.current = false;
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    const emailTrim = email.trim();
    if (otpSendLockedRef.current) return;
    otpSendLockedRef.current = true;

    setBusy(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: emailTrim, purpose: mode }),
      });
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Failed to resend OTP';
      Alert.alert('Error', String(msg));
    } finally {
      setBusy(false);
      otpSendLockedRef.current = false;
    }
  };

  const handleChangeInput = () => {
    setStep('input');
    setOtp(['', '', '', '', '', '']);
    setResendTimer(0);
    setError(null);
  };

  const handleContinueAsGuest = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top-Right Skip Button */}
      <View style={styles.skipContainer}>
        <PressableScale onPress={handleContinueAsGuest} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
          <Text style={styles.skipChevron}>›</Text>
        </PressableScale>
      </View>

      {/* Full-screen Image */}
      <View style={[styles.topSection, { height: height * 0.7 }]}>
        <Image
          source={require('@/assets/loginsplash/image.png')}
          style={{ width, height: height * 0.7 }}
          resizeMode="cover"
        />
      </View>

      {/* Floating Bottom Login Panel */}
      <View style={styles.keyboardContainer}>
        <Animated.View
          style={[
            styles.bottomPanel,
            {
              minHeight: height * 0.32,
              backgroundColor: isDark ? '#141417' : CaseUi.white,
              borderTopColor: isDark ? '#27272A' : CaseUi.line,
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Reanimated.View entering={FadeInDown.duration(340)} style={styles.headerContainer}>
              <Image
                source={isDark ? SD_LOGO : SD_LOGO_BLACK}
                style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 12 }}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.text }]}>
                {step === 'input' ? 'Welcome to SD-Services' : 'Verify OTP'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {step === 'input'
                  ? 'Enter your email to continue'
                  : `Enter the 6-digit code sent to ${email}`}
              </Text>
              {step === 'input' && (
                <Text style={styles.helperText}>
                  We&apos;ll log you in or create a new account automatically
                </Text>
              )}
            </Reanimated.View>

            {error ? (
              <Reanimated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                {error}
              </Reanimated.Text>
            ) : null}

            {step === 'input' ? (
              <Reanimated.View entering={FadeInDown.delay(60).duration(340)} style={styles.inputSection}>
                {/* Email Input */}
                <View style={[styles.phoneInputContainer, { backgroundColor: isDark ? '#1C1C22' : CaseUi.field, borderColor: isDark ? '#27272A' : CaseUi.line }]}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.atSymbol}>@</Text>
                  </View>
                  <View style={[styles.inputDivider, { backgroundColor: isDark ? '#27272A' : CaseUi.line }]} />
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text }]}
                    placeholder="Enter email address"
                    placeholderTextColor={isDark ? '#666' : CaseUi.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    cursorColor={CaseUi.orange}
                  />
                </View>

                {/* Primary CTA */}
                <PressableScale
                  disabled={busy}
                  onPress={handleSendOtp}
                  style={[styles.primaryBtn, busy && { opacity: 0.65 }]}
                >
                  <Text style={styles.primaryBtnText}>{busy ? 'Sending...' : 'Send OTP'}</Text>
                </PressableScale>

                <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.resetLinkWrap}>
                  <Text style={styles.resetLinkText}>
                    Prefer password login? <Text style={styles.resetLinkAccent}>Reset here</Text>
                  </Text>
                </Pressable>

                <PressableScale onPress={() => router.push('/(auth)/register')} style={styles.signupBtn}>
                  <Text style={styles.signupBtnLabel}>New here? Create your account first</Text>
                  <Text style={styles.signupBtnAccent}>Sign up → then login with OTP</Text>
                </PressableScale>

                {/* Social Login Icons */}
                <View style={styles.socialContainer}>
                  <PressableScale
                    style={[styles.socialButton, { backgroundColor: isDark ? '#1C1C22' : CaseUi.white, borderColor: isDark ? '#27272A' : CaseUi.line }]}
                    onPress={() => Alert.alert('Google', 'Google login is coming next. Backend social login is currently a stub (501).')}
                  >
                    <Text style={styles.socialG}>G</Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.socialButton, { backgroundColor: isDark ? '#1C1C22' : CaseUi.white, borderColor: isDark ? '#27272A' : CaseUi.line }]}
                    onPress={() => Alert.alert('Apple', 'Apple login is coming next.')}
                  >
                    <Ionicons name="logo-apple" size={22} color={colors.text} />
                  </PressableScale>
                </View>

                {/* Terms and Policies */}
                <View style={styles.legalSection}>
                  <Text style={styles.legalTextBase}>By continuing, you agree to our</Text>
                  <View style={styles.legalLinksRow}>
                    <Pressable>
                      <Text style={styles.legalLabel}>Terms of Service</Text>
                    </Pressable>
                    <Pressable>
                      <Text style={styles.legalLabel}>Privacy Policy</Text>
                    </Pressable>
                  </View>
                </View>
              </Reanimated.View>
            ) : (
              <Reanimated.View entering={FadeInDown.delay(60).duration(340)} style={styles.inputSection}>
                {/* OTP Boxes */}
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpBox, 
                        { backgroundColor: isDark ? '#1C1C22' : CaseUi.field, borderColor: isDark ? '#27272A' : CaseUi.line, color: colors.text },
                        digit ? styles.otpBoxFilled : null
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      autoFocus={index === 0}
                      cursorColor={CaseUi.orange}
                    />
                  ))}
                </View>

                {/* Resend Timer block */}
                <View style={styles.resendSection}>
                  <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
                  <Pressable onPress={handleResendOtp} disabled={!canResend}>
                    <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                      {canResend ? 'Resend Now' : `Resend in ${resendTimer}s`}
                    </Text>
                  </Pressable>
                </View>

                <PressableScale
                  disabled={busy}
                  onPress={handleVerifyOtp}
                  style={[styles.primaryBtn, busy && { opacity: 0.65 }]}
                >
                  <Text style={styles.primaryBtnText}>{busy ? 'Verifying...' : 'Verify & Continue'}</Text>
                </PressableScale>

                <Pressable onPress={handleChangeInput} style={styles.changePhoneButton}>
                  <Text style={styles.changePhoneText}>Change email address</Text>
                </Pressable>
              </Reanimated.View>
            )}

            <View style={styles.spacer} />
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CaseUi.ink,
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    minHeight: 44,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.3,
  },
  skipChevron: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginLeft: 4,
    marginTop: -2,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomPanel: {
    backgroundColor: CaseUi.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: CaseUi.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  formScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
  },
  headerContainer: {
    marginBottom: 24,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.2,
    color: CaseUi.ink,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  helperText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
    color: CaseUi.muted,
  },
  inputSection: {
    gap: 16,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CaseUi.line,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: CaseUi.field,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  atSymbol: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: CaseUi.muted,
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: CaseUi.line,
    marginRight: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    height: '100%',
    color: CaseUi.ink,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: CaseUi.orange,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  resetLinkWrap: { alignSelf: 'center', marginTop: 10 },
  resetLinkText: {
    color: CaseUi.muted,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  resetLinkAccent: {
    color: CaseUi.orange,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  signupBtn: {
    alignSelf: 'stretch',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CaseUi.orange,
    alignItems: 'center',
  },
  signupBtnLabel: {
    color: CaseUi.muted,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
  },
  signupBtnAccent: {
    color: CaseUi.orange,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    marginTop: 2,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...CaseUi.softShadow,
  },
  socialG: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#EA4335',
  },
  socialApple: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: CaseUi.ink,
  },
  legalSection: {
    marginTop: 4,
    alignItems: 'center',
    gap: 4,
  },
  legalTextBase: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    color: CaseUi.muted,
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legalLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textDecorationLine: 'underline',
    color: CaseUi.orange,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderColor: CaseUi.line,
  },
  otpBoxFilled: {
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.orangeSoft,
  },
  resendSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.muted,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: CaseUi.orange,
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
  changePhoneButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  changePhoneText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textDecorationLine: 'underline',
    color: CaseUi.muted,
  },
  spacer: {
    height: 20,
  },
  errorText: {
    marginBottom: 10,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
    color: CaseUi.danger,
  },
});
