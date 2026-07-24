import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { CaseUi } from '@/constants/caseUi';
import { profileKeys, useProfileQuery } from '@/hooks/queries/profile';
import { updateProfile } from '@/services/profile';
import { toast } from '@/lib/toast';

export default function EditProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const profileQ = useProfileQuery();
  const user = profileQ.data;

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(user.fullName ?? user.name ?? '');
      setMobile(user.mobile ?? user.phone ?? '');
    }
  }, [user]);

  const save = useMutation({
    mutationFn: () => updateProfile({ fullName: fullName.trim(), mobile: mobile.trim() || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: profileKeys.me });
      toast.success('Profile updated', 'Saved');
      router.back();
    },
    onError: (e: Error) => toast.error(e.message, 'Error'),
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} style={styles.iconCircle}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        {profileQ.isLoading ? (
          <View style={styles.body}>
            <SkeletonBlock width={84} height={84} radius={42} style={{ alignSelf: 'center' }} />
            <SkeletonBlock width="100%" height={54} radius={14} style={{ marginTop: 28 }} />
            <SkeletonBlock width="100%" height={54} radius={14} style={{ marginTop: 14 }} />
            <SkeletonBlock width="100%" height={54} radius={14} style={{ marginTop: 14 }} />
          </View>
        ) : (
          <View style={styles.body}>
            <Animated.View entering={FadeInDown.duration(300)} style={styles.avatarWrap}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {(fullName || user?.fullName)?.charAt(0)?.toUpperCase() ?? 'U'}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={17} color={CaseUi.muted} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={CaseUi.muted}
                  style={styles.input}
                  cursorColor={CaseUi.orange}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.field}>
              <Text style={styles.label}>Mobile number</Text>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={17} color={CaseUi.muted} />
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor={CaseUi.muted}
                  style={styles.input}
                  cursorColor={CaseUi.orange}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(300)} style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputRow, styles.inputRowDisabled]}>
                <Ionicons name="mail-outline" size={17} color={CaseUi.muted} />
                <Text style={styles.disabledText} numberOfLines={1}>
                  {user?.email ?? '—'}
                </Text>
                <Ionicons name="lock-closed-outline" size={14} color={CaseUi.muted} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(180).duration(300)}>
              <PressableScale
                disabled={save.isPending}
                onPress={() => save.mutate()}
                style={[styles.saveBtn, save.isPending && { opacity: 0.7 }]}
              >
                <Text style={styles.saveBtnText}>{save.isPending ? 'Saving…' : 'Save changes'}</Text>
              </PressableScale>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CaseUi.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  body: { padding: 20 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: CaseUi.field },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orangeSoft,
  },
  avatarInitials: { fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.orange },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.muted, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
  },
  inputRowDisabled: { opacity: 0.75 },
  input: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink, height: '100%' },
  disabledText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: CaseUi.orange,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
