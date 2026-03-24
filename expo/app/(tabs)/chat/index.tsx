import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  MessageCircle,
  Bot,
  Users,
  ArrowLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api-client';

type ChatView = 'rooms' | 'room-chat' | 'ai-chat';

interface ChatMessage {
  id: number | string;
  sender_name: string;
  sender_id?: number;
  content: string;
  created_at: string;
  isAI?: boolean;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [chatView, setChatView] = useState<ChatView>('rooms');
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [activeRoomName, setActiveRoomName] = useState('');
  const [messageText, setMessageText] = useState('');

  // AI chat local state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender_name: 'Fund AI',
      content: 'Hello! I\'m your personal Fund Assistant. I can help you understand your account, check loan eligibility, review contribution history, and answer questions about fund policies. How can I help?',
      created_at: new Date().toISOString(),
      isAI: true,
    },
  ]);

  // ─── API Queries ───────────────────────────────────────────────

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const res = await api.get('/api/chat-rooms/');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['room-messages', activeRoomId],
    queryFn: async () => {
      const res = await api.get(`/api/chat-rooms/${activeRoomId}/messages`);
      return res.data;
    },
    enabled: chatView === 'room-chat' && activeRoomId != null,
    refetchInterval: 5000, // Poll every 5s for new messages
  });

  const rooms = roomsData?.rooms ?? [];
  const roomMessages: ChatMessage[] = messagesData?.messages ?? [];

  // ─── Mutations ─────────────────────────────────────────────────

  const sendRoomMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/api/chat-rooms/${activeRoomId}/messages`, { content });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['room-messages', activeRoomId] });
    },
  });

  const sendAiMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post('/api/chat/', { message });
      return res.data;
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────

  const openRoom = useCallback((roomId: number, roomName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveRoomId(roomId);
    setActiveRoomName(roomName);
    setChatView('room-chat');
  }, []);

  const openAiChat = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatView('ai-chat');
  }, []);

  const goBack = useCallback(() => {
    setChatView('rooms');
    setActiveRoomId(null);
  }, []);

  const handleSendRoomMessage = useCallback(() => {
    const text = messageText.trim();
    if (!text) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendRoomMessage.mutate(text);
    setMessageText('');
  }, [messageText, sendRoomMessage]);

  const handleSendAiMessage = useCallback(async () => {
    const text = messageText.trim();
    if (!text) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender_name: user?.first_name ?? 'You',
      sender_id: user?.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setMessageText('');

    try {
      const res = await sendAiMessage.mutateAsync(text);
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender_name: 'Fund AI',
        content: res.response ?? res.message ?? 'I received your message.',
        created_at: new Date().toISOString(),
        isAI: true,
      };
      setAiMessages((prev) => [...prev, aiReply]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender_name: 'Fund AI',
          content: 'Sorry, I encountered an error. Please try again.',
          created_at: new Date().toISOString(),
          isAI: true,
        },
      ]);
    }
  }, [messageText, user, sendAiMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [roomMessages.length, aiMessages.length]);

  // ─── Room List View ────────────────────────────────────────────

  if (chatView === 'rooms') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>

        {/* AI Assistant Card */}
        <TouchableOpacity style={styles.aiCard} activeOpacity={0.7} onPress={openAiChat}>
          <View style={styles.aiIconWrapper}>
            <Bot size={26} color={Colors.accentGold} />
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>Fund AI Assistant</Text>
            <Text style={styles.aiSub}>Ask about your account, loans, policies</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Group Rooms</Text>

        {roomsLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 32 }} />
        ) : rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No chat rooms available</Text>
          </View>
        ) : (
          rooms.map((room: any) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              activeOpacity={0.7}
              onPress={() => openRoom(room.id, room.name)}
            >
              <View style={styles.roomIconWrapper}>
                <Users size={20} color={Colors.accentGold} />
              </View>
              <View style={styles.roomContent}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomDesc}>
                  {room.last_message?.content ?? room.description ?? 'No messages yet'}
                </Text>
              </View>
              {room.type === 'board_only' && (
                <View style={styles.boardBadge}>
                  <Text style={styles.boardBadgeText}>BOARD</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  }

  // ─── Chat View (Room or AI) ────────────────────────────────────

  const isAi = chatView === 'ai-chat';
  const displayMessages = isAi ? aiMessages : roomMessages;
  const isSending = isAi ? sendAiMessage.isPending : sendRoomMessage.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatHeaderContent}>
          {isAi ? <Bot size={20} color={Colors.accentGold} /> : <Users size={20} color={Colors.accentGold} />}
          <Text style={styles.chatHeaderTitle}>{isAi ? 'Fund AI Assistant' : activeRoomName}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messagesLoading && !isAi ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 32 }} />
        ) : displayMessages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <MessageCircle size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyMessagesText}>No messages yet. Start the conversation!</Text>
          </View>
        ) : (
          displayMessages.map((msg) => {
            const isOwnMessage = !msg.isAI && msg.sender_id === user?.id;
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.ownMessage : styles.otherMessage,
                  msg.isAI && styles.aiMessage,
                ]}
              >
                {!isOwnMessage && (
                  <Text style={styles.messageSender}>
                    {msg.isAI ? '🤖 Fund AI' : msg.sender_name}
                  </Text>
                )}
                <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                  {msg.content}
                </Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })
        )}
        {isSending && isAi && (
          <View style={[styles.messageBubble, styles.aiMessage]}>
            <Text style={styles.messageSender}>🤖 Fund AI</Text>
            <ActivityIndicator size="small" color={Colors.accentGold} />
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.chatInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder={isAi ? 'Ask your Fund AI anything...' : 'Type a message...'}
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={isAi ? handleSendAiMessage : handleSendRoomMessage}
          disabled={!messageText.trim() || isSending}
        >
          <Send size={20} color={messageText.trim() && !isSending ? Colors.bgPrimary : Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  sectionTitle: {
    fontSize: 16, fontWeight: '600', color: Colors.textSecondary,
    paddingHorizontal: 20, marginTop: 20, marginBottom: 12,
    letterSpacing: 0.5,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  aiIconWrapper: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  aiContent: { flex: 1 },
  aiTitle: { fontSize: 17, fontWeight: '700', color: Colors.accentGold },
  aiSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.bgSecondary, borderRadius: 14,
    padding: 20, marginHorizontal: 20, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgSecondary, borderRadius: 14,
    padding: 16, marginHorizontal: 20, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  roomIconWrapper: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  roomContent: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  roomDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  boardBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  boardBadgeText: { fontSize: 9, fontWeight: '700', color: '#60a5fa', letterSpacing: 0.5 },

  // Chat view
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { padding: 4 },
  chatHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chatHeaderTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  messagesList: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  emptyMessagesContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyMessagesText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  messageBubble: {
    maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentGold,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgSecondary,
    borderBottomLeftRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 11, fontWeight: '600',
    color: Colors.accentGold, marginBottom: 4,
  },
  messageText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 21 },
  ownMessageText: { color: Colors.bgPrimary },
  messageTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgPrimary,
  },
  chatInput: {
    flex: 1, backgroundColor: Colors.bgSecondary,
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accentGold,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.bgTertiary },
});
