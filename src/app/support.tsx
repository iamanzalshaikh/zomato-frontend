import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { createSupportTicket, fetchSupportTickets } from '@/services/support';

const ISSUE_TYPES = ['PAYMENT', 'DELIVERY', 'FOOD', 'REFUND', 'OTHER'];

export default function SupportScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('ORDER_ISSUE');

  const ticketsQ = useQuery({ queryKey: ['support', 'tickets'], queryFn: fetchSupportTickets });

  const create = useMutation({
    mutationFn: () => createSupportTicket({ issueType, description: description.trim() }),
    onSuccess: async () => {
      setDescription('');
      await qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      Alert.alert('Submitted', 'Support ticket created. We will respond soon.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const tickets = Array.isArray(ticketsQ.data) ? ticketsQ.data : [];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={CaseUi.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Help & support</Text>
        </View>

        <FlatList
          data={tickets}
          keyExtractor={(item: any) => String(item._id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Animated.View entering={FadeInDown.duration(280)}>
              <View style={styles.chips}>
                {ISSUE_TYPES.map((t) => {
                  const active = issueType === t;
                  return (
                    <PressableScale key={t} onPress={() => setIssueType(t)} style={[styles.chip, active && styles.chipActive]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.replace(/_/g, ' ')}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your issue (min 10 characters)"
                multiline
                placeholderTextColor={CaseUi.muted}
                style={styles.input}
              />

              <PressableScale
                disabled={create.isPending || description.trim().length < 10}
                onPress={() => create.mutate()}
                style={[styles.btn, description.trim().length < 10 && { opacity: 0.6 }]}
              >
                <Text style={styles.btnText}>{create.isPending ? 'Submitting…' : 'Submit ticket'}</Text>
              </PressableScale>

              <Text style={styles.sectionTitle}>Your tickets</Text>
            </Animated.View>
          }
          ListEmptyComponent={
            <EmptyState icon="help-buoy-outline" title="No tickets yet" subtitle={ticketsQ.isLoading ? 'Loading…' : 'Submit an issue above and we’ll take a look.'} />
          }
          renderItem={({ item, index }: { item: any; index: number }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(240)} style={styles.ticketCard}>
              <Text style={styles.ticketType}>{String(item.issueType ?? '').replace(/_/g, ' ')}</Text>
              <Text style={styles.ticketDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.ticketStatus}>{item.status ?? 'OPEN'}</Text>
            </Animated.View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: CaseUi.line },
  chipActive: { backgroundColor: CaseUi.orangeSoft, borderColor: CaseUi.orange },
  chipText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: CaseUi.muted },
  chipTextActive: { color: CaseUi.orange },
  input: {
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.field,
    padding: 12,
    textAlignVertical: 'top',
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.ink,
  },
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: CaseUi.orange },
  btnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, marginTop: 24, marginBottom: 8, color: CaseUi.ink },
  ticketCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CaseUi.line,
    backgroundColor: CaseUi.white,
    ...CaseUi.softShadow,
  },
  ticketType: { fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.ink },
  ticketDesc: { color: CaseUi.muted, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
  ticketStatus: { marginTop: 6, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: CaseUi.orange },
});
