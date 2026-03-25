import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeDate, getInitials } from '@/utils/formatters';
import api from '@/utils/api-client';
import { DMConversation } from '@/types';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const { data: convData, isLoading, refetch } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const res = await api.get('/api/dm/conversations');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const conversations: DMConversation[] = convData?.conversations ?? [];

  const filtered = conversations.filter((c) =>
    c.member_name.toLowerCase().includes(search.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openConversation = useCallback((memberId: number, memberName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/messages/conversation?memberId=${memberId}&memberName=${encodeURIComponent(memberName)}` as never);
  }, [router]);

  const renderConversation = useCallback(({ item }: { item: DMConversation }) => {
    const nameParts = item.member_name.split(' ');
    const initials = getInitials(nameParts[0] ?? '?', nameParts[1] ?? '?');

    return (
      <TouchableOpacity
        style={styles.convRow}
        activeOpacity={0.7}
        onPress={() => openConversation(item.member_id, item.member_name)}
      >
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initials}</Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadDot} />
          )}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, item.unread_count > 0 && styles.convNameUnread]}>
              {item.member_name}
            </Text>
            {item.last_message_at && (
              <Text style={styles.convTime}>
                {formatRelativeDate(item.last_message_at)}
              </Text>
            )}
          </View>
          <Text style={[styles.convPreview, item.unread_count > 0 && styles.convPreviewUnread]} numberOfLines={1}>
            {item.last_message ?? 'Start a conversation'}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [openConversation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/messages/contacts' as never);
          }}
        >
          <UserPlus size={20} color={Colors.accentGold} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.member_id)}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySub}>Tap the + button to start a new message</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary },
  contactsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative' as const,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  unreadDot: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accentGold,
    borderWidth: 2,
    borderColor: Colors.bgPrimary,
  },
  convInfo: { flex: 1 },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: { fontSize: 16, fontWeight: '500' as const, color: Colors.textPrimary },
  convNameUnread: { fontWeight: '700' as const },
  convTime: { fontSize: 12, color: Colors.textTertiary },
  convPreview: { fontSize: 14, color: Colors.textSecondary },
  convPreviewUnread: { color: Colors.textPrimary, fontWeight: '500' as const },
  unreadBadge: {
    backgroundColor: Colors.accentGold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
  },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary },
  emptySub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
});
