import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { API_BASE_URL } from '../../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type PickupDetail = {
  pickup_id: number;
  waste_type: string;
  location_text: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
  user_name?: string;
  user_phone?: string;
  latitude?: number | null;
  longitude?: number | null;
};

// ─── Status Config ────────────────────────────────────────────────────────────
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS': return { color: '#F59E0B', bg: '#FFFBEB', label: 'IN PROGRESS' };
    case 'COMPLETED':   return { color: '#10B981', bg: '#ECFDF5', label: 'COMPLETED'   };
    default:            return { color: '#3B82F6', bg: '#EFF6FF', label: 'ASSIGNED'    };
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkerTrackScreen() {
  const router = useRouter();
  const { pickup_id } = useLocalSearchParams<{ pickup_id: string }>();

  const [pickup, setPickup]         = useState<PickupDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // ─── Fetch Pickup Detail ──────────────────────────────────────────────────
  const fetchPickup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/index' as any); return; }

      const res = await fetch(`${API_BASE_URL}/worker/pickup/${pickup_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userName');
        router.replace('/index' as any);
        return;
      }
      if (!res.ok) throw new Error('Failed to load pickup detail.');
      const data = await res.json();
      setPickup(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [pickup_id]);

  // ─── Start Live Location Tracking ────────────────────────────────────────
  const startLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Stop any existing watcher before starting a new one
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }

      setIsSharingLocation(true);

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,   // every 5 seconds
          distanceInterval: 5,  // or every 5 metres
        },
        async (loc) => {
          const token = await AsyncStorage.getItem('token');
          if (!token || !pickup_id) return;
          try {
            await fetch(`${API_BASE_URL}/worker/location`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pickup_id: Number(pickup_id),
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              }),
            });
          } catch {
            // silent – location updates are best-effort
          }
        }
      );
    } catch {
      setIsSharingLocation(false);
    }
  }, [pickup_id]);

  // ─── Stop Tracking ────────────────────────────────────────────────────────
  const stopLocationTracking = () => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    setIsSharingLocation(false);
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPickup();
    return () => stopLocationTracking();
  }, [fetchPickup]);

  // Start/stop tracking based on pickup status
  useEffect(() => {
    if (!pickup) return;
    if (pickup.status === 'ASSIGNED' || pickup.status === 'IN_PROGRESS') {
      startLocationTracking(); // always restart on status change
    } else {
      stopLocationTracking();
    }
  }, [pickup?.status]);

  // ─── Update Status ────────────────────────────────────────────────────────
  const updateStatus = async (newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'INVALID') => {
    const actionLabel = newStatus === 'COMPLETED' ? 'Mark as Completed'
      : newStatus === 'INVALID' ? 'Mark as Invalid'
      : 'Mark as In Progress';

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()}?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            actionLabel,
            `Are you sure you want to ${actionLabel.toLowerCase()}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Confirm', style: newStatus === 'INVALID' ? 'destructive' : 'default', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/worker/pickup/${pickup_id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus === 'INVALID' ? 'PENDING' : newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status.');
      await fetchPickup();
      if (Platform.OS === 'web') {
        window.alert(`Pickup ${actionLabel.toLowerCase()} successfully.`);
      } else {
        Alert.alert('Success', `Pickup ${actionLabel.toLowerCase()} successfully.`);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err.message || 'Could not update status.');
      } else {
        Alert.alert('Error', err.message || 'Could not update status.');
      }
    } finally {
      setUpdating(false);
    }
  };

  // ─── Open Maps Navigation ─────────────────────────────────────────────────
  const handleNavigate = () => {
    if (!pickup) return;
    if (pickup.latitude && pickup.longitude) {
      const lat = pickup.latitude;
      const lng = pickup.longitude;
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      Linking.openURL(mapsUrl).catch(() =>
        Linking.openURL(`https://www.google.com/maps/@${lat},${lng},17z`)
      );
      return;
    }
    const query = encodeURIComponent(pickup.location_text);
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    );
  };

  // ─── Detail Row ───────────────────────────────────────────────────────────
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1A5C38" />
        </TouchableOpacity>
        <Text style={styles.logo}>BinGo</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Live Location Banner */}
      {isSharingLocation && (
        <View style={styles.locationBanner}>
          <View style={styles.locationBannerDot} />
          <Text style={styles.locationBannerText}>📡 Sharing live location with user</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E6F43" />
          <Text style={styles.loadingText}>Loading pickup details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPickup}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : pickup ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Pickup Details Card ── */}
          <View style={styles.card}>
            <DetailRow label="Pickup ID:"       value={`#PK${pickup.pickup_id.toString().padStart(4, '0')}`} />
            <DetailRow label="Waste Type:"      value={pickup.waste_type}    />
            <DetailRow label="Requested On:"    value={pickup.created_at}    />
            <DetailRow label="Pickup Location:" value={pickup.location_text} />
          </View>

          {/* ── Map / Navigation Card ── */}
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <View style={styles.mapCard}>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="location-outline" size={32} color="#9CA3AF" />
              <Text style={styles.mapText}>Map view / Navigation</Text>
            </View>
            <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate} activeOpacity={0.85}>
              <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.navigateBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>

          {/* ── Current Status ── */}
          {pickup.status !== 'COMPLETED' && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                {(() => {
                  const cfg = getStatusConfig(pickup.status);
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {pickup.status === 'ASSIGNED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.progressBtn]}
                    onPress={() => updateStatus('IN_PROGRESS')}
                    disabled={updating}
                    activeOpacity={0.85}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="sync" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.actionBtnText}>Mark as In Progress</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn]}
                  onPress={() => updateStatus('COMPLETED')}
                  disabled={updating}
                  activeOpacity={0.85}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnText}>Mark as Completed</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.invalidBtn]}
                  onPress={() => updateStatus('INVALID')}
                  disabled={updating}
                  activeOpacity={0.85}
                >
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>Mark as Invalid</Text>
                  </>
                </TouchableOpacity>

                <Text style={styles.confirmNote}>
                  Confirmation dialog will appear before critical actions.
                </Text>
              </View>
            </>
          )}

          {/* Completed State */}
          {pickup.status === 'COMPLETED' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-done-circle" size={32} color="#10B981" style={{ marginBottom: 8 }} />
              <Text style={styles.completedTitle}>Pickup Completed!</Text>
              <Text style={styles.completedSub}>This pickup has been successfully completed.</Text>
            </View>
          )}

        </ScrollView>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F7F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F7F0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontSize: 24, fontWeight: '800', color: '#1A5C38', letterSpacing: -0.5 },

  // Live location banner
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  locationBannerDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#10B981', marginRight: 8,
  },
  locationBannerText: { fontSize: 13, color: '#065F46', fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 8 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 14, color: '#1F2937', fontWeight: '600', flex: 1.5, textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  mapCard: { marginBottom: 24 },
  mapPlaceholder: {
    backgroundColor: '#F3F4F6', borderRadius: 14, height: 130,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  mapText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E6F43', borderRadius: 14, paddingVertical: 15,
    shadowColor: '#1E6F43', shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  navigateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  actionsContainer: { gap: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15,
    shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  progressBtn: { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' },
  completeBtn: { backgroundColor: '#1E6F43', shadowColor: '#1E6F43' },
  invalidBtn:  { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  confirmNote: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  completedBanner: {
    backgroundColor: '#ECFDF5', borderRadius: 16, padding: 28,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  completedTitle: { fontSize: 20, fontWeight: '800', color: '#065F46', marginBottom: 6 },
  completedSub: { fontSize: 14, color: '#047857', textAlign: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  errorText: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 20, backgroundColor: '#1E6F43', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});