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
        const needsTrial =
          !profile.is_institutional &&
          (!profile.subscription_status || profile.subscription_status === 'none') &&
          !profile.trial_ends_at;
        if (needsTrial) {
          const trialEnds = new Date();
          trialEnds.setDate(trialEnds.getDate() + 7);
          update.subscription_status = 'trial';
          update.trial_ends_at       = trialEnds.toISOString();
          update.is_active           = true;
        }
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
