import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const FAQ_ITEMS = [
  { q: 'How do I set up auto-pay?', a: 'Navigate to the Payments tab and tap "Manage Auto-Pay". You\'ll be guided through connecting your payment method via our secure Stripe integration.' },
  { q: 'What happens if I miss a payment?', a: 'A missed payment results in a strike. Strike 1 is a soft ban (6 months to restore), Strike 2 is a full ban (12 months), and Strike 3 is indefinite (board vote required).' },
  { q: 'How do I apply for a loan?', a: 'Go to the Requests tab and tap "Apply for a Loan". You must have contributed at least $5,000 to the fund and provide collateral covering at least 85% of the loan amount.' },
  { q: 'What are the interest tiers?', a: 'Tier 1 (5%): Flawless history, 750+ credit. Tier 2 (8%): 620+ credit, 24 months perfect payment. Tier 3 (10%): Default tier for all other members.' },
  { q: 'How does the emergency fund work?', a: 'Each member gets 2 lifetime emergency fund uses (max $2,500 each). Requires unanimous board approval. These count separately from regular loans.' },
  { q: 'Can I change my monthly contribution?', a: 'Yes, but you have a lifetime maximum of 4 contribution changes. The minimum is $25/month. Contact a board member to request a change.' },
];

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Help & FAQ', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {FAQ_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqCard}
            activeOpacity={0.7}
            onPress={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              {openIndex === i ? (
                <ChevronUp size={18} color={Colors.accentGold} />
              ) : (
                <ChevronDown size={18} color={Colors.textTertiary} />
              )}
            </View>
            {openIndex === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need more help?</Text>
          <Text style={styles.contactDesc}>Contact your Fund Administrator or reach out to a board member through the Chat tab.</Text>
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
    paddingTop: 8,
  },
  faqCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contactCard: {
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderRadius: 14,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.accentGold,
    marginBottom: 6,
  },
  contactDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
