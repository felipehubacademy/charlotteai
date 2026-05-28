import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { PaywallModal } from '@/components/auth/PaywallModal';
import { XPToastProvider } from '@/components/ui/XPToastProvider';
import { AchievementsProvider } from '@/components/achievements/AchievementsProvider';
import { PaywallProvider } from '@/lib/paywallContext';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

export default function AppLayout() {
  const { isAuthenticated, profile, mustChangePassword } = useAuth();

  // AuthGuard in app/_layout.tsx handles all redirects at root level.
  // When the user signs out, isAuthenticated becomes false before AuthGuard
  // can fire router.replace. Returning null here causes a blank white flash.
  // Render a solid background instead so the transition is invisible.
  if (!isAuthenticated) return <View style={{ flex: 1, backgroundColor: '#F4F3FA' }} />;

  return (
    <AppErrorBoundary>
    <PaywallProvider>
    <XPToastProvider>
      <AchievementsProvider>
      <PaywallModal />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="first-access" options={{ animation: 'none' }} />
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="learn-grammar" />
        <Stack.Screen name="learn-pronunciation" />
        <Stack.Screen name="learn-trail" />
        <Stack.Screen name="learn-intro" />
        <Stack.Screen name="learn-session" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="placement-test" options={{ animation: 'none' }} />
        <Stack.Screen name="charlotte-intro" options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="my-vocabulary" />
        <Stack.Screen name="add-word" />
        <Stack.Screen name="ai-consent" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      </AchievementsProvider>
    </XPToastProvider>
    </PaywallProvider>
    </AppErrorBoundary>
  );
}
