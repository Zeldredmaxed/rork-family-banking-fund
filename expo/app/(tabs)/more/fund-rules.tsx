import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BUSINESS_RULES } from '@/constants/business-rules';

export default function FundRulesScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Fund Rules', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Contribution Rules</Text>
        <View style={styles.card}>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Minimum Monthly Contribution</Text>
            <Text style={styles.ruleValue}>${BUSINESS_RULES.MIN_MONTHLY_CONTRIBUTION}</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Loan Access Threshold</Text>
            <Text style={styles.ruleValue}>${BUSINESS_RULES.LOAN_ACCESS_THRESHOLD.toLocaleString()}</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Max Contribution Changes</Text>
            <Text style={styles.ruleValue}>{BUSINESS_RULES.MAX_CONTRIBUTION_CHANGES} (lifetime)</Text>
          </View>
          <View style={[styles.ruleRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.ruleLabel}>Emergency Fund Uses</Text>
            <Text style={styles.ruleValue}>{BUSINESS_RULES.MAX_EMERGENCY_FUND_USES} (lifetime)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Interest Tiers</Text>
        <View style={styles.card}>
          {BUSINESS_RULES.INTEREST_TIERS.map((tier, i) => (
            <View key={i} style={[styles.ruleRow, i === BUSINESS_RULES.INTEREST_TIERS.length - 1 && { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.tierName}>Tier {tier.tier} — {tier.rate}%</Text>
                <Text style={styles.tierDesc}>{tier.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Strike Policy</Text>
        <View style={styles.card}>
          {BUSINESS_RULES.STRIKES.map((strike, i) => (
            <View key={i} style={[styles.ruleRow, i === BUSINESS_RULES.STRIKES.length - 1 && { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.tierName}>Strike {strike.count}: {strike.label}</Text>
                <Text style={styles.tierDesc}>{strike.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Collateral Requirements</Text>
        <View style={styles.card}>
          <View style={[styles.ruleRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.ruleLabel}>Minimum Coverage</Text>
            <Text style={styles.ruleValue}>{BUSINESS_RULES.MIN_COLLATERAL_COVERAGE * 100}%</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.accentGold,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ruleLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  ruleValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accentGold,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tierDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
