import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { FileText, PenTool, CheckCircle, AlertTriangle, X, FileSignature } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/formatters';
import api from '@/utils/api-client';
import { MemberDocument } from '@/types';

export default function DocumentsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<MemberDocument | null>(null);

  const { data: docsData, isLoading, refetch } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const res = await api.get('/api/documents/');
      return res.data;
    },
    enabled: !!user,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pending-documents'],
    queryFn: async () => {
      const res = await api.get('/api/documents/unsigned/pending');
      return res.data;
    },
    enabled: !!user,
  });

  const documents: MemberDocument[] = docsData?.documents ?? [];
  const pendingCount = pendingData?.documents?.length ?? 0;

  const signMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await api.post(`/api/documents/${docId}/sign`);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Document Signed', 'Your signature has been recorded.');
      void queryClient.invalidateQueries({ queryKey: ['my-documents'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-documents'] });
      setViewingDoc(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Failed to sign document.';
      Alert.alert('Error', detail);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const viewDocument = useCallback(async (doc: MemberDocument) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.get(`/api/documents/${doc.id}`);
      setViewingDoc({ ...doc, content_html: res.data?.content_html ?? res.data?.content ?? '' });
    } catch {
      setViewingDoc(doc);
    }
  }, []);

  const handleSign = useCallback((docId: number) => {
    Alert.alert(
      'Sign Document',
      'By signing, you agree to the terms outlined in this document. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: () => signMutation.mutate(docId),
        },
      ]
    );
  }, [signMutation]);

  const getDocIcon = (docType: string) => {
    switch (docType) {
      case 'loan_agreement': return '📄';
      case 'promissory_note': return '📝';
      case 'membership': return '🏦';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return Colors.success;
      case 'unsigned': return Colors.warning;
      case 'expired': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'My Documents', headerStyle: { backgroundColor: Colors.bgPrimary }, headerTintColor: Colors.textPrimary }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accentGold} />}
      >
        {pendingCount > 0 && (
          <View style={styles.pendingBanner}>
            <AlertTriangle size={18} color={Colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} document{pendingCount > 1 ? 's' : ''} awaiting your signature
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 40 }} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No documents yet</Text>
          </View>
        ) : (
          documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              activeOpacity={0.7}
              onPress={() => viewDocument(doc)}
            >
              <View style={styles.docIcon}>
                <Text style={styles.docEmoji}>{getDocIcon(doc.doc_type)}</Text>
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName}>{doc.title}</Text>
                <Text style={styles.docDate}>{formatDate(doc.created_at)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(doc.status)}15` }]}>
                {doc.status === 'signed' ? (
                  <CheckCircle size={14} color={Colors.success} />
                ) : (
                  <PenTool size={14} color={getStatusColor(doc.status)} />
                )}
                <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                  {doc.status.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={viewingDoc !== null} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{viewingDoc?.title ?? 'Document'}</Text>
            <TouchableOpacity onPress={() => setViewingDoc(null)}>
              <X size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.docContent}>
              {viewingDoc?.content_html ?? 'Loading document content...'}
            </Text>
          </ScrollView>
          {viewingDoc?.status === 'unsigned' && (
            <View style={styles.signFooter}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => viewingDoc && handleSign(viewingDoc.id)}
                disabled={signMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.accentGold, Colors.accentGoldDark]}
                  style={styles.signButton}
                >
                  {signMutation.isPending ? (
                    <ActivityIndicator color={Colors.bgPrimary} />
                  ) : (
                    <View style={styles.signRow}>
                      <FileSignature size={18} color={Colors.bgPrimary} />
                      <Text style={styles.signText}>SIGN DOCUMENT</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  pendingText: { flex: 1, fontSize: 14, color: Colors.warning, fontWeight: '500' as const },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
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
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docEmoji: { fontSize: 18 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  docDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
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
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary, flex: 1, marginRight: 12 },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  docContent: { fontSize: 15, color: Colors.textPrimary, lineHeight: 24 },
  signFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  signButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  signRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signText: { fontWeight: '700' as const, fontSize: 15, color: Colors.bgPrimary, letterSpacing: 1 },
});
