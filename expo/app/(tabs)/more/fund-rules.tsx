import React, { useState, useCallback } from 'react';
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
import { ChevronDown, ChevronUp, Shield, AlertTriangle, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { BUSINESS_RULES } from '@/constants/business-rules';
import api from '@/utils/api-client';

export default function FundRulesScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('contribution');

  const { isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['fund-rules'],
    queryFn: async () => {
      const res = await api.get('/api/rules/');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: standingData, refetch: refetchStanding } = useQuery({
    queryKey: ['my-standing'],
    queryFn: async () => {
      const res = await api.get('/api/rules/my-standing');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: tierData } = useQuery({
    queryKey: ['interest-tier'],
    queryFn: async () => {
      const res = await api.get('/api/rules/interest-tier');
      return res.data;
    },
    enabled: !!user,
  });

  const standing = standingData;
  const currentTier = tierData?.tier ?? (user?.credit_score && user.credit_score >= 750 ? 1 : user?.credit_score && user.credit_score >= 620 ? 2 : 3);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRules(), refetchStanding()]);
    setRefreshing(false);
  }, [refetchRules, refetchStanding]);

  const toggleSection = useCallback((section: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSection(expandedSection === section ? null : section);
  }, [expandedSection]);

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return Colors.accentGold;
      case 2: return '#94a3b8';
      case 3: return '#78716c';
      default: return Colors.textSecondary;
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return 'GOLD';
      case 2: return 'SILVER';
      case 3: return 'STANDARD';
      default: return 'N/A';
    }
  };

  const strikeCount = standing?.strike_count ?? user?.strike_count ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Fund Rules', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />}
      >
        <View style={styles.standingCard}>
          <Text style={styles.standingTitle}>MY STANDING</Text>
          <View style={styles.standingRow}>
            <View style={styles.standingItem}>
              <View style={[styles.tierBadge, { backgroundColor: `${getTierColor(currentTier)}20` }]}>
                <Award size={16} color={getTierColor(currentTier)} />
                <Text style={[styles.tierBadgeText, { color: getTierColor(currentTier) }]}>
                  TIER {currentTier} · {getTierLabel(currentTier)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.standingStatsRow}>
            <View style={styles.standingStat}>
              <Text style={styles.standingStatValue}>
                {standing?.interest_rate ?? BUSINESS_RULES.INTEREST_TIERS[currentTier - 1]?.rate ?? 10}%
              </Text>
              <Text style={styles.standingStatLabel}>INTEREST</Text>
            </View>
            <View style={styles.standingDivider} />
            <View style={styles.standingStat}>
              <Text style={styles.standingStatValue}>{strikeCount}/3</Text>
              <Text style={styles.standingStatLabel}>STRIKES</Text>
            </View>
            <View style={styles.standingDivider} />
            <View style={styles.standingStat}>
              <Text style={[styles.standingStatValue, { color: standing?.loan_eligible !== false ? Colors.success : Colors.danger }]}>
                {standing?.loan_eligible !== false ? 'YES' : 'NO'}
              </Text>
              <Text style={styles.standingStatLabel}>ELIGIBLE</Text>
            </View>
          </View>

          <View style={styles.strikeVisual}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.strikeItem}>
                {s <= strikeCount ? (
                  <View style={[styles.strikeDot, styles.strikeDotActive]}>
                    <AlertTriangle size={10} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.strikeDot}>
                    <Shield size={10} color={Colors.textTertiary} />
                  </View>
                )}
                <Text style={[styles.strikeLabel, s <= strikeCount && styles.strikeLabelActive]}>
                  {s === 1 ? 'Soft' : s === 2 ? 'Full' : 'Indef.'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {rulesLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 20 }} />
        ) : (
          <>
            <AccordionSection
              title="Contribution Rules"
              section="contribution"
              expanded={expandedSection === 'contribution'}
              onToggle={toggleSection}
            >
              <RuleRow label="Minimum Monthly" value={formatCurrency(BUSINESS_RULES.MIN_MONTHLY_CONTRIBUTION)} />
              <RuleRow label="Loan Access Threshold" value={formatCurrency(BUSINESS_RULES.LOAN_ACCESS_THRESHOLD)} />
              <RuleRow label="Max Contribution Changes" value={`${BUSINESS_RULES.MAX_CONTRIBUTION_CHANGES} (lifetime)`} />
              <RuleRow label="Emergency Fund Uses" value={`${BUSINESS_RULES.MAX_EMERGENCY_FUND_USES} (lifetime)`} last />
            </AccordionSection>

            <AccordionSection
              title="Interest Tiers"
              section="tiers"
              expanded={expandedSection === 'tiers'}
              onToggle={toggleSection}
            >
              {BUSINESS_RULES.INTEREST_TIERS.map((tier, i) => (
                <View key={i} style={[styles.tierRow, i < BUSINESS_RULES.INTEREST_TIERS.length - 1 && styles.ruleRowBorder]}>
                  <View style={[styles.tierIndicator, { backgroundColor: getTierColor(tier.tier) }]} />
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>Tier {tier.tier} — {tier.rate}%</Text>
                    <Text style={styles.tierDesc}>{tier.description}</Text>
                  </View>
                  {currentTier === tier.tier && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  )}
                </View>
              ))}
            </AccordionSection>

            <AccordionSection
              title="Strike Policy"
              section="strikes"
              expanded={expandedSection === 'strikes'}
              onToggle={toggleSection}
            >
              {BUSINESS_RULES.STRIKES.map((strike, i) => (
                <View key={i} style={[styles.ruleRow, i < BUSINESS_RULES.STRIKES.length - 1 && styles.ruleRowBorder]}>
                  <View>
                    <Text style={styles.ruleLabel}>Strike {strike.count}: {strike.label}</Text>
                    <Text style={styles.ruleDesc}>{strike.description}</Text>
                  </View>
                </View>
              ))}
            </AccordionSection>

            <AccordionSection
              title="Collateral Requirements"
              section="collateral"
              expanded={expandedSection === 'collateral'}
              onToggle={toggleSection}
            >
              <RuleRow label="Minimum Coverage" value={`${BUSINESS_RULES.MIN_COLLATERAL_COVERAGE * 100}%`} last />
            </AccordionSection>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AccordionSection({
  title,
  section,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  section: string;
  expanded: boolean;
  onToggle: (s: string) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity style={styles.accordionHeader} activeOpacity={0.7} onPress={() => onToggle(section)}>
        <Text style={styles.accordionTitle}>{title}</Text>
        {expanded ? (
          <ChevronUp size={20} color={Colors.accentGold} />
        ) : (
          <ChevronDown size={20} color={Colors.textTertiary} />
        )}
      </TouchableOpacity>
      {expanded && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

function RuleRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.ruleRow, !last && styles.ruleRowBorder]}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  standingCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.accentGold,
    marginTop: 8,
    marginBottom: 20,
  },
  standingTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  standingRow: { marginBottom: 16 },
  standingItem: {},
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8 },
  standingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  standingStat: { flex: 1, alignItems: 'center' },
  standingStatValue: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
  standingStatLabel: { fontSize: 10, fontWeight: '600' as const, color: Colors.textTertiary, letterSpacing: 0.8, marginTop: 4 },
  standingDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  strikeVisual: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  strikeItem: { alignItems: 'center', gap: 6 },
  strikeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  strikeDotActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  strikeLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' as const },
  strikeLabelActive: { color: Colors.danger },
  accordionCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.accentGold },
  accordionBody: { borderTopWidth: 1, borderTopColor: Colors.border },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  ruleRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  ruleLabel: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  ruleValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.accentGold },
  ruleDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tierIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 14,
  },
  tierInfo: { flex: 1 },
  tierName: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary, marginBottom: 2 },
  tierDesc: { fontSize: 12, color: Colors.textSecondary },
  currentBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700' as const, color: Colors.accentGold, letterSpacing: 0.5 },
});
