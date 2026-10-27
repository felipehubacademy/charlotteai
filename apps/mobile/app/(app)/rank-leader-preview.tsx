// Prévia da celebração de 1º lugar do ranking (queizy://rank-leader-preview), só para contas da equipe
// (fora do ranking). Serve para ver e revisar a celebração sem depender de alguém assumir a liderança.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { RankLeaderModal, type RankLeaderEvent } from '@/components/social/RankLeaderModal';

export default function RankLeaderPreview() {
  const { profile } = useAuth();
  const [event, setEvent] = useState<RankLeaderEvent | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('charlotte_users').select('hide_from_ranking').eq('id', profile.id).maybeSingle().then(({ data }) => {
      if (!(data as { hide_from_ranking?: boolean } | null)?.hide_from_ranking) { router.back(); return; }
      setEvent({ level: profile.charlotte_level ?? 'Novice', totalXP: 21440, leadXP: 9645, players: 190 });
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: '#16131F' }}>
      <RankLeaderModal event={event} onClose={() => { setEvent(null); router.back(); }} />
    </View>
  );
}
