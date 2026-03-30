import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Reusing and expanding theme colors
const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  emerald: '#10B981',
  white: '#FFFFFF',
  background: '#F8F9FA', // Softer background so white cards pop
  black: '#000000',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  statusConfirmed: '#10B981', 
};

// Helper to get dynamic styles based on waste type
const getWasteStyles = (type: string) => {
  if (type.includes('Dry') || type.includes('Recyclable')) 
    return { icon: 'cube-outline', color: '#3B82F6', bg: '#EFF6FF' }; // Blue
  if (type.includes('Plastic')) 
    return { icon: 'water-outline', color: '#06B6D4', bg: '#ECFEFF' }; // Cyan/Teal
  if (type.includes('Organic') || type.includes('Wet')) 
    return { icon: 'leaf-outline', color: '#10B981', bg: '#ECFDF5' }; // Emerald
  if (type.includes('E-Waste')) 
    return { icon: 'hardware-chip-outline', color: '#F59E0B', bg: '#FFFBEB' }; // Amber
  if (type.includes('Hazardous')) 
    return { icon: 'warning-outline', color: '#EF4444', bg: '#FEF2F2' }; // Red
  
  return { icon: 'trash-outline', color: '#6B7280', bg: '#F3F4F6' }; // Default Gray
};

// Mock Data
const MOCK_HISTORY = [
  {
    id: '1',
    wasteType: 'Dry Waste',
    location: 'Anna Nagar, Chennai',
    date: '20 Sep 2025',
    status: 'COMPLETED',
  },
  {
    id: '2',
    wasteType: 'Dry Waste',
    location: 'Anna Nagar, Chennai',
    date: '20 Sep 2025',
    status: 'COMPLETED',
  },
  {
    id: '3',
    wasteType: 'Plastic Waste',
    location: 'T. Nagar, Chennai',
    date: '18 Sep 2025',
    status: 'COMPLETED',
  },
];

export default function HistoryScreen() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState(MOCK_HISTORY); 

  const renderItem = ({ item }: { item: typeof MOCK_HISTORY[0] }) => {
    const { icon, color, bg } = getWasteStyles(item.wasteType);

    return (
      <View style={styles.card}>
        {/* Dynamic Icon */}
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        {/* Middle Column: Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.wasteTypeText}>{item.wasteType}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.gray500} style={{ marginRight: 4 }} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        {/* Right Column: Date & Status */}
        <View style={styles.cardAction}>
          <Text style={styles.dateText}>{item.date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.statusConfirmed + '15' }]}>
            <Ionicons name="checkmark-done" size={14} color={COLORS.statusConfirmed} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: COLORS.statusConfirmed }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.gray400} />
      </View>
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptyText}>Your past waste pickups will appear here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Modern Gradient Header */}
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
          <Text style={styles.headerTitle}>Pickup History</Text>
          <View style={{ width: 28 }} /> {/* Spacer to keep title centered perfectly */}
        </View>
      </LinearGradient>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <FlatList
          data={historyData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, 
  },
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
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100, 
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    
    // Smooth, premium shadow
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
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  wasteTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray800,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '500',
    flexShrink: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Enhanced Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray800,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray500,
    fontWeight: '500',
    textAlign: 'center',
  },
});