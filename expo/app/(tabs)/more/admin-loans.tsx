import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, DollarSign, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { AdminLoan } from '@/types';

const STATUSES = ['all', 'pending', 'approved', 'active', 'paid_off', 'defaulted', 'denied'] as const;

export default function AdminLoansScreen() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ loans: AdminLoan[] }>({
    queryKey: ['admin-loans', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?loan_status=${statusFilter}` : '';
      const res = await api.get(`/api/admin/loans${params}`);
      return res.data;
    },
  });

  const loans = data?.loans ?? [];

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'approved': return '#22c55e';
      case 'pending': return Colors.accentGold;
      case 'paid_off': return '#818cf8';
      case 'defaulted': return Colors.danger;
      case 'denied': return Colors.danger;
      default: return Colors.textTertiary;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'All Loans', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive,
            ]}>
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : loans.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No loans found</Text>
          </View>
        ) : (
          loans.map((loan) => (
            <View key={loan.id} style={styles.loanCard}>
              <View style={styles.loanHeader}>
                <View style={styles.loanHeaderLeft}>
                  <Text style={styles.loanMember}>{loan.member_name}</Text>
                  <Text style={styles.loanType}>{loan.loan_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(loan.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                    {loan.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.loanStats}>
                <View style={styles.loanStat}>
                  <DollarSign size={12} color={Colors.textSecondary} />
                  <Text style={styles.loanStatLabel}>Amount</Text>
                  <Text style={styles.loanStatValue}>{formatCurrency(loan.amount)}</Text>
                </View>
                <View style={styles.loanStat}>
                  <Clock size={12} color={Colors.textSecondary} />
                  <Text style={styles.loanStatLabel}>Term</Text>
                  <Text style={styles.loanStatValue}>{loan.term_months}mo</Text>
                </View>
                <View style={styles.loanStat}>
                  <Text style={styles.loanStatLabel}>Rate</Text>
                  <Text style={styles.loanStatValue}>{loan.interest_rate}%</Text>
                </View>
              </View>

              <View style={styles.loanFooter}>
                <Text style={styles.loanFooterText}>
                  {formatCurrency(loan.monthly_payment)}/mo • Balance: {formatCurrency(loan.remaining_balance)}
                </Text>
                <Text style={styles.loanDate}>{formatDate(loan.submitted)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  filterScroll: { maxHeight: 50 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { borderColor: Colors.accentGold, backgroundColor: 'rgba(201,168,76,0.12)' },
  filterChipText: { fontSize: 12, fontWeight: '500' as const, color: Colors.textSecondary, textTransform: 'capitalize' as const },
  filterChipTextActive: { color: Colors.accentGold },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  loanCard: { backgroundColor: Colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  loanHeaderLeft: { flex: 1 },
  loanMember: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2 },
  loanType: { fontSize: 11, color: Colors.textTertiary, textTransform: 'capitalize' as const },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  loanStats: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  loanStat: { flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: Colors.bgTertiary, borderRadius: 8, padding: 10, gap: 2 },
  loanStatLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '500' as const },
  loanStatValue: { fontSize: 14, fontWeight: '700' as const, color: Colors.textPrimary },
  loanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loanFooterText: { fontSize: 12, color: Colors.textSecondary },
  loanDate: { fontSize: 11, color: Colors.textTertiary },
});
