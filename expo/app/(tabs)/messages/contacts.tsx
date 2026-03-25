import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/utils/formatters';
import api from '@/utils/api-client';
import { DMContact } from '@/types';

export default function ContactsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dm-contacts'],
    queryFn: async () => {
      const res = await api.get('/api/dm/contacts');
      return res.data;
    },
    enabled: !!user,
  });

  const contacts: DMContact[] = (data?.contacts ?? []).filter(
    (c: DMContact) => c.id !== user?.id
  );

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openChat = useCallback((contact: DMContact) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/messages/conversation?memberId=${contact.id}&memberName=${encodeURIComponent(contact.name)}` as never);
  }, [router]);

  const renderContact = useCallback(({ item }: { item: DMContact }) => {
    const nameParts = item.name.split(' ');
    const initials = getInitials(nameParts[0] ?? '?', nameParts[1] ?? '?');

    return (
      <TouchableOpacity
        style={styles.contactRow}
        activeOpacity={0.7}
        onPress={() => openChat(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactStatus}>{item.status === 'active' ? 'Active Member' : item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [openChat]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Message',
          headerStyle: { backgroundColor: Colors.bgPrimary },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accentGold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  contactStatus: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
});
