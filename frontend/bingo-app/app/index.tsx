import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { API_BASE_URL as BACKEND_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');

  const handleLogin = async () => {
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Safe parsing
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: text }; }

      if (!res.ok) {
        setErrorMsg(data.detail || 'Invalid credentials. Please try again.');
        return;
      }

      // Save token + name
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('userName', data.name || 'User');

      // Role-based routing
      if (data.role === 'USER') {
        router.replace('/(user-tabs)' as any);
      } else if (data.role === 'WORKER') {
        router.replace('/(worker-tabs)/worker-home' as any);
      } else if (data.role === 'ADMIN') {
        router.replace('/(admin)/dashboard' as any);
      } else {
        setErrorMsg('Unknown user role. Please contact admin.');
      }

    } catch (err) {
      setErrorMsg('Cannot connect to server. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Wave Background ── */}
      <Svg
        height={height}
        width={width}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Top-left wave */}
        <Path
          d={`M0,${height * 0.18} Q${width * 0.25},${height * 0.06} ${width * 0.55},${height * 0.14} Q${width * 0.78},${height * 0.2} ${width},${height * 0.09} L${width},0 L0,0 Z`}
          fill="#C8EDD9"
          opacity="0.65"
        />
        <Path
          d={`M0,${height * 0.32} Q${width * 0.3},${height * 0.2} ${width * 0.62},${height * 0.3} Q${width * 0.85},${height * 0.38} ${width},${height * 0.26} L${width},0 L0,0 Z`}
          fill="#DAF2E8"
          opacity="0.4"
        />
        {/* Bottom-right wave */}
        <Path
          d={`M0,${height} Q${width * 0.28},${height * 0.84} ${width * 0.58},${height * 0.91} Q${width * 0.8},${height * 0.97} ${width},${height * 0.86} L${width},${height} Z`}
          fill="#C8EDD9"
          opacity="0.55"
        />
        <Path
          d={`M${width * 0.38},${height} Q${width * 0.65},${height * 0.89} ${width},${height * 0.93} L${width},${height} Z`}
          fill="#B8E6D0"
          opacity="0.4"
        />
      </Svg>

      {/* ── Content ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Logo */}
        <View style={styles.topSection}>
          <Text style={styles.logo}>BinGo</Text>
          <Text style={styles.subtitle}>Smart Waste Pickup & Tracking</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#B0B8C1"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              placeholder="Enter your password"
              placeholderTextColor="#B0B8C1"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Inline Error */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <Text style={styles.footer}>
              Don&apos;t have an account?{' '}
              <Text style={styles.link}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8F7F0',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },

  // Logo
  topSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A5C38',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#3D7A5A',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 30,
    shadowColor: '#1E6F43',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1F2937',
  },
  eyeBtn: {
    padding: 4,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Button
  button: {
    backgroundColor: '#1E6F43',
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1E6F43',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    marginTop: 18,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  link: {
    color: '#1E6F43',
    fontWeight: '700',
  },
});