import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  PanResponder,
  LayoutChangeEvent,
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
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { calculateMonthlyPayment } from '@/utils/formatters';
import { BUSINESS_RULES } from '@/constants/business-rules';
import api from '@/utils/api-client';

type ModalType = 'loan' | 'emergency' | 'meeting' | null;

interface InterestOption {
  rate: number;
  label: string;
  tier: number;
}

const INTEREST_OPTIONS: InterestOption[] = [
  { rate: 5, label: '5%', tier: 1 },
  { rate: 8, label: '8%', tier: 2 },
  { rate: 10, label: '10%', tier: 3 },
];

const TERM_OPTIONS = [12, 24, 36, 48, 60];

const MIN_LOAN = 0;
const MAX_LOAN = 1000000;

type ReviewStage = 'ai_review' | 'board_review' | 'decision';

function getReviewStage(loan: any): { stage: ReviewStage; approved: boolean | null } {
  if (loan.status === 'approved' || loan.status === 'active' || loan.status === 'paid_off') {
    return { stage: 'decision', approved: true };
  }
  if (loan.status === 'denied' || loan.status === 'defaulted') {
    return { stage: 'decision', approved: false };
  }
  if (loan.status === 'pending') {
    if (loan.board_votes !== undefined && loan.board_votes !== null) {
      return { stage: 'board_review', approved: null };
    }
    return { stage: 'ai_review', approved: null };
  }
  return { stage: 'ai_review', approved: null };
}

function getProgressWidth(stage: ReviewStage): number {
  switch (stage) {
    case 'ai_review': return 0.2;
    case 'board_review': return 0.6;
    case 'decision': return 1.0;
  }
}

function getProgressColor(stage: ReviewStage): string {
  switch (stage) {
    case 'ai_review': return '#ef4444';
    case 'board_review': return '#f59e0b';
    case 'decision': return '#22c55e';
  }
}

function getStageLabel(stage: ReviewStage, approved: boolean | null): string {
  switch (stage) {
    case 'ai_review': return 'AI REVIEW';
    case 'board_review': return 'BOARD APPROVAL';
    case 'decision': return approved ? 'APPROVED' : 'DENIED';
  }
}

