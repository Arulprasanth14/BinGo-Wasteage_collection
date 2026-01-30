import React, { useState, useEffect } from 'react';
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
 FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Location type definition
interface LocationResult {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

// Mock location data (kept for fallback if needed)
const MOCK_LOCATIONS: LocationResult[] = [
  { id: '1', name: 'Anna University', address: 'Chennai, Tamil Nadu', latitude: '12.9716', longitude: '80.2206' },
  { id: '2', name: 'IIT Madras', address: 'Chennai, Tamil Nadu', latitude: '12.9915', longitude: '80.2337' },
  { id: '3', name: 'Madras High Court', address: 'Chennai, Tamil Nadu', latitude: '13.0850', longitude: '80.2864' },
  { id: '4', name: 'Guindy National Park', address: 'Chennai, Tamil Nadu', latitude: '12.9500', longitude: '80.2200' },
  { id: '5', name: 'Marina Beach', address: 'Chennai, Tamil Nadu', latitude: '13.0500', longitude: '80.2833' },
  { id: '6', name: 'Express Avenue Mall', address: 'Chennai, Tamil Nadu', latitude: '13.0600', longitude: '80.2600' },
];

// Backend API configuration
// Platform-specific URLs:
// - Android Emulator: '10.0.2.2' (special IP that maps to host machine's localhost)
// - iOS Simulator: 'localhost' or '127.0.0.1' (works directly)
// - Real device: Your LAN IP (e.g., '192.168.1.x' or '10.10.49.113')
const getBackendUrl = () => {
  if (__DEV__) {
    // Development mode - use platform-specific localhost
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000'; // Android emulator special IP
    } else {
      return 'http://localhost:8000'; // iOS simulator
    }
  } else {
    // Production mode - use your actual backend server IP
    return 'http://10.10.49.113:8000'; // Change this to your production backend URL
  }
};

const BACKEND_URL = getBackendUrl();

const WASTE_TYPES = [
 { id: 'dry', label: 'Dry Waste', emoji: '🌾', color: '#FCD34D' },
 { id: 'wet', label: 'Wet Waste', emoji: '💧', color: '#60A5FA' },
 { id: 'plastic', label: 'Plastic Waste', emoji: '♻️', color: '#F472B6' },
 { id: 'ewaste', label: 'E-Waste', emoji: '⚡', color: '#A78BFA' },
];

// Color palette
const COLORS = {
 primary: '#22C55E', // eco-green
 primaryLight: '#86EFAC',
 primaryDark: '#16A34A',
 emerald: '#10B981',
 white: '#FFFFFF',
 black: '#000000',
 gray100: '#F3F4F6',
 gray200: '#E5E7EB',
 gray300: '#D1D5DB',
 gray600: '#4B5563',
 gray700: '#374151',
 statusPending: '#3B82F6',
 statusConfirmed: '#10B981',
};

// Header Component
const Header: React.FC<{ userName: string }> = ({ userName }) => (
 <LinearGradient
   colors={[COLORS.primary, COLORS.emerald]}
   start={{ x: 0, y: 0 }}
   end={{ x: 1, y: 1 }}
   style={styles.headerGradient}
 >
   <SafeAreaView>
     <View style={styles.headerContent}>
       <View style={styles.headerTop}>
         <View style={styles.logoBox}>
           <Text style={styles.leafEmoji}>🌱</Text>
         </View>
         <Text style={styles.appName}>BinGo</Text>
       </View>
       <View style={styles.greetingContainer}>
         <Text style={styles.greetingLabel}>Welcome,</Text>
         <Text style={styles.greetingName}>{userName}</Text>
       </View>
     </View>
   </SafeAreaView>
 </LinearGradient>
);

// Location Search Component
interface LocationSearchProps {
  selectedLocation: LocationResult | null;
  onSelectLocation: (location: LocationResult) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  isLoadingLocation: boolean;
  suggestions: LocationResult[];
  showSuggestions: boolean;
  onShowSuggestions: (show: boolean) => void;
}

