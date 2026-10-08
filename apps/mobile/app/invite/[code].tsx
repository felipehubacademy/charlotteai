// queizy://invite/CÓDIGO — guarda o convite e segue o fluxo normal do app.
// A aceitação acontece depois do login (InviteClaimer, em app/(app)/_layout).
import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { savePendingInvite } from '@/lib/referral';
import { useAuth } from '@/hooks/useAuth';

export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    (async () => {
      if (code) await savePendingInvite(String(code));
      router.replace(isAuthenticated ? '/(app)/study-together' as any : '/(onboarding)' as any);
    })();
  }, [code, isAuthenticated]);

  return <View style={{ flex: 1, backgroundColor: '#FAF7F0' }} />;
}
