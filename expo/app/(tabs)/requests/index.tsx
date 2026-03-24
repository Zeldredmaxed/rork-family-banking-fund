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
  Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { calculateMonthlyPayment } from '@/utils/formatters';
import { BUSINESS_RULES } from '@/constants/business-rules';
import { LoanApplication } from '@/types';

const MOCK_REQUESTS: LoanApplication[] = [
  {
    id: 1,
    type: 'standard',
    amount: 8500,
    status: 'pending',
    interest_tier: 2,
    monthly_payment: 284,
    submitted: '2023-10-12',
    purpose: 'Vehicle Loan',
    repayment_progress: 35,
  },
];

type ModalType = 'loan' | 'emergency' | 'meeting' | null;

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const _auth = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [loanAmount, setLoanAmount] = useState(5000);
  const [loanTerm, setLoanTerm] = useState(24);
  const [selectedTierIndex, _setSelectedTierIndex] = useState(1);

  const selectedTier = BUSINESS_RULES.INTEREST_TIERS[selectedTierIndex];
  const estimatedPayment = useMemo(
    () => calculateMonthlyPayment(loanAmount, selectedTier.rate, loanTerm),
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
    Alert.alert('Loan Application', 'Your loan application has been submitted for review.');
    closeModal();
  }, [closeModal]);

  const handleSubmitEmergency = useCallback(() => {
    Alert.alert('Emergency Request', 'Your emergency fund request has been submitted.');
    closeModal();
  }, [closeModal]);

  const handleSubmitMeeting = useCallback(() => {
    Alert.alert('Meeting Request', 'Your board meeting request has been submitted.');
    closeModal();
  }, [closeModal]);

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
      desc: 'Request up to $2,500 lifetime maximum',
      modal: 'emergency' as ModalType,
    },
    {
      icon: CalendarDays,
      iconColor: '#818cf8',
      iconBg: 'rgba(129, 140, 248, 0.15)',
      title: 'Schedule Board Meeting',
      desc: 'Request a vote or discussion topic',
      modal: 'meeting' as ModalType,
    },
  ];

  const termOptions = [12, 24, 36, 48];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <Bell size={22} color={Colors.accentGold} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {requestCards.map((card, i) => (
          <TouchableOpacity
            key={i}
            style={styles.requestCard}
            activeOpacity={0.7}
            onPress={() => openModal(card.modal)}
          >
            <View style={[styles.requestIcon, { backgroundColor: card.iconBg }]}>
              <card.icon size={22} color={card.iconColor} />
            </View>
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>{card.title}</Text>
              <Text style={styles.requestDesc}>{card.desc}</Text>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}

        <View style={styles.calculatorCard}>
          <View style={styles.calcHeader}>
            <Calculator size={18} color={Colors.accentGold} />
            <Text style={styles.calcTitle}>QUICK CALCULATOR</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Loan Amount</Text>
            <Text style={styles.calcValue}>{formatCurrency(loanAmount)}</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${(loanAmount / 25000) * 100}%` }]} />
            <View style={[styles.sliderThumb, { left: `${(loanAmount / 25000) * 100}%` }]} />
          </View>
          <View style={styles.sliderButtons}>
            {[1000, 5000, 10000, 15000, 25000].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => { setLoanAmount(val); void Haptics.selectionAsync(); }}
                style={[styles.sliderBtn, loanAmount === val && styles.sliderBtnActive]}
              >
                <Text style={[styles.sliderBtnText, loanAmount === val && styles.sliderBtnTextActive]}>
                  {val >= 1000 ? `${val / 1000}k` : val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Term</Text>
            <View style={styles.termPicker}>
              {termOptions.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setLoanTerm(t); void Haptics.selectionAsync(); }}
                  style={[styles.termBtn, loanTerm === t && styles.termBtnActive]}
                >
                  <Text style={[styles.termBtnText, loanTerm === t && styles.termBtnTextActive]}>
                    {t}mo
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.calcResult}>
            <View>
              <Text style={styles.calcResultLabel}>Est. Monthly Payment</Text>
              <Text style={styles.calcResultSub}>
                Interest Rate: {selectedTier.rate}% (Tier {selectedTier.tier})
              </Text>
            </View>
            <Text style={styles.calcResultValue}>{formatCurrency(Math.round(estimatedPayment))}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>MY REQUESTS</Text>

        {MOCK_REQUESTS.map((req) => (
          <View key={req.id} style={styles.myRequestCard}>
            <View style={styles.myRequestHeader}>
              <Text style={styles.myRequestTitle}>
                {req.purpose} — {formatCurrency(req.amount)}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>UNDER REVIEW</Text>
              </View>
            </View>
            <Text style={styles.myRequestSub}>Submitted Oct 12, 2023</Text>
            <View style={styles.myRequestProgress}>
              <View style={styles.myRequestProgressFill} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={activeModal === 'loan'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Loan Application</Text>
                <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textSecondary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>LOAN AMOUNT ($)</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="5000" placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.modalLabel}>TERM (MONTHS)</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="24" placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.modalLabel}>PURPOSE</Text>
                <TextInput style={[styles.modalInput, styles.modalTextArea]} multiline placeholder="Describe the loan purpose..." placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.modalLabel}>COLLATERAL TYPE</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. Vehicle, Property" placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.modalLabel}>COLLATERAL DESCRIPTION</Text>
                <TextInput style={styles.modalInput} placeholder="e.g. 2020 Honda Civic" placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.modalLabel}>COLLATERAL VALUE ($)</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="15000" placeholderTextColor={Colors.textTertiary} />
                <TouchableOpacity onPress={handleSubmitLoan} activeOpacity={0.8}>
                  <LinearGradient colors={[Colors.accentGold, Colors.accentGoldDark]} style={styles.modalButton}>
                    <Text style={styles.modalButtonText}>SUBMIT APPLICATION</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'emergency'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Fund</Text>
              <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>Requires unanimous board approval. Counts against 2 lifetime uses.</Text>
            </View>
            <Text style={styles.modalLabel}>AMOUNT ($)</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="2500" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.modalLabel}>REASON</Text>
            <TextInput style={[styles.modalInput, styles.modalTextArea]} multiline placeholder="Explain your emergency..." placeholderTextColor={Colors.textTertiary} />
            <TouchableOpacity onPress={handleSubmitEmergency} activeOpacity={0.8}>
              <View style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>SUBMIT EMERGENCY REQUEST</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'meeting'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Board Meeting</Text>
              <TouchableOpacity onPress={closeModal}><X size={24} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>SUBJECT</Text>
            <TextInput style={styles.modalInput} placeholder="Meeting subject" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.modalLabel}>AGENDA</Text>
            <TextInput style={[styles.modalInput, styles.modalTextArea]} multiline placeholder="Describe discussion topics..." placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.modalLabel}>PREFERRED DATE</Text>
            <TextInput style={styles.modalInput} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} />
            <TouchableOpacity onPress={handleSubmitMeeting} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.accentGold, Colors.accentGoldDark]} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>SUBMIT REQUEST</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  bellBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accentGold,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  requestDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  calculatorCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.accentGold,
    marginTop: 12,
    marginBottom: 28,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calcLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  calcValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 3,
    marginBottom: 12,
    position: 'relative' as const,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.accentGold,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute' as const,
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accentGold,
    marginLeft: -8,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sliderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sliderBtnActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
  },
  sliderBtnText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  sliderBtnTextActive: {
    color: Colors.accentGold,
  },
  termPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  termBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.bgTertiary,
  },
  termBtnActive: {
    backgroundColor: Colors.accentGold,
  },
  termBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  termBtnTextActive: {
    color: Colors.bgPrimary,
  },
  calcResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  calcResultLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  calcResultSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  calcResultValue: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  myRequestCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  myRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myRequestTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.accentGold,
    letterSpacing: 0.5,
  },
  myRequestSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  myRequestProgress: {
    height: 4,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  myRequestProgressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: Colors.accentGold,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButton: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
    letterSpacing: 1,
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: Colors.danger,
    lineHeight: 18,
  },
  dangerButton: {
    backgroundColor: Colors.danger,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
});
