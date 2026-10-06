import { Stack } from 'expo-router';

export default function AuthLayout() {
  // All auth-based navigation is handled by AuthGuard in app/_layout.tsx.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#FAF7F0' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
