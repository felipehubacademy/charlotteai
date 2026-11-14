// StreakProvider — mostra a tela da sequência uma vez por dia (StreakCelebration) e guarda o último
// estado lido do servidor (lib/streak.ts) para quem quiser usar sem consultar de novo.
// celebrateStreak(): chamado ao concluir uma atividade e ao voltar para a tela inicial. Só abre se o aluno
// praticou hoje e ainda não viu a tela hoje; espera a comemoração de conquista fechar antes.
// openStreakWeek(): o aluno tocou na semana da tela inicial; abre a mesma tela só para consultar (sem som,
// sem convite do desafio) e não conta como a comemoração do dia.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/hooks/useAuth';
import { useAchievementsContext } from '@/components/achievements/AchievementsProvider';
import { StreakCelebrationModal } from '@/components/streak/StreakCelebration';
import { fetchStreakStatus, StreakStatus } from '@/lib/streak';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

interface StreakContextValue {
  status: StreakStatus | null;
  refreshStreak: () => Promise<StreakStatus | null>;
  celebrateStreak: () => Promise<void>;
  openStreakWeek: () => void;
}

const StreakContext = createContext<StreakContextValue>({
  status: null,
  refreshStreak: async () => null,
  celebrateStreak: async () => {},
  openStreakWeek: () => {},
});

export const useStreak = () => useContext(StreakContext);

const MAX_CHALLENGE_OFFERS = 3;

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const { waitForCelebration } = useAchievementsContext();
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [showing, setShowing] = useState<StreakStatus | null>(null);
  const [offerShow, setOfferShow] = useState(false);
  const [viewing, setViewing] = useState(false);
  const busy = useRef(false);
  const openRef = useRef(false);

  const refreshStreak = useCallback(async () => {
    const s = await fetchStreakStatus();
    if (s) setStatus(s);
    return s;
  }, []);

  const celebrateStreak = useCallback(async () => {
    if (!userId || busy.current || openRef.current) return;
    busy.current = true;
    try {
      const s = await refreshStreak();
      if (!s || !s.practiced_today || s.streak < 1) return;
      const seenKey = `streak_celebrated_${userId}_${s.today}`;
      if (await SecureStore.getItemAsync(seenKey).catch(() => null)) return;
      // Visto hoje em outro aparelho (a conta guarda o dia): não repete.
      const { data: seenRow } = await supabase.from('charlotte_users').select('streak_celebrated_on').eq('id', userId).maybeSingle();
      if ((seenRow as { streak_celebrated_on?: string | null } | null)?.streak_celebrated_on === s.today) {
        SecureStore.setItemAsync(seenKey, '1').catch(() => {});
        return;
      }
      // Convite do desafio: no máximo 3 vezes, uma por dia.
      const offersKey = `streak_challenge_offers_${userId}`;
      const raw = await SecureStore.getItemAsync(offersKey).catch(() => null);
      const offers = raw ? (JSON.parse(raw) as { n: number; last: string }) : { n: 0, last: '' };
      setOfferShow(offers.n < MAX_CHALLENGE_OFFERS && offers.last !== s.today);
      await waitForCelebration();
      track('streak_celebration_shown', { streak: s.streak });
      openRef.current = true;
      setViewing(false);
      setShowing(s);
    } finally {
      busy.current = false;
    }
  }, [userId, refreshStreak, waitForCelebration]);

  const onOfferShown = useCallback(() => {
    if (!userId || !showing) return;
    const offersKey = `streak_challenge_offers_${userId}`;
    SecureStore.getItemAsync(offersKey).catch(() => null).then(raw => {
      const offers = raw ? (JSON.parse(raw) as { n: number; last: string }) : { n: 0, last: '' };
      if (offers.last === showing.today) return;
      SecureStore.setItemAsync(offersKey, JSON.stringify({ n: offers.n + 1, last: showing.today })).catch(() => {});
    });
  }, [userId, showing]);

  const openStreakWeek = useCallback(() => {
    if (!status || openRef.current) return;
    track('streak_week_opened', { streak: status.streak, practiced_today: status.practiced_today });
    openRef.current = true;
    setOfferShow(false);
    setViewing(true);
    setShowing(status);
  }, [status]);

  // "Visto hoje" só ao fechar: se outra tela cheia impedir a abertura, a próxima chamada tenta de novo.
  const close = useCallback(() => {
    if (userId && showing && !viewing) {
      SecureStore.setItemAsync(`streak_celebrated_${userId}_${showing.today}`, '1').catch(() => {});
      supabase.from('charlotte_users').update({ streak_celebrated_on: showing.today }).eq('id', userId).then(() => {}, () => {});
    }
    openRef.current = false;
    setShowing(null);
    refreshStreak();
  }, [userId, showing, viewing, refreshStreak]);

  return (
    <StreakContext.Provider value={{ status, refreshStreak, celebrateStreak, openStreakWeek }}>
      {children}
      {showing && <StreakCelebrationModal status={showing} offer={{ show: offerShow, onShown: onOfferShown }} onClose={close} mode={viewing ? 'view' : 'celebrate'} />}
    </StreakContext.Provider>
  );
}
