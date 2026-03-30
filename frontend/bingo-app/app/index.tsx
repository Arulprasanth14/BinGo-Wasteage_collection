import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://10.10.49.127:8000";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // ✅ safer parsing (prevents crash)
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        Alert.alert("Login Failed", data.detail || "Invalid credentials");
        return;
      }

      // ✅ SAVE TOKEN FIRST
      await AsyncStorage.setItem("token", data.token);

      console.log("Token saved:", data.token);

      // ✅ Navigate AFTER storing token
      if (data.role === 'USER') {
        router.replace('/(user-tabs)' as any);
      } else if (data.role === 'WORKER') {
        router.replace('/(worker-tabs)' as any);
      } else if (data.role === 'ADMIN') {
        router.replace('/(admin)/dashboard' as any);
      } else {
        Alert.alert("Error", "Unknown user role");
      }

    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Network Error", "Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background Shapes */}
      <View style={styles.curveTop} />
      <View style={styles.curveMiddle} />
      <View style={styles.curveBottom} />

      {/* Content */}
      <View style={styles.container}>
        <Text style={styles.title}>BinGo</Text>
        <Text style={styles.subtitle}>Smart Waste Pickup & Tracking</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <Text style={styles.footer}>
              Don&apos;t have an account? <Text style={styles.link}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAF7F1',
  },

  curveTop: {
    position: 'absolute',
    top: -140,
    left: -100,
    width: 380,
    height: 380,
    backgroundColor: '#D2EFE4',
    borderRadius: 220,
    opacity: 0.65,
  },

  curveMiddle: {
    position: 'absolute',
    top: 220,
    right: -140,
    width: 440,
    height: 440,
    backgroundColor: '#C7E9DA',
    borderRadius: 260,
    opacity: 0.55,
  },

  curveBottom: {
    position: 'absolute',
    bottom: -180,
    left: -120,
    width: 460,
    height: 460,
    backgroundColor: '#DFF4EC',
    borderRadius: 280,
    opacity: 0.65,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1E6F43',
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    color: '#2F7D57',
    marginBottom: 36,
    fontSize: 14,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  label: {
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },

  input: {
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },

  button: {
    backgroundColor: '#1E6F43',
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E6F43',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  footer: {
    marginTop: 18,
    textAlign: 'center',
    color: '#333',
    fontSize: 14,
  },

  link: {
    color: '#1E6F43',
    fontWeight: '700',
  },
});