import { useState, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { TabScrollView } from '@/components/tab-scroll-view';
import { PressableScale } from '@/components/pressable-scale';
import { CaseUi } from '@/constants/caseUi';
import { logout } from '@/lib/auth';
import {
  useDeleteAddressMutation,
  useProfileQuery,
  useUpdateAddressMutation,
  useDeleteAccountMutation,
} from '@/hooks/queries/profile';
import { V1_WALLET_ENABLED } from '@/config/features';
import { useThemeContext } from '@/context/ThemeContext';

function OptionRow({
  icon,
  label,
  onPress,
  danger,
  trailing,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} style={[styles.optionRow, !last && styles.optionRowBorder]}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon} size={18} color={danger ? CaseUi.danger : CaseUi.muted} />
        <Text style={[styles.optionText, danger && styles.optionTextDanger]}>{label}</Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={danger ? CaseUi.danger : CaseUi.muted} />}
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { themePreference, setThemePreference } = useThemeContext();
  const q = useProfileQuery();

  const addresses = useMemo(() => {
    const list = [...(q.data?.addresses ?? [])];
    return list.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
  }, [q.data?.addresses]);
  const upd = useUpdateAddressMutation();
  const del = useDeleteAddressMutation();
  const delAcc = useDeleteAccountMutation();

  const [busy, setBusy] = useState(false);
  const [showAddresses, setShowAddresses] = useState(true);

  const user = q.data;

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(onboarding)');
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await delAcc.mutateAsync();
              await logout();
              router.replace('/(onboarding)');
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to delete account');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (q.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={CaseUi.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <TabScrollView contentContainerStyle={styles.scrollBody}>
          {/* Top Profile Header Card */}
          <Animated.View entering={FadeInDown.duration(320)}>
            <LinearGradient colors={['#FF8A4C', '#FF5A00']} style={styles.profileHeaderCard}>
              <View style={styles.avatarRow}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.userNameText}>{user?.fullName || 'CASE Student'}</Text>
                  <Text style={styles.userContactText}>{user?.email || 'email@example.com'}</Text>
                  {user?.mobile && <Text style={styles.userContactText}>{user.mobile}</Text>}
                  <PressableScale onPress={() => router.push('/edit-profile')} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Text style={styles.editLink}>Edit Profile →</Text>
                  </PressableScale>
                </View>
              </View>

              <View style={styles.balanceCard}>
                {V1_WALLET_ENABLED ? (
                  <>
                    <PressableScale onPress={() => router.push('/wallet')} style={styles.balanceItem}>
                      <Ionicons name="wallet-outline" size={20} color={CaseUi.orange} />
                      <View>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceValue}>J${user?.walletBalance ?? 0}</Text>
                      </View>
                    </PressableScale>
                    <View style={styles.cardDividerVertical} />
                  </>
                ) : null}
                <PressableScale
                  onPress={() => router.push('/(tabs)/orders')}
                  style={[styles.balanceItem, !V1_WALLET_ENABLED && { flex: 1 }]}
                >
                  <Ionicons name="receipt-outline" size={20} color={CaseUi.orange} />
                  <View>
                    <Text style={styles.balanceLabel}>My Orders</Text>
                    <Text style={styles.balanceValue}>View history ›</Text>
                  </View>
                </PressableScale>
                {!V1_WALLET_ENABLED ? (
                  <>
                    <View style={styles.cardDividerVertical} />
                    <PressableScale onPress={() => router.push('/coupons')} style={[styles.balanceItem, { flex: 1 }]}>
                      <Ionicons name="pricetag-outline" size={20} color={CaseUi.orange} />
                      <View>
                        <Text style={styles.balanceLabel}>Offers</Text>
                        <Text style={styles.balanceValue}>Coupons ›</Text>
                      </View>
                    </PressableScale>
                  </>
                ) : null}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Addresses Accordion */}
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.sectionCard}>
            <PressableScale onPress={() => setShowAddresses(!showAddresses)} style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="location-outline" size={20} color={CaseUi.orange} />
                <Text style={styles.sectionTitle}>Saved Addresses</Text>
              </View>
              <Ionicons name={showAddresses ? 'chevron-up' : 'chevron-down'} size={16} color={CaseUi.muted} />
            </PressableScale>

            {showAddresses && (
              <View style={{ marginTop: 10 }}>
                {addresses.length === 0 ? (
                  <Text style={styles.emptyAddrText}>No saved addresses yet. Add one during checkout!</Text>
                ) : (
                  addresses.map((a) => (
                    <View key={a._id} style={styles.addrRow}>
                      <View style={[styles.addrIconContainer, a.isDefault && { backgroundColor: CaseUi.orangeSoft }]}>
                        <Ionicons
                          name={a.label === 'Home' ? 'home-outline' : a.label === 'Work' ? 'briefcase-outline' : 'location-outline'}
                          size={18}
                          color={a.isDefault ? CaseUi.orange : CaseUi.muted}
                        />
                      </View>

                      <View style={styles.addrContent}>
                        <View style={styles.addrHeader}>
                          <Text style={styles.addrLabel}>{a.label}</Text>
                          {a.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                            </View>
                          )}
                        </View>
                        <Text numberOfLines={2} style={styles.addrText}>
                          {a.fullAddress}
                        </Text>
                      </View>

                      <View style={styles.addrActionsRight}>
                        {!a.isDefault ? (
                          <PressableScale
                            disabled={busy}
                            onPress={async () => {
                              try {
                                setBusy(true);
                                await upd.mutateAsync({ addressId: a._id, isDefault: true } as any);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            style={styles.miniActionBtn}
                          >
                            <Text style={styles.miniActionBtnText}>Use</Text>
                          </PressableScale>
                        ) : (
                          <View style={styles.defaultCheckCircle}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <PressableScale
                          disabled={busy}
                          onPress={() => {
                            if (busy) return;
                            setBusy(true);
                            Alert.alert('Delete Address', 'Remove this address?', [
                              { text: 'Cancel', style: 'cancel', onPress: () => setBusy(false) },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await del.mutateAsync(a._id);
                                  } catch {
                                    // ignore or log
                                  } finally {
                                    setBusy(false);
                                  }
                                },
                              },
                            ], { onDismiss: () => setBusy(false) });
                          }}
                          style={styles.deleteMiniBtn}
                        >
                          <Ionicons name="trash-outline" size={14} color={CaseUi.danger} />
                        </PressableScale>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </Animated.View>

          {/* Settings / General Options Card */}
          <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Settings</Text>
            <OptionRow
              icon="color-palette-outline"
              label="App Theme"
              onPress={() => {
                Alert.alert(
                  'Choose App Theme',
                  'Select how SD-Services looks on your device:',
                  [
                    {
                      text: 'System Default (Auto)',
                      onPress: () => void setThemePreference('system'),
                    },
                    {
                      text: 'Light Mode ☀️',
                      onPress: () => void setThemePreference('light'),
                    },
                    {
                      text: 'Dark Mode 🌙',
                      onPress: () => void setThemePreference('dark'),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              trailing={
                <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.orange }}>
                  {themePreference === 'system' ? 'System (Auto)' : themePreference === 'dark' ? 'Dark 🌙' : 'Light ☀️'} ›
                </Text>
              }
            />
            <OptionRow icon="person-outline" label="Edit profile" onPress={() => router.push('/edit-profile')} />
            <OptionRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
            {V1_WALLET_ENABLED ? (
              <OptionRow icon="card-outline" label="Wallet" onPress={() => router.push('/wallet')} />
            ) : null}
            <OptionRow icon="heart-outline" label="Favourites" onPress={() => router.push('/favorites-list')} />
            <OptionRow icon="book-outline" label="FAQ" onPress={() => router.push('/faq')} />
            <OptionRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/terms')} />
            <OptionRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/support')} last />
          </Animated.View>

          {/* Danger Zone Account deletion & Logout */}
          <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.sectionCard}>
            <OptionRow icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
            <OptionRow
              icon="trash-outline"
              label="Delete Account"
              onPress={handleDeleteAccount}
              danger
              last
              trailing={busy ? <ActivityIndicator size="small" color={CaseUi.danger} /> : undefined}
            />
          </Animated.View>
        </TabScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: CaseUi.muted, marginTop: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  scrollBody: { padding: 16, gap: 16 },
  profileHeaderCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)' },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  userNameText: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFFFFF' },
  userContactText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: 'rgba(255,255,255,0.85)' },
  editLink: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  balanceLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.muted },
  balanceValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2, color: CaseUi.ink },
  cardDividerVertical: { width: 1, height: '80%', backgroundColor: CaseUi.line },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: CaseUi.white,
    borderWidth: 1,
    borderColor: CaseUi.line,
    ...CaseUi.softShadow,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textTransform: 'uppercase',
    marginBottom: 8,
    color: CaseUi.muted,
  },
  emptyAddrText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 8,
    textAlign: 'center',
    color: CaseUi.muted,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
    gap: 12,
  },
  addrIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.field,
  },
  addrContent: { flex: 1, gap: 2 },
  addrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: CaseUi.ink },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: CaseUi.orange },
  defaultBadgeText: { color: '#FFFFFF', fontSize: 7.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  addrText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 16, color: CaseUi.muted },
  addrActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CaseUi.orange,
    backgroundColor: CaseUi.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniActionBtnText: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orange },
  defaultCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orange,
  },
  deleteMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionRowBorder: { borderBottomWidth: 1, borderBottomColor: CaseUi.line },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.ink },
  optionTextDanger: { color: CaseUi.danger, fontFamily: 'PlusJakartaSans_700Bold' },
});