function CustomSlider({
  value,
  onValueChange,
  min,
  max,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const currentValue = useRef(value);

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const fillPercent = `${ratio * 100}%`;

  useCallback(() => {
    currentValue.current = value;
  }, [value]);

  const measureTrack = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.measureInWindow((x, _y, width) => {
        if (width > 0) {
          trackWidthRef.current = width;
          trackPageXRef.current = x;
        }
      });
    }
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
    setTimeout(measureTrack, 50);
  }, [measureTrack]);

  const computeValueFromPageX = useCallback((pageX: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return currentValue.current;
    const localX = pageX - trackPageXRef.current;
    const r = Math.max(0, Math.min(1, localX / width));
    return Math.round((min + r * (max - min)) / 1000) * 1000;
  }, [min, max]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        measureTrack();
        const newVal = computeValueFromPageX(evt.nativeEvent.pageX);
        currentValue.current = newVal;
        onValueChange(newVal);
        void Haptics.selectionAsync();
      },
      onPanResponderMove: (evt) => {
        const newVal = computeValueFromPageX(evt.nativeEvent.pageX);
        if (newVal !== currentValue.current) {
          currentValue.current = newVal;
          onValueChange(newVal);
        }
      },
      onPanResponderRelease: () => {
        void Haptics.selectionAsync();
      },
    })
  ).current;

  return (
    <View
      ref={trackRef}
      style={sliderStyles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={sliderStyles.track}>
        <View
          style={[
            sliderStyles.fill,
            { width: fillPercent as any },
          ]}
        />
      </View>
      <View
        style={[
          sliderStyles.thumb,
          { left: fillPercent as any, marginLeft: -12 },
        ]}
      >
        <View style={sliderStyles.thumbInner} />
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative' as const,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.accentGold,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute' as const,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentGold,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.accentGold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a1a2e',
  },
});

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [calcAmount, setCalcAmount] = useState(5000);
  const [calcRate, setCalcRate] = useState(8);
  const [calcTerm, setCalcTerm] = useState(24);

  const [loanAmount, setLoanAmount] = useState('5000');
  const [loanTerm, setLoanTerm] = useState('24');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [collateralType, setCollateralType] = useState('vehicle');
  const [collateralDesc, setCollateralDesc] = useState('');
  const [collateralValue, setCollateralValue] = useState('');

  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');

  const [meetingSubject, setMeetingSubject] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

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

  const calcPayment = useMemo(
    () => calculateMonthlyPayment(calcAmount, calcRate, calcTerm),
    [calcAmount, calcRate, calcTerm]
  );

  const selectedTier = BUSINESS_RULES.INTEREST_TIERS[1];
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

  const handleSliderChange = useCallback((val: number) => {
    setCalcAmount(val);
  }, []);

  const handleRateSelect = useCallback((rate: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalcRate(rate);
  }, []);

  const handleTermSelect = useCallback((term: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalcTerm(term);
  }, []);

  const handleRequestTap = useCallback((loan: any) => {
    const { stage, approved } = getReviewStage(loan);
    if (stage === 'decision') {
      void Haptics.notificationAsync(
        approved
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      setExpandedRequestId(expandedRequestId === loan.id ? null : loan.id);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedRequestId(expandedRequestId === loan.id ? null : loan.id);
    }
  }, [expandedRequestId]);

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

  const getTierForRate = (rate: number) => {
    const found = INTEREST_OPTIONS.find(o => o.rate === rate);
    return found ? found.tier : 2;
  };

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
        {/* Quick Calculator Widget */}
        <View style={styles.calcCard}>
          <View style={styles.calcHeader}>
            <SlidersHorizontal size={18} color={Colors.accentGold} />
            <Text style={styles.calcHeaderText}>QUICK CALCULATOR</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Loan Amount</Text>
            <Text style={styles.calcAmountValue}>
              {formatCurrency(calcAmount)}
            </Text>
          </View>

          <CustomSlider
            value={calcAmount}
            onValueChange={handleSliderChange}
            min={MIN_LOAN}
            max={MAX_LOAN}
          />

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderMinMax}>$0</Text>
            <Text style={styles.sliderMinMax}>$1M</Text>
          </View>

          <View style={styles.amountInputRow}>
            <Text style={styles.amountInputPrefix}>$</Text>
            <TextInput
              style={styles.amountTextInput}
              value={calcAmount > 0 ? String(calcAmount) : ''}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                const num = Math.min(parseInt(cleaned) || 0, MAX_LOAN);
                setCalcAmount(num);
              }}
              keyboardType="numeric"
              placeholder="Type exact amount"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="done"
            />
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Term</Text>
            <View style={styles.termRow}>
              {TERM_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.termPill, calcTerm === t && styles.termPillActive]}
                  onPress={() => handleTermSelect(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.termPillText, calcTerm === t && styles.termPillTextActive]}>
                    {t}mo
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Interest Rate</Text>
            <View style={styles.rateRow}>
              {INTEREST_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.rate}
                  style={[styles.rateBubble, calcRate === opt.rate && styles.rateBubbleActive]}
                  onPress={() => handleRateSelect(opt.rate)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rateBubbleText, calcRate === opt.rate && styles.rateBubbleTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.calcResultRow}>
            <Text style={styles.calcResultLabel}>Est. Monthly Payment</Text>
            <View style={styles.calcResultRight}>
              <Text style={styles.calcResultValue}>
                {formatCurrency(Math.round(calcPayment))}
              </Text>
              <Text style={styles.calcResultNote}>
                Interest Rate: {calcRate}% (Tier {getTierForRate(calcRate)})
              </Text>
            </View>
          </View>
        </View>

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

        {/* My Requests Section */}
        <View style={styles.myRequestsHeader}>
          <Text style={styles.sectionTitle}>MY REQUESTS</Text>
        </View>

        {myLoans.length === 0 && myMeetings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No requests submitted yet</Text>
          </View>
        ) : (
          <>
            {myLoans.map((loan: any) => {
              const { stage, approved } = getReviewStage(loan);
              const progressWidth = getProgressWidth(stage);
              const progressColor = getProgressColor(stage);
              const stageLabel = getStageLabel(stage, approved);
              const isExpanded = expandedRequestId === loan.id;

              return (
                <TouchableOpacity
                  key={loan.id}
                  style={styles.requestProgressCard}
                  activeOpacity={0.7}
                  onPress={() => handleRequestTap(loan)}
                >
                  <View style={styles.requestProgressTop}>
                    <View style={styles.requestProgressInfo}>
                      <Text style={styles.requestProgressTitle}>
                        {loan.purpose || (loan.type === 'emergency' ? 'Emergency' : 'Standard')} Loan — {formatCurrency(loan.amount)}
                      </Text>
                      <Text style={styles.requestProgressMeta}>
                        Submitted {loan.submitted ? formatDate(loan.submitted) : 'Recently'}
                      </Text>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: `${progressColor}20` }]}>
                      <Text style={[styles.stageBadgeText, { color: progressColor }]}>
                        {stageLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progressWidth * 100}%`,
                            backgroundColor: progressColor,
                          },
                        ]}
                      />
                      {/* Stage markers */}
                      <View style={[styles.stageMarker, { left: '20%' }]}>
                        <View style={[
                          styles.stageMarkerDot,
                          { backgroundColor: progressWidth >= 0.2 ? progressColor : 'rgba(255,255,255,0.15)' }
                        ]} />
                      </View>
                      <View style={[styles.stageMarker, { left: '60%' }]}>
                        <View style={[
                          styles.stageMarkerDot,
                          { backgroundColor: progressWidth >= 0.6 ? progressColor : 'rgba(255,255,255,0.15)' }
                        ]} />
                      </View>
                      <View style={[styles.stageMarker, { left: '100%' }]}>
                        <View style={[
                          styles.stageMarkerDot,
                          { backgroundColor: progressWidth >= 1.0 ? progressColor : 'rgba(255,255,255,0.15)' }
                        ]} />
                      </View>
                    </View>
                    <View style={styles.stageLabelsRow}>
                      <Text style={[styles.stageLabelText, progressWidth >= 0.2 && { color: '#ef4444' }]}>AI</Text>
                      <Text style={[styles.stageLabelText, progressWidth >= 0.6 && { color: '#f59e0b' }]}>Board</Text>
                      <Text style={[styles.stageLabelText, progressWidth >= 1.0 && { color: '#22c55e' }]}>Decision</Text>
                    </View>
                  </View>

                  {/* Board vote info for board_review stage */}
                  {stage === 'board_review' && (
                    <View style={styles.boardVoteRow}>
                      <Text style={styles.boardVoteText}>
                        Board votes: 3 of 5 required to pass
                      </Text>
                    </View>
                  )}

                  {/* Expanded detail for decision stage */}
                  {isExpanded && stage === 'decision' && (
                    <View style={styles.decisionDetail}>
                      <View style={styles.decisionIconRow}>
                        {approved ? (
                          <CheckCircle size={20} color={Colors.success} />
                        ) : (
                          <XCircle size={20} color={Colors.danger} />
                        )}
                        <Text style={[styles.decisionText, { color: approved ? Colors.success : Colors.danger }]}>
                          {approved
                            ? `Your loan of ${formatCurrency(loan.amount)} has been approved!`
                            : `Your loan request of ${formatCurrency(loan.amount)} was denied.`}
                        </Text>
                      </View>
                      {loan.monthly_payment && approved && (
                        <Text style={styles.decisionMeta}>
                          Monthly payment: {formatCurrency(loan.monthly_payment)} · Tier {loan.interest_tier}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Expanded detail for non-decision stages */}
                  {isExpanded && stage !== 'decision' && (
                    <View style={styles.decisionDetail}>
                      <View style={styles.decisionIconRow}>
                        <Clock size={18} color={Colors.accentGold} />
                        <Text style={styles.pendingDetailText}>
                          {stage === 'ai_review'
                            ? 'Your request is being analyzed by our AI system. This usually takes a few minutes.'
                            : 'Your request is awaiting board member votes. At least 3 of 5 board members must vote.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {myMeetings.map((m: any) => (
              <View key={`meeting-${m.id}`} style={styles.requestProgressCard}>
                <View style={styles.requestProgressTop}>
                  <View style={styles.requestProgressInfo}>
                    <Text style={styles.requestProgressTitle}>
                      📅 {m.subject}
                    </Text>
                    <Text style={styles.requestProgressMeta}>
                      {m.preferred_date ? `Preferred: ${formatDate(m.preferred_date)}` : 'Flexible date'}
                    </Text>
                  </View>
                  <View style={[
                    styles.stageBadge,
                    { backgroundColor: m.status === 'scheduled' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)' }
                  ]}>
                    <Text style={[
                      styles.stageBadgeText,
                      { color: m.status === 'scheduled' ? Colors.success : Colors.warning }
                    ]}>
                      {(m.status ?? 'PENDING').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Loan Application Modal */}
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

      {/* Emergency Fund Modal */}
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

      {/* Meeting Request Modal */}
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
  screenTitle: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  calcCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  calcHeaderText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: 1.2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  calcAmountValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.accentGold,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sliderMinMax: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  amountInputPrefix: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.accentGold,
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  termRow: {
    flexDirection: 'row',
    gap: 6,
  },
  termPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  termPillActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderColor: Colors.accentGold,
  },
  termPillText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
  },
  termPillTextActive: {
    color: Colors.accentGold,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBubbleActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderColor: Colors.accentGold,
  },
  rateBubbleText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
  },
  rateBubbleTextActive: {
    color: Colors.accentGold,
  },
  calcDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  calcResultLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    paddingTop: 4,
  },
  calcResultRight: {
    alignItems: 'flex-end',
  },
  calcResultValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.accentGold,
  },
  calcResultNote: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },

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
  requestTitle: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  requestDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  myRequestsHeader: {
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
  },

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

  requestProgressCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  requestProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  requestProgressInfo: {
    flex: 1,
    marginRight: 10,
  },
  requestProgressTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  requestProgressMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  stageBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },

  progressBarContainer: {
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stageMarker: {
    position: 'absolute',
    top: -3,
    marginLeft: -6,
  },
  stageMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.bgSecondary,
  },
  stageLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  stageLabelText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },

  boardVoteRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  boardVoteText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  decisionDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  decisionIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  decisionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    lineHeight: 20,
  },
  decisionMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 30,
  },
  pendingDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

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
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.textPrimary },
  modalBody: { paddingHorizontal: 20, paddingTop: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
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
  chipTextActive: { color: Colors.accentGold, fontWeight: '600' as const },
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
  estimateLabel: { fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 0.8 },
  estimateValue: { fontSize: 24, fontWeight: '700' as const, color: Colors.accentGold, marginTop: 4 },
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
    fontWeight: '700' as const,
    fontSize: 15,
    color: Colors.bgPrimary,
    letterSpacing: 1,
  },
});
