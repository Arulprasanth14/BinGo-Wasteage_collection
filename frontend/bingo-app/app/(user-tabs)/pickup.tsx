import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Unified Theme Colors matching history.tsx
const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  emerald: '#10B981',
  background: '#F8F9FA', // Off-white background for card contrast
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  yellow: '#F59E0B',
  green: '#10B981',
};

// Helper component for rows in the Info Card
const InfoRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelContainer}>
      <Ionicons name={icon as any} size={16} color={COLORS.gray500} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function TrackPickupScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Modern Gradient Header (Matching history.tsx) */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Pickup</Text>
          <View style={{ width: 40 }} /> {/* Spacer to keep title centered perfectly */}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- Pickup Info Card --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pickup Details</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>#PK1023</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow icon="cube-outline" label="Waste Type" value="Dry Waste" />
          <InfoRow icon="calendar-outline" label="Requested On" value="20 Sep 2025" />
          <InfoRow icon="location-outline" label="Location" value="Anna Nagar, Chennai" />
        </View>

        {/* --- Current Status Stepper Card --- */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.cardTitle}>Current Status</Text>
            <View style={styles.yellowPill}>
              <Ionicons name="sync" size={12} color={COLORS.yellow} style={{ marginRight: 4 }} />
              <Text style={styles.yellowPillText}>IN PROGRESS</Text>
            </View>
          </View>

          {/* Stepper Progress Bar */}
          <View style={styles.stepperContainer}>
            {/* Absolute background lines */}
            <View style={styles.linesBackground}>
              <View style={[styles.lineSegment, styles.lineActive]} /> {/* Req -> Assig */}
              <View style={[styles.lineSegment, styles.lineActive]} /> {/* Assig -> InProg */}
              <View style={styles.lineSegment} /> {/* InProg -> Comp */}
            </View>

            {/* Step 1: Requested */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.stepTextActive}>Requested</Text>
            </View>
            
            {/* Step 2: Assigned */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.stepTextActive}>Assigned</Text>
            </View>

            {/* Step 3: In Progress */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleProgress]}>
                <View style={styles.innerDot} />
              </View>
              <Text style={[styles.stepTextActive, { color: COLORS.yellow }]}>In Progress</Text>
            </View>

            {/* Step 4: Completed */}
            <View style={styles.stepItem}>
              <View style={styles.stepCircle} />
              <Text style={styles.stepText}>Completed</Text>
            </View>
          </View>
        </View>

        {/* --- Live Tracking Card --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Tracking</Text>
          
          <View style={styles.mapPlaceholder}>
            <View style={styles.pulseRing}>
              <View style={styles.mapIconCircle}>
                <Ionicons name="location" size={24} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.mapText}>Worker location updating...</Text>
            <Text style={styles.helperText}>Live updates every few seconds</Text>
          </View>
        </View>

        {/* --- Assigned Worker Card --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Worker</Text>
          <View style={styles.workerRow}>
            <View style={styles.workerAvatar}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>Ramesh</Text>
              <Text style={styles.workerRole}>Waste Collector</Text>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, 
  },
  // Modern Header matching history.tsx
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  
  // Content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100, 
  },
  
  // Universal Card Style
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray800,
  },
  badge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: 16,
  },
  
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 140, 
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
    textAlign: 'right',
  },

  // Status Stepper Card
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  yellowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.yellow + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.yellow + '30',
  },
  yellowPillText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 5,
  },
  linesBackground: {
    position: 'absolute',
    top: 14, 
    left: 40,
    right: 40,
    height: 2,
    flexDirection: 'row',
  },
  lineSegment: {
    flex: 1,
    backgroundColor: COLORS.gray200,
  },
  lineActive: {
    backgroundColor: COLORS.green,
  },
  stepItem: {
    alignItems: 'center',
    width: 70, 
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  stepCircleActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  stepCircleProgress: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.yellow,
    borderWidth: 2,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.yellow,
  },
  stepText: {
    fontSize: 11,
    color: COLORS.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepTextActive: {
    fontSize: 11,
    color: COLORS.gray800,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Live Tracking Map Area
  mapPlaceholder: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  pulseRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapText: {
    color: COLORS.gray800,
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 6,
  },
  
  // Worker Section
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  workerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray800,
  },
  workerRole: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});