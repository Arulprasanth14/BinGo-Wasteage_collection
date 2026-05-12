import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar,
  Platform, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL as API } from '../../config/api';

type Worker = { user_id: number; name: string; email: string; created_at: string };

export default function WorkersScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorkers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API}/admin/workers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load workers');
      setWorkers(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchWorkers(); }, [fetchWorkers])
  );

  const handleCreateWorker = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation', 'All fields are required.'); return;
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.'); return;
    }
    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/admin/create-worker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Error', data.detail || 'Failed to create worker'); return; }
      Alert.alert('✅ Success', `Worker "${data.name}" registered successfully!`);
      setModalVisible(false);
      setName(''); setEmail(''); setPassword('');
      fetchWorkers();
    } catch {
      Alert.alert('Network Error', 'Cannot connect to server.');
    } finally { setCreating(false); }
  };

  const handleDelete = (worker: Worker) => {
    Alert.alert('Remove Worker', `Remove "${worker.name}" from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API}/admin/worker/${worker.user_id}`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchWorkers();
          } catch { Alert.alert('Error', 'Could not remove worker.'); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Worker }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.workerName}>{item.name}</Text>
        <Text style={styles.workerEmail}>{item.email}</Text>
        <Text style={styles.workerDate}>Registered: {item.created_at}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#145231','#1E6F43','#4CAF50']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Worker Management</Text>
            <Text style={styles.headerSub}>{workers.length} worker{workers.length !== 1 ? 's' : ''} registered</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#1E6F43" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1E6F43" />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWorkers()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={item => item.user_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchWorkers(true)}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="construct-outline" size={52} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Workers Yet</Text>
              <Text style={styles.emptyText}>Tap "Add" to register the first worker.</Text>
            </View>
          }
        />
      )}

      {/* Add Worker Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Worker</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Worker will use these credentials to log in</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Full Name', value: name, setter: setName, placeholder: 'e.g. Ravi Kumar', secure: false, keyboard: 'default' as any },
                { label: 'Email Address', value: email, setter: setEmail, placeholder: 'e.g. ravi@bingo.com', secure: false, keyboard: 'email-address' as any },
                { label: 'Password', value: password, setter: setPassword, placeholder: 'Min. 6 characters', secure: true, keyboard: 'default' as any },
              ].map(field => (
                <View key={field.label} style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={field.value}
                    onChangeText={field.setter}
                    secureTextEntry={field.secure}
                    keyboardType={field.keyboard}
                    autoCapitalize="none"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.createBtn, creating && { opacity: 0.75 }]}
                onPress={handleCreateWorker}
                disabled={creating}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#145231','#1E6F43']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.createBtnGradient}>
                  {creating
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="person-add" size={18} color="#fff" style={{marginRight:8}} /><Text style={styles.createBtnText}>Register Worker</Text></>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
  },
  addBtnText: { color: '#1E6F43', fontWeight: '700', fontSize: 14, marginLeft: 4 },
  list: { padding: 16, paddingBottom: 60 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#1E6F43' },
  info: { flex: 1 },
  workerName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  workerEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  workerDate: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 10, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#1E6F43', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 13, fontSize: 15, color: '#1F2937', backgroundColor: '#FAFAFA',
  },
  createBtn: { marginTop: 8 },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 16,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
