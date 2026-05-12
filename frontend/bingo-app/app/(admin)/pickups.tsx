import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar,
  Platform, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/core'; // ← re-fetches on tab focus
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL as API } from '../../config/api';

type Pickup = {
  pickup_id: number; waste_type: string; location_text: string;
  status: string; created_at: string; user_name: string; worker_name?: string;
};
type Worker = { user_id: number; name: string; email: string };

const STATUS_FILTERS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'COMPLETED':   return { color: '#10B981', bg: '#ECFDF5' };
    case 'IN_PROGRESS': return { color: '#F59E0B', bg: '#FFFBEB' };
    case 'ASSIGNED':    return { color: '#8B5CF6', bg: '#F5F3FF' };
    default:            return { color: '#3B82F6', bg: '#EFF6FF' };
  }
};

export default function PickupsScreen() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  // Assign modal state
  const [assignPickup, setAssignPickup] = useState<Pickup | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [isReassign, setIsReassign] = useState(false); // true = reassign mode

  // ── Fetch (runs every time this tab becomes focused) ────────────────────────
  const fetchPickups = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const [pickupsRes, workersRes] = await Promise.all([
        fetch(`${API}/admin/all-pickups`, { headers: { Authorization: `Bearer ${token}` } }),
        // Always re-fetch workers so newly registered workers appear immediately
        fetch(`${API}/admin/workers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!pickupsRes.ok) throw new Error(`Pickups fetch failed (${pickupsRes.status})`);

      const [pickupsData, workersData] = await Promise.all([
        pickupsRes.json(),
        workersRes.ok ? workersRes.json() : Promise.resolve([]),
      ]);

      setPickups(pickupsData);
      setWorkers(workersData);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  // ── FIX 3: useFocusEffect – re-runs fetchPickups whenever tab is focused ────
  useFocusEffect(
    useCallback(() => {
      fetchPickups();
    }, [fetchPickups])
  );

  // ── Assign worker to pickup ─────────────────────────────────────────────────
  const handleAssign = async (workerId: number) => {
    if (!assignPickup) return;
    try {
      setAssigning(true);
      const token = await AsyncStorage.getItem('token');

      const endpoint = isReassign
        ? `${API}/admin/pickup/${assignPickup.pickup_id}/reassign`
        : `${API}/admin/pickup/${assignPickup.pickup_id}/assign`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_user_id: workerId }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { data = { detail: `Server error (HTTP ${res.status})` }; }

      if (!res.ok) {
        Alert.alert(isReassign ? 'Reassignment Failed' : 'Assignment Failed', data.detail || `Error ${res.status}`);
        return;
      }

      Alert.alert(
        isReassign ? '🔄 Reassigned!' : '✅ Assigned!',
        `Pickup #${assignPickup.pickup_id.toString().padStart(4, '0')} ${isReassign ? 'reassigned' : 'assigned'} to ${data.worker_name}`
      );
      setAssignPickup(null);
      fetchPickups();
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Could not connect to server.');
    } finally { setAssigning(false); }
  };

  const filtered = filter === 'ALL' ? pickups : pickups.filter(p => p.status === filter);

  // ── Pickup Card ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Pickup }) => {
    const st = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.pickupId}>
            #{item.pickup_id.toString().padStart(4, '0')} · {item.created_at}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.wasteType}>{item.waste_type}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={13} color="#6B7280" style={{ marginRight: 5 }} />
          <Text style={styles.infoText}>User: {item.user_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={13} color="#6B7280" style={{ marginRight: 5 }} />
          <Text style={styles.infoText} numberOfLines={1}>{item.location_text}</Text>
        </View>

        {item.worker_name ? (
          <View style={styles.infoRow}>
            <Ionicons name="construct-outline" size={13} color="#1E6F43" style={{ marginRight: 5 }} />
            <Text style={[styles.infoText, { color: '#1E6F43', fontWeight: '600' }]}>
              Worker: {item.worker_name}
            </Text>
          </View>
        ) : null}

        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => { setIsReassign(false); setAssignPickup(item); }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={15} color="#fff" style={{ marginRight: 7 }} />
            <Text style={styles.assignBtnText}>Assign Worker</Text>
          </TouchableOpacity>
        )}

        {(item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS') && (
          <TouchableOpacity
            style={[styles.assignBtn, styles.reassignBtn]}
            onPress={() => { setIsReassign(true); setAssignPickup(item); }}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={15} color="#fff" style={{ marginRight: 7 }} />
            <Text style={styles.assignBtnText}>Reassign Worker</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Main Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient
        colors={['#145231', '#1E6F43', '#4CAF50']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Pickup Management</Text>
        <Text style={styles.headerSub}>{pickups.length} total pickup{pickups.length !== 1 ? 's' : ''}</Text>
      </LinearGradient>

      {/* FIX 1: Filter Bar – explicit height so it doesn't overlay the list */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'ALL' ? 'All' : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1E6F43" />
            <Text style={styles.loadingText}>Loading pickups...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPickups()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.pickup_id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => fetchPickups(true)}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="cube-outline" size={52} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Pickups</Text>
                <Text style={styles.emptyText}>
                  No {filter !== 'ALL' ? filter.replace('_', ' ').toLowerCase() + ' ' : ''}pickups found.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Assign Worker Modal */}
      <Modal
        visible={!!assignPickup}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignPickup(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {isReassign ? 'Reassign Worker' : 'Assign Worker'}
              </Text>
              <TouchableOpacity onPress={() => setAssignPickup(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {assignPickup && (
              <Text style={styles.modalSub}>
                Pickup #{assignPickup.pickup_id.toString().padStart(4, '0')} · {assignPickup.waste_type}
                {isReassign && assignPickup.worker_name ? `\nCurrently: ${assignPickup.worker_name}` : ''}
              </Text>
            )}

            {workers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="construct-outline" size={40} color="#9CA3AF" />
                <Text style={{ color: '#6B7280', marginTop: 12, textAlign: 'center' }}>
                  No workers registered yet.{'\n'}Go to the Workers tab to add one.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {workers.map(w => (
                  <TouchableOpacity
                    key={w.user_id}
                    style={styles.workerOption}
                    onPress={() => handleAssign(w.user_id)}
                    disabled={assigning}
                    activeOpacity={0.75}
                  >
                    <View style={styles.workerOptionAvatar}>
                      <Text style={styles.workerOptionAvatarText}>{w.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workerOptionName}>{w.name}</Text>
                      <Text style={styles.workerOptionEmail}>{w.email}</Text>
                    </View>
                    {assigning
                      ? <ActivityIndicator size="small" color="#1E6F43" />
                      : <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    }
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  // FIX 1: Wrapper View with explicit height prevents filter overlaying the list
  filterBarWrapper: {
    height: 52,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'center',
  },
  filterBarContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#1E6F43', borderColor: '#1E6F43' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  // Explicit flex:1 so FlatList fills remaining space
  listContainer: { flex: 1 },
  list: { padding: 16, paddingBottom: 60 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pickupId: { fontSize: 11, fontWeight: '600', color: '#6B7280', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  wasteType: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#6B7280', flex: 1 },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E6F43', borderRadius: 10, paddingVertical: 10, marginTop: 12,
    shadowColor: '#1E6F43', shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  reassignBtn: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
  },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#1E6F43', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  workerOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  workerOptionAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  workerOptionAvatarText: { fontSize: 18, fontWeight: '800', color: '#1E6F43' },
  workerOptionName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  workerOptionEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
