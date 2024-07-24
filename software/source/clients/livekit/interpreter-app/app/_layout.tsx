import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';

registerGlobals();

export default function RootLayout() {
  return (
    <Stack>

        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="room" />
    </Stack>
  );
}
