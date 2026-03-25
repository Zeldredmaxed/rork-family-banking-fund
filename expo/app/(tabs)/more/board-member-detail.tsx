import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, CreditCard, AlertTriangle, Shield, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

interface MemberDetail {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string | null;
  status: string;
  is_board_member: boolean;
  credit_score: number | null;
  monthly_contribution: number;
  total_contributed: number;
  loan_access_unlocked: boolean;
  strike_count: number;
  active_loans: number;
  join_date: string | null;
  loans?: Array<{
    id: number;
    amount: number;
    status: string;
    monthly_payment: number;
    remaining_balance: number;
  }>;
  recent_contributions?: Array<{
    amount: number;
    date: string;
    status: string;
  }>;
}

export default function BoardMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery<MemberDetail>({
    queryKey: ['board-member-detail', id],
    queryFn: async () => {
      const res = await api.get(`/api/board-panel/members/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'soft_ban': return Colors.warning;
      default: return Colors.danger;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Member Detail', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading || !data ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.profileSection}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{getInitials(data.name)}</Text>
              </View>
              <Text style={styles.name}>{data.name}</Text>
              <View style={styles.badges}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(data.status)}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(data.status) }]} />
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(data.status) }]}>{data.status}</Text>
                </View>
                {data.is_board_member && (
                  <View style={styles.boardBadge}>
                    <Shield size={12} color={Colors.accentGold} />
                    <Text style={styles.boardBadgeText}>Board</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.sectionLabel}>FINANCIAL OVERVIEW</Text>
            <View style={styles.statsGrid}>
              {[
                { icon: DollarSign, label: 'Total Contributed', value: formatCurrency(data.total_contributed), color: Colors.accentGold },
                { icon: CreditCard, label: 'Monthly', value: formatCurrency(data.monthly_contribution), color: '#818cf8' },
                { icon: TrendingUp, label: 'Credit Score', value: data.credit_score?.toString() ?? 'N/A', color: Colors.success },
                { icon: AlertTriangle, label: 'Strikes', value: data.strike_count.toString(), color: data.strike_count > 0 ? Colors.danger : Colors.success },
              ].map((stat, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}15` }]}>
                    <stat.icon size={16} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Loan Access</Text>
                <Text style={[styles.infoValue, { color: data.loan_access_unlocked ? Colors.success : Colors.warning }]}>
                  {data.loan_access_unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Active Loans</Text>
                <Text style={styles.infoValue}>{data.active_loans}</Text>
              </View>
              {data.join_date && (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>{new Date(data.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
                </View>
              )}
            </View>

            {data.loans && data.loans.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ACTIVE LOANS</Text>
                {data.loans.map((loan) => (
                  <View key={loan.id} style={styles.loanCard}>
                    <View style={styles.loanHeader}>
                      <Text style={styles.loanAmount}>{formatCurrency(loan.amount)}</Text>
                      <View style={[styles.loanStatusBadge, { backgroundColor: loan.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(201,168,76,0.12)' }]}>
                        <Text style={[styles.loanStatusText, { color: loan.status === 'active' ? Colors.success : Colors.accentGold }]}>{loan.status}</Text>
                      </View>
                    </View>
                    <View style={styles.loanMeta}>
                      <Text style={styles.loanMetaText}>Payment: {formatCurrency(loan.monthly_payment)}/mo</Text>
                      <Text style={styles.loanMetaText}>Balance: {formatCurrency(loan.remaining_balance)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.accentGold, marginBottom: 12 },
  avatarLargeText: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary },
  name: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' as const },
  boardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  boardBadgeText: { fontSize: 12, fontWeight: '600' as const, color: Colors.accentGold },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%' as unknown as number, backgroundColor: Colors.bgSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, flexGrow: 1 },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  infoCard: { backgroundColor: Colors.bgSecondary, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  loanCard: { backgroundColor: Colors.bgSecondary, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  loanAmount: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary },
  loanStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  loanStatusText: { fontSize: 11, fontWeight: '600' as const },
  loanMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  loanMetaText: { fontSize: 12, color: Colors.textSecondary },
});
