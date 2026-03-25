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
  Vote,
  FileText,
  Users,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Wallet,
  Briefcase,
  ChevronRight,
  History,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

interface BoardDashboardData {
  action_items: {
    pending_votes: number;
    pending_proposals: number;
    pending_meetings: number;
  };
  fund_metrics: {
    total_pool: number;
    outstanding_loans: number;
    available_funds: number;
    active_loans: number;
    total_members: number;
    total_board: number;
  };
}

export default function BoardDashboardScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<BoardDashboardData>({
    queryKey: ['board-dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/board-panel/dashboard');
      return res.data;
    },
  });

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const actionItems = [
    {
      icon: Vote,
      label: 'Pending Votes',
      count: data?.action_items.pending_votes ?? 0,
      color: Colors.accentGold,
      route: '/more/board-proposals',
    },
    {
      icon: FileText,
      label: 'Pending Proposals',
      count: data?.action_items.pending_proposals ?? 0,
      color: '#818cf8',
      route: '/more/board-proposals',
    },
    {
      icon: CalendarDays,
      label: 'Pending Meetings',
      count: data?.action_items.pending_meetings ?? 0,
      color: '#f59e0b',
      route: '/more/board-meetings',
    },
  ];

  const navItems = [
    { icon: Vote, label: 'Proposals & Voting', desc: 'Review and cast votes', color: Colors.accentGold, route: '/more/board-proposals' },
    { icon: History, label: 'Vote History', desc: 'Past decisions', color: '#818cf8', route: '/more/board-history' },
    { icon: Users, label: 'Members Overview', desc: 'View member profiles', color: '#22c55e', route: '/more/board-members' },
    { icon: CalendarDays, label: 'Meeting Requests', desc: 'Schedule & manage', color: '#f59e0b', route: '/more/board-meetings' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Board Portal', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>ACTION ITEMS</Text>
            <View style={styles.actionRow}>
              {actionItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as never);
                  }}
                >
                  <View style={[styles.actionBadge, { backgroundColor: `${item.color}20` }]}>
                    <Text style={[styles.actionCount, { color: item.color }]}>{item.count}</Text>
                  </View>
                  <item.icon size={16} color={item.color} />
                  <Text style={styles.actionLabel} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>FUND METRICS</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(201,168,76,0.12)' }]}>
                  <DollarSign size={18} color={Colors.accentGold} />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(data?.fund_metrics.total_pool ?? 0)}</Text>
                <Text style={styles.metricLabel}>Total Pool</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <TrendingUp size={18} color={Colors.danger} />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(data?.fund_metrics.outstanding_loans ?? 0)}</Text>
                <Text style={styles.metricLabel}>Outstanding</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Wallet size={18} color={Colors.success} />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(data?.fund_metrics.available_funds ?? 0)}</Text>
                <Text style={styles.metricLabel}>Available</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(129,140,248,0.12)' }]}>
                  <Briefcase size={18} color="#818cf8" />
                </View>
                <Text style={styles.metricValue}>{data?.fund_metrics.active_loans ?? 0}</Text>
                <Text style={styles.metricLabel}>Active Loans</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Users size={18} color="#f59e0b" />
                </View>
                <Text style={styles.metricValue}>{data?.fund_metrics.total_members ?? 0}</Text>
                <Text style={styles.metricLabel}>Members</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(201,168,76,0.12)' }]}>
                  <Users size={18} color={Colors.accentGold} />
                </View>
                <Text style={styles.metricValue}>{data?.fund_metrics.total_board ?? 0}</Text>
                <Text style={styles.metricLabel}>Board</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>NAVIGATION</Text>
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
          </>
        )}
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
    paddingBottom: 40,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  actionBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionCount: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    width: '31%' as unknown as number,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexGrow: 1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  navCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  navItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navInfo: {
    flex: 1,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  navDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
