import React from 'react';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].background,
          borderTopColor: '#e0e0e0',
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
  name="worker-home"
  options={{
    title: 'Home',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home-outline" size={size} color={color} />
    ),
  }}
/>

<Tabs.Screen
  name="worker-track"
  options={{
    title: 'Track',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="time-outline" size={size} color={color} />
    ),
  }}
/>
    </Tabs>
  );
}
