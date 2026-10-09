// InviteClaimer — depois do login, aceita o convite pendente (deep link) ou o
// deixado pela instalação (Play Store / área de transferência no iPhone) e
// avisa que a dupla de estudo foi formada.
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Users } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { takePendingInvite, detectInstallInvite, fetchReferral, claimInvite } from '@/lib/referral';
import { takePendingRally, savePendingRally, joinRally } from '@/lib/rally';

export function InviteClaimer() {
  const { profile } = useAuth();
  const ran = useRef(false);
  const [joined, setJoined] = useState<{ inviter: string | null; minutes: number } | null>(null);
  const isPt = systemIsPt;

  useEffect(() => {
    // Só depois do onboarding, para não sobrepor as telas iniciais.
    if (ran.current || !profile?.first_welcome_done) return;
    ran.current = true;
    (async () => {
      let code = await takePendingInvite();
      if (!code) {
        // Detecção pela instalação só para contas que ainda podem aceitar convite.
        const info = await fetchReferral();
        if (!info?.canClaim) return;
        code = await detectInstallInvite();
      }
      if (code) {
        const r = await claimInvite(code);
        if (r.ok) setJoined({ inviter: r.inviter, minutes: r.rewardMinutes });
      }
      // Veio de um link de rally: entra na disputa já no primeiro acesso.
      const rally = await takePendingRally();
      if (rally) {
        const j = await joinRally(rally);
        if (!j.ok && j.error === 'network') await savePendingRally(rally);
        else if (j.ok && !code) router.push('/(app)/study-together' as any);
      }
    })();
  }, [profile?.first_welcome_done]);

  if (!joined) return null;
  const who = joined.inviter ?? (isPt ? 'quem te convidou' : 'your buddy');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setJoined(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#16131F', borderRadius: 26, padding: 24, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFF4A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Users size={30} color="#16131F" weight="bold" />
          </View>
          <AppText display style={{ fontSize: 26, lineHeight: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
            {isPt ? `Você e ${who} agora estudam juntos` : `You and ${who} are now study buddies`}
          </AppText>
          <AppText style={{ fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 10 }}>
            {isPt ? `Vocês dois ganharam ${joined.minutes} minutos de Live Voice.` : `You both got ${joined.minutes} Live Voice minutes.`}
          </AppText>
          <TouchableOpacity onPress={() => { setJoined(null); router.push('/(app)/study-together' as any); }}
            style={{ marginTop: 22, alignSelf: 'stretch', backgroundColor: '#DCFF4A', borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: '#16131F' }}>{isPt ? 'Ver amigos de estudo' : 'See study buddies'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setJoined(null)} style={{ marginTop: 12, padding: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{isPt ? 'Depois' : 'Later'}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
