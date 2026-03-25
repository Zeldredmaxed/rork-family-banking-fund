import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Lock, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api-client';

interface SettingItem {
  category: string;
  label: string;
  enabled: boolean;
  mandatory: boolean;
}

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await api.get('/api/notification-settings/');
      return res.data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: Record<string, boolean>) => {
      const res = await api.put('/api/notification-settings/', settings);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Failed to update settings.';
      Alert.alert('Error', detail);
    },
  });

  const settings: SettingItem[] = data?.settings ?? [
    { category: 'announcements', label: 'Announcements', enabled: true, mandatory: true },
    { category: 'loan_status', label: 'Loan Status Updates', enabled: true, mandatory: true },
    { category: 'strikes', label: 'Strike Notifications', enabled: true, mandatory: true },
    { category: 'payment_reminders', label: 'Payment Reminders', enabled: true, mandatory: false },
    { category: 'payment_confirmations', label: 'Payment Confirmations', enabled: true, mandatory: false },
    { category: 'direct_messages', label: 'Direct Messages', enabled: true, mandatory: false },
    { category: 'chat_mentions', label: 'Chat Mentions', enabled: true, mandatory: false },
    { category: 'meeting_requests', label: 'Meeting Requests', enabled: true, mandatory: false },
  ];

  const handleToggle = useCallback((category: string, newValue: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMutation.mutate({ [category]: newValue });
  }, [updateMutation]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Bell size={18} color={Colors.accentGold} />
          <Text style={styles.infoText}>
            Some notifications are mandatory and cannot be disabled for your account security.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>MANDATORY</Text>
            <View style={styles.settingsCard}>
              {settings.filter((s) => s.mandatory).map((setting, i, arr) => (
                <View key={setting.category} style={[styles.settingRow, i < arr.length - 1 && styles.settingRowBorder]}>
                  <View style={styles.settingInfo}>
                    <Lock size={14} color={Colors.textTertiary} />
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                  </View>
                  <Switch
                    value={true}
                    disabled
                    trackColor={{ false: Colors.bgTertiary, true: 'rgba(201,168,76,0.3)' }}
                    thumbColor={Colors.accentGold}
                  />
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>CONFIGURABLE</Text>
            <View style={styles.settingsCard}>
              {settings.filter((s) => !s.mandatory).map((setting, i, arr) => (
                <View key={setting.category} style={[styles.settingRow, i < arr.length - 1 && styles.settingRowBorder]}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={(val) => handleToggle(setting.category, val)}
                    trackColor={{ false: Colors.bgTertiary, true: 'rgba(201,168,76,0.3)' }}
                    thumbColor={setting.enabled ? Colors.accentGold : Colors.textTertiary}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.textPrimary },
});
