import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/reset-password', {
        token: token ?? '',
        new_password: newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail ?? 'Password reset failed. The link may have expired.';
      Alert.alert('Error', detail);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    resetMutation.mutate();
  }, [newPassword, confirmPassword, resetMutation]);

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <CheckCircle size={48} color={Colors.success} />
          <Text style={styles.successTitle}>Password Reset</Text>
          <Text style={styles.successText}>Your password has been successfully reset. You can now sign in with your new password.</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/login')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[Colors.accentGold, Colors.accentGoldDark]} style={styles.btnGradient}>
              <Text style={styles.btnText}>SIGN IN</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.accentGold} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.accentGold} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, resetMutation.isPending && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={resetMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[Colors.accentGold, Colors.accentGoldDark]} style={styles.btnGradient}>
                {resetMutation.isPending ? (
                  <ActivityIndicator color={Colors.bgPrimary} />
                ) : (
                  <Text style={styles.btnText}>RESET PASSWORD</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32 },
  formCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 16, marginLeft: 12 },
  btn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnGradient: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  btnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.bgPrimary, letterSpacing: 1.5 },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successTitle: { fontSize: 24, fontWeight: '700' as const, color: Colors.textPrimary },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },
});
