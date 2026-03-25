import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Users,
  Briefcase,
  ChevronRight,
  Megaphone,
  CalendarDays,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

interface AdminDashboardData {
  fund_health: {
    total_pool: number;
    total_loaned: number;
    outstanding_balance: number;
    available_funds: number;
  };
  members: {
    total: number;
    active: number;
    board_members: number;
  };
  loans: {
    active: number;
    pending_proposals: number;
  };
  pending_meetings: number;
  recent_payments: Array<{
    id: number;
    loan_id: number;
    amount_paid: number;
    paid_date: string;
  }>;
}

export default function AdminDashboardScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/admin/dashboard');
      return res.data;
    },
  });

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const navItems = [
    { icon: Users, label: 'Member Management', desc: 'Roles, bans & profiles', color: '#22c55e', route: '/more/admin-members' },
    { icon: Megaphone, label: 'Announcements', desc: 'Create & manage', color: Colors.accentGold, route: '/more/admin-announcements' },
    { icon: CalendarDays, label: 'Meetings', desc: 'Schedule & manage', color: '#f59e0b', route: '/more/admin-meetings' },
    { icon: Briefcase, label: 'All Loans', desc: 'Monitor fund loans', color: '#818cf8', route: '/more/admin-loans' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Admin Panel', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>FUND HEALTH</Text>
            <View style={styles.healthGrid}>
              <View style={styles.healthCard}>
                <View style={[styles.healthIconWrap, { backgroundColor: 'rgba(201,168,76,0.12)' }]}>
                  <DollarSign size={18} color={Colors.accentGold} />
                </View>
                <Text style={styles.healthValue}>{formatCurrency(data?.fund_health.total_pool ?? 0)}</Text>
                <Text style={styles.healthLabel}>Total Pool</Text>
              </View>
              <View style={styles.healthCard}>
                <View style={[styles.healthIconWrap, { backgroundColor: 'rgba(129,140,248,0.12)' }]}>
                  <TrendingUp size={18} color="#818cf8" />
                </View>
                <Text style={styles.healthValue}>{formatCurrency(data?.fund_health.total_loaned ?? 0)}</Text>
                <Text style={styles.healthLabel}>Total Loaned</Text>
              </View>
              <View style={styles.healthCard}>
                <View style={[styles.healthIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <CreditCard size={18} color={Colors.danger} />
                </View>
                <Text style={styles.healthValue}>{formatCurrency(data?.fund_health.outstanding_balance ?? 0)}</Text>
                <Text style={styles.healthLabel}>Outstanding</Text>
              </View>
              <View style={styles.healthCard}>
                <View style={[styles.healthIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Wallet size={18} color={Colors.success} />
                </View>
                <Text style={styles.healthValue}>{formatCurrency(data?.fund_health.available_funds ?? 0)}</Text>
                <Text style={styles.healthLabel}>Available</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{data?.members.total ?? 0}</Text>
                <Text style={styles.overviewLabel}>Members</Text>
                <Text style={styles.overviewSub}>{data?.members.active ?? 0} active</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{data?.loans.active ?? 0}</Text>
                <Text style={styles.overviewLabel}>Active Loans</Text>
                <Text style={styles.overviewSub}>{data?.loans.pending_proposals ?? 0} pending</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{data?.members.board_members ?? 0}</Text>
                <Text style={styles.overviewLabel}>Board</Text>
                <Text style={styles.overviewSub}>{data?.pending_meetings ?? 0} mtgs</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>MANAGE</Text>
            <View style={styles.navCard}>
              {navItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.navItem, i < navItems.length - 1 && styles.navItemBorder]}
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as never);
                  }}
                >
                  <View style={[styles.navIcon, { backgroundColor: `${item.color}15` }]}>
                    <item.icon size={18} color={item.color} />
                  </View>
                  <View style={styles.navInfo}>
                    <Text style={styles.navLabel}>{item.label}</Text>
                    <Text style={styles.navDesc}>{item.desc}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

            {data?.recent_payments && data.recent_payments.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>RECENT PAYMENTS</Text>
                {data.recent_payments.slice(0, 5).map((payment) => (
                  <View key={payment.id} style={styles.paymentRow}>
                    <View style={styles.paymentIconWrap}>
                      <DollarSign size={14} color={Colors.success} />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>{formatCurrency(payment.amount_paid)}</Text>
                      <Text style={styles.paymentMeta}>Loan #{payment.loan_id} • {formatDate(payment.paid_date)}</Text>
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
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  healthCard: { width: '47%' as unknown as number, backgroundColor: Colors.bgSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, flexGrow: 1 },
  healthIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  healthValue: { fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2 },
  healthLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 0.3 },
  overviewRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  overviewCard: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  overviewValue: { fontSize: 24, fontWeight: '800' as const, color: Colors.textPrimary },
  overviewLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: 2 },
  overviewSub: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  navCard: { backgroundColor: Colors.bgSecondary, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  navItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  navIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  navInfo: { flex: 1 },
  navLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  navDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  paymentIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentAmount: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  paymentMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
