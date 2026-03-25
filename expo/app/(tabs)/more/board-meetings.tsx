import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, Calendar, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { BoardMeeting } from '@/types';

export default function BoardMeetingsScreen() {
  const queryClient = useQueryClient();
  const [scheduleModal, setScheduleModal] = useState<BoardMeeting | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ meetings: BoardMeeting[] }>({
    queryKey: ['board-meetings'],
    queryFn: async () => {
      const res = await api.get('/api/board-panel/meetings');
      return res.data;
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ meetingId, date }: { meetingId: number; date: string }) => {
      const res = await api.put(`/api/board-panel/meetings/${meetingId}/schedule`, { scheduled_date: date });
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['board-meetings'] });
      setScheduleModal(null);
      setScheduledDate('');
      Alert.alert('Success', 'Meeting has been scheduled.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to schedule meeting.');
    },
  });

  const meetings = data?.meetings ?? [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return Colors.success;
      case 'completed': return '#818cf8';
      case 'cancelled': return Colors.danger;
      default: return Colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Meeting Requests', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary, headerShadowVisible: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : meetings.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No meeting requests</Text>
          </View>
        ) : (
          meetings.map((meeting) => (
            <View key={meeting.id} style={styles.meetingCard}>
              <View style={styles.meetingHeader}>
                <View style={styles.meetingHeaderLeft}>
                  <Text style={styles.meetingSubject}>{meeting.subject}</Text>
                  <Text style={styles.meetingRequester}>by {meeting.requested_by}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(meeting.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(meeting.status) }]}>{meeting.status}</Text>
                </View>
              </View>
              <Text style={styles.agendaText} numberOfLines={3}>{meeting.agenda}</Text>
              <View style={styles.meetingMeta}>
                {meeting.preferred_date && (
                  <View style={styles.metaItem}>
                    <Calendar size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>Preferred: {formatDate(meeting.preferred_date)}</Text>
                  </View>
                )}
                {meeting.scheduled_date && (
                  <View style={styles.metaItem}>
                    <Clock size={12} color={Colors.success} />
                    <Text style={[styles.metaText, { color: Colors.success }]}>Scheduled: {formatDate(meeting.scheduled_date)}</Text>
                  </View>
                )}
              </View>
              {meeting.status === 'pending' && (
                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setScheduleModal(meeting);
                  }}
                >
                  <CalendarDays size={14} color={Colors.accentGold} />
                  <Text style={styles.scheduleBtnText}>Schedule Meeting</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={scheduleModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Meeting</Text>
              <TouchableOpacity onPress={() => { setScheduleModal(null); setScheduledDate(''); }}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>{scheduleModal?.subject}</Text>
            <Text style={styles.inputLabel}>Date & Time (ISO format)</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="2026-04-01T14:00:00"
              placeholderTextColor={Colors.textTertiary}
              value={scheduledDate}
              onChangeText={setScheduledDate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setScheduleModal(null); setScheduledDate(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  if (!scheduledDate.trim() || !scheduleModal) {
                    Alert.alert('Error', 'Please enter a valid date.');
                    return;
                  }
                  scheduleMutation.mutate({ meetingId: scheduleModal.id, date: scheduledDate });
                }}
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  meetingCard: { backgroundColor: Colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  meetingHeaderLeft: { flex: 1 },
  meetingSubject: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2 },
  meetingRequester: { fontSize: 12, color: Colors.textTertiary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  agendaText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  meetingMeta: { gap: 4, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', backgroundColor: 'rgba(201,168,76,0.08)' },
  scheduleBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.accentGold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  modalSubtext: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  dateInput: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.bgTertiary, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.accentGold, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.bgPrimary },
});
