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
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Pin, X, Megaphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';
import { Announcement } from '@/types';

export default function AdminAnnouncementsScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPinned, setFormPinned] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ announcements: Announcement[] }>({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await api.get('/api/admin/announcements');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { title: string; content: string; is_pinned: boolean }) => {
      const res = await api.post('/api/admin/announcements', body);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      resetForm();
      Alert.alert('Success', 'Announcement created.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to create announcement.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: { title?: string; content?: string; is_pinned?: boolean } }) => {
      const res = await api.put(`/api/admin/announcements/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      resetForm();
      Alert.alert('Success', 'Announcement updated.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to update announcement.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/admin/announcements/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to delete announcement.');
    },
  });

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormPinned(false);
  }, []);

  const openEdit = useCallback((announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormTitle(announcement.title);
    setFormContent(announcement.content ?? announcement.message ?? '');
    setFormPinned(announcement.is_pinned ?? false);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formTitle.trim() || !formContent.trim()) {
      Alert.alert('Missing Fields', 'Please fill in title and content.');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: { title: formTitle, content: formContent, is_pinned: formPinned } });
    } else {
      createMutation.mutate({ title: formTitle, content: formContent, is_pinned: formPinned });
    }
  }, [formTitle, formContent, formPinned, editingId, createMutation, updateMutation]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Delete Announcement', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }, [deleteMutation]);

  const announcements = data?.announcements ?? [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Announcements',
          headerStyle: { backgroundColor: Colors.bgPrimary },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                resetForm();
                setShowForm(true);
              }}
              style={styles.headerBtn}
            >
              <Plus size={20} color={Colors.accentGold} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accentGold} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 60 }} />
        ) : announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No announcements yet</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => { resetForm(); setShowForm(true); }}
            >
              <Text style={styles.createBtnText}>Create First Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          announcements.map((ann) => (
            <View key={ann.id} style={styles.annCard}>
              <View style={styles.annHeader}>
                <View style={styles.annHeaderLeft}>
                  {ann.is_pinned && <Pin size={12} color={Colors.accentGold} />}
                  <Text style={styles.annTitle}>{ann.title}</Text>
                </View>
                <View style={styles.annActions}>
                  <TouchableOpacity onPress={() => openEdit(ann)} style={styles.annActionBtn}>
                    <Edit3 size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(ann.id)} style={styles.annActionBtn}>
                    <Trash2 size={14} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.annContent} numberOfLines={4}>{ann.content ?? ann.message}</Text>
              <Text style={styles.annDate}>{formatDate(ann.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Announcement' : 'New Announcement'}</Text>
              <TouchableOpacity onPress={resetForm}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.formInput}
              placeholder="Title"
              placeholderTextColor={Colors.textTertiary}
              value={formTitle}
              onChangeText={setFormTitle}
            />
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              placeholder="Content"
              placeholderTextColor={Colors.textTertiary}
              value={formContent}
              onChangeText={setFormContent}
              multiline
              numberOfLines={5}
            />
            <View style={styles.pinnedRow}>
              <Text style={styles.pinnedLabel}>Pin announcement</Text>
              <Switch
                value={formPinned}
                onValueChange={setFormPinned}
                trackColor={{ false: Colors.bgTertiary, true: Colors.accentGold }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color={Colors.bgPrimary} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{editingId ? 'Update' : 'Create'}</Text>
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
  headerBtn: { marginRight: 4, padding: 4 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  createBtn: { backgroundColor: Colors.accentGold, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.bgPrimary },
  annCard: { backgroundColor: Colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  annHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  annTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary },
  annActions: { flexDirection: 'row', gap: 8 },
  annActionBtn: { padding: 4 },
  annContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  annDate: { fontSize: 11, color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
  formInput: { backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  formTextarea: { minHeight: 100, textAlignVertical: 'top' },
  pinnedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pinnedLabel: { fontSize: 14, color: Colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.bgTertiary, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.accentGold, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.bgPrimary },
});
