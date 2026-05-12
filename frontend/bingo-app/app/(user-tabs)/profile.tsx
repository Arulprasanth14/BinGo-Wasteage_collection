import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  primaryDark: '#145231',
  background: '#F8F9FA',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  red: '#EF4444',
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('USER');

  useEffect(() => {
    const loadUserInfo = async () => {
      const name = await AsyncStorage.getItem('userName');
      const token = await AsyncStorage.getItem('token');
      if (name) setUserName(name);
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role || 'USER');
        } catch {
          setUserRole('USER');
        }
      }
    };
    loadUserInfo();
  }, []);

  const goToLogin = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userName');
    // From inside a tab screen, getParent() gives the root Stack navigator
    // (defined in app/_layout.tsx). Dispatching RESET here replaces the
    // entire stack with just the login screen. Going higher (ExpoRoot) breaks.
    const rootStack = navigation.getParent() ?? navigation;
    rootStack.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'index' }],
      })
    );
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (!(global as any).confirm('Are you sure you want to logout?')) return;
      goToLogin();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: goToLogin },
    ]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </View>
          <Text style={styles.headerName}>{userName}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={userRole === 'WORKER' ? 'construct' : 'person'}
              size={12}
              color={COLORS.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.roleBadgeText}>{userRole}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <ProfileRow icon="person-outline" label="Name" value={userName} />
            <View style={styles.divider} />
            <ProfileRow
              icon="shield-checkmark-outline"
              label="Role"
              value={
                userRole === 'USER'
                  ? 'Regular User'
                  : userRole === 'WORKER'
                  ? 'Waste Collector'
                  : userRole
              }
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <View style={styles.card}>
            <ProfileRow icon="leaf-outline" label="App" value="BinGo – Smart Waste Pickup" />
            <View style={styles.divider} />
            <ProfileRow icon="code-slash-outline" label="Version" value="1.0.0" />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ── Profile Row Component ─────────────────────────────────────────────────────
const ProfileRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <View style={styles.rowIconBox}>
        <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 64,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: { alignItems: 'center' },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: COLORS.gray100 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.gray700 },
  rowValue: { fontSize: 14, fontWeight: '500', color: COLORS.gray500, maxWidth: 180, textAlign: 'right' },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: COLORS.red,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  logoutText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
