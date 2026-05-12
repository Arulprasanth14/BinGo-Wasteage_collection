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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../config/api';

const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  emerald: '#10B981',
  white: '#FFFFFF',
  background: '#F8F9FA',
  black: '#000000',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  statusCompleted: '#10B981',
  statusPending: '#F59E0B',
  statusInProgress: '#3B82F6',
  statusAssigned: '#8B5CF6',
};

// ─── Waste Type Styles ────────────────────────────────────────────────────────
const getWasteStyles = (type: string) => {
  if (type.includes('Dry') || type.includes('Recyclable'))
    return { icon: 'cube-outline', color: '#3B82F6', bg: '#EFF6FF' };
  if (type.includes('Plastic'))
    return { icon: 'water-outline', color: '#06B6D4', bg: '#ECFEFF' };
  if (type.includes('Organic') || type.includes('Wet'))
    return { icon: 'leaf-outline', color: '#10B981', bg: '#ECFDF5' };
  if (type.includes('E-Waste'))
    return { icon: 'hardware-chip-outline', color: '#F59E0B', bg: '#FFFBEB' };
  if (type.includes('Hazardous'))
    return { icon: 'warning-outline', color: '#EF4444', bg: '#FEF2F2' };
  return { icon: 'trash-outline', color: '#6B7280', bg: '#F3F4F6' };
};

// ─── Status Badge Config ──────────────────────────────────────────────────────
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { color: COLORS.statusCompleted, icon: 'checkmark-done', label: 'COMPLETED' };
    case 'IN_PROGRESS':
      return { color: COLORS.statusInProgress, icon: 'sync', label: 'IN PROGRESS' };
    case 'ASSIGNED':
      return { color: COLORS.statusAssigned, icon: 'person', label: 'ASSIGNED' };
    default:
      return { color: COLORS.statusPending, icon: 'time-outline', label: 'PENDING' };
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PickupItem = {
  pickup_id: number;
  waste_type: string;
  location_text: string;
  status: string;
  created_at: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState<PickupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/pickup/history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data: PickupItem[] = await response.json();
      setHistoryData(data);
    } catch (err) {
      setError('Could not load history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── Render Item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: PickupItem }) => {
    const { icon, color, bg } = getWasteStyles(item.waste_type);
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push(`/(user-tabs)/pickup?pickup_id=${item.pickup_id}` as any)}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.wasteTypeText}>{item.waste_type}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.gray500} style={{ marginRight: 4 }} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location_text}</Text>
          </View>
        </View>

        {/* Date & Status */}
        <View style={styles.cardAction}>
          <Text style={styles.dateText}>{item.created_at}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Empty State ────────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.gray400} />
      </View>
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptyText}>Your past waste pickups will appear here.</Text>
    </View>
  );

  // ─── Error State ────────────────────────────────────────────────────────────
  const renderError = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF2F2' }]}>
        <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
      </View>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup History</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.mainContent}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : error ? (
          renderError()
        ) : (
          <FlatList
            data={historyData}
            keyExtractor={(item) => item.pickup_id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchHistory(true)}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 55,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  mainContent: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardAction: { alignItems: 'flex-end', justifyContent: 'center' },
  wasteTypeText: { fontSize: 16, fontWeight: '700', color: COLORS.gray800, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 13, color: COLORS.gray600, fontWeight: '500', flexShrink: 1 },
  dateText: { fontSize: 12, fontWeight: '600', color: COLORS.gray500, marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray500, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray800, marginBottom: 8 },
  emptyText: { fontSize: 15, color: COLORS.gray500, fontWeight: '500', textAlign: 'center' },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});