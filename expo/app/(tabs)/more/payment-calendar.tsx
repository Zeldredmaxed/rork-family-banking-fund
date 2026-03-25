import React, { useState, useCallback, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import api from '@/utils/api-client';
import { CalendarEvent } from '@/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function PaymentCalendarScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const monthStr = getMonthStr(year, month);

  const { data: calendarData, isLoading, refetch } = useQuery({
    queryKey: ['payment-calendar', monthStr],
    queryFn: async () => {
      const res = await api.get(`/api/payments/calendar?month=${monthStr}`);
      return res.data;
    },
    enabled: !!user,
  });

  const totalDue = calendarData?.total_due ?? 0;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    (calendarData?.events ?? []).forEach((e: CalendarEvent) => {
      const day = e.date;
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [calendarData]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  const prevMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }, [month, year]);

  const nextMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }, [month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarCells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateStr });
  }

  const getDateDotColor = (dateStr: string): string | null => {
    const dayEvents = eventsByDate[dateStr];
    if (!dayEvents || dayEvents.length === 0) return null;
    const hasOverdue = dayEvents.some((e) => e.status === 'overdue');
    const hasPaid = dayEvents.every((e) => e.status === 'paid');
    if (hasOverdue) return Colors.danger;
    if (hasPaid) return Colors.success;
    return Colors.warning;
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'contribution_due': return 'Contribution Due';
      case 'loan_payment': return 'Loan Payment';
      case 'contribution_paid': return 'Contribution Paid';
      case 'loan_paid': return 'Loan Paid';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'overdue': return Colors.danger;
      case 'upcoming': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const isToday = (dateStr: string) => {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dateStr === today;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Payment Calendar', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />}
      >
        <View style={styles.summaryCard}>
          <DollarSign size={20} color={Colors.accentGold} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>TOTAL DUE THIS MONTH</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalDue)}</Text>
          </View>
        </View>

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <ChevronLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <ChevronRight size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.dayLabels}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell, i) => {
              if (!cell.day || !cell.dateStr) {
                return <View key={`empty-${i}`} style={styles.calendarCell} />;
              }
              const dotColor = getDateDotColor(cell.dateStr);
              const today = isToday(cell.dateStr);
              const isSelected = selectedDate === cell.dateStr;

              return (
                <TouchableOpacity
                  key={cell.dateStr}
                  style={[
                    styles.calendarCell,
                    today && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedDate(cell.dateStr);
                  }}
                >
                  <Text style={[
                    styles.dayNumber,
                    today && styles.todayText,
                    isSelected && styles.selectedText,
                  ]}>
                    {cell.day}
                  </Text>
                  {dotColor && <View style={[styles.eventDot, { backgroundColor: dotColor }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Paid</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Upcoming</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendText}>Overdue</Text>
          </View>
        </View>

        {selectedDate && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text style={styles.noEvents}>No payments on this date</Text>
            ) : (
              selectedEvents.map((evt, i) => (
                <View key={i} style={styles.eventCard}>
                  <View style={[styles.eventDotLarge, { backgroundColor: getStatusColor(evt.status) }]} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventType}>{getEventTypeLabel(evt.type)}</Text>
                    <Text style={[styles.eventStatus, { color: getStatusColor(evt.status) }]}>
                      {evt.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.eventAmount}>{formatCurrency(evt.amount)}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 1 },
  summaryValue: { fontSize: 26, fontWeight: '700' as const, color: Colors.accentGold, marginTop: 2 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  dayLabels: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' as const },
  calendarCell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  todayCell: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 10,
  },
  selectedCell: {
    backgroundColor: Colors.accentGold,
    borderRadius: 10,
  },
  dayNumber: { fontSize: 14, fontWeight: '500' as const, color: Colors.textPrimary },
  todayText: { color: Colors.accentGold, fontWeight: '700' as const },
  selectedText: { color: Colors.bgPrimary, fontWeight: '700' as const },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute' as const,
    bottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  detailSection: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  noEvents: { fontSize: 14, color: Colors.textSecondary },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  eventDotLarge: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  eventStatus: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5, marginTop: 2 },
  eventAmount: { fontSize: 16, fontWeight: '700' as const, color: Colors.accentGold },
});
