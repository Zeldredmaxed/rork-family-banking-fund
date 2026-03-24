import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Paperclip, MoreVertical, Lock, Bot } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types';
import { getInitials, formatTime } from '@/utils/formatters';

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 1, sender_id: 2, sender_name: 'Tanya Johnson', content: 'Has everyone reviewed the agenda for next month\'s board meeting?', is_edited: false, created_at: '2026-03-24T15:42:00' },
  { id: 2, sender_id: 3, sender_name: 'David Patterson', content: 'Yes, I have a few items to add regarding the emergency fund policy.', is_edited: false, created_at: '2026-03-24T15:45:00' },
  { id: 3, sender_id: 1, sender_name: 'Marcus Johnson', content: 'I\'ll prepare the financial summary report. Should have it ready by next week.', is_edited: false, created_at: '2026-03-24T15:48:00' },
  { id: 4, sender_id: 4, sender_name: 'Lisa Williams', content: 'Great, thanks Marcus! I\'ll follow up on the insurance quotes.', is_edited: false, created_at: '2026-03-24T15:50:00' },
];

const AI_MESSAGES: ChatMessage[] = [
  { id: 100, sender_id: 0, sender_name: 'AI Assistant', content: 'Hello! I\'m your Family Banking Fund assistant. I can help you with account questions, loan calculations, fund rules, and more. How can I help you today?', is_edited: false, created_at: '2026-03-24T16:00:00' },
];

type TabType = 'family' | 'ai';
type RoomType = 'general' | 'board';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('family');
  const [activeRoom, setActiveRoom] = useState<RoomType>('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(AI_MESSAGES);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = user?.id ?? 1;
  const currentMessages = activeTab === 'family' ? messages : aiMessages;

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMsg: ChatMessage = {
      id: Date.now(),
      sender_id: currentUserId,
      sender_name: `${user?.first_name ?? 'Marcus'} ${user?.last_name ?? 'Johnson'}`,
      content: message.trim(),
      is_edited: false,
      created_at: new Date().toISOString(),
    };

    if (activeTab === 'family') {
      setMessages(prev => [...prev, newMsg]);
    } else {
      setAiMessages(prev => [...prev, newMsg]);
      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: Date.now() + 1,
          sender_id: 0,
          sender_name: 'AI Assistant',
          content: 'I understand your question. Let me look into that for you. Based on the fund rules, I can provide you with the relevant information.',
          is_edited: false,
          created_at: new Date().toISOString(),
        };
        setAiMessages(prev => [...prev, aiReply]);
      }, 1500);
    }
    setMessage('');
  }, [message, currentUserId, activeTab, user]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === currentUserId;
    const isAI = item.sender_id === 0;
    const names = item.sender_name.split(' ');
    const initials = getInitials(names[0] || '', names[1] || '');

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && (
          <View style={[styles.msgAvatar, isAI && styles.aiAvatar]}>
            {isAI ? (
              <Bot size={16} color={Colors.accentGold} />
            ) : (
              <Text style={styles.msgAvatarText}>{initials}</Text>
            )}
          </View>
        )}
        <View style={styles.msgContent}>
          {!isOwn && (
            <Text style={styles.msgSender}>
              {item.sender_name.split(' ')[0]?.toUpperCase()} {item.sender_name.split(' ')[1]?.[0]?.toUpperCase()}.
            </Text>
          )}
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
          </View>
          <Text style={[styles.msgTime, isOwn && styles.msgTimeOwn]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  }, [currentUserId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity>
          <MoreVertical size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'family' && styles.tabActive]}
          onPress={() => setActiveTab('family')}
        >
          <Text style={[styles.tabText, activeTab === 'family' && styles.tabTextActive]}>Family Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI Assistant</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'family' && (
        <View style={styles.roomSelector}>
          <TouchableOpacity
            style={[styles.roomBtn, activeRoom === 'general' && styles.roomBtnActive]}
            onPress={() => setActiveRoom('general')}
          >
            <Text style={[styles.roomBtnText, activeRoom === 'general' && styles.roomBtnTextActive]}>GENERAL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roomBtn, activeRoom === 'board' && styles.roomBtnActive]}
            onPress={() => setActiveRoom('board')}
          >
            <Lock size={12} color={activeRoom === 'board' ? Colors.bgPrimary : Colors.textSecondary} />
            <Text style={[styles.roomBtnText, activeRoom === 'board' && styles.roomBtnTextActive]}>BOARD ONLY</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatArea}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={currentMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Paperclip size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, message.trim() && styles.sendBtnActive]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Send size={18} color={message.trim() ? Colors.bgPrimary : Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accentGold,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.accentGold,
  },
  roomSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  roomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bgTertiary,
  },
  roomBtnActive: {
    backgroundColor: Colors.accentGold,
  },
  roomBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  roomBtnTextActive: {
    color: Colors.bgPrimary,
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: '85%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 18,
  },
  aiAvatar: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  msgAvatarText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  msgContent: {
    flex: 1,
  },
  msgSender: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.accentGold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 16,
    padding: 14,
  },
  bubbleOwn: {
    backgroundColor: 'rgba(201, 168, 76, 0.25)',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.bgSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: Colors.textPrimary,
  },
  msgTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  msgTimeOwn: {
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgPrimary,
  },
  attachBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.accentGold,
  },
});
