import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Shield, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { BoardMember } from '@/types';

export default function BoardMembersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ members: BoardMember[] }>({
    queryKey: ['board-members'],
    queryFn: async () => {
      const res = await api.get('/api/board-panel/members');
      return res.data;
    },
  });

  const members = data?.members ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.members, search]);

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'soft_ban': return Colors.warning;
      case 'full_ban': case 'indefinite_ban': return Colors.danger;
      default: return Colors.textTertiary;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Members Overview', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />

      <View style={styles.searchWrap}>
        <Search size={16} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        ) : (
          filtered.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/more/board-member-detail?id=${member.id}` as never)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.is_board_member && <Shield size={12} color={Colors.accentGold} />}
                </View>
                <View style={styles.memberMeta}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                  <Text style={styles.statusText}>{member.status}</Text>
                  <Text style={styles.metaSep}>•</Text>
                  <Text style={styles.metaText}>{formatCurrency(member.total_contributed)}</Text>
                  {member.active_loans > 0 && (
                    <>
                      <Text style={styles.metaSep}>•</Text>
                      <Text style={styles.metaText}>{member.active_loans} loan{member.active_loans > 1 ? 's' : ''}</Text>
                    </>
                  )}
                </View>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  memberName: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  metaSep: { fontSize: 11, color: Colors.textTertiary },
  metaText: { fontSize: 11, color: Colors.textSecondary },
});
