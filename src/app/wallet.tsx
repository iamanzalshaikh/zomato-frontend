import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { fetchWallet, fetchWalletTransactions } from '@/services/wallet';

function txIcon(type: string | undefined, amount: number): keyof typeof Ionicons.glyphMap {
  const t = (type ?? '').toLowerCase();
  if (t.includes('cashback')) return 'gift-outline';
  if (t.includes('refund')) return 'return-down-back-outline';
  if (amount >= 0) return 'add-circle-outline';
  return 'remove-circle-outline';
}

export default function WalletScreen() {
  const router = useRouter();

  const walletQ = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet });
  const txQ = useQuery({ queryKey: ['wallet', 'transactions'], queryFn: () => fetchWalletTransactions() });

  const balance = Number(walletQ.data?.balance ?? walletQ.data?.walletBalance ?? 0);
  const loyalty = Number((walletQ.data as any)?.loyaltyPoints ?? 0);
  const txs = Array.isArray(txQ.data) ? txQ.data : [];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={{ width: 38 }} />
        </View>

        <FlatList
          data={txs}
          keyExtractor={(item: any, i) => String(item._id ?? item.id ?? i)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <Animated.View entering={FadeInDown.duration(320)}>
                <LinearGradient colors={['#FF8A4C', '#FF5A00']} style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Available balance</Text>
                  {walletQ.isLoading ? (
                    <SkeletonBlock width={140} height={36} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={styles.balance}>J${balance.toFixed(0)}</Text>
                  )}
                  <View style={styles.loyaltyPill}>
                    <Ionicons name="star" size={13} color="#FFFFFF" />
                    <Text style={styles.loyaltyText}>{loyalty} loyalty points</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.quickActions}>
                <View style={styles.quickAction}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="wallet-outline" size={20} color={CaseUi.orange} />
                  </View>
                  <Text style={styles.quickActionLabel}>Top up at checkout</Text>
                </View>
                <View style={styles.quickActionDivider} />
                <View style={styles.quickAction}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="gift-outline" size={20} color={CaseUi.orange} />
                  </View>
                  <Text style={styles.quickActionLabel}>Earn cashback on orders</Text>
                </View>
              </Animated.View>

              <Text style={styles.sectionTitle}>Recent transactions</Text>
            </>
          }
          ListEmptyComponent={
            txQ.isLoading ? (
              <View style={{ gap: 14 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <SkeletonBlock width={36} height={36} radius={18} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonBlock width="60%" height={13} />
                      <SkeletonBlock width="35%" height={11} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No transactions yet"
                subtitle="Your wallet activity will show up here."
              />
            )
          }
          renderItem={({ item, index }: { item: any; index: number }) => {
            const amount = Number(item.amount ?? 0);
            const isCredit = amount >= 0;
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(240)} style={styles.txRow}>
                <View style={[styles.txIconWrap, isCredit ? styles.txIconWrapCredit : styles.txIconWrapDebit]}>
                  <Ionicons
                    name={txIcon(item.type, amount)}
                    size={18}
                    color={isCredit ? CaseUi.success : CaseUi.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{item.description ?? item.type ?? 'Transaction'}</Text>
                  {item.createdAt ? (
                    <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  ) : null}
                </View>
                <Text style={[styles.txAmount, isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
                  {isCredit ? '+' : '-'}J${Math.abs(amount).toFixed(0)}
                </Text>
              </Animated.View>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: CaseUi.field },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: CaseUi.ink },
  listContent: { padding: 16, paddingBottom: 32, gap: 4 },
  balanceCard: { borderRadius: 20, padding: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  balance: { color: '#FFFFFF', fontSize: 34, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 4 },
  loyaltyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loyaltyText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  quickActions: {
    flexDirection: 'row',
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    padding: 14,
    ...CaseUi.softShadow,
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 8 },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orangeSoft,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: CaseUi.muted,
    textAlign: 'center',
  },
  quickActionDivider: { width: 1, backgroundColor: CaseUi.line, marginVertical: 4 },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: CaseUi.ink,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CaseUi.line,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txIconWrapCredit: { backgroundColor: CaseUi.successSoft },
  txIconWrapDebit: { backgroundColor: '#FEE2E2' },
  txTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: CaseUi.ink },
  txDate: { fontSize: 11, color: CaseUi.muted, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },
  txAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },
  txAmountCredit: { color: CaseUi.success },
  txAmountDebit: { color: CaseUi.danger },
});
