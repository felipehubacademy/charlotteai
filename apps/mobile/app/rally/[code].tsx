// queizy://rally/CÓDIGO — com login (e boas-vindas feitas), entra na competição na hora e mostra
// "Você entrou" (RallyJoinedModal) por cima da tela em que o aluno estava. Sem login, guarda o
// código para entrar depois do cadastro (InviteClaimer, em app/(app)/_layout).
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { savePendingRally, joinRallyFromLink } from '@/lib/rally';
import { useAuth } from '@/hooks/useAuth';

export default function RallyLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated, isLoading, profile } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || isLoading) return;
    if (isAuthenticated && !profile) return; // espera o perfil carregar
    done.current = true;
    (async () => {
      const ready = isAuthenticated && !!profile?.first_welcome_done;
      if (code && ready) joinRallyFromLink(String(code)); // a tela de "Você entrou" aparece sozinha
      else if (code) await savePendingRally(String(code));
      if (!isAuthenticated) router.replace('/(onboarding)' as any);
      else if (router.canGoBack()) router.back();
      else router.replace('/(app)' as any);
    })();
  }, [code, isAuthenticated, isLoading, profile]);

  return <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />;
}
