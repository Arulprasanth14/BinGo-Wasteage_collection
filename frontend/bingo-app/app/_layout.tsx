import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(user-tabs)" />
      <Stack.Screen name="(worker-tabs)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