// Location Search Component
const LocationSearch: React.FC<LocationSearchProps> = ({
  selectedLocation,
  onSelectLocation,
  searchQuery,
  onSearchChange,
  suggestions,
  showSuggestions,
  onShowSuggestions,
  isLoadingLocation,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>Pickup Location</Text>
    <View style={[
      styles.searchContainer, 
      showSuggestions && suggestions.length > 0 && styles.searchContainerActive
    ]}>
      <Text style={styles.searchIcon}>{isLoadingLocation ? '⏳' : '🔍'}</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Enter area, street, or landmark..."
        placeholderTextColor={COLORS.gray600}
        value={searchQuery}
        onChangeText={(text) => {
          onSearchChange(text);
          onShowSuggestions(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) onShowSuggestions(true);
        }}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => onSearchChange('')}>
          <Text style={styles.clearInputIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>

    {/* Dynamic Suggestions List */}
    {showSuggestions && (suggestions.length > 0 || isLoadingLocation) && (
      <View style={styles.suggestionsBox}>
        {isLoadingLocation && suggestions.length === 0 ? (
          <Text style={styles.loadingText}>Searching places...</Text>
        ) : (
          suggestions.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={styles.suggestionItem}
              onPress={() => {
                onSelectLocation(location);
                onShowSuggestions(false);
                onSearchChange(location.name); // Fill input with selection
              }}
            >
              <View style={styles.suggestionIconCircle}>
                <Text style={styles.suggestionIcon}>📍</Text>
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {location.name.split(',')[0]} {/* Primary Name */}
                </Text>
                <Text style={styles.suggestionAddress} numberOfLines={2}>
                  {location.name.split(',').slice(1).join(',').trim()} {/* Rest of Address */}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    )}
  </View>
);

// Waste Type Selector Component
interface WasteSelectorProps {
 selectedWasteTypes: string[];
 onWasteTypeChange: (types: string[]) => void;
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
     <Text style={styles.sectionLabel}>Waste Types</Text>
     <TouchableOpacity
       style={styles.wasteButton}
       onPress={() => onWasteModalChange(true)}
     >
       {selectedWasteTypes.length === 0 ? (
         <Text style={styles.wastePlaceholder}>Select waste types...</Text>
       ) : (
         <View>
           <Text style={styles.wasteCount}>{selectedWasteTypes.length} selected</Text>
           <View style={styles.wasteTagsContainer}>
             {selectedWasteTypes.map((typeId) => {
               const waste = WASTE_TYPES.find((w) => w.id === typeId);
               return (
                 <View key={typeId} style={styles.wasteTag}>
                   <Text style={styles.wasteTagText}>{waste?.label}</Text>
                 </View>
               );
             })}
           </View>
         </View>
       )}
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
         <View style={styles.modalHeader}>
           <Text style={styles.modalTitle}>Select Waste Types</Text>
           <TouchableOpacity onPress={() => onWasteModalChange(false)}>
             <Text style={styles.closeButton}>✕</Text>
           </TouchableOpacity>
         </View>

         <View style={styles.wasteOptionsContainer}>
           {WASTE_TYPES.map((waste) => {
             const isSelected = selectedWasteTypes.includes(waste.id);
             return (
               <TouchableOpacity
                 key={waste.id}
                 style={[
                   styles.wasteOption,
                   isSelected && styles.wasteOptionSelected,
                 ]}
                 onPress={() => {
                   const updated = isSelected
                     ? selectedWasteTypes.filter((id) => id !== waste.id)
                     : [...selectedWasteTypes, waste.id];
                   onWasteTypeChange(updated);
                 }}
               >
                 <View
                   style={[styles.wasteOptionIcon, { backgroundColor: waste.color }]}
                 >
                   <Text style={styles.wasteOptionEmoji}>{waste.emoji}</Text>
                 </View>
                 <Text style={styles.wasteOptionLabel}>{waste.label}</Text>
                 {isSelected && <Text style={styles.checkmark}>✓</Text>}
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
             <Text style={styles.doneButtonText}>Done</Text>
           </TouchableOpacity>
         </View>
       </View>
     </View>
   </Modal>
 </>
);

// Map Preview Component
interface MapPreviewProps {
  location: LocationResult | null;
}

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapPreview: React.FC<MapPreviewProps> = ({ location }) => {
 if (!location) return null;

 const region = {
   latitude: parseFloat(location.latitude),
   longitude: parseFloat(location.longitude),
   latitudeDelta: 0.005, // Lower number = more zoomed in
   longitudeDelta: 0.005,
 };

 return (
   <View style={styles.mapPreviewContainer}>
     <MapView
       provider={PROVIDER_GOOGLE} // Optional: uses Google Maps instead of standard
       style={styles.mapPreview}
       initialRegion={region}
       region={region} // Forces the map to move when location changes
       scrollEnabled={true}
       zoomEnabled={true}
     >
       <Marker
         coordinate={{
           latitude: region.latitude,
           longitude: region.longitude,
         }}
         title={location.name}
       />
     </MapView>
   </View>
 );
};

// Status Indicator Component
interface StatusIndicatorProps {
 status: 'idle' | 'pending' | 'confirmed';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
 const getStatusLabel = () => {
   switch (status) {
     case 'pending':
       return 'PENDING';
     case 'confirmed':
       return 'CONFIRMED';
     default:
       return 'No Active Pickup';
   }
 };

 const getStatusColor = () => {
   switch (status) {
     case 'pending':
       return COLORS.statusPending;
     case 'confirmed':
       return COLORS.statusConfirmed;
     default:
       return COLORS.gray300;
   }
 };

 return (
   <View style={styles.statusContainer}>
     <Text style={styles.statusLabel}>Current Pickup Status</Text>
     <View style={styles.statusCard}>
       <View>
         <Text style={styles.statusSmallLabel}>Status</Text>
         <Text style={styles.statusValue}>{getStatusLabel()}</Text>
       </View>
       <View
         style={[
           styles.statusBadge,
           { backgroundColor: getStatusColor() + '20' },
         ]}
       >
         <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
           {status === 'idle' ? 'Idle' : status === 'pending' ? 'Pending' : 'Confirmed'}
         </Text>
       </View>
     </View>
   </View>
 );
};

// Main Home Screen Component
export default function BinGoHome() {
  const userName = 'Arjun'; // Placeholder - can be dynamic
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [selectedWasteTypes, setSelectedWasteTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wasteModalVisible, setWasteModalVisible] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [pickupStatus, setPickupStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');

  // API-based location search with debouncing
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsLoadingLocation(true);

        const url = `${BACKEND_URL}/location/search?q=${encodeURIComponent(searchQuery)}`;
        console.log(`[Location Search] Fetching from: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid response format: expected array');
        }

        const formatted: LocationResult[] = data.map(
          (item: any, index: number) => ({
            id: String(index),
            name: item.name,
            address: item.name, // display_name already includes full address
            latitude: item.latitude,
            longitude: item.longitude,
          })
        );

        console.log(`[Location Search] Found ${formatted.length} results`);
        setSuggestions(formatted);
        setShowSuggestions(true);
      } catch (err: any) {
        console.error('[Location Search] Error:', err);
        console.error('[Location Search] Backend URL:', BACKEND_URL);
        console.error('[Location Search] Platform:', Platform.OS);
        
        // More helpful error message
        if (err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch')) {
          console.error('[Location Search] Network error - Check if backend is running at:', BACKEND_URL);
          console.error('[Location Search] For Android emulator, use: http://10.0.2.2:8000');
          console.error('[Location Search] For iOS simulator, use: http://localhost:8000');
          console.error('[Location Search] For real device, use your LAN IP');
        }
        
        // Fallback to empty suggestions on error
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingLocation(false);
      }
    }, 400); // ✅ debounce 400ms

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleUseMyLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        // Set location with proper LocationResult format
        setSelectedLocation({
          id: 'current',
          name: 'Your Current Location',
          address: `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

 const handleRequestPickup = () => {
   if (selectedLocation && selectedWasteTypes.length > 0) {
     setPickupStatus('pending');
     // Simulate confirmation
     setTimeout(() => {
       setPickupStatus('confirmed');
     }, 2000);
   }
 };

 const isFormValid = selectedLocation !== null && selectedWasteTypes.length > 0;

 return (
   <KeyboardAvoidingView
     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
     style={styles.container}
   >
     <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

     <ScrollView
       style={styles.scrollView}
       contentContainerStyle={styles.scrollContent}
       showsVerticalScrollIndicator={false}
     >
       {/* Header */}
       <Header userName={userName} />

       {/* Main Content */}
       <View style={styles.mainContent}>
         {/* Status Card */}
         {pickupStatus !== 'idle' && (
           <View
             style={[
               styles.statusCardAlert,
               {
                 borderColor:
                   pickupStatus === 'pending'
                     ? COLORS.statusPending
                     : COLORS.statusConfirmed,
                 backgroundColor:
                   pickupStatus === 'pending'
                     ? COLORS.statusPending + '10'
                     : COLORS.statusConfirmed + '10',
               },
             ]}
           >
             <Text style={styles.statusIcon}>
               {pickupStatus === 'pending' ? '⏳' : '✓'}
             </Text>
             <View style={styles.statusCardContent}>
               <Text style={styles.statusCardTitle}>
                 {pickupStatus === 'pending' ? 'Pickup Scheduled' : 'Pickup Confirmed'}
               </Text>
               <Text style={styles.statusCardDesc}>
                 {pickupStatus === 'pending'
                   ? 'Your pickup request is being processed.'
                   : 'Your pickup has been confirmed!'}
               </Text>
             </View>
           </View>
         )}

         {/* Status Indicator */}
         <StatusIndicator status={pickupStatus} />

         {/* Report Pickup Card */}
         <LinearGradient
           colors={[COLORS.primary, COLORS.emerald]}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 1 }}
           style={styles.reportPickupHeader}
         >
           <Text style={styles.reportPickupTitle}>Report Pickup</Text>
           <Text style={styles.reportPickupSubtitle}>
             Schedule your waste collection today
           </Text>
         </LinearGradient>

         <View style={styles.reportPickupContent}>
           {/* Location Search */}
           <LocationSearch
             selectedLocation={selectedLocation}
             onSelectLocation={setSelectedLocation}
             searchQuery={searchQuery}
             onSearchChange={setSearchQuery}
             isLoadingLocation={isLoadingLocation}
             suggestions={suggestions}
             showSuggestions={showSuggestions}
             onShowSuggestions={setShowSuggestions}
           />

           {/* Use My Location Button */}
           <TouchableOpacity
             style={[
               styles.useLocationButton,
               isLoadingLocation && { opacity: 0.6 },
             ]}
             onPress={handleUseMyLocation}
             disabled={isLoadingLocation}
           >
             <Text style={styles.useLocationIcon}>📍</Text>
             <Text style={styles.useLocationText}>
               {isLoadingLocation ? 'Getting location...' : 'Use My Location'}
             </Text>
           </TouchableOpacity>

           {/* Map Preview */}
           {selectedLocation && <MapPreview location={selectedLocation} />}

           {/* Waste Type Selector */}
           <WasteTypeSelector
             selectedWasteTypes={selectedWasteTypes}
             onWasteTypeChange={setSelectedWasteTypes}
             wasteModalVisible={wasteModalVisible}
             onWasteModalChange={setWasteModalVisible}
           />

           {/* Notes Section */}
           <View style={styles.section}>
             <Text style={styles.sectionLabel}>
               Additional Instructions (Optional)
             </Text>
             <TextInput
               style={styles.notesInput}
               placeholder="E.g., Please ring the bell twice, gate code is 1234..."
               placeholderTextColor={COLORS.gray600}
               value={notes}
               onChangeText={setNotes}
               multiline
               numberOfLines={3}
             />
           </View>

           {/* Request Pickup Button */}
           <LinearGradient
             colors={[COLORS.primary, COLORS.emerald]}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 1 }}
             style={[
               styles.requestButton,
               !isFormValid && { opacity: 0.5 },
             ]}
           >
             <TouchableOpacity
               onPress={handleRequestPickup}
               disabled={!isFormValid}
               style={styles.requestButtonTouch}
             >
               <Text style={styles.requestButtonText}>Request Pickup</Text>
               <Text style={styles.requestButtonArrow}>→</Text>
             </TouchableOpacity>
           </LinearGradient>

           {!isFormValid && (
             <Text style={styles.formHint}>
               {!selectedLocation
                 ? 'Please select a location'
                 : 'Please select waste types'}
             </Text>
           )}

           {/* Info Section */}
           <View style={styles.infoBox}>
             <Text style={styles.infoTitle}>Why BinGo?</Text>
             <Text style={styles.infoBullet}>✓ Fast and reliable service</Text>
             <Text style={styles.infoBullet}>✓ Eco-friendly practices</Text>
             <Text style={styles.infoBullet}>✓ Real-time tracking</Text>
           </View>
         </View>
       </View>
     </ScrollView>
   </KeyboardAvoidingView>
 );
}

// Styles
const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: COLORS.white,
 },
 scrollView: {
   flex: 1,
 },
 scrollContent: {
   paddingBottom: 40,
 },
 headerGradient: {
   paddingBottom: 20,
 },
 headerContent: {
   paddingHorizontal: 16,
   paddingBottom: 16,
 },
 headerTop: {
   flexDirection: 'row',
   alignItems: 'center',
   marginBottom: 16,
 },
 logoBox: {
   width: 44,
   height: 44,
   borderRadius: 10,
   backgroundColor: COLORS.white,
   justifyContent: 'center',
   alignItems: 'center',
   marginRight: 12,
 },
 leafEmoji: {
   fontSize: 24,
 },
 appName: {
   fontSize: 28,
   fontWeight: 'bold',
   color: COLORS.white,
 },
 greetingContainer: {
   marginLeft: 4,
 },
 greetingLabel: {
   fontSize: 14,
   color: 'rgba(255,255,255,0.8)',
   fontWeight: '500',
 },
 greetingName: {
   fontSize: 22,
   fontWeight: 'bold',
   color: COLORS.white,
   marginTop: 2,
 },
 mainContent: {
   paddingHorizontal: 16,
   paddingTop: 16,
 },
 section: {
   marginBottom: 16,
 },
 sectionLabel: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
   marginBottom: 8,
 },
 searchContainer: {
   flexDirection: 'row',
   alignItems: 'center',
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderRadius: 12,
   paddingHorizontal: 12,
   height: 48,
 },
 searchIcon: {
   fontSize: 18,
   marginRight: 8,
 },
 searchInput: {
   flex: 1,
   fontSize: 14,
   color: COLORS.black,
 },
 suggestionsBox: {
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderTopWidth: 0,
   borderBottomLeftRadius: 12,
   borderBottomRightRadius: 12,
   marginTop: 0, // Align perfectly with search bar
   maxHeight: 250,
   zIndex: 1000,
   elevation: 5,
   shadowColor: '#000', // Shadow for iOS
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.1,
   shadowRadius: 4,
   overflow: 'hidden',
 },
 suggestionItem: {
   flexDirection: 'row',
   padding: 15,
   alignItems: 'center',
   borderBottomWidth: 1,
   borderBottomColor: COLORS.gray100,
 },
 suggestionIcon: {
   fontSize: 18,
   marginRight: 12,
   marginTop: 2,
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
   color: COLORS.gray600,
   marginTop: 2,
 },
 selectedLocationBox: {
   flexDirection: 'row',
   backgroundColor: '#F0FDF4',
   borderWidth: 1,
   borderColor: '#86EFAC',
   borderRadius: 12,
   padding: 12,
   marginTop: 8,
   alignItems: 'flex-start',
 },
 selectedIcon: {
   fontSize: 18,
   marginRight: 12,
 },
 selectedName: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 selectedAddress: {
   fontSize: 12,
   color: COLORS.gray600,
   marginTop: 2,
 },
 useLocationButton: {
   flexDirection: 'row',
   borderWidth: 2,
   borderColor: COLORS.primary,
   borderRadius: 10,
   paddingVertical: 12,
   paddingHorizontal: 16,
   alignItems: 'center',
   justifyContent: 'center',
   marginBottom: 16,
 },
 useLocationIcon: {
   fontSize: 16,
   marginRight: 8,
 },
 useLocationText: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.primary,
 },
 mapPreviewContainer: {
   marginBottom: 16,
 },
 mapPreview: {
   height: 200,
   borderRadius: 12,
   overflow: 'hidden',
   borderWidth: 1,
   borderColor: COLORS.gray200,
 },
 mapPlaceholder: {
   height: 200,
   borderRadius: 12,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   backgroundColor: COLORS.gray100,
   justifyContent: 'center',
   alignItems: 'center',
   paddingVertical: 40,
 },
 mapPlaceholderIcon: {
   fontSize: 48,
   marginBottom: 12,
 },
 mapPlaceholderText: {
   fontSize: 14,
   color: COLORS.gray600,
   textAlign: 'center',
   paddingHorizontal: 20,
 },
 mapBackground: {
   flex: 1,
   backgroundColor: '#E0F2FE',
 },
 markerContainer: {
   ...StyleSheet.absoluteFillObject,
   justifyContent: 'center',
   alignItems: 'center',
 },
 markerPulse: {
   width: 60,
   height: 60,
   borderRadius: 30,
   backgroundColor: COLORS.primary,
   opacity: 0.2,
   position: 'absolute',
 },
 markerPin: {
   width: 48,
   height: 48,
   borderRadius: 24,
   backgroundColor: COLORS.primary,
   borderWidth: 3,
   borderColor: COLORS.white,
   justifyContent: 'center',
   alignItems: 'center',
 },
 markerIcon: {
   fontSize: 24,
 },
 compass: {
   position: 'absolute',
   top: 12,
   right: 12,
   width: 40,
   height: 40,
   borderRadius: 8,
   backgroundColor: COLORS.white,
   justifyContent: 'center',
   alignItems: 'center',
   borderWidth: 1,
   borderColor: COLORS.gray200,
 },
 compassText: {
   fontSize: 16,
   fontWeight: 'bold',
   color: COLORS.primary,
 },
 mapInfoBox: {
   position: 'absolute',
   bottom: 0,
   left: 0,
   right: 0,
   backgroundColor: COLORS.white,
   paddingVertical: 12,
   paddingHorizontal: 12,
   borderTopWidth: 1,
   borderTopColor: COLORS.gray200,
 },
 mapLocationName: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 mapLocationAddress: {
   fontSize: 12,
   color: COLORS.gray600,
   marginTop: 2,
 },
 wasteButton: {
   flexDirection: 'row',
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderRadius: 12,
   paddingHorizontal: 14,
   paddingVertical: 12,
   alignItems: 'center',
   justifyContent: 'space-between',
 },
 wastePlaceholder: {
   fontSize: 14,
   color: COLORS.gray600,
 },
 wasteCount: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 wasteTagsContainer: {
   flexDirection: 'row',
   flexWrap: 'wrap',
   marginTop: 6,
 },
 wasteTag: {
   backgroundColor: COLORS.primary + '15',
   borderRadius: 6,
   paddingVertical: 4,
   paddingHorizontal: 10,
   marginRight: 6,
   marginTop: 4,
 },
 wasteTagText: {
   fontSize: 12,
   fontWeight: '600',
   color: COLORS.primary,
 },
 wasteArrow: {
   fontSize: 20,
   color: COLORS.gray600,
 },
 modalOverlay: {
   flex: 1,
   backgroundColor: 'rgba(0,0,0,0.5)',
   justifyContent: 'flex-end',
 },
 wasteModal: {
   backgroundColor: COLORS.white,
   borderTopLeftRadius: 20,
   borderTopRightRadius: 20,
   paddingTop: 16,
   paddingBottom: 20,
   maxHeight: '80%',
 },
 modalHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   paddingHorizontal: 16,
   marginBottom: 16,
 },
 modalTitle: {
   fontSize: 18,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 closeButton: {
   fontSize: 24,
   color: COLORS.gray600,
 },
 wasteOptionsContainer: {
   paddingHorizontal: 16,
   marginBottom: 16,
 },
 wasteOption: {
   flexDirection: 'row',
   alignItems: 'center',
   paddingVertical: 12,
   paddingHorizontal: 12,
   marginBottom: 8,
   borderRadius: 12,
   backgroundColor: '#F9FAFB',
   borderWidth: 2,
   borderColor: '#E5E7EB',
 },
 wasteOptionSelected: {
   backgroundColor: COLORS.primary + '10',
   borderColor: COLORS.primary,
 },
 wasteOptionIcon: {
   width: 48,
   height: 48,
   borderRadius: 10,
   justifyContent: 'center',
   alignItems: 'center',
   marginRight: 12,
 },
 wasteOptionEmoji: {
   fontSize: 24,
 },
 wasteOptionLabel: {
   flex: 1,
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 checkmark: {
   fontSize: 20,
   color: COLORS.primary,
 },
 modalButtons: {
   flexDirection: 'row',
   gap: 10,
   paddingHorizontal: 16,
 },
 clearButton: {
   flex: 1,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderRadius: 10,
   paddingVertical: 12,
   justifyContent: 'center',
   alignItems: 'center',
 },
 clearButtonText: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
 },
 doneButton: {
   flex: 1,
   backgroundColor: COLORS.primary,
   borderRadius: 10,
   paddingVertical: 12,
   justifyContent: 'center',
   alignItems: 'center',
 },
 doneButtonText: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.white,
 },
 statusContainer: {
   marginBottom: 16,
 },
 statusLabel: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
   marginBottom: 8,
   paddingHorizontal: 2,
 },
 statusCard: {
   flexDirection: 'row',
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderRadius: 12,
   paddingHorizontal: 14,
   paddingVertical: 12,
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 statusSmallLabel: {
   fontSize: 12,
   color: COLORS.gray600,
   marginBottom: 2,
 },
 statusValue: {
   fontSize: 16,
   fontWeight: 'bold',
   color: COLORS.gray700,
 },
 statusBadge: {
   paddingVertical: 6,
   paddingHorizontal: 10,
   borderRadius: 8,
 },
 statusBadgeText: {
   fontSize: 12,
   fontWeight: '600',
 },
 statusCardAlert: {
   flexDirection: 'row',
   borderWidth: 2,
   borderRadius: 12,
   padding: 12,
   marginBottom: 16,
   alignItems: 'flex-start',
 },
 statusIcon: {
   fontSize: 24,
   marginRight: 12,
 },
 statusCardContent: {
   flex: 1,
 },
 statusCardTitle: {
   fontSize: 14,
   fontWeight: '700',
   color: COLORS.gray700,
 },
 statusCardDesc: {
   fontSize: 12,
   color: COLORS.gray600,
   marginTop: 2,
 },
 reportPickupHeader: {
   borderTopLeftRadius: 16,
   borderTopRightRadius: 16,
   paddingHorizontal: 16,
   paddingVertical: 16,
   marginBottom: -1,
 },
 reportPickupTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   color: COLORS.white,
 },
 reportPickupSubtitle: {
   fontSize: 13,
   color: 'rgba(255,255,255,0.9)',
   marginTop: 4,
 },
 reportPickupContent: {
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderBottomLeftRadius: 16,
   borderBottomRightRadius: 16,
   paddingHorizontal: 16,
   paddingVertical: 16,
   marginBottom: 16,
 },
 notesInput: {
   backgroundColor: COLORS.white,
   borderWidth: 1,
   borderColor: COLORS.gray200,
   borderRadius: 12,
   paddingHorizontal: 14,
   paddingVertical: 10,
   fontSize: 14,
   color: COLORS.black,
   textAlignVertical: 'top',
   minHeight: 90,
 },
 requestButton: {
   borderRadius: 12,
   overflow: 'hidden',
   marginTop: 16,
   marginBottom: 8,
 },
 requestButtonTouch: {
   flexDirection: 'row',
   justifyContent: 'center',
   alignItems: 'center',
   paddingVertical: 16,
   paddingHorizontal: 16,
 },
 requestButtonText: {
   fontSize: 16,
   fontWeight: '700',
   color: COLORS.white,
 },
 requestButtonArrow: {
   fontSize: 18,
   color: COLORS.white,
   marginLeft: 8,
 },
 formHint: {
   fontSize: 13,
   color: COLORS.gray600,
   textAlign: 'center',
   marginBottom: 16,
 },
 infoBox: {
   backgroundColor: '#F0FDF4',
   borderWidth: 1,
   borderColor: '#86EFAC',
   borderRadius: 12,
   paddingHorizontal: 14,
   paddingVertical: 12,
   marginTop: 8,
 },
 infoTitle: {
   fontSize: 14,
   fontWeight: '600',
   color: COLORS.gray700,
   marginBottom: 8,
 },
 infoBullet: {
   fontSize: 13,
   color: COLORS.gray600,
   marginBottom: 4,
 },
 searchContainerActive: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottomWidth: 0,
  elevation: 5, // Shadow for Android
  shadowColor: '#000', // Shadow for iOS
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
suggestionIconCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: COLORS.gray100,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
clearInputIcon: {
  fontSize: 18,
  color: COLORS.gray600,
  padding: 4,
},
loadingText: {
  padding: 15,
  textAlign: 'center',
  color: COLORS.gray600,
  fontStyle: 'italic',
}
});
