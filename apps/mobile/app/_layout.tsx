import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { AI_CONSENT_KEY } from '@/lib/aiConsent';
// OfflineBanner desativado temporariamente — reimplementar com @react-native-community/netinfo
// import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { soundEngine } from '@/lib/soundEngine';
import { ThemeProvider, useTheme } from '@/lib/theme';

// Mantém a splash screen visível enquanto carrega
SplashScreen.preventAutoHideAsync();

// Pré-gera e faz cache de todos os efeitos sonoros em background
soundEngine.preload().catch(() => {});

/**
 * Handles all auth-based navigation at the ROOT level where the full
 * route tree is visible. Avoids cross-group <Redirect> issues inside
 * nested layouts which cause "not found" errors.
 */
function AuthGuard() {
  const { isAuthenticated, isLoading, mustChangePassword, isPasswordRecovery, profile, refreshProfile } = useAuth();
  const lastRoute   = useRef<string | null>(null);
  const retryCount  = useRef(0);
  const pathname    = usePathname();
  const [aiConsent,    setAiConsent]    = useState<boolean | null>(null); // null = still loading
  const [consentReady, setConsentReady] = useState(false);

  // Read AI consent from secure store on mount and whenever pathname changes
  // (re-read after returning from ai-consent screen so the guard unblocks)
  useEffect(() => {
    SecureStore.getItemAsync(AI_CONSENT_KEY).then(val => {
      setAiConsent(val === '1');
      setConsentReady(true);
    }).catch(() => {
      setAiConsent(false);
      setConsentReady(true);
    });
  }, [pathname]);

  // If auth resolved but profile fetch failed, retry up to 5 times with backoff.
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile === null && retryCount.current < 5) {
      const attempt = retryCount.current;
      retryCount.current += 1;
      const delay = attempt * 1000; // 0ms, 1s, 2s, 3s, 4s
      console.log(`[AuthGuard] profile=null retry ${attempt + 1}/5 in ${delay}ms`);
      const t = setTimeout(() => refreshProfile(), delay);
      return () => clearTimeout(t);
    }
  }, [isLoading, isAuthenticated, profile]);

  useEffect(() => {
    if (isLoading) return;
    if (!consentReady) return;                        // wait for SecureStore read
    if (isAuthenticated && profile === null) return;  // wait for profile

    let target: string;
    if (!isAuthenticated) {
      // Não logado → sempre vai para o onboarding, sem exceção.
      target = '/(onboarding)';
    } else if (isPasswordRecovery) {
      // Usuário clicou no link de redefinição de senha — vai direto para a tela de nova senha.
      target = '/(auth)/reset-password';
    } else if (mustChangePassword) {
      target = '/(app)/first-access';
    } else if (profile && !profile.placement_test_done) {
      target = '/(app)/placement-test';
    } else if (profile && profile.placement_test_done && !profile.first_welcome_done) {
      target = '/(app)/charlotte-intro';
    } else if (profile && profile.placement_test_done && profile.first_welcome_done && !aiConsent) {
      // User completed onboarding but hasn't accepted AI consent yet
      target = '/(app)/ai-consent';
    } else if (isAuthenticated && profile) {
      // Auth is fully ready. If still on login/onboarding (edge case: INITIAL_SESSION
      // fired null, redirected to login, then TOKEN_REFRESHED brought a valid session),
      // navigate into the app. Skip if already inside (app) to avoid clobbering navigation.
      const onAuthScreen = pathname === '/' ||
        pathname.includes('login') || pathname.includes('onboarding') ||
        pathname.includes('forgot') || pathname.includes('callback') ||
        pathname.includes('reset-password');
      if (!onAuthScreen) {
        lastRoute.current = null;
        return; // already in app — don't redirect
      }
      target = '/(app)';
    } else {
      lastRoute.current = null;
      return;
    }

    if (lastRoute.current === target) return;
    lastRoute.current = target;
    router.replace(target as any);
  }, [isLoading, consentReady, isAuthenticated, mustChangePassword, isPasswordRecovery, profile, profile?.placement_test_done, profile?.first_welcome_done, aiConsent, pathname]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // expo-updates cuida automaticamente dos checks via checkAutomatically: 'ON_LOAD'
    // configurado em app.config.ts — updates são baixados em background e aplicados
    // na próxima abertura do app, sem código manual necessário aqui.
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <AuthGuard />
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.card} translucent={false} />;
}
