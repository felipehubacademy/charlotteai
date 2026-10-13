// queizy://aff/CÓDIGO — link de afiliado com o app já instalado. Guarda o código; com login,
// marca a conta na hora (só contas novas valem, regra no servidor). Volta para onde o aluno estava.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { savePendingAffiliate, attachPendingAffiliate } from '@/lib/affiliate';
import { useAuth } from '@/hooks/useAuth';

export default function AffiliateLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || isLoading) return;
    done.current = true;
    (async () => {
      if (code) await savePendingAffiliate(String(code), 'link');
      if (isAuthenticated) attachPendingAffiliate();
      if (!isAuthenticated) router.replace('/(onboarding)' as any);
      else if (router.canGoBack()) router.back();
      else router.replace('/(app)' as any);
    })();
  }, [code, isAuthenticated, isLoading]);

  return <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />;
}
