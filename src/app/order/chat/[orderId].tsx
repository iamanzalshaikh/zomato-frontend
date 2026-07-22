import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonBlock } from '@/components/skeleton';
import { EmptyState } from '@/components/state-views';
import { CaseUi } from '@/constants/caseUi';
import { useCaseChatQuery, useSendCaseChatMutation } from '@/hooks/queries/caseOrders';

export default function OrderChatScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';
  const chatQ = useCaseChatQuery(id);
  const sendMut = useSendCaseChatMutation(id);
  const [text, setText] = useState('');
  const messages = chatQ.data ?? [];

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await sendMut.mutateAsync(body);
    } catch {
      setText(body);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.iconCircle}>
            <Ionicons name="arrow-back" size={20} color={CaseUi.ink} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Order chat</Text>
            <Text style={styles.subtitle}>Support & delivery rider</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          {chatQ.isLoading ? (
            <View style={styles.list}>
              <SkeletonBlock width="55%" height={40} radius={14} style={{ alignSelf: 'flex-start', marginBottom: 10 }} />
              <SkeletonBlock width="65%" height={40} radius={14} style={{ alignSelf: 'flex-end', marginBottom: 10 }} />
              <SkeletonBlock width="45%" height={40} radius={14} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(m, i) => m.id || String(i)}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  title="No messages yet"
                  subtitle="Say hello to support or your rider."
                />
              }
              renderItem={({ item, index }) => {
                const mine = String(item.senderRole ?? '').toUpperCase() === 'CUSTOMER';
                return (
                  <Animated.View
                    entering={FadeInUp.delay(Math.min(index, 10) * 20).duration(220)}
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                  >
                    <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.body}</Text>
                  </Animated.View>
                );
              }}
            />
          )}

          <Animated.View entering={FadeInDown.duration(240)} style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message…"
              placeholderTextColor={CaseUi.muted}
              style={styles.input}
              cursorColor={CaseUi.orange}
            />
            <PressableScale onPress={send} disabled={sendMut.isPending || !text.trim()} style={styles.send}>
              <Ionicons name="send" size={17} color="#FFFFFF" />
            </PressableScale>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CaseUi.white },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  title: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: CaseUi.ink },
  subtitle: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: CaseUi.muted, marginTop: 1 },
  list: { padding: 16, paddingBottom: 16, flexGrow: 1 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    marginBottom: 10,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: CaseUi.orange,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: CaseUi.field,
    borderBottomLeftRadius: 4,
  },
  bubbleTextMine: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  bubbleTextTheirs: { color: CaseUi.ink, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: CaseUi.line,
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: CaseUi.ink,
    backgroundColor: CaseUi.field,
    borderWidth: 1,
    borderColor: CaseUi.line,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CaseUi.orange,
  },
});
