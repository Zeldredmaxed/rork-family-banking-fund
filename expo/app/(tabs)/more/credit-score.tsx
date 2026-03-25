import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Clock, Upload } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/formatters';
import api from '@/utils/api-client';
import { CreditHistoryItem } from '@/types';

function CreditGauge({ score }: { score: number | null }) {
  const min = 300;
  const max = 850;
  const safeScore = score ?? 0;
  const pct = Math.max(0, Math.min(1, (safeScore - min) / (max - min)));

  const getColor = () => {
    if (!score) return Colors.textTertiary;
    if (score >= 750) return '#22c55e';
    if (score >= 700) return '#4ade80';
    if (score >= 650) return '#f59e0b';
    if (score >= 600) return '#f97316';
    return '#ef4444';
  };

  const getLabel = () => {
    if (!score) return 'N/A';
    if (score >= 750) return 'EXCELLENT';
    if (score >= 700) return 'GOOD';
    if (score >= 650) return 'FAIR';
    if (score >= 600) return 'POOR';
    return 'VERY POOR';
  };

  const color = getColor();

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.trackBg}>
        <View style={[gaugeStyles.trackFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <View style={gaugeStyles.labelsRow}>
        <Text style={gaugeStyles.rangeLabel}>300</Text>
        <Text style={gaugeStyles.rangeLabel}>850</Text>
      </View>
      <Text style={[gaugeStyles.scoreValue, { color }]}>{score ?? '—'}</Text>
      <View style={[gaugeStyles.labelBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[gaugeStyles.labelText, { color }]}>{getLabel()}</Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 16 },
  trackBg: {
    width: '100%',
    height: 10,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 5 },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  rangeLabel: { fontSize: 11, color: Colors.textTertiary },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800' as const,
    marginTop: 12,
  },
  labelBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 6,
  },
  labelText: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1 },
});

export default function CreditScoreScreen() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { data: scoreData, refetch: refetchScore } = useQuery({
    queryKey: ['credit-score'],
    queryFn: async () => {
      const res = await api.get('/api/credit/my-score');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['credit-history'],
    queryFn: async () => {
      const res = await api.get('/api/credit/history');
      return res.data;
    },
    enabled: !!user,
  });

  const currentScore = scoreData?.score ?? user?.credit_score ?? null;
  const lastUpdated = scoreData?.last_updated ?? user?.credit_report_date ?? null;
  const history: CreditHistoryItem[] = historyData?.history ?? [];

  const reportMutation = useMutation({
    mutationFn: async (data: { score: number; proof_url: string; notes: string }) => {
      const res = await api.post('/api/credit/self-report', data);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Score Reported', 'Your credit score has been submitted for review.');
      setShowReport(false);
      setScoreInput('');
      setProofUrl('');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['credit-score'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-history'] });
      void refreshProfile();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Failed to report score.';
      Alert.alert('Error', detail);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchScore(), refetchHistory()]);
    setRefreshing(false);
  }, [refetchScore, refetchHistory]);

  const handleSubmitReport = useCallback(() => {
    const score = parseInt(scoreInput, 10);
    if (!score || score < 300 || score > 850) {
      Alert.alert('Invalid Score', 'Please enter a score between 300 and 850.');
      return;
    }
    reportMutation.mutate({ score, proof_url: proofUrl.trim(), notes: notes.trim() });
  }, [scoreInput, proofUrl, notes, reportMutation]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Credit Score', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />}
      >
        <View style={styles.gaugeCard}>
          <CreditGauge score={currentScore} />
          {lastUpdated && (
            <View style={styles.lastUpdatedRow}>
              <Clock size={14} color={Colors.textTertiary} />
              <Text style={styles.lastUpdatedText}>Last updated: {formatDate(lastUpdated)}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.updateBtn}
          activeOpacity={0.8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowReport(!showReport);
          }}
        >
          <LinearGradient
            colors={[Colors.accentGold, Colors.accentGoldDark]}
            style={styles.updateBtnGradient}
          >
            <Upload size={18} color={Colors.bgPrimary} />
            <Text style={styles.updateBtnText}>UPDATE SCORE</Text>
          </LinearGradient>
        </TouchableOpacity>

        {showReport && (
          <View style={styles.reportCard}>
            <Text style={styles.fieldLabel}>CREDIT SCORE (300-850)</Text>
            <TextInput
              style={styles.textInput}
              value={scoreInput}
              onChangeText={setScoreInput}
              keyboardType="numeric"
              placeholder="e.g. 720"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>PROOF URL (screenshot link)</Text>
            <TextInput
              style={styles.textInput}
              value={proofUrl}
              onChangeText={setProofUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>NOTES (optional)</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional context..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitReport}
              disabled={reportMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.submitBtn}
              >
                {reportMutation.isPending ? (
                  <ActivityIndicator color={Colors.bgPrimary} />
                ) : (
                  <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Score History</Text>

        {historyLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No score history yet</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <TrendingUp size={16} color={Colors.accentGold} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyScore}>{item.score}</Text>
                <Text style={styles.historyDate}>{formatDate(item.reported_at)}</Text>
              </View>
              <View style={styles.historySourceBadge}>
                <Text style={styles.historySourceText}>{item.source?.toUpperCase() ?? 'SELF'}</Text>
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
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  gaugeCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    marginBottom: 16,
  },
  lastUpdatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  lastUpdatedText: { fontSize: 12, color: Colors.textTertiary },
  updateBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  updateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  updateBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.bgPrimary, letterSpacing: 1 },
  reportCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.bgPrimary, letterSpacing: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfo: { flex: 1 },
  historyScore: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  historyDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historySourceBadge: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historySourceText: { fontSize: 10, fontWeight: '700' as const, color: Colors.accentGold, letterSpacing: 0.5 },
});
