// Fim do onboarding (rota mantida como 'charlotte-intro' por compatibilidade
// com o AuthGuard e o placement). O vídeo de apresentação da Charlotte saiu no
// rebrand Queizy; a tela agora só conclui a configuração da conta e segue
// direto para a Home: marca first_welcome_done, garante nível default e
// 7 dias de trial (com guard para não sobrescrever institucional/pago/placement).

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingFinishScreen() {
  const { profile, refreshProfile } = useAuth();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !profile?.id) return;
    doneRef.current = true;
    (async () => {
      try {
        const update: Record<string, unknown> = { first_welcome_done: true };
        if (!profile.charlotte_level) update.charlotte_level = 'Novice';
        // Desde 2026-10-14 o teste grátis de 7 dias é o da loja (Apple/Google, com o cartão da conta da loja):
        // conta nova não ganha mais o teste do app. Sem acesso, o paywall abre logo depois das boas-vindas
        // com "Comece seus 7 dias grátis" (components/auth/PaywallModal.tsx). Quem já tinha o teste do app segue igual.
        await supabase.from('charlotte_users').update(update).eq('id', profile.id);
        // refresh para o AuthGuard não redirecionar de volta pra cá
        refreshProfile().catch(() => {});
      } catch {
        // Não crítico
      }
      router.replace('/(app)');
    })();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F0', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#16131F" />
    </View>
  );
}
