import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  CreditCard,
  TrendingUp,
  Target,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getInitials, getCreditScoreLabel } from '@/utils/formatters';

export default function ProfileScreen() {
  const { user } = useAuth();

  const firstName = user?.first_name ?? 'Marcus';
  const lastName = user?.last_name ?? 'Johnson';
  const initials = getInitials(firstName, lastName);
  const creditLabel = getCreditScoreLabel(user?.credit_score ?? 742);

  const infoItems = [
    { icon: Mail, label: 'Email', value: user?.email ?? 'marcus@family.com' },
    { icon: Phone, label: 'Phone', value: user?.phone ?? '(555) 123-4567' },
    { icon: Calendar, label: 'Member Since', value: user?.join_date ? formatDate(user.join_date) : 'Jan 2024' },
    { icon: Shield, label: 'Status', value: (user?.status ?? 'active').toUpperCase(), color: Colors.success },
    { icon: CreditCard, label: 'Credit Score', value: `${user?.credit_score ?? 742} (${creditLabel.label})`, color: creditLabel.color },
    { icon: TrendingUp, label: 'Monthly Contribution', value: formatCurrency(user?.monthly_contribution ?? 250) },
    { icon: Target, label: 'Total Contributed', value: formatCurrency(user?.total_contributed ?? 4800) },
    { icon: Shield, label: 'Loan Access', value: user?.loan_access_unlocked ? 'Unlocked' : 'Locked', color: user?.loan_access_unlocked ? Colors.success : Colors.warning },
    { icon: AlertTriangle, label: 'Strikes', value: `${user?.strike_count ?? 0} / 3`, color: (user?.strike_count ?? 0) > 0 ? Colors.danger : Colors.success },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'My Profile', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{firstName} {lastName}</Text>
          {user?.is_board_member && (
            <View style={styles.boardBadge}>
              <Shield size={12} color={Colors.accentGold} />
              <Text style={styles.boardText}>Board Member</Text>
            </View>
          )}
        </View>

        {infoItems.map((item, i) => (
          <View key={i} style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <item.icon size={18} color={Colors.accentGold} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={[styles.infoValue, item.color ? { color: item.color } : undefined]}>{item.value}</Text>
            </View>
          </View>
        ))}
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
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.accentGold,
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  name: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  boardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boardText: {
    fontSize: 13,
    color: Colors.accentGold,
    fontWeight: '500' as const,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginTop: 2,
  },
});
