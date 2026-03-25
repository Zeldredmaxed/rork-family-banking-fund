import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { History, CheckCircle, XCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

interface HistoryProposal {
  loan_id: number;
  applicant_name: string;
  amount: number;
  interest_rate: number;
  interest_tier: number;
  term_months: number;
  loan_type: string;
  collateral: string;
  submitted_at: string;
  status: string;
  votes: {
    total_cast: number;
    total_required: number;
    approvals: number;
    denials: number;
    abstentions: number;
    remaining: number;
  };
}

export default function BoardHistoryScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<{ proposals: HistoryProposal[] }>({
    queryKey: ['board-history'],
    queryFn: async () => {
      const res = await api.get('/api/board-panel/proposals/history');
      return res.data;
    },
  });

  const proposals = data?.proposals ?? [];

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Vote History', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : proposals.length === 0 ? (
          <View style={styles.emptyState}>
            <History size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No past proposals</Text>
          </View>
        ) : (
          proposals.map((proposal) => {
            const isApproved = proposal.status === 'approved' || proposal.status === 'active' || proposal.status === 'paid_off';
            return (
              <View key={proposal.loan_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.applicantName}>{proposal.applicant_name}</Text>
                    <Text style={styles.dateText}>{formatDate(proposal.submitted_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isApproved ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                    {isApproved ? (
                      <CheckCircle size={14} color={Colors.success} />
                    ) : (
                      <XCircle size={14} color={Colors.danger} />
                    )}
                    <Text style={[styles.statusText, { color: isApproved ? Colors.success : Colors.danger }]}>
                      {isApproved ? 'Approved' : 'Denied'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Amount</Text>
                    <Text style={styles.statValue}>{formatCurrency(proposal.amount)}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Term</Text>
                    <Text style={styles.statValue}>{proposal.term_months} months</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Rate</Text>
                    <Text style={styles.statValue}>Tier {proposal.interest_tier} ({proposal.interest_rate}%)</Text>
                  </View>
                </View>
                <View style={styles.tallyRow}>
                  <View style={styles.tallyItem}>
                    <View style={[styles.tallyDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.tallyText}>{proposal.votes.approvals} approve</Text>
                  </View>
                  <View style={styles.tallyItem}>
                    <View style={[styles.tallyDot, { backgroundColor: Colors.danger }]} />
                    <Text style={styles.tallyText}>{proposal.votes.denials} deny</Text>
                  </View>
                  <View style={styles.tallyItem}>
                    <View style={[styles.tallyDot, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.tallyText}>{proposal.votes.abstentions} abstain</Text>
                  </View>
                </View>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  applicantName: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2 },
  dateText: { fontSize: 12, color: Colors.textTertiary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' as const },
  cardBody: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginBottom: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statLabel: { fontSize: 13, color: Colors.textSecondary },
  statValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' as const },
  tallyRow: { flexDirection: 'row', gap: 14 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyDot: { width: 8, height: 8, borderRadius: 4 },
  tallyText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
});
