import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#FAF7F0' },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
