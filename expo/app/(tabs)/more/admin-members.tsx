import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldCheck, ChevronDown, ChevronUp, UserMinus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { BoardMember } from '@/types';

export default function AdminMembersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ members: BoardMember[] }>({
    queryKey: ['admin-members'],
    queryFn: async () => {
      const res = await api.get('/api/admin/members');
      return res.data;
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      const res = await api.put(`/api/admin/members/${memberId}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      Alert.alert('Success', 'Role updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update role.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: number; status: string }) => {
      const res = await api.put(`/api/admin/members/${memberId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      Alert.alert('Success', 'Status updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update status.');
    },
  });

  const members = data?.members;

  const filtered = useMemo(() => {
    const list = members ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((m) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)));
  }, [members, search]);

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

  const confirmRoleChange = useCallback((member: BoardMember, role: string) => {
    const roleLabel = role === 'admin' ? 'Admin' : role === 'board_member' ? 'Board Member' : 'Member';
    Alert.alert(
      'Confirm Role Change',
      `Change ${member.name}'s role to ${roleLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => roleMutation.mutate({ memberId: member.id, role }) },
      ]
    );
  }, [roleMutation]);

  const confirmStatusChange = useCallback((member: BoardMember, status: string) => {
    Alert.alert(
      'Confirm Status Change',
      `Change ${member.name}'s status to ${status.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: status !== 'active' ? 'destructive' : 'default', onPress: () => statusMutation.mutate({ memberId: member.id, status }) },
      ]
    );
  }, [statusMutation]);

  const roleOptions = [
    { value: 'member', label: 'Regular Member', icon: UserMinus, color: Colors.textSecondary },
    { value: 'board_member', label: 'Board Member', icon: Shield, color: Colors.accentGold },
    { value: 'admin', label: 'Admin', icon: ShieldCheck, color: Colors.success },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: Colors.success },
    { value: 'soft_ban', label: 'Soft Ban', color: Colors.warning },
    { value: 'full_ban', label: 'Full Ban', color: Colors.danger },
    { value: 'indefinite_ban', label: 'Indefinite Ban', color: Colors.danger },
    { value: 'locked', label: 'Locked', color: Colors.textTertiary },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Member Management', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />

      <View style={styles.searchWrap}>
        <Search size={16} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
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
        ) : (
          filtered.map((member) => {
            const isExpanded = expandedId === member.id;
            return (
              <View key={member.id} style={styles.memberCard}>
                <TouchableOpacity
                  style={styles.memberHeader}
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(isExpanded ? null : member.id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.is_admin && <ShieldCheck size={12} color={Colors.success} />}
                      {member.is_board_member && !member.is_admin && <Shield size={12} color={Colors.accentGold} />}
                    </View>
                    {member.email && <Text style={styles.emailText}>{member.email}</Text>}
                    <View style={styles.memberMeta}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                      <Text style={styles.metaText}>{member.status}</Text>
                      <Text style={styles.metaSep}>•</Text>
                      <Text style={styles.metaText}>${member.total_contributed.toFixed(0)}</Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={18} color={Colors.textTertiary} />
                  ) : (
                    <ChevronDown size={18} color={Colors.textTertiary} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.actionRow}>
                      <Text style={styles.actionLabel}>ROLE</Text>
                      <View style={styles.actionBtns}>
                        {roleOptions.map((opt) => {
                          const isCurrentRole =
                            (opt.value === 'admin' && member.is_admin) ||
                            (opt.value === 'board_member' && member.is_board_member && !member.is_admin) ||
                            (opt.value === 'member' && !member.is_board_member && !member.is_admin);
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.roleBtn, isCurrentRole && { borderColor: opt.color, backgroundColor: `${opt.color}10` }]}
                              onPress={() => {
                                if (!isCurrentRole) {
                                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  confirmRoleChange(member, opt.value);
                                }
                              }}
                              disabled={isCurrentRole || roleMutation.isPending}
                            >
                              <opt.icon size={12} color={isCurrentRole ? opt.color : Colors.textTertiary} />
                              <Text style={[styles.roleBtnText, isCurrentRole && { color: opt.color }]}>{opt.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <Text style={styles.actionLabel}>STATUS</Text>
                      <View style={styles.statusBtns}>
                        {statusOptions.map((opt) => {
                          const isCurrent = member.status === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.statusBtn, isCurrent && { borderColor: opt.color, backgroundColor: `${opt.color}10` }]}
                              onPress={() => {
                                if (!isCurrent) {
                                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  confirmStatusChange(member, opt.value);
                                }
                              }}
                              disabled={isCurrent || statusMutation.isPending}
                            >
                              <View style={[styles.statusBtnDot, { backgroundColor: opt.color }]} />
                              <Text style={[styles.statusBtnText, isCurrent && { color: opt.color }]}>{opt.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })
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
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.textPrimary, fontSize: 15 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  memberCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  memberName: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  emailText: { fontSize: 12, color: Colors.textTertiary, marginBottom: 3 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  metaSep: { fontSize: 11, color: Colors.textTertiary },
  expandedSection: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 14, gap: 14 },
  actionRow: { gap: 8 },
  actionLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textTertiary, letterSpacing: 1 },
  actionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  roleBtnText: { fontSize: 12, fontWeight: '500' as const, color: Colors.textTertiary },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  statusBtnDot: { width: 6, height: 6, borderRadius: 3 },
  statusBtnText: { fontSize: 11, fontWeight: '500' as const, color: Colors.textTertiary },
});
