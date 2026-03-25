import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { BoardProposal } from '@/types';

export default function BoardProposalsScreen() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [voteModal, setVoteModal] = useState<{ loanId: number; decision: string } | null>(null);
  const [voteNotes, setVoteNotes] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ proposals: BoardProposal[]; total: number }>({
    queryKey: ['board-proposals'],
    queryFn: async () => {
      const res = await api.get('/api/board-panel/proposals');
      return res.data;
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ loanId, decision, notes }: { loanId: number; decision: string; notes: string }) => {
      const res = await api.post(`/api/board-panel/proposals/${loanId}/vote`, { decision, notes });
      return res.data;
    },
    onSuccess: (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['board-proposals'] });
      void queryClient.invalidateQueries({ queryKey: ['board-dashboard'] });
      setVoteModal(null);
      setVoteNotes('');
      const msg = result.resolution
        ? `Vote recorded. Loan ${result.loan_status}: ${result.resolution}`
        : result.message ?? 'Your vote has been recorded anonymously';
      Alert.alert('Vote Submitted', msg);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Failed to submit vote.';
      Alert.alert('Error', detail);
    },
  });

  const confirmVote = useCallback(() => {
    if (!voteModal) return;
    voteMutation.mutate({ loanId: voteModal.loanId, decision: voteModal.decision, notes: voteNotes });
  }, [voteModal, voteNotes, voteMutation]);

  const proposals = data?.proposals ?? [];

  const getDecisionLabel = (decision: string | null) => {
    switch (decision) {
      case 'approve': return 'Approve';
      case 'deny': return 'Deny';
      case 'abstain': return 'Abstain';
      default: return '';
    }
  };

  const getDecisionColor = (decision: string | null) => {
    switch (decision) {
      case 'approve': return Colors.success;
      case 'deny': return Colors.danger;
      case 'abstain': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Proposals & Voting', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : proposals.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No pending proposals</Text>
            <Text style={styles.emptySubtext}>All caught up!</Text>
          </View>
        ) : (
          proposals.map((proposal) => {
            const isExpanded = expandedId === proposal.loan_id;
            const votePct = proposal.votes.total_required > 0
              ? (proposal.votes.total_cast / proposal.votes.total_required) * 100
              : 0;

            return (
              <TouchableOpacity
                key={proposal.loan_id}
                style={styles.proposalCard}
                activeOpacity={0.8}
                onPress={() => setExpandedId(isExpanded ? null : proposal.loan_id)}
              >
                <View style={styles.proposalHeader}>
                  <View style={styles.proposalHeaderLeft}>
                    <Text style={styles.applicantName}>{proposal.applicant_name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {proposal.loan_type === 'emergency' ? '🚨 Emergency' : '🏦 Standard'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountText}>{formatCurrency(proposal.amount)}</Text>
                    {isExpanded ? (
                      <ChevronUp size={16} color={Colors.textTertiary} />
                    ) : (
                      <ChevronDown size={16} color={Colors.textTertiary} />
                    )}
                  </View>
                </View>

                <View style={styles.quickInfo}>
                  <View style={styles.infoChip}>
                    <Clock size={12} color={Colors.textSecondary} />
                    <Text style={styles.infoChipText}>{proposal.term_months}mo</Text>
                  </View>
                  <View style={styles.infoChip}>
                    <DollarSign size={12} color={Colors.textSecondary} />
                    <Text style={styles.infoChipText}>{formatCurrency(proposal.monthly_payment)}/mo</Text>
                  </View>
                  <View style={styles.infoChip}>
                    <Text style={styles.infoChipText}>Tier {proposal.interest_tier} ({proposal.interest_rate}%)</Text>
                  </View>
                </View>

                {proposal.unanimous_required && (
                  <View style={styles.unanimousBanner}>
                    <AlertTriangle size={14} color={Colors.warning} />
                    <Text style={styles.unanimousText}>Requires Unanimous Approval</Text>
                  </View>
                )}

                <View style={styles.voteProgress}>
                  <View style={styles.voteProgressHeader}>
                    <Text style={styles.voteProgressLabel}>
                      {proposal.votes.total_cast}/{proposal.votes.total_required} votes cast
                    </Text>
                    <Text style={styles.voteProgressRemaining}>
                      {proposal.votes.remaining} remaining
                    </Text>
                  </View>
                  <View style={styles.voteBar}>
                    <View style={[styles.voteBarFill, { width: `${Math.min(votePct, 100)}%` }]} />
                  </View>
                  <View style={styles.voteTally}>
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

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {proposal.collateral ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Collateral</Text>
                        <Text style={styles.detailValue}>{proposal.collateral}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submitted</Text>
                      <Text style={styles.detailValue}>{formatDate(proposal.submitted_at)}</Text>
                    </View>
                  </View>
                )}

                {proposal.my_vote.has_voted ? (
                  <View style={[styles.votedChip, { backgroundColor: `${getDecisionColor(proposal.my_vote.decision)}15` }]}>
                    <Text style={[styles.votedChipText, { color: getDecisionColor(proposal.my_vote.decision) }]}>
                      You voted: {getDecisionLabel(proposal.my_vote.decision)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.voteActions}>
                    <TouchableOpacity
                      style={[styles.voteBtn, styles.approveBtn]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setVoteModal({ loanId: proposal.loan_id, decision: 'approve' });
                      }}
                    >
                      <CheckCircle size={16} color={Colors.success} />
                      <Text style={[styles.voteBtnText, { color: Colors.success }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteBtn, styles.denyBtn]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setVoteModal({ loanId: proposal.loan_id, decision: 'deny' });
                      }}
                    >
                      <XCircle size={16} color={Colors.danger} />
                      <Text style={[styles.voteBtnText, { color: Colors.danger }]}>Deny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteBtn, styles.abstainBtn]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setVoteModal({ loanId: proposal.loan_id, decision: 'abstain' });
                      }}
                    >
                      <PauseCircle size={16} color={Colors.warning} />
                      <Text style={[styles.voteBtnText, { color: Colors.warning }]}>Abstain</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={voteModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Confirm {voteModal?.decision === 'approve' ? 'Approval' : voteModal?.decision === 'deny' ? 'Denial' : 'Abstention'}
              </Text>
              <TouchableOpacity onPress={() => { setVoteModal(null); setVoteNotes(''); }}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>Your vote is anonymous. Only aggregate counts are visible to others.</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Private notes (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={voteNotes}
              onChangeText={setVoteNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setVoteModal(null); setVoteNotes(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: getDecisionColor(voteModal?.decision ?? null) }]}
                onPress={confirmVote}
                disabled={voteMutation.isPending}
              >
                {voteMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Submit Vote</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary },
  proposalCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  proposalHeaderLeft: { flex: 1 },
  applicantName: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 4 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: Colors.bgTertiary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary },
  amountWrap: { alignItems: 'flex-end', gap: 4 },
  amountText: { fontSize: 18, fontWeight: '800' as const, color: Colors.accentGold },
  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bgTertiary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  infoChipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  unanimousBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 10, marginBottom: 12 },
  unanimousText: { fontSize: 12, fontWeight: '600' as const, color: Colors.warning },
  voteProgress: { marginBottom: 14 },
  voteProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  voteProgressLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  voteProgressRemaining: { fontSize: 11, color: Colors.textTertiary },
  voteBar: { height: 6, backgroundColor: Colors.bgTertiary, borderRadius: 3, overflow: 'hidden' },
  voteBarFill: { height: '100%', backgroundColor: Colors.accentGold, borderRadius: 3 },
  voteTally: { flexDirection: 'row', gap: 14, marginTop: 8 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyDot: { width: 8, height: 8, borderRadius: 4 },
  tallyText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' as const },
  expandedSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: Colors.textSecondary },
  detailValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' as const },
  votedChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  votedChipText: { fontSize: 13, fontWeight: '600' as const },
  voteActions: { flexDirection: 'row', gap: 8 },
  voteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  approveBtn: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' },
  denyBtn: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  abstainBtn: { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.08)' },
  voteBtnText: { fontSize: 12, fontWeight: '600' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  modalSubtext: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  notesInput: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.bgTertiary, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
});
