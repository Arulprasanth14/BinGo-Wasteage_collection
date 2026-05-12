import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_BASE_URL as BACKEND_URL } from '../../config/api';

const { width } = Dimensions.get('window');

// --- TYPES ---
interface LocationResult {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

// --- CONFIGURATION ---

const WASTE_TYPES = [
  { id: 1, label: 'Organic Waste', emoji: '🍂', color: '#4CAF50' },
  { id: 2, label: 'Dry / Recyclable', emoji: '♻️', color: '#2196F3' },
  { id: 3, label: 'E-Waste', emoji: '⚡', color: '#FFC107' },
  { id: 4, label: 'Hazardous', emoji: '⚠️', color: '#F44336' },
];

const COLORS = {
  primary: '#1E6F43',
  primaryLight: '#4CAF50',
  primaryDark: '#145231',
  emerald: '#10B981',
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  statusPending: '#F59E0B',
  statusConfirmed: '#10B981',
  shadow: 'rgba(0,0,0,0.08)',
};

// --- HEADER ---
const Header: React.FC<{ userName: string }> = ({ userName }) => (
  <LinearGradient
    colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.headerGradient}
  >
    <View style={[styles.headerContent, Platform.OS === 'android' && { paddingTop: (StatusBar.currentHeight ?? 24) + 12 }]}>
      <View style={styles.headerTop}>
        <View style={styles.logoBox}>
          <Text style={styles.leafEmoji}>🌱</Text>
        </View>
        <Text style={styles.appName}>BinGo</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>Eco</Text>
        </View>
      </View>
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingLabel}>Welcome back,</Text>
        <Text style={styles.greetingName}>{userName} 👋</Text>
        <Text style={styles.greetingSubtext}>Ready to schedule a pickup?</Text>
      </View>
    </View>
  </LinearGradient>
);

