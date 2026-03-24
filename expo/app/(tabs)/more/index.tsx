import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText,
  TrendingUp,
  CalendarDays,
  BookOpen,
  BellRing,
  Lock,
  ChevronRight,
  Settings,
  Shield,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, formatDate } from '@/utils/formatters';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const firstName = user?.first_name ?? 'Marcus';
  const lastName = user?.last_name ?? 'Johnson';
  const initials = getInitials(firstName, lastName);
  const isBoardMember = user?.is_board_member ?? true;
  const joinDate = user?.join_date ? formatDate(user.join_date) : 'January 2024';
  const email = user?.email ?? 'marcus@family.com';

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
        },
      },
    ]);
  }, [logout]);

  const menuItems = [
    { icon: FileText, label: 'My Documents', desc: 'Loan agreements, receipts', color: Colors.accentGold, route: '/more/documents' },
    { icon: TrendingUp, label: 'Fund Health', desc: 'Total capital, distributions', color: '#22c55e', route: null },
    { icon: CalendarDays, label: 'Payment Calendar', desc: 'Upcoming due dates', color: '#818cf8', route: null },
    { icon: BookOpen, label: 'Fund Rules', desc: 'Bylaws, interest tiers', color: Colors.accentGold, route: '/more/fund-rules' },
    { icon: BellRing, label: 'Notification Settings', desc: 'Manage alerts', color: '#f59e0b', route: null },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <TouchableOpacity>
          <Settings size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{initials}</Text>
            </View>
            {isBoardMember && (
              <View style={styles.verifiedBadge}>
                <Shield size={10} color={Colors.success} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{firstName} {lastName}</Text>
          {isBoardMember && (
            <View style={styles.boardBadge}>
              <Shield size={12} color={Colors.accentGold} />
              <Text style={styles.boardBadgeText}>Board Member</Text>
            </View>
          )}
          <Text style={styles.memberSince}>FAMILY MEMBER SINCE {joinDate.toUpperCase()}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <Text style={styles.sectionLabel}>PORTFOLIO MANAGEMENT</Text>

        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.route) {
                  router.push(item.route as never);
                }
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => setShowChangePassword(!showChangePassword)}
          activeOpacity={0.7}
        >
          <Lock size={18} color={Colors.textPrimary} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        {showChangePassword && (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Current Password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.accentGold, Colors.accentGoldDark]}
                style={styles.passwordSubmit}
              >
                <Text style={styles.passwordSubmitText}>UPDATE PASSWORD</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>INSTITUTIONAL WEALTH PROTOCOL</Text>
        <Text style={styles.versionNumber}>v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accentGold,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.accentGold,
  },
  avatarLargeText: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  boardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  boardBadgeText: {
    fontSize: 13,
    color: Colors.accentGold,
    fontWeight: '500' as const,
  },
  memberSince: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  menuDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  changePasswordText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  passwordForm: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 12,
  },
  passwordInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordSubmit: {
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordSubmitText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.bgPrimary,
    letterSpacing: 1,
  },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  versionNumber: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
