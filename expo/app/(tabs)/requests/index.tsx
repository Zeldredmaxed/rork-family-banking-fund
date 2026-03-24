import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Briefcase,
  ShieldAlert,
  CalendarDays,
  Calculator,
  ChevronRight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { calculateMonthlyPayment } from '@/utils/formatters';
import { BUSINESS_RULES } from '@/constants/business-rules';
import api from '@/utils/api-client';

type ModalType = 'loan' | 'emergency' | 'meeting' | null;

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Loan form state ───────────────────────────────────────────
  const [loanAmount, setLoanAmount] = useState('5000');
  const [loanTerm, setLoanTerm] = useState('24');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [collateralType, setCollateralType] = useState('vehicle');
  const [collateralDesc, setCollateralDesc] = useState('');
  const [collateralValue, setCollateralValue] = useState('');

  // ─── Emergency form state ──────────────────────────────────────
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');

  // ─── Meeting form state ────────────────────────────────────────
  const [meetingSubject, setMeetingSubject] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  // ─── API Queries ───────────────────────────────────────────────

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: async () => {
      const res = await api.get('/api/requests/my-requests');
      return res.data;
    },
    enabled: !!user,
  });

  const myLoans = requestsData?.loan_applications ?? [];
  const myMeetings = requestsData?.meeting_requests ?? [];

  // ─── Mutations ─────────────────────────────────────────────────

  const loanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/requests/loan', data);
      return res.data;
    },
    onSuccess: (data) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Loan Application Submitted',
        `Your $${data.amount?.toLocaleString()} loan application at Tier ${data.interest_tier} has been submitted for board review.\n\nEstimated monthly payment: $${data.monthly_payment}`,
      );
      setActiveModal(null);
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Submission failed. Please try again.';
      Alert.alert('Error', detail);
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/requests/emergency-fund', data);
      return res.data;
    },
    onSuccess: (data) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Emergency Request Submitted',
        `Your request for $${data.amount?.toLocaleString()} has been submitted.\nRequires: Unanimous Board Vote\nUses remaining: ${data.emergency_uses_remaining}`,
      );
      setActiveModal(null);
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Submission failed.';
      Alert.alert('Error', detail);
    },
  });

  const meetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/requests/meeting', data);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Meeting Requested', 'Your board meeting request has been submitted.');
      setActiveModal(null);
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Submission failed.';
      Alert.alert('Error', detail);
    },
  });

  // ─── Estimate calculation ──────────────────────────────────────

  const selectedTier = BUSINESS_RULES.INTEREST_TIERS[1]; // Use tier 2 as default estimate
  const estimatedPayment = useMemo(
    () => calculateMonthlyPayment(parseFloat(loanAmount) || 0, selectedTier.rate, parseInt(loanTerm) || 1),
    [loanAmount, selectedTier.rate, loanTerm]
  );

  const openModal = useCallback((type: ModalType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleSubmitLoan = useCallback(() => {
    const amount = parseFloat(loanAmount);
    const term = parseInt(loanTerm);
    const colVal = parseFloat(collateralValue);

    if (!amount || !term || !loanPurpose.trim() || !collateralDesc.trim() || !colVal) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    loanMutation.mutate({
      amount,
      term_months: term,
      purpose: loanPurpose.trim(),
      collateral_type: collateralType,
      collateral_description: collateralDesc.trim(),
      collateral_claimed_value: colVal,
    });
  }, [loanAmount, loanTerm, loanPurpose, collateralType, collateralDesc, collateralValue, loanMutation]);

  const handleSubmitEmergency = useCallback(() => {
    const amount = parseFloat(emergencyAmount);
    if (!amount || !emergencyReason.trim()) {
      Alert.alert('Missing Fields', 'Please provide an amount and reason.');
      return;
    }
    emergencyMutation.mutate({ amount, reason: emergencyReason.trim() });
  }, [emergencyAmount, emergencyReason, emergencyMutation]);

  const handleSubmitMeeting = useCallback(() => {
    if (!meetingSubject.trim() || !meetingAgenda.trim()) {
      Alert.alert('Missing Fields', 'Please provide a subject and agenda.');
      return;
    }
    meetingMutation.mutate({ subject: meetingSubject.trim(), agenda: meetingAgenda.trim() });
  }, [meetingSubject, meetingAgenda, meetingMutation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchRequests();
    setRefreshing(false);
  }, [refetchRequests]);

  const requestCards = [
    {
      icon: Briefcase,
      iconColor: Colors.accentGold,
      iconBg: 'rgba(201, 168, 76, 0.15)',
      title: 'Apply for a Loan',
      desc: 'Request funds backed by collateral',
      modal: 'loan' as ModalType,
    },
    {
      icon: ShieldAlert,
      iconColor: '#f87171',
      iconBg: 'rgba(248, 113, 113, 0.15)',
      title: 'Emergency Fund',
      desc: 'Request emergency financial assistance',
      modal: 'emergency' as ModalType,
    },
    {
      icon: CalendarDays,
      iconColor: '#60a5fa',
      iconBg: 'rgba(96, 165, 250, 0.15)',
      title: 'Request a Meeting',
      desc: 'Schedule a board meeting',
      modal: 'meeting' as ModalType,
    },
  ];

  const collateralOptions = [
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'equity', label: 'Equity' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Requests</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />
        }
      >
        {/* Request Type Cards */}
        {requestCards.map((card, i) => (
          <TouchableOpacity
            key={i}
            style={styles.requestCard}
            activeOpacity={0.7}
            onPress={() => openModal(card.modal)}
          >
            <View style={[styles.requestIconWrapper, { backgroundColor: card.iconBg }]}>
              <card.icon size={24} color={card.iconColor} />
            </View>
            <View style={styles.requestContent}>
              <Text style={styles.requestTitle}>{card.title}</Text>
              <Text style={styles.requestDesc}>{card.desc}</Text>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}

        {/* My Requests History */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>My Loan Applications</Text>
        {myLoans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No loan applications yet</Text>
          </View>
        ) : (
          myLoans.map((loan: any) => (
            <View key={loan.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle}>{loan.type === 'emergency' ? '🚨 Emergency' : '📋 Standard'} Loan</Text>
                  <Text style={styles.historyMeta}>
                    {formatCurrency(loan.amount)} · Tier {loan.interest_tier}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: loan.status === 'active' ? 'rgba(0,200,83,0.1)' : loan.status === 'pending' ? 'rgba(255,193,7,0.1)' : 'rgba(244,67,54,0.1)' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: loan.status === 'active' ? Colors.success : loan.status === 'pending' ? Colors.warning : Colors.danger }
                  ]}>
                    {(loan.status ?? '').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Meeting Requests</Text>
        {myMeetings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No meeting requests</Text>
          </View>
        ) : (
          myMeetings.map((m: any) => (
            <View key={m.id} style={styles.historyCard}>
              <Text style={styles.historyTitle}>{m.subject}</Text>
              <Text style={styles.historyMeta}>
                Status: {(m.status ?? '').toUpperCase()} · {m.preferred_date ? new Date(m.preferred_date).toLocaleDateString() : 'Flexible'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── Loan Application Modal ──────────────────────────────── */}
      <Modal visible={activeModal === 'loan'} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Loan Application</Text>
            <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Loan Amount ($)</Text>
            <TextInput
              style={styles.textInput}
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Term (Months)</Text>
            <TextInput
              style={styles.textInput}
              value={loanTerm}
              onChangeText={setLoanTerm}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Purpose</Text>
            <TextInput
              style={styles.textInput}
              value={loanPurpose}
              onChangeText={setLoanPurpose}
              placeholder="e.g. Vehicle purchase, home repair"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Collateral Type</Text>
            <View style={styles.chipRow}>
              {collateralOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, collateralType === opt.value && styles.chipActive]}
                  onPress={() => setCollateralType(opt.value)}
                >
                  <Text style={[styles.chipText, collateralType === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Collateral Description</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              value={collateralDesc}
              onChangeText={setCollateralDesc}
              placeholder="Describe your collateral asset"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <Text style={styles.fieldLabel}>Collateral Claimed Value ($)</Text>
            <TextInput
              style={styles.textInput}
              value={collateralValue}
              onChangeText={setCollateralValue}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Estimate Card */}
            <View style={styles.estimateCard}>
              <Calculator size={20} color={Colors.accentGold} />
              <View style={styles.estimateContent}>
                <Text style={styles.estimateLabel}>EST. MONTHLY PAYMENT</Text>
                <Text style={styles.estimateValue}>{formatCurrency(estimatedPayment)}</Text>
                <Text style={styles.estimateNote}>Based on Tier 2 rate ({(selectedTier.rate * 100).toFixed(0)}%)</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitLoan}
              disabled={loanMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loanMutation.isPending ? (
                  <ActivityIndicator color={Colors.bgPrimary} />
                ) : (
                  <Text style={styles.submitText}>SUBMIT APPLICATION</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Emergency Fund Modal ────────────────────────────────── */}
      <Modal visible={activeModal === 'emergency'} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Emergency Fund Request</Text>
            <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.warningBanner}>
              <ShieldAlert size={20} color="#f87171" />
              <Text style={styles.warningText}>
                Emergency funds require a unanimous board vote. You have {BUSINESS_RULES.MAX_EMERGENCY_FUND_USES - (user?.emergency_fund_uses ?? 0)} uses remaining.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput
              style={styles.textInput}
              value={emergencyAmount}
              onChangeText={setEmergencyAmount}
              keyboardType="numeric"
              placeholder={`Max: ${formatCurrency(user?.total_contributed ?? 0)}`}
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.textInput, { height: 100 }]}
              value={emergencyReason}
              onChangeText={setEmergencyReason}
              placeholder="Describe the emergency situation"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitEmergency}
              disabled={emergencyMutation.isPending}
            >
              <LinearGradient
                colors={['#f87171', '#dc2626']}
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {emergencyMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.submitText, { color: '#fff' }]}>SUBMIT EMERGENCY REQUEST</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Meeting Request Modal ───────────────────────────────── */}
      <Modal visible={activeModal === 'meeting'} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Board Meeting Request</Text>
            <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              value={meetingSubject}
              onChangeText={setMeetingSubject}
              placeholder="Meeting topic"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Agenda</Text>
            <TextInput
              style={[styles.textInput, { height: 120 }]}
              value={meetingAgenda}
              onChangeText={setMeetingAgenda}
              placeholder="What would you like to discuss?"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmitMeeting}
              disabled={meetingMutation.isPending}
            >
              <LinearGradient
                colors={['#60a5fa', '#3b82f6']}
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {meetingMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.submitText, { color: '#fff' }]}>REQUEST MEETING</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  screenHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  requestIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  requestContent: { flex: 1 },
  requestTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  requestDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  emptyCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  historyCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyLeft: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  historyMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // ─── Modal ─────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: Colors.bgPrimary },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalBody: { paddingHorizontal: 20, paddingTop: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderColor: Colors.accentGold,
  },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accentGold, fontWeight: '600' },
  estimateCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  estimateContent: { flex: 1 },
  estimateLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.8 },
  estimateValue: { fontSize: 24, fontWeight: '700', color: Colors.accentGold, marginTop: 4 },
  estimateNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  warningText: { flex: 1, fontSize: 13, color: '#f87171', lineHeight: 18 },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitText: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.bgPrimary,
    letterSpacing: 1,
  },
});
