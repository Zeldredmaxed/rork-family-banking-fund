import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api-client';
import { DMMessage } from '@/types';

export default function ConversationScreen() {
  const { memberId, memberName } = useLocalSearchParams<{ memberId: string; memberName: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [messageText, setMessageText] = useState('');
  const mid = parseInt(memberId ?? '0', 10);

  const { data: msgData, isLoading } = useQuery({
    queryKey: ['dm-messages', mid],
    queryFn: async () => {
      const res = await api.get(`/api/dm/conversations/${mid}?limit=50`);
      return res.data;
    },
    enabled: mid > 0,
    refetchInterval: 5000,
  });

  const messages: DMMessage[] = msgData?.messages ?? [];

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/dm/conversations/${mid}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });

  useEffect(() => {
    if (mid > 0 && messages.length > 0) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mid, messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/api/dm/conversations/${mid}`, { content });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dm-messages', mid] });
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate(text);
    setMessageText('');
  }, [messageText, sendMutation]);

  const decodedName = decodeURIComponent(memberName ?? 'Chat');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: decodedName,
          headerStyle: { backgroundColor: Colors.bgPrimary },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySub}>Say hello!</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <View
                key={msg.id}
                style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
              >
                <Text style={[styles.bubbleText, isOwn && styles.ownBubbleText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.bubbleTime, isOwn && styles.ownBubbleTime]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.chatInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sendMutation.isPending}
        >
          <Send size={20} color={messageText.trim() && !sendMutation.isPending ? Colors.bgPrimary : Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  messagesList: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary },
  emptySub: { fontSize: 13, color: Colors.textTertiary },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentGold,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgSecondary,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 21 },
  ownBubbleText: { color: Colors.bgPrimary },
  bubbleTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 4, textAlign: 'right' as const },
  ownBubbleTime: { color: 'rgba(10,10,15,0.5)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgPrimary,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.bgTertiary },
});
