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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import api from '@/utils/api-client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const forgotMutation = useMutation({
    mutationFn: async (emailVal: string) => {
      const res = await api.post('/api/auth/forgot-password', { email: emailVal });
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!email.trim()) return;
    forgotMutation.mutate(email.trim());
  }, [email, forgotMutation]);

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['rgba(201, 168, 76, 0.15)', 'rgba(201, 168, 76, 0.03)', 'transparent']}
          style={styles.topGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            If an account exists with that email address, we've sent password reset instructions.
          </Text>
          <TouchableOpacity
            style={styles.backToLoginBtn}
            onPress={() => router.replace('/login')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.accentGold, Colors.accentGoldDark]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>BACK TO SIGN IN</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['rgba(201, 168, 76, 0.15)', 'rgba(201, 168, 76, 0.03)', 'transparent']}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.accentGold} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!email.trim() || forgotMutation.isPending) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!email.trim() || forgotMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.buttonGradient}
              >
                {forgotMutation.isPending ? (
                  <ActivityIndicator color={Colors.bgPrimary} />
                ) : (
                  <Text style={styles.buttonText}>SEND RESET LINK</Text>
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
  flex: { flex: 1 },
  topGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  headerSection: { marginTop: 24, marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    marginLeft: 12,
  },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
    letterSpacing: 1.5,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIcon: { marginBottom: 24 },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  successText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
});
