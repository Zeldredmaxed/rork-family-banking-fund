import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, Eye } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const MOCK_DOCS = [
  { id: 1, name: 'Loan Agreement — Vehicle Loan', date: 'Oct 12, 2023', type: 'loan' },
  { id: 2, name: 'Membership Agreement', date: 'Jun 1, 2025', type: 'membership' },
  { id: 3, name: 'Payment Receipt — Mar 2026', date: 'Mar 1, 2026', type: 'receipt' },
  { id: 4, name: 'Payment Receipt — Feb 2026', date: 'Feb 1, 2026', type: 'receipt' },
  { id: 5, name: 'Fund Bylaws v2.0', date: 'Jan 1, 2025', type: 'bylaws' },
];

export default function DocumentsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'My Documents', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {MOCK_DOCS.map((doc) => (
          <View key={doc.id} style={styles.docCard}>
            <View style={styles.docIcon}>
              <FileText size={20} color={Colors.accentGold} />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={styles.docDate}>{doc.date}</Text>
            </View>
            <TouchableOpacity style={styles.docAction}>
              <Eye size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  docDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  docAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
