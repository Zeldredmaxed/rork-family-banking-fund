import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  CheckCircle,
  TrendingUp,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PaymentHistoryItem } from '@/types';

const MOCK_HISTORY: PaymentHistoryItem[] = [
  { id: 1, type: 'contribution', amount: 250, date: '2026-03-01', status: 'completed', notes: 'Monthly Contribution' },
  { id: 2, type: 'contribution', amount: 250, date: '2026-02-01', status: 'completed', notes: 'Monthly Contribution' },
  { id: 3, type: 'contribution', amount: 250, date: '2026-01-01', status: 'completed', notes: 'Monthly Contribution' },
  { id: 4, type: 'contribution', amount: 250, date: '2025-12-01', status: 'completed', notes: 'Monthly Contribution' },
];

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const monthlyContribution = user?.monthly_contribution ?? 250;
  const totalPaid = user?.total_contributed ?? 4800;
  const remaining = 12000 - totalPaid;

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
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View>
                <Text style={styles.statusLabel}>STATUS</Text>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>ACTIVE</Text>
                </View>
              </View>
              <View style={styles.amountCol}>
                <Text style={styles.amountLabel}>MONTHLY CONTRIBUTION</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(monthlyContribution)}<Text style={styles.amountUnit}>/mo</Text>
                </Text>
              </View>
            </View>

            <View style={styles.nextPaymentRow}>
              <CalendarDays size={18} color={Colors.accentGold} />
              <View style={styles.nextPaymentText}>
                <Text style={styles.nextPaymentLabel}>NEXT PAYMENT</Text>
                <Text style={styles.nextPaymentDate}>April 1, 2026</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.autoPayButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.autoPayText}>MANAGE AUTO-PAY</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL PAID</Text>
              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
                <TrendingUp size={14} color={Colors.success} />
              </View>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>REMAINING</Text>
              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryValue}>{formatCurrency(remaining)}</Text>
                <Clock size={14} color={Colors.accentGold} />
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {MOCK_HISTORY.map((payment) => (
            <View key={payment.id} style={styles.paymentItem}>
              <View style={styles.paymentIcon}>
                <CheckCircle size={20} color={Colors.success} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>{payment.notes || 'Monthly Contribution'}</Text>
                <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
            </View>
          ))}
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
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  amountUnit: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  nextPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.glassBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextPaymentText: {
    flex: 1,
  },
  nextPaymentLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  nextPaymentDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  autoPayButton: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoPayText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
    letterSpacing: 1.2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.accentGold,
    letterSpacing: 0.5,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  paymentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
});
