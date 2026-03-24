import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  CheckCircle,
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import api from '@/utils/api-client';

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Real API queries ─────────────────────────────────────────

  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const res = await api.get('/api/payments/history');
      return res.data;
    },
    enabled: !!user,
  });

  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: ['upcoming-payments'],
    queryFn: async () => {
      const res = await api.get('/api/payments/upcoming');
      return res.data;
    },
    enabled: !!user,
  });

  const payments = historyData?.payments ?? [];
  const totalContributed = historyData?.total_contributed ?? user?.total_contributed ?? 0;
  const upcomingPayments = upcomingData?.upcoming_payments ?? [];
  const contributionUpcoming = upcomingPayments.find((p: any) => p.type === 'contribution');
  const loanUpcoming = upcomingPayments.filter((p: any) => p.type === 'loan_payment');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      refreshProfile(),
      refetchHistory(),
      refetchUpcoming(),
    ]);
    setRefreshing(false);
  }, [refreshProfile, refetchHistory, refetchUpcoming]);

  const monthlyContribution = user?.monthly_contribution ?? 250;
  const hasAutoPay = contributionUpcoming?.auto_pay === true;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'pending':
        return <Clock size={16} color={Colors.warning} />;
      default:
        return <DollarSign size={16} color={Colors.textSecondary} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contribution':
        return 'Monthly Contribution';
      case 'loan_payment':
        return 'Loan Repayment';
      default:
        return 'Payment';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Payments</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Subscription Status Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View>
                <Text style={styles.statusLabel}>STATUS</Text>
                <View style={styles.activeBadge}>
                  <View style={[styles.activeDot, { backgroundColor: hasAutoPay ? Colors.success : Colors.warning }]} />
                  <Text style={styles.activeText}>{hasAutoPay ? 'AUTO-PAY' : 'MANUAL'}</Text>
                </View>
              </View>
              <View style={styles.amountCol}>
                <Text style={styles.amountLabel}>MONTHLY CONTRIBUTION</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(monthlyContribution)}<Text style={styles.amountUnit}>/mo</Text>
                </Text>
              </View>
            </View>

            {!hasAutoPay && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    'Setup Auto-Pay',
                    'Connect your payment method through Stripe to enable automatic monthly contributions.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <LinearGradient
                  colors={[Colors.accentGold, Colors.accentGoldDark]}
                  style={styles.autoPayButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.autoPayText}>SET UP AUTO-PAY</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Payments */}
          {loanUpcoming.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Upcoming Loan Payments</Text>
              {loanUpcoming.map((p: any, i: number) => (
                <View key={i} style={styles.upcomingCard}>
                  <View style={styles.upcomingRow}>
                    <CalendarDays size={18} color={Colors.accentGold} />
                    <View style={styles.upcomingTextCol}>
                      <Text style={styles.upcomingLabel}>
                        Due: {formatDate(p.due_date)}
                      </Text>
                      <Text style={styles.upcomingNote}>
                        Payment #{p.payment_number} · {p.remaining_payments} remaining
                      </Text>
                    </View>
                    <Text style={styles.upcomingAmount}>{formatCurrency(p.amount)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <TrendingUp size={22} color={Colors.accentGold} />
              <Text style={styles.statValue}>{formatCurrency(totalContributed)}</Text>
              <Text style={styles.statLabel}>TOTAL PAID</Text>
            </View>
            <View style={styles.statCard}>
              <CalendarDays size={22} color={Colors.accentGold} />
              <Text style={styles.statValue}>{payments.length}</Text>
              <Text style={styles.statLabel}>TRANSACTIONS</Text>
            </View>
          </View>

          {/* Payment History */}
          <Text style={styles.sectionTitle}>Payment History</Text>

          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.accentGold} />
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No payment history yet</Text>
              <Text style={styles.emptySub}>Contributions will appear here once processed</Text>
            </View>
          ) : (
            payments.map((p: any) => (
              <View key={`${p.type}-${p.id}`} style={styles.historyItem}>
                <View style={styles.historyIcon}>{getStatusIcon(p.status)}</View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{getTypeLabel(p.type)}</Text>
                  <Text style={styles.historyDate}>{formatDate(p.date)}</Text>
                </View>
                <View style={styles.historyAmountCol}>
                  <Text style={styles.historyAmount}>{formatCurrency(p.amount)}</Text>
                  <Text style={[styles.historyStatus, { color: p.status === 'completed' || p.status === 'paid' ? Colors.success : Colors.warning }]}>
                    {p.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,200,83,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.accentGold,
  },
  amountUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  autoPayButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  autoPayText: {
    fontWeight: '700',
    fontSize: 14,
    color: Colors.bgPrimary,
    letterSpacing: 1,
  },
  upcomingCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingTextCol: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  upcomingNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  upcomingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accentGold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
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
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyAmountCol: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
