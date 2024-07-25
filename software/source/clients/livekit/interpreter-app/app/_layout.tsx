import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';
import '../constants/cryptoPolyfill';

registerGlobals();

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="room" />
    </Stack>
  );
}
