// queizy://rally/CÓDIGO — entra no rally (se já houver login) ou guarda o código
// para entrar depois do login (InviteClaimer, em app/(app)/_layout).
import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { savePendingRally } from '@/lib/rally';
import { useAuth } from '@/hooks/useAuth';

export default function RallyLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    (async () => {
      if (code) await savePendingRally(String(code));
      router.replace(isAuthenticated ? '/(app)/study-together' as any : '/(onboarding)' as any);
    })();
  }, [code, isAuthenticated]);

  return <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />;
}
