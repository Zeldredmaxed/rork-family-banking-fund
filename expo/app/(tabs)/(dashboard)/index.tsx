import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CreditCard,
  Landmark,
  AlertTriangle,
  CalendarDays,
  Clipboard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getInitials, getCreditScoreLabel } from '@/utils/formatters';
import { BUSINESS_RULES } from '@/constants/business-rules';
import api from '@/utils/api-client';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Real API Queries ───────────────────────────────────────────

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: async () => {
      const res = await api.get('/api/requests/my-requests');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const res = await api.get('/api/notifications/');
      return res.data;
    },
    enabled: !!user,
  });

  // Extract active loans from the requests response
  const activeLoans = (requestsData?.loan_applications ?? []).filter(
    (l: any) => l.status === 'active' || l.status === 'pending'
  );

  // Extract recent announcements from notifications
  const announcements = (notificationsData?.notifications ?? []).slice(0, 3);

  // Unread notification count
  const unreadCount = (notificationsData?.notifications ?? []).filter(
    (n: any) => !n.is_read
  ).length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, progressAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      refreshProfile(),
      refetchRequests(),
      refetchNotifications(),
    ]);
    setRefreshing(false);
  }, [refreshProfile, refetchRequests, refetchNotifications]);

  const totalContributed = user?.total_contributed ?? 0;
  const loanThreshold = BUSINESS_RULES.LOAN_ACCESS_THRESHOLD;
  const progressPct = Math.min(totalContributed / loanThreshold, 1);
  const creditScore = user?.credit_score ?? 0;
  const creditLabel = getCreditScoreLabel(creditScore);
  const firstName = user?.first_name ?? '';
  const lastName = user?.last_name ?? '';
  const initials = getInitials(firstName || '?', lastName || '?');

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${progressPct * 100}%`],
  });

  const quickActions = [
    { icon: CreditCard, label: 'PAY', color: Colors.accentGold },
    { icon: Landmark, label: 'LOAN', color: Colors.accentGold },
    { icon: AlertTriangle, label: 'ALERT', color: Colors.accentGold },
    { icon: CalendarDays, label: 'MEET', color: Colors.accentGold },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentGold}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.welcomeText}>
                Welcome Back, <Text style={styles.nameText}>{firstName || 'Member'}</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.bellButton}>
              <Bell size={22} color={Colors.accentGold} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>CONTRIBUTIONS</Text>
              <Text style={styles.statValue}>{formatCurrency(totalContributed)}</Text>
              <Text style={styles.statSub}>of {formatCurrency(loanThreshold)} buy-in</Text>
              <View style={styles.miniProgress}>
                <Animated.View style={[styles.miniProgressFill, { width: progressWidth }]} />
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.creditHeader}>
                <Text style={styles.statLabel}>CREDIT SCORE</Text>
                {creditScore > 0 && (
                  <View style={[styles.creditBadge, { backgroundColor: creditLabel.color }]}>
                    <Text style={styles.creditBadgeText}>{creditLabel.label}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.statValue}>{creditScore || '—'}</Text>
              <Text style={styles.statSub}>
                {user?.credit_report_date
                  ? `Last checked: ${new Date(user.credit_report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Not yet reported'}
              </Text>
            </View>
          </View>

          <View style={styles.quickActionsRow}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickAction}
                activeOpacity={0.7}
                onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <View style={styles.quickActionIcon}>
                  <action.icon size={22} color={Colors.bgPrimary} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Loans</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {activeLoans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active loans</Text>
              <Text style={styles.emptySub}>Apply for a loan from the Requests tab</Text>
            </View>
          ) : (
            activeLoans.map((loan: any) => (
              <View key={loan.id} style={styles.loanCard}>
                <View style={styles.loanHeader}>
                  <View>
                    <Text style={styles.loanTitle}>
                      {loan.purpose || `${loan.type} Loan`}
                    </Text>
                    <Text style={styles.loanSub}>
                      Status: {loan.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.loanAmountCol}>
                    <Text style={styles.loanAmount}>{formatCurrency(loan.amount)}</Text>
                    <Text style={styles.loanMonthly}>
                      {formatCurrency(loan.monthly_payment)}/MO
                    </Text>
                  </View>
                </View>
                {loan.repayment_progress != null && (
                  <>
                    <View style={styles.repaymentRow}>
                      <Text style={styles.repaymentLabel}>REPAYMENT PROGRESS</Text>
                      <Text style={styles.repaymentPct}>{loan.repayment_progress}%</Text>
                    </View>
                    <View style={styles.repaymentBar}>
                      <View
                        style={[
                          styles.repaymentFill,
                          { width: `${loan.repayment_progress ?? 0}%` as unknown as number },
                        ]}
                      />
                    </View>
                  </>
                )}
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Announcements</Text>

          {announcements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No announcements</Text>
            </View>
          ) : (
            announcements.map((a: any) => (
              <View key={a.id} style={styles.announcementCard}>
                <View style={styles.announcementIcon}>
                  <Clipboard size={20} color={Colors.accentGold} />
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{a.title}</Text>
                  <Text style={styles.announcementMsg}>{a.message}</Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.promoCard}>
            <LinearGradient
              colors={['rgba(0, 150, 136, 0.3)', 'rgba(0, 100, 120, 0.5)']}
              style={styles.promoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.promoTag}>ESTATE PLANNING</Text>
              <Text style={styles.promoTitle}>Secure Your Legacy</Text>
              <Text style={styles.promoDesc}>Explore our new generational trust structures.</Text>
            </LinearGradient>
          </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentGold,
    marginRight: 12,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  welcomeText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  nameText: {
    color: Colors.accentGold,
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
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
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  creditBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  miniProgress: {
    height: 4,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: Colors.accentGold,
    borderRadius: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.accentGold,
    letterSpacing: 0.5,
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
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  loanCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  loanSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  loanAmountCol: {
    alignItems: 'flex-end',
  },
  loanAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  loanMonthly: {
    fontSize: 12,
    color: Colors.accentGold,
    fontWeight: '500' as const,
  },
  repaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repaymentLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  repaymentPct: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  repaymentBar: {
    height: 6,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  repaymentFill: {
    height: '100%',
    backgroundColor: Colors.accentGold,
    borderRadius: 3,
  },
  announcementCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accentGold,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  announcementIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  announcementMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  promoCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
  },
  promoGradient: {
    padding: 24,
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  promoTag: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.accentGold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
