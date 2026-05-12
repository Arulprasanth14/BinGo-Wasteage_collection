import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL as API } from '../../config/api';

type Stats = {
  total_users: number; total_workers: number;
  pending_pickups: number; assigned_pickups: number;
  in_progress_pickups: number; completed_pickups: number;
};

const STAT_CONFIG = [
  { key: 'total_users',         label: 'Total Users',   icon: 'people-outline',         color: '#3B82F6' },
  { key: 'total_workers',       label: 'Workers',        icon: 'construct-outline',      color: '#1E6F43' },
  { key: 'pending_pickups',     label: 'Pending',        icon: 'time-outline',           color: '#F59E0B' },
  { key: 'assigned_pickups',    label: 'Assigned',       icon: 'person-outline',         color: '#8B5CF6' },
  { key: 'in_progress_pickups', label: 'In Progress',    icon: 'sync-outline',           color: '#EC4899' },
  { key: 'completed_pickups',   label: 'Completed',      icon: 'checkmark-done-outline', color: '#10B981' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  const fetchStats = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { doLogout(); return; }
      const res = await fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { doLogout(); return; }
      if (!res.ok) throw new Error('Failed');
      setStats(await res.json());
    } catch {
      Alert.alert('Error', 'Could not load dashboard stats. Pull to refresh.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    AsyncStorage.getItem('userName').then(n => { if (n) setAdminName(n); });
  }, [fetchStats]);

  const doLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userName');
    router.replace('/');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to logout?')) return;
      await doLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#145231', '#1E6F43', '#4CAF50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>BinGo Admin</Text>
            <Text style={styles.headerSub}>Welcome, {adminName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1E6F43" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : stats ? (
          <>
            <Text style={styles.sectionTitle}>📊 Overview</Text>
            <View style={styles.statsGrid}>
              {STAT_CONFIG.map(cfg => (
                <View key={cfg.key} style={[styles.statCard, { borderLeftColor: cfg.color }]}>
                  <View style={[styles.statIcon, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <Text style={[styles.statValue, { color: cfg.color }]}>
                    {(stats as any)[cfg.key]}
                  </Text>
                  <Text style={styles.statLabel}>{cfg.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.tipsCard}>
              <View style={styles.tipRow}>
                <Ionicons name="construct" size={18} color="#1E6F43" style={{ marginRight: 10 }} />
                <Text style={styles.tipText}>Go to <Text style={styles.tipBold}>Workers</Text> tab to register new workers</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="cube" size={18} color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={styles.tipText}>Go to <Text style={styles.tipBold}>Pickups</Text> tab to assign pickups to workers</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchStats} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color="#1E6F43" style={{ marginRight: 6 }} />
              <Text style={styles.refreshText}>Refresh Stats</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
            <Text style={styles.loadingText}>Failed to load data</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 24, paddingHorizontal: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 14, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tipsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tipText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  tipBold: { fontWeight: '700', color: '#1E6F43' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#1E6F43', borderRadius: 12, paddingVertical: 12,
  },
  refreshText: { color: '#1E6F43', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  retryBtn: { marginTop: 16, backgroundColor: '#1E6F43', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
