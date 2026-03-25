import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Mail, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoggingIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    try {
      await login({ email: email.trim(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.log('[Login] Error caught:', err);
      let message = 'Login failed. Please check your credentials.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
        console.log('[Login] Response status:', axiosErr.response?.status);
        console.log('[Login] Response data:', JSON.stringify(axiosErr.response?.data));
        message = axiosErr.response?.data?.detail ?? message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [email, password, login, shakeAnim]);

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
          <View style={styles.logoSection}>
            <View style={styles.shieldContainer}>
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.shieldBg}
              >
                <Shield size={32} color={Colors.bgPrimary} strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Family Banking Fund</Text>
            <Text style={styles.subtitle}>MEMBER PORTAL</Text>
          </View>

          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.inputLabel}>SECURE EMAIL</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.accentGold} />
              <TextInput
                style={styles.input}
                placeholder="name@private.fund"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="login-email"
              />
            </View>

            <Text style={styles.inputLabel}>VERIFICATION KEY</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.accentGold} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                testID="login-password"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.signInButton, isLoggingIn && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoggingIn}
              activeOpacity={0.8}
              testID="login-submit"
            >
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color={Colors.bgPrimary} />
                ) : (
                  <Text style={styles.signInText}>SIGN IN TO VAULT</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                New Member? <Text style={styles.registerHighlight}>Contact your Fund Administrator</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  topGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldContainer: {
    marginBottom: 20,
  },
  shieldBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 8,
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
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    marginLeft: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
    letterSpacing: 1.5,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  registerLink: {
    padding: 8,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  registerHighlight: {
    color: Colors.accentGold,
    fontWeight: '600' as const,
  },
  forgotLink: {
    padding: 8,
    marginBottom: 8,
  },
  forgotText: {
    color: Colors.accentGold,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
