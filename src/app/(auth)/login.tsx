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
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '@/lib/apiFetch';
import { saveAuthFromResponse } from '@/lib/auth';
import { getApiUrl } from '@/config/env';
import { useTheme } from '@/hooks/use-theme';

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as { message?: string; data?: { message?: string } };
  return err?.data?.message ?? err?.message ?? fallback;
}

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const theme = useTheme();

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
        try {
          if (__DEV__) console.log('📨 [AUTH] send-otp (signup)', { email: emailTrim, purpose: 'signup' });
          await apiFetch('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email: emailTrim, purpose: 'signup' }),
          });
          setMode('signup');
          setStep('otp');
          setResendTimer(60);
          requestAnimationFrame(() => inputRefs.current[0]?.focus());
        } catch (signupError: unknown) {
          const msg = extractErrorMessage(signupError, 'Failed to send OTP');
          setError(msg);
          Alert.alert('Error', msg);
        }
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Top-Right Skip Button */}
      <View style={styles.skipContainer}>
        <Pressable
          onPress={handleContinueAsGuest}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', marginLeft: 4, marginTop: -2 }}>›</Text>
        </Pressable>
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
              backgroundColor: theme.backgroundElement,
              minHeight: height * 0.32,
              transform: [{ translateY: panelTranslateY }],
              borderTopColor: `${theme.primary}22`,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: theme.text }]}>
                {step === 'input' ? 'Welcome to QuickBite' : 'Verify OTP'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {step === 'input'
                  ? 'Enter your email to continue'
                  : `Enter the 6-digit code sent to ${email}`}
              </Text>
              {step === 'input' && (
                <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                  We&apos;ll log you in or create a new account automatically
                </Text>
              )}
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: '#e53935' }]}>{error}</Text>
            ) : null}

            {step === 'input' ? (
              <View style={styles.inputSection}>
                {/* Email Input */}
                <View style={[styles.phoneInputContainer, { backgroundColor: theme.backgroundSelected, borderColor: 'rgba(127,127,127,0.15)' }]}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: theme.textSecondary }}>@</Text>
                  </View>
                  <View style={styles.inputDivider} />
                  <TextInput
                    style={[styles.phoneInput, { color: theme.text }]}
                    placeholder="Enter email address"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    cursorColor={theme.primary}
                  />
                </View>

                {/* Primary CTA */}
                <Pressable
                  disabled={busy}
                  onPress={handleSendOtp}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.8 },
                    busy && { opacity: 0.65 }
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? 'Sending...' : 'Send OTP'}
                  </Text>
                </Pressable>

                <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <Text style={{ color: theme.primary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>
                    Forgot password?
                  </Text>
                </Pressable>

                {/* Social Login Icons */}
                <View style={styles.socialContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.socialButton,
                      { backgroundColor: theme.backgroundElement, borderColor: 'rgba(127,127,127,0.15)' },
                      pressed && styles.socialButtonPressed,
                    ]}
                    onPress={() => Alert.alert('Google', 'Google login is coming next. Backend social login is currently a stub (501).')}
                  >
                    <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#EA4335' }}>G</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.socialButton,
                      { backgroundColor: theme.backgroundElement, borderColor: 'rgba(127,127,127,0.15)' },
                      pressed && styles.socialButtonPressed,
                    ]}
                    onPress={() => Alert.alert('Apple', 'Apple login is coming next.')}
                  >
                    <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: theme.text }}></Text>
                  </Pressable>
                </View>

                {/* Terms and Policies */}
                <View style={styles.legalSection}>
                  <Text style={[styles.legalTextBase, { color: theme.textSecondary }]}>
                    By continuing, you agree to our
                  </Text>
                  <View style={styles.legalLinksRow}>
                    <Pressable>
                      <Text style={[styles.legalLabel, { color: theme.primary }]}>
                        Terms of Service
                      </Text>
                    </Pressable>
                    <Pressable>
                      <Text style={[styles.legalLabel, { color: theme.primary }]}>
                        Privacy Policy
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.inputSection}>
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
                        {
                          backgroundColor: theme.backgroundSelected,
                          borderColor: 'rgba(127,127,127,0.15)',
                          color: theme.text,
                        },
                        digit ? {
                          borderColor: theme.primary,
                          backgroundColor: theme.primarySoft,
                        } : null,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      autoFocus={index === 0}
                      cursorColor={theme.primary}
                    />
                  ))}
                </View>

                {/* Resend Timer block */}
                <View style={styles.resendSection}>
                  <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                    Didn&apos;t receive the code?
                  </Text>
                  <Pressable onPress={handleResendOtp} disabled={!canResend}>
                    <Text
                      style={[
                        styles.resendLink,
                        { color: canResend ? theme.primary : '#9CA3AF' },
                      ]}
                    >
                      {canResend ? 'Resend Now' : `Resend in ${resendTimer}s`}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={handleVerifyOtp}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.8 },
                    busy && { opacity: 0.65 }
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? 'Verifying...' : 'Verify & Continue'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleChangeInput}
                  style={styles.changePhoneButton}
                >
                  <Text style={[styles.changePhoneText, { color: theme.textSecondary }]}>
                    Change email address
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Error Message */}
            {!!error && (
              <Text style={[styles.error, { color: '#E5484D' }]}>
                {error}
              </Text>
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
    fontWeight: '700',
    letterSpacing: 0.3,
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
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
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  helperText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
  inputSection: {
    gap: 16,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D1D5DB',
    marginRight: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    height: '100%',
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
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
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  changePhoneButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  changePhoneText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textDecorationLine: 'underline',
  },
  spacer: {
    height: 20,
  },
  error: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 10,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
  },
});
