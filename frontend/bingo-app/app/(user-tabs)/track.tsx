import { Redirect } from 'expo-router';

// This file exists as a route stub.
// The tracking functionality lives in pickup.tsx (shown as the "Pickup" tab).
export default function TrackRedirect() {
  return <Redirect href="/(user-tabs)/pickup" />;
}
