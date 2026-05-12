import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { API_BASE_URL } from '../../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type AssignedPickup = {
  pickup_id: number;
  waste_type: string;
  location_text: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
};

// ─── Status Config ────────────────────────────────────────────────────────────
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS': return { color: '#F59E0B', bg: '#FFFBEB', label: 'IN PROGRESS' };
    case 'COMPLETED': return { color: '#10B981', bg: '#ECFDF5', label: 'COMPLETED' };
    default: return { color: '#3B82F6', bg: '#EFF6FF', label: 'ASSIGNED' };
  }
};

// ─── Waste Type Icon ──────────────────────────────────────────────────────────
const getWasteIcon = (type: string) => {
  if (type.includes('Dry') || type.includes('Recyclable')) return { icon: 'cube-outline', color: '#3B82F6', bg: '#EFF6FF' };
  if (type.includes('Plastic')) return { icon: 'water-outline', color: '#06B6D4', bg: '#ECFEFF' };
  if (type.includes('Organic') || type.includes('Wet')) return { icon: 'leaf-outline', color: '#10B981', bg: '#ECFDF5' };
  if (type.includes('E-Waste')) return { icon: 'hardware-chip-outline', color: '#F59E0B', bg: '#FFFBEB' };
  if (type.includes('Hazardous')) return { icon: 'warning-outline', color: '#EF4444', bg: '#FEF2F2' };
  return { icon: 'trash-outline', color: '#6B7280', bg: '#F3F4F6' };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkerHomeScreen() {
  const router = useRouter();
  const [pickups, setPickups] = useState<AssignedPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workerName, setWorkerName] = useState('Worker');
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Assigned Pickups ───────────────────────────────────────────────
  const fetchAssignedPickups = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/index' as any); return; }

      const res = await fetch(`${API_BASE_URL}/worker/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userName');
        router.replace('/index' as any);
        return;
      }

      if (!res.ok) throw new Error('Failed to load pickups.');

      const data = await res.json();
      setPickups(data.pickups || []);
      setWorkerName(data.worker_name || 'Worker');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAssignedPickups(); }, [fetchAssignedPickups]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to logout?')) return;
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userName');
      router.replace('/' as any);
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('userName');
          router.replace('/' as any);
        },
      },
    ]);
  };

  // ─── GPS Alert + Navigate ─────────────────────────────────────────────────
  const handleViewDetails = (pickupId: number) => {
    const trackRoute = `/(worker-tabs)/worker-track?pickup_id=${pickupId}` as any;
    // On web: no native GPS dialog — navigate directly
    if (Platform.OS === 'web') {
      router.push(trackRoute);
      return;
    }
    Alert.alert(
      '📍 Enable Location',
      'Please enable your GPS so the user can track your live progress during this pickup.',
      [
        {
          text: 'Enable Location',
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Location Permission Required',
                  'Please go to your phone Settings and enable location access for BinGo.',
                  [
                    { text: 'Cancel', style: 'cancel', onPress: () => router.push(trackRoute) },
                    { text: 'Open Settings', onPress: () => { Location.enableNetworkProviderAsync().catch(() => { }); router.push(trackRoute); } },
                  ]
                );
              } else {
                router.push(trackRoute);
              }
            } catch {
              router.push(trackRoute);
            }
          },
        },
        { text: 'Skip', style: 'cancel', onPress: () => router.push(trackRoute) },
      ]
    );
  };

  // ─── Render Pickup Card ───────────────────────────────────────────────────
  const renderItem = ({ item }: { item: AssignedPickup }) => {
    const statusCfg = getStatusConfig(item.status);
    const wasteCfg = getWasteIcon(item.waste_type);

    return (
      <View style={styles.card}>
        {/* Top Row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.wasteIconBox, { backgroundColor: wasteCfg.bg }]}>
            <Ionicons name={wasteCfg.icon as any} size={22} color={wasteCfg.color} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.pickupId}>Pickup ID: #PK{item.pickup_id.toString().padStart(4, '0')}</Text>
            <Text style={styles.wasteType}>
              Waste Type: <Text style={styles.wasteTypeBold}>{item.waste_type}</Text>
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}> {item.location_text}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Row */}
        <View style={styles.cardBottomRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewBtn}
            activeOpacity={0.8}
            onPress={() => handleViewDetails(item.pickup_id)}
          >
            <Text style={styles.viewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#1E6F43" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Empty State ──────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="checkmark-done-circle-outline" size={52} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>All Clear!</Text>
      <Text style={styles.emptyText}>No pickups assigned to you right now.</Text>
    </View>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>BinGo</Text>
          <Text style={styles.headerSub}>Assigned Pickups</Text>
          <View style={styles.workerBadge}>
            <Ionicons name="person-circle-outline" size={14} color="#1E6F43" style={{ marginRight: 4 }} />
            <Text style={styles.workerBadgeText}>Logged in as: {workerName} (Worker)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="power" size={15} color="#fff" style={{ marginRight: 5 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E6F43" />
          <Text style={styles.loadingText}>Loading your assignments...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAssignedPickups()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => item.pickup_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAssignedPickups(true)}
              colors={['#1E6F43']}
              tintColor="#1E6F43"
            />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F7F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#E8F7F0',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A5C38',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#9CA3AF',
  },
  workerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  workerBadgeText: {
    fontSize: 12,
    color: '#1E6F43',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wasteIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardMeta: {
    flex: 1,
  },
  pickupId: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  wasteType: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 5,
  },
  wasteTypeBold: {
    fontWeight: '700',
    color: '#1F2937',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E6F43',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E6F43',
    marginRight: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#1E6F43',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});