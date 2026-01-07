import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleRegister = async () => {
    try {
      const res = await fetch('http://10.10.49.58:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
  
      const data = await res.json(); // SAFE now
  
      if (!res.ok) {
        alert(data.detail || 'Registration failed');
        return;
      }
  
      alert(data.message); // "Registration successful"
      router.replace('/'); // login screen
    } catch (error) {
      console.error(error);
      alert('Backend not reachable');
    }
  };
  
  return (
    <View style={styles.root}>
      {/* Decorative curved shapes */}
      <View style={styles.curveTop} />
      <View style={styles.curveMiddle} />
      <View style={styles.curveBottom} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>BinGo</Text>
        <Text style={styles.subtitle}>Create Your Account</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.footer}>
            Already have an account? <Text style={styles.link}>Login</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAF7F1',
  },

  /* ---- CURVED BACKGROUND SHAPES ---- */

  curveTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 350,
    height: 350,
    backgroundColor: '#D6F0E5',
    borderRadius: 200,
    opacity: 0.6,
  },

  curveMiddle: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 400,
    height: 400,
    backgroundColor: '#CDEBDD',
    borderRadius: 220,
    opacity: 0.5,
  },

  curveBottom: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 420,
    height: 420,
    backgroundColor: '#DFF4EC',
    borderRadius: 240,
    opacity: 0.6,
  },

  /* ---- CONTENT ---- */

  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E6F43',
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    color: '#2F7D57',
    marginBottom: 30,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
  },

  label: {
    marginTop: 10,
    color: '#333',
  },

  input: {
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },

  button: {
    backgroundColor: '#1E6F43',
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  footer: {
    textAlign: 'center',
    color: '#333',
  },

  link: {
    color: '#1E6F43',
    fontWeight: 'bold',
  },
});
