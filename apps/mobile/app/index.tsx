import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

// ── Loading screen (minimal) ──────────────────────────────────────────────────
// Mostrada enquanto o AuthProvider resolve a sessão no boot. O SplashOverlay
// (splash.png "Charlotte AI English Teacher") já cobre a marca por cima nos
// primeiros ~3s; então aqui NÃO repetimos o avatar/wordmark da Charlotte (evita
// a "segunda Charlotte" / dois loadings). Fica só o fundo + um spinner discreto,
// que aparece se o load passar do splash (ex.: rede lenta/offline).

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3FA', alignItems: 'center', justifyContent: 'center' }}>
      {/* Dot texture — same as ChatBox */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <Circle cx="2" cy="2" r="1.1" fill="rgba(22,21,58,0.055)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>

      <ActivityIndicator size="small" color="#16153A" />
    </View>
  );
}

// ── Root index ────────────────────────────────────────────────────────────────

export default function Index() {
  const { isAuthenticated, isLoading, profile } = useAuth();

  // Hold on the branded loading screen while auth OR profile is still resolving.
  // This prevents the intermediate (isAuthenticated=true, profile=null) state
  // from ever reaching /(app)/_layout.tsx and triggering the dot-spinner loop.
  if (isLoading || (isAuthenticated && profile === null)) return <LoadingScreen />;

  // Not authenticated — go to onboarding (slides first, then login).
  if (!isAuthenticated) return <Redirect href="/(onboarding)" />;

  // Authenticated with profile — AuthGuard in _layout.tsx handles all routing
  // (first-access, placement-test, or home). Do NOT redirect here to avoid
  // racing with AuthGuard's router.replace() calls.
  return <LoadingScreen />;
}