// --- LOCATION SEARCH ---
interface LocationSearchProps {
  selectedLocation: LocationResult | null;
  onSelectLocation: (location: LocationResult | null) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  isLoadingLocation: boolean;
  suggestions: LocationResult[];
  showSuggestions: boolean;
  onShowSuggestions: (show: boolean) => void;
  onClearSuggestions: () => void;
  onUseMyLocation?: () => void;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  selectedLocation,
  onSelectLocation,
  searchQuery,
  onSearchChange,
  suggestions,
  showSuggestions,
  onShowSuggestions,
  isLoadingLocation,
  onClearSuggestions,
  onUseMyLocation,
}) => {
  const hasSuggestions = showSuggestions && (suggestions.length > 0 || isLoadingLocation);

  return (
    <View style={styles.locationSection}>
      <Text style={styles.sectionLabel}>📍 Pickup Location</Text>

      {/* Search Input */}
      <View style={[
        styles.searchContainer,
        hasSuggestions && styles.searchContainerActive,
      ]}>
        <Text style={styles.searchIcon}>
          {isLoadingLocation ? '⏳' : '🔍'}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search village, town or landmark in TN..."
          placeholderTextColor={COLORS.gray500}
          value={searchQuery}
          onChangeText={(text) => {
            onSearchChange(text);
            onShowSuggestions(true);
            if (selectedLocation) onSelectLocation(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0) onShowSuggestions(true);
          }}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onSearchChange('');
              onSelectLocation(null);
              onClearSuggestions();
              onShowSuggestions(false);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Suggestions Dropdown */}
      {hasSuggestions && (
        <View style={styles.suggestionsDropdown}>
          {isLoadingLocation && suggestions.length === 0 ? (
            <View style={styles.suggestionsLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.suggestionsLoadingText}>Searching places...</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 220 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((location, index) => {
                const parts = location.name.split(',');
                const primaryName = parts[0]?.trim();
                const secondaryName = parts.slice(1).join(',').trim();
                return (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.suggestionItem,
                      index === suggestions.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => {
                      onSelectLocation(location);
                      onShowSuggestions(false);
                      onSearchChange(location.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIconCircle}>
                      <Text style={styles.suggestionIcon}>📍</Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {primaryName}
                      </Text>
                      {secondaryName ? (
                        <Text style={styles.suggestionAddress} numberOfLines={1}>
                          {secondaryName}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Use My Location Button — always visible below input */}
      {onUseMyLocation && !selectedLocation && (
        <TouchableOpacity
          style={styles.useLocationButton}
          onPress={() => {
            onShowSuggestions(false);
            onUseMyLocation();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.useLocationIcon}>🎯</Text>
          <Text style={styles.useLocationText}>
            {isLoadingLocation ? 'Detecting location...' : 'Use My Current Location'}
          </Text>
          {isLoadingLocation && (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      )}

      {/* Selected Location Chip */}
      {selectedLocation && (
        <View style={styles.selectedLocationChip}>
          <Text style={styles.selectedLocationIcon}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedLocationName} numberOfLines={1}>
              {selectedLocation.name.split(',')[0]}
            </Text>
            <Text style={styles.selectedLocationAddr} numberOfLines={1}>
              {selectedLocation.name.split(',').slice(1).join(',').trim() ||
                selectedLocation.address}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onSelectLocation(null);
              onSearchChange('');
              onClearSuggestions();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.selectedLocationClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// --- WASTE TYPE SELECTOR ---
interface WasteSelectorProps {
  selectedWasteTypes: number[];
  onWasteTypeChange: (types: number[]) => void;
  wasteModalVisible: boolean;
  onWasteModalChange: (visible: boolean) => void;
}

const WasteTypeSelector: React.FC<WasteSelectorProps> = ({
  selectedWasteTypes,
  onWasteTypeChange,
  wasteModalVisible,
  onWasteModalChange,
}) => (
  <>
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>🗑️ Waste Types</Text>
      <TouchableOpacity
        style={styles.wasteButton}
        onPress={() => onWasteModalChange(true)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          {selectedWasteTypes.length === 0 ? (
            <Text style={styles.wastePlaceholder}>Tap to select waste types...</Text>
          ) : (
            <>
              <Text style={styles.wasteCount}>{selectedWasteTypes.length} type(s) selected</Text>
              <View style={styles.wasteTagsContainer}>
                {selectedWasteTypes.map((typeId) => {
                  const waste = WASTE_TYPES.find((w) => w.id === typeId);
                  return (
                    <View key={typeId} style={[styles.wasteTag, { backgroundColor: (waste?.color ?? COLORS.primary) + '20', borderColor: waste?.color }]}>
                      <Text style={styles.wasteTagEmoji}>{waste?.emoji}</Text>
                      <Text style={[styles.wasteTagText, { color: waste?.color }]}>{waste?.label}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
        <Text style={styles.wasteArrow}>›</Text>
      </TouchableOpacity>
    </View>

    <Modal
      visible={wasteModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => onWasteModalChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.wasteModal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Waste Types</Text>
            <TouchableOpacity
              onPress={() => onWasteModalChange(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Choose all that apply</Text>

          <View style={styles.wasteOptionsContainer}>
            {WASTE_TYPES.map((waste) => {
              const isSelected = selectedWasteTypes.includes(waste.id);
              return (
                <TouchableOpacity
                  key={waste.id}
                  style={[
                    styles.wasteOption,
                    isSelected && [styles.wasteOptionSelected, { borderColor: waste.color }],
                  ]}
                  onPress={() => {
                    const updated = isSelected
                      ? selectedWasteTypes.filter((id) => id !== waste.id)
                      : [...selectedWasteTypes, waste.id];
                    onWasteTypeChange(updated);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.wasteOptionIcon, { backgroundColor: waste.color + '20' }]}>
                    <Text style={styles.wasteOptionEmoji}>{waste.emoji}</Text>
                  </View>
                  <Text style={styles.wasteOptionLabel}>{waste.label}</Text>
                  <View style={[styles.checkbox, isSelected && { backgroundColor: waste.color, borderColor: waste.color }]}>
                    {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onWasteTypeChange([])}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => onWasteModalChange(false)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}
              >
                <Text style={styles.doneButtonText}>Done ({selectedWasteTypes.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
);

// --- MAP PREVIEW ---
interface MapPreviewProps {
  location: LocationResult | null;
}

const MapPreview: React.FC<MapPreviewProps> = ({ location }) => {
  if (!location) return null;
  // react-native-maps renders as a stub on web (metro.config.js handles it)
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.mapPreviewContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#6B7280', fontSize: 14 }}>📍 {location.name}</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>Map preview not available on web</Text>
      </View>
    );
  }

  const region = {
    latitude: parseFloat(location.latitude),
    longitude: parseFloat(location.longitude),
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={styles.mapPreviewContainer}>
      <MapView
        style={styles.mapPreview}
        initialRegion={region}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title={location.name}
        />
      </MapView>
      <View style={styles.mapTapHint}>
        <Text style={styles.mapTapHintText}>Tap to adjust pin</Text>
      </View>
    </View>
  );
};

// --- STATUS INDICATOR ---
interface StatusIndicatorProps {
  status: 'idle' | 'pending' | 'confirmed';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusLabel = () => {
    switch (status) {
      case 'pending': return 'Awaiting Assignment';
      case 'confirmed': return 'Worker Assigned';
      default: return 'No Active Pickup';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return COLORS.statusPending;
      case 'confirmed': return COLORS.statusConfirmed;
      default: return COLORS.gray300;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      default: return '💤';
    }
  };

  return (
    <View style={styles.statusContainer}>
      <Text style={styles.sectionLabel}>📊 Current Status</Text>
      <View style={[styles.statusCard, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
        <Text style={styles.statusCardIcon}>{getStatusIcon()}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusSmallLabel}>Pickup Status</Text>
          <Text style={styles.statusValue}>{getStatusLabel()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
            {status === 'idle' ? 'Idle' : status === 'pending' ? 'Pending' : 'Confirmed'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- HELPERS ---

/**
 * Search locations strictly within Tamil Nadu using OpenStreetMap Nominatim.
 * Nominatim has deep coverage of Tamil Nadu — including small towns and villages
 * like Thirukallukundram, Mahabalipuram, Guduvanchery, etc.
 *
 * Strategy:
 *  1. Primary: countrycodes=in + bounded viewbox covering Tamil Nadu
 *  2. If < 2 results: fallback with just "Tamil Nadu" appended to query
 */
const searchTamilNaduLocations = async (query: string): Promise<LocationResult[]> => {
  // Bounding box for Tamil Nadu: SW(7.8,76.2) → NE(13.6,80.4)
  const TN_VIEWBOX = '76.2,7.8,80.4,13.6';
  const BASE = 'https://nominatim.openstreetmap.org/search';
  const HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'BinGoApp/1.0' };

  const toResults = (data: any[]): LocationResult[] =>
    data
      .filter((item) => {
        // Keep only results that are actually in Tamil Nadu
        const display = (item.display_name || '').toLowerCase();
        return display.includes('tamil nadu');
      })
      .map((item, idx) => {
        const parts = (item.display_name as string).split(',').map((p: string) => p.trim());
        // Build a clean display: "Place Name, District, Tamil Nadu"
        const cleanParts = parts.filter(
          (p) =>
            p.toLowerCase() !== 'india' &&
            !p.match(/^\d{6}$/) // remove pincodes
        );
        const displayName = cleanParts.slice(0, 4).join(', ');
        return {
          id: item.place_id ? String(item.place_id) : String(idx),
          name: displayName,
          address: item.display_name,
          latitude: item.lat,
          longitude: item.lon,
        };
      })
      .slice(0, 8);

  // --- Primary search: bounded to Tamil Nadu ---
  const primaryUrl =
    `${BASE}?q=${encodeURIComponent(query)}&format=json&addressdetails=1` +
    `&countrycodes=in&viewbox=${TN_VIEWBOX}&bounded=1&limit=10`;

  try {
    const res = await fetch(primaryUrl, { headers: HEADERS });
    const data = await res.json();
    const results = toResults(data);

    if (results.length >= 2) return results;

    // --- Fallback: append "Tamil Nadu India" to query (unbounded) ---
    const fallbackUrl =
      `${BASE}?q=${encodeURIComponent(query + ', Tamil Nadu, India')}&format=json` +
      `&addressdetails=1&countrycodes=in&limit=10`;
    const res2 = await fetch(fallbackUrl, { headers: HEADERS });
    const data2 = await res2.json();
    const fallback = toResults(data2);

    // Merge, deduplicate by place_id
    const merged = [...results, ...fallback];
    const seen = new Set<string>();
    return merged.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  } catch (err) {
    throw err;
  }
};

const rankLocations = (items: LocationResult[], query: string): LocationResult[] => {
  const q = query.toLowerCase().trim();
  if (!q) return items.slice(0, 8);
  return items
    .map((item) => {
      const name = item.name.toLowerCase();
      let score = 0;
      if (name === q) score += 6;
      if (name.startsWith(q)) score += 5;
      if (name.includes(q)) score += 3;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, 8);
};

// --- MAIN SCREEN ---
export default function BinGoHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [selectedWasteTypes, setSelectedWasteTypes] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wasteModalVisible, setWasteModalVisible] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupStatus, setPickupStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce 500ms after user stops typing (Nominatim rate-limit friendly)
    const timeout = setTimeout(async () => {
      try {
        setIsLoadingLocation(true);
        const results = await searchTamilNaduLocations(searchQuery);
        const ranked = rankLocations(results, searchQuery);
        setSuggestions(ranked);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Location search error:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingLocation(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load userName from storage
  useEffect(() => {
    AsyncStorage.getItem('userName').then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const handleUseMyLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      let addressText = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverse.length > 0) {
          const addr = reverse[0];
          const parts = [addr.name, addr.street, addr.district, addr.city].filter(Boolean);
          addressText = parts.join(', ');
        }
      } catch (e) {
        /* ignore reverse geocode error */
      }
      setSelectedLocation({
        id: 'current',
        name: addressText,
        address: addressText,
        latitude: loc.coords.latitude.toString(),
        longitude: loc.coords.longitude.toString(),
      });
      setSearchQuery(addressText);
      setShowSuggestions(false);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/docs`)
      .then(() => console.log('Backend reachable'))
      .catch(() => console.log('Backend NOT reachable'));
  }, []);

  const handleRequestPickup = async () => {
    if (!selectedLocation || selectedWasteTypes.length === 0) return;
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        waste_type: selectedWasteTypes.join(','),
        location_text: selectedLocation.address,
        latitude: selectedLocation.latitude ? parseFloat(selectedLocation.latitude) : null,
        longitude: selectedLocation.longitude ? parseFloat(selectedLocation.longitude) : null,
      };
      const res = await fetch(`${BACKEND_URL}/pickup/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setPickupStatus('pending');
        Alert.alert(
          '✅ Pickup Scheduled!',
          'Your request has been received. Tap OK to track your pickup.',
          [{ text: 'OK', onPress: () => router.push('/(user-tabs)/pickup' as any) }]
        );
        setSelectedWasteTypes([]);
        setNotes('');
        setSelectedLocation(null);
        setSearchQuery('');
      } else {
        Alert.alert('Error', data.detail || 'Pickup request failed.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Cannot connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedLocation !== null && selectedWasteTypes.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} translucent={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header userName={userName} />

        <View style={styles.mainContent}>

          {/* Active Status Banner */}
          {pickupStatus !== 'idle' && (
            <View style={[styles.statusBanner, {
              borderColor: pickupStatus === 'pending' ? COLORS.statusPending : COLORS.statusConfirmed,
              backgroundColor: pickupStatus === 'pending' ? '#FFFBEB' : '#ECFDF5',
            }]}>
              <Text style={styles.statusBannerIcon}>
                {pickupStatus === 'pending' ? '⏳' : '✅'}
              </Text>
              <View style={styles.statusBannerContent}>
                <Text style={[styles.statusBannerTitle, {
                  color: pickupStatus === 'pending' ? '#92400E' : '#065F46',
                }]}>
                  {pickupStatus === 'pending' ? 'Pickup Scheduled' : 'Pickup Confirmed!'}
                </Text>
                <Text style={[styles.statusBannerDesc, {
                  color: pickupStatus === 'pending' ? '#B45309' : '#047857',
                }]}>
                  {pickupStatus === 'pending'
                    ? 'Finding a nearby worker for you...'
                    : 'A worker has been assigned to your request.'}
                </Text>
              </View>
            </View>
          )}

          <StatusIndicator status={pickupStatus} />

          {/* Form Card */}
          <View style={styles.formCard}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.formCardHeader}
            >
              <Text style={styles.formCardTitle}>🚛 Schedule Pickup</Text>
              <Text style={styles.formCardSubtitle}>Fill in the details below</Text>
            </LinearGradient>

            <View style={styles.formCardBody}>

              {/* 1. Location Search */}
              <LocationSearch
                selectedLocation={selectedLocation}
                onSelectLocation={setSelectedLocation}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoadingLocation={isLoadingLocation}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                onShowSuggestions={setShowSuggestions}
                onClearSuggestions={() => setSuggestions([])}
                onUseMyLocation={handleUseMyLocation}
              />

              {/* 2. Map Preview */}
              {selectedLocation && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{ marginBottom: 16 }}
                  onPress={() => {
                    setMapRegion({
                      latitude: parseFloat(selectedLocation.latitude),
                      longitude: parseFloat(selectedLocation.longitude),
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    });
                    setMapPickerVisible(true);
                  }}
                >
                  <MapPreview location={selectedLocation} />
                </TouchableOpacity>
              )}

              {/* 3. Waste Types */}
              <WasteTypeSelector
                selectedWasteTypes={selectedWasteTypes}
                onWasteTypeChange={setSelectedWasteTypes}
                wasteModalVisible={wasteModalVisible}
                onWasteModalChange={setWasteModalVisible}
              />

              {/* 4. Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>📝 Additional Instructions (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g. Gate code 1234, ring bell twice..."
                  placeholderTextColor={COLORS.gray500}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* 5. Submit */}
              <TouchableOpacity
                onPress={handleRequestPickup}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={0.85}
                style={styles.submitWrapper}
              >
                <LinearGradient
                  colors={
                    isFormValid
                      ? [COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]
                      : [COLORS.gray300, COLORS.gray300]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.requestButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.requestButtonText}>
                        {isFormValid ? 'Request Pickup' : 'Complete Form to Continue'}
                      </Text>
                      {isFormValid && <Text style={styles.requestButtonArrow}>→</Text>}
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {!isFormValid && (
                <Text style={styles.formHint}>
                  {!selectedLocation
                    ? '⚠️ Please select a pickup location'
                    : '⚠️ Please select at least one waste type'}
                </Text>
              )}

            </View>
          </View>
        </View>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={mapPickerVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          {mapRegion && (
            <MapView
              style={{ flex: 1 }}
              region={mapRegion}
              onRegionChangeComplete={(region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
                setMapRegion(region);
                setSelectedLocation({
                  id: 'custom',
                  name: 'Pinned location',
                  address: 'Pinned location',
                  latitude: region.latitude.toString(),
                  longitude: region.longitude.toString(),
                });
              }}
            />
          )}
          {/* Fixed Center Pin */}
          <View style={styles.mapCenterPin}>
            <Text style={{ fontSize: 40 }}>📍</Text>
          </View>
          {/* Map Header */}
          <View style={styles.mapHeader}>
            <Text style={styles.mapHeaderText}>Drag to adjust your pickup pin</Text>
          </View>
          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.mapConfirmButton}
            onPress={() => setMapPickerVisible(false)}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mapConfirmGradient}
            >
              <Text style={styles.mapConfirmText}>✅ Confirm This Location</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  headerGradient: {
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  leafEmoji: {
    fontSize: 24,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  greetingContainer: {
    marginLeft: 2,
  },
  greetingLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 2,
  },
  greetingSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  // Layout
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  statusBannerIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 1,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBannerDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  // Status Card
  statusContainer: {
    marginBottom: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  statusCardIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  statusSmallLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  formCardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  formCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  formCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray700,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Location Search
  locationSection: {
    marginBottom: 20,
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  searchContainerActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
    borderColor: COLORS.primary,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '700',
  },

  // Suggestions Dropdown — floats OVER content
  suggestionsDropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  suggestionsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  suggestionsLoadingText: {
    fontSize: 13,
    color: COLORS.gray500,
    fontStyle: 'italic',
    marginLeft: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  suggestionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  suggestionAddress: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Use Location Button
  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    backgroundColor: COLORS.primary + '08',
  },
  useLocationIcon: {
    fontSize: 17,
    marginRight: 10,
  },
  useLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },

  // Selected Location Chip
  selectedLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  selectedLocationIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  selectedLocationName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  selectedLocationAddr: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  selectedLocationClear: {
    fontSize: 14,
    color: COLORS.gray500,
    paddingLeft: 8,
    fontWeight: '700',
  },

  // Map Preview
  mapPreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    height: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mapPreview: {
    flex: 1,
    width: '100%',
  },
  mapTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapTapHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },

  // Waste Selector
  wasteButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  wastePlaceholder: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  wasteCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  wasteTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wasteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
  },
  wasteTagEmoji: {
    fontSize: 12,
  },
  wasteTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  wasteArrow: {
    fontSize: 22,
    color: COLORS.gray500,
    marginLeft: 8,
  },

  // Waste Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  wasteModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.gray700,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '700',
  },
  wasteOptionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  wasteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: COLORS.gray50,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  wasteOptionSelected: {
    backgroundColor: COLORS.primary + '08',
  },
  wasteOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  wasteOptionEmoji: {
    fontSize: 22,
  },
  wasteOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxTick: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  doneButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Notes
  notesInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
    textAlignVertical: 'top',
    minHeight: 90,
    lineHeight: 20,
  },

  // Submit Button
  submitWrapper: {
    marginTop: 4,
    marginBottom: 4,
  },
  requestButton: {
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  requestButtonArrow: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '800',
  },
  formHint: {
    fontSize: 12,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: 10,
  },

  // Map Picker
  mapCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -44,
    zIndex: 10,
  },
  mapHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  mapHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapConfirmButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  mapConfirmGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  mapConfirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});