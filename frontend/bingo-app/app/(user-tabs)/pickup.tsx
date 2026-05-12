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
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';

// ─── Config ───────────────────────────────────────────────────────────────────
import { API_BASE_URL } from '../../config/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  background: '#F8F9FA',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  yellow: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',
  purple: '#8B5CF6',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Worker = {
  worker_id: number;
  name: string;
  phone: string;
};

type PickupDetail = {
  pickup_id: number;
  waste_type: string;
  location_text: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
  worker: Worker | null;
};

// ─── Stepper Config ───────────────────────────────────────────────────────────
const STEPS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
const STEP_LABELS = ['Requested', 'Assigned', 'In Progress', 'Completed'];

const getStepIndex = (status: string) => STEPS.indexOf(status);

const getStatusPill = (status: string) => {
  switch (status) {
    case 'COMPLETED': return { color: COLORS.green, icon: 'checkmark-done', label: 'COMPLETED' };
    case 'IN_PROGRESS': return { color: COLORS.yellow, icon: 'sync', label: 'IN PROGRESS' };
    case 'ASSIGNED': return { color: COLORS.purple, icon: 'person', label: 'ASSIGNED' };
    default: return { color: COLORS.yellow, icon: 'time-outline', label: 'PENDING' };
  }
};

// ─── Helper: InfoRow ──────────────────────────────────────────────────────────
const InfoRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelContainer}>
      <Ionicons name={icon as any} size={16} color={COLORS.gray500} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── In-App Notification Banner (replaces expo-notifications for Expo Go) ─────────
type BannerConfig = { title: string; body: string; color: string };

const STATUS_BANNERS: Record<string, BannerConfig> = {
  ASSIGNED: { title: '🚛 Worker Assigned', body: 'A worker has been assigned to your pickup.', color: '#8B5CF6' },
  IN_PROGRESS: { title: '📍 Worker On The Way', body: 'Your waste is being collected right now.', color: '#F59E0B' },
  COMPLETED: { title: '✅ Pickup Completed', body: 'Your pickup request has been completed.', color: '#10B981' },
};

function NotificationBanner({ config, onHide }: { config: BannerConfig | null; onHide: () => void }) {
  const slideY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!config) return;
    Animated.sequence([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
      Animated.delay(3000),
      Animated.timing(slideY, { toValue: -120, useNativeDriver: true, duration: 300 }),
    ]).start(() => onHide());
  }, [config]);

  if (!config) return null;
  return (
    <Animated.View style={[styles.banner, { backgroundColor: config.color, transform: [{ translateY: slideY }] }]}>
      <Text style={styles.bannerTitle}>{config.title}</Text>
      <Text style={styles.bannerBody}>{config.body}</Text>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrackPickupScreen() {
  const router = useRouter();
  const { pickup_id } = useLocalSearchParams<{ pickup_id: string }>();

  const [pickup, setPickup] = useState<PickupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPickup, setNoPickup] = useState(false);

  // Worker live location
  const [workerLocation, setWorkerLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Feedback modal
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  // Track last known status to trigger banner only on change
  const lastStatusRef = useRef<string | null>(null);
  const [banner, setBanner] = useState<BannerConfig | null>(null);

  // ─── Fetch Logic ─────────────────────────────────────────────────────────────
  const fetchPickup = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setNoPickup(false);

      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }

      let url = '';

      if (pickup_id) {
        // Came from History card tap → fetch specific pickup
        url = `${API_BASE_URL}/pickup/${pickup_id}`;
      } else {
        // Opened directly from tab bar → fetch latest active pickup
        url = `${API_BASE_URL}/pickup/active`;
      }

      const response = await fetch(url, {
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

      if (response.status === 404) throw new Error('Pickup not found.');
      if (!response.ok) throw new Error('Failed to load pickup details.');

      const data = await response.json();

      if (pickup_id) {
        // Direct pickup detail response
        setPickup(data);
      } else {
        // Active pickup response: { pickup: {...} | null }
        if (data.pickup) {
          setPickup(data.pickup);
        } else {
          setNoPickup(true);
          setPickup(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pickup_id]);

  // ─── Status-change banner ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!pickup) return;
    const prev = lastStatusRef.current;
    if (prev !== null && prev !== pickup.status) {
      setBanner(STATUS_BANNERS[pickup.status] ?? null);
    }
    lastStatusRef.current = pickup.status;
  }, [pickup?.status]);

  // ─── Poll worker location when ASSIGNED or IN_PROGRESS ──────────────────────
  useEffect(() => {
    if (!pickup) return;
    const isActive = pickup.status === 'IN_PROGRESS' || pickup.status === 'ASSIGNED';
    if (!isActive) return;

    const fetchLocation = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/pickup/${pickup.pickup_id}/worker-location`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.available) setWorkerLocation({ latitude: data.latitude, longitude: data.longitude });
      } catch { /* silent */ }
    };

    fetchLocation(); // immediate first fetch
    const loc = setInterval(fetchLocation, 5000); // poll every 5s
    return () => clearInterval(loc);
  }, [pickup?.status, pickup?.pickup_id]);

  // ─── Feedback check on load ───────────────────────────────────────────────────
  useEffect(() => {
    if (!pickup || pickup.status !== 'COMPLETED') return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/pickup/${pickup.pickup_id}/feedback`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.submitted) setFeedbackDone(true);
      } catch { /* silent */ }
    })();
  }, [pickup?.status, pickup?.pickup_id]);

  useEffect(() => {
    fetchPickup();
    const interval = setInterval(() => fetchPickup(true), 10000);
    return () => clearInterval(interval);
  }, [fetchPickup]);

  // ─── Submit Feedback ──────────────────────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    try {
      setFeedbackSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/pickup/${pickup!.pickup_id}/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }),
      });
      if (res.ok) {
        setFeedbackDone(true);
        setFeedbackVisible(false);
        Alert.alert('Thank you!', 'Your feedback has been submitted.');
      } else {
        const d = await res.json();
        Alert.alert('Error', d.detail || 'Could not submit feedback.');
      }
    } catch { Alert.alert('Error', 'Network error.'); }
    finally { setFeedbackSubmitting(false); }
  };

  // ─── Stepper ──────────────────────────────────────────────────────────────────
  const renderStepper = (status: string) => {
    const currentStep = getStepIndex(status);
    const pill = getStatusPill(status);

    return (
      <View style={styles.card}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.cardTitle}>Current Status</Text>
          <View style={[styles.statusPill, { backgroundColor: pill.color + '15', borderColor: pill.color + '40' }]}>
            <Ionicons name={pill.icon as any} size={12} color={pill.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusPillText, { color: pill.color }]}>{pill.label}</Text>
          </View>
        </View>

        <View style={styles.stepperContainer}>
          {/* Connecting lines */}
          <View style={styles.linesBackground}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.lineSegment, i < currentStep && styles.lineActive]} />
            ))}
          </View>

          {/* Steps */}
          {STEPS.map((step, index) => {
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <View key={step} style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleActive,
                  isCurrent && (status === 'COMPLETED' ? styles.stepCircleActive : styles.stepCircleProgress),
                ]}>
                  {isDone || (isCurrent && status === 'COMPLETED') ? (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  ) : isCurrent ? (
                    <View style={[styles.innerDot, { backgroundColor: pill.color }]} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  (isDone || isCurrent) && {
                    color: isCurrent ? pill.color : COLORS.gray800,
                    fontWeight: '600',
                  },
                ]}>
                  {STEP_LABELS[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── No Active Pickup Placeholder ─────────────────────────────────────────────
  const renderNoPickup = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchPickup(true)}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.noPickupContainer}>
        {/* Icon */}
        <View style={styles.noPickupIconCircle}>
          <Ionicons name="car-outline" size={52} color={COLORS.gray400} />
        </View>

        {/* Text */}
        <Text style={styles.noPickupTitle}>No Active Pickup</Text>
        <Text style={styles.noPickupSubText}>
          You don't have any ongoing pickup requests right now.
        </Text>

        {/* Divider */}
        <View style={styles.noPickupDivider} />

        {/* Tips */}
        <View style={styles.tipRow}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
          <Text style={styles.tipText}>Request a new pickup from the Home screen</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
          <Text style={styles.tipText}>Check your past pickups in the History tab</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.goHomeButton} onPress={() => router.replace('/(user-tabs)' as any)} activeOpacity={0.85}>
          <Ionicons name="home-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.goHomeText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ─── Error State ──────────────────────────────────────────────────────────────
  const renderError = () => (
    <View style={styles.centerContainer}>
      <View style={[styles.noPickupIconCircle, { backgroundColor: '#FEF2F2' }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.red} />
      </View>
      <Text style={styles.noPickupTitle}>Oops!</Text>
      <Text style={styles.noPickupSubText}>{error}</Text>
      <TouchableOpacity style={styles.goHomeButton} onPress={() => fetchPickup()} activeOpacity={0.85}>
        <Ionicons name="refresh-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
        <Text style={styles.goHomeText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Header ───────────────────────────────────────────────────────────────────
  const renderHeader = () => (
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
        <Text style={styles.headerTitle}>Track Pickup</Text>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {renderHeader()}

      {/* In-App Notification Banner */}
      <NotificationBanner config={banner} onHide={() => setBanner(null)} />

      {/* Loading */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading pickup details...</Text>
        </View>

      ) : error ? renderError()

        : noPickup ? renderNoPickup()

          : pickup ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchPickup(true)}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
            >
              {/* ── Pickup Info Card ── */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Pickup Details</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{pickup.pickup_id.toString().padStart(4, '0')}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <InfoRow icon="cube-outline" label="Waste Type" value={pickup.waste_type} />
                <InfoRow icon="calendar-outline" label="Requested On" value={pickup.created_at} />
                <InfoRow icon="location-outline" label="Location" value={pickup.location_text} />
              </View>

              {/* ── Status Stepper ── */}
              {renderStepper(pickup.status)}

              {/* ── Live Tracking Card ── */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Live Tracking</Text>
                {pickup.status === 'IN_PROGRESS' && workerLocation && Platform.OS !== 'web' ? (
                  <MapView
                    style={styles.map}
                    region={{
                      latitude: workerLocation.latitude,
                      longitude: workerLocation.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={workerLocation}
                      title="Worker Location"
                      description="Live location"
                    />
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <View style={styles.pulseRing}>
                      <View style={styles.mapIconCircle}>
                        <Ionicons
                          name={pickup.status === 'IN_PROGRESS' ? 'location' : 'location-outline'}
                          size={24}
                          color={pickup.status === 'IN_PROGRESS' ? COLORS.primary : COLORS.gray400}
                        />
                      </View>
                    </View>
                    {pickup.status === 'IN_PROGRESS' ? (
                      <>
                        <Text style={styles.mapText}>Fetching worker location...</Text>
                        <Text style={styles.helperText}>Updates every 8 seconds</Text>
                      </>
                    ) : pickup.status === 'COMPLETED' ? (
                      <Text style={styles.mapText}>Pickup completed ✓</Text>
                    ) : (
                      <>
                        <Text style={styles.mapText}>Tracking not started</Text>
                        <Text style={styles.helperText}>Available once worker is en route</Text>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* ── Worker Card ── */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Assigned Worker</Text>
                {pickup.worker ? (
                  <View style={styles.workerRow}>
                    <View style={styles.workerAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{pickup.worker.name}</Text>
                      <Text style={styles.workerRole}>Waste Collector</Text>
                    </View>
                    {/* Feedback button — show only on COMPLETED */}
                    {pickup.status === 'COMPLETED' && (
                      feedbackDone ? (
                        <View style={[styles.callButton, { backgroundColor: COLORS.green }]}>
                          <Ionicons name="checkmark" size={20} color={COLORS.white} />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.callButton, { backgroundColor: '#8B5CF6' }]}
                          onPress={() => setFeedbackVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="star" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ) : (
                  <View style={styles.noWorkerContainer}>
                    <Ionicons name="person-outline" size={32} color={COLORS.gray400} />
                    <Text style={styles.noWorkerText}>No worker assigned yet</Text>
                    <Text style={styles.noWorkerSubText}>We'll assign one shortly</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : null}

      {/* ── Feedback Modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Rate Your Worker</Text>
            <Text style={styles.modalSub}>How was your pickup experience?</Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setFeedbackRating(s)} activeOpacity={0.7}>
                  <Ionicons
                    name={s <= feedbackRating ? 'star' : 'star-outline'}
                    size={36}
                    color={s <= feedbackRating ? '#F59E0B' : COLORS.gray400}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={COLORS.gray400}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, feedbackSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitFeedback}
              disabled={feedbackSubmitting}
              activeOpacity={0.85}
            >
              {feedbackSubmitting
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.submitBtnText}>Submit Feedback</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.gray500, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  backButton: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray500, fontWeight: '500' },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray800 },
  badge: { backgroundColor: COLORS.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.gray700 },
  divider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: 16 },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center', width: 140 },
  infoIcon: { marginRight: 8 },
  infoLabel: { fontSize: 14, color: COLORS.gray500, fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.gray800, textAlign: 'right' },

  // Stepper
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', paddingHorizontal: 5 },
  linesBackground: { position: 'absolute', top: 14, left: 40, right: 40, height: 2, flexDirection: 'row' },
  lineSegment: { flex: 1, backgroundColor: COLORS.gray200 },
  lineActive: { backgroundColor: COLORS.green },
  stepItem: { alignItems: 'center', width: 70 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 2, borderColor: COLORS.gray200,
  },
  stepCircleActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  stepCircleProgress: { backgroundColor: COLORS.white, borderColor: COLORS.yellow, borderWidth: 2 },
  innerDot: { width: 10, height: 10, borderRadius: 5 },
  stepText: { fontSize: 11, color: COLORS.gray400, fontWeight: '500', textAlign: 'center' },

  // Live Tracking
  mapPlaceholder: {
    backgroundColor: COLORS.gray100, borderRadius: 12, padding: 30,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
    borderWidth: 1, borderColor: COLORS.gray200, borderStyle: 'dashed',
  },
  pulseRing: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  mapIconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  mapText: { color: COLORS.gray800, fontSize: 15, fontWeight: '600' },
  helperText: { fontSize: 13, color: COLORS.gray500, marginTop: 6 },

  // Worker
  workerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  workerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 16, fontWeight: '700', color: COLORS.gray800 },
  workerRole: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  callButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  noWorkerContainer: { alignItems: 'center', paddingVertical: 20 },
  noWorkerText: { fontSize: 15, fontWeight: '600', color: COLORS.gray600, marginTop: 10 },
  noWorkerSubText: { fontSize: 13, color: COLORS.gray400, marginTop: 4 },

  // Banner
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 14, paddingHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  bannerTitle: { color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 2 },
  bannerBody: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  // Real map
  map: { width: '100%', height: 220, borderRadius: 12, marginTop: 16, overflow: 'hidden' },

  // Feedback modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.gray800, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.gray500, marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  commentInput: {
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 12,
    padding: 12, fontSize: 14, color: COLORS.gray800, backgroundColor: COLORS.gray100,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // No Active Pickup
  noPickupContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  noPickupIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  noPickupTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray800, marginBottom: 10 },
  noPickupSubText: { fontSize: 14, color: COLORS.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  noPickupDivider: { width: '80%', height: 1, backgroundColor: COLORS.gray200, marginBottom: 24 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  tipText: { fontSize: 14, color: COLORS.gray600, fontWeight: '500', flex: 1 },
  goHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  goHomeText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});