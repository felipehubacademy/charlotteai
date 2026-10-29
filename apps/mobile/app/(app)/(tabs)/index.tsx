// app/(app)/(tabs)/index.tsx
// New Home tab — beta only (beta_features includes 'new_layout').
// Header (streak/XP/rank pills) + Charlotte hero card + TrailContent inline.

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, RefreshControl, Animated, unstable_batchedUpdates,
  findNodeHandle, UIManager, AppState,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { AppText } from '@/components/ui/Text';
import { MarkerText } from '@/components/ui/MarkerText';
import Svg, { Path } from 'react-native-svg';
import { systemIsPt } from '@/lib/systemLang';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { fetchMyRank } from '@/lib/myRank';
import { UserLevel } from '@/lib/levelConfig';
import type { TrailLevel } from '@/data/trailTypes';
import { ExtraTracksRow } from '@/components/trail/ExtraTracksStrip';
import { useTheme } from '@/lib/theme';
import { usePaywallContext } from '@/lib/paywallContext';
import { identifyUser, track } from '@/lib/analytics';
import { reportOtaStatus } from '@/lib/otaDiagnostics';
import { greetingCache, resetGreetingCache, prefetchGreeting } from '@/lib/greetingCache';
import { characterInfo, type CharacterId } from '@/lib/characters';
import { FamilyPickSheet } from '@/components/family/FamilyPickSheet';
import { markFamilyMemberPicked } from '@/lib/familyInvite';
import { fetchGoals } from '@/lib/missions';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import { splashGate } from '@/lib/splashGate';
import { getAppVersionFields } from '@/lib/appVersion';
import { voiceSFX } from '@/lib/voiceSFX';
import { ArrowDown, ArrowUp } from 'phosphor-react-native';
import { TrailContent } from '@/components/trail/TrailContent';
import { TasteCallCard } from '@/components/trail/TasteCallCard';
import { TasteTomorrowCard } from '@/components/trail/TasteTomorrowCard';
import { useStreak } from '@/components/streak/StreakProvider';
import { StreakProtectedCard } from '@/components/streak/StreakProtectedCard';
import { protectedYesterday } from '@/lib/streak';
import { TASTE_DAYS, tasteDayNumber, tasteFreeUnits } from '@/lib/tasteDays';
import { RankLeaderModal, type RankLeaderEvent } from '@/components/social/RankLeaderModal';
import { TrailBanner } from '@/components/trail/TrailBanner';
import { StudyingNow } from '@/components/social/StudyingNow';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { PromotionModal } from '@/components/trail/PromotionModal';
import { GraduationModal } from '@/components/trail/GraduationModal';
import { usePromotion } from '@/lib/curriculum-v2/usePromotion';
import { usePromotionVideoPrefetch } from '@/hooks/usePromotionVideoPrefetch';
import { usePromotionPending } from '@/lib/promotionState';
import { PlacementPromptSheet } from '@/components/onboarding/PlacementPromptSheet';
import { maybeRequestReview } from '@/lib/storeReview';
import { AcquisitionSheet } from '@/components/onboarding/AcquisitionSheet';

// Celebração de líder da semana: XP mínimo da semana para valer.
const WEEK_LEADER_MIN_XP = 100;
/** Segunda-feira da semana corrente no horário de Brasília (AAAA-MM-DD), igual ao ranking da semana. */
function brtWeekStart(): string {
  const brt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  brt.setDate(brt.getDate() - ((brt.getDay() + 6) % 7));
  return `${brt.getFullYear()}-${String(brt.getMonth() + 1).padStart(2, '0')}-${String(brt.getDate()).padStart(2, '0')}`;
}

// Module-level flag — persists for the JS session (like the legacy home screen)
let _streakSoundPlayedThisSession = false;
// Intro brand jingle: toca em todo cold start (1x por sessao JS — reset somente
// quando o processo do app e recriado, igual padrao do Duolingo).
let _introPlayedThisJsSession = false;

const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  heroStrip: '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  navyGhost: 'rgba(22,19,31,0.06)',
  orange:    '#FF6B35',
  gold:      '#F59E0B',
  greenDark: '#08804A',
  shadow:    'rgba(22,19,31,0.08)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: C.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 4 },
});

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current); // eslint-disable-line
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []); // eslint-disable-line
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(22,19,31,0.45)', opacity: dot }} />
      ))}
    </View>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────────

const MIN_TRAIL_VIEWPORT = 240; // abaixo disso a trilha fixa embaixo do hero fica inutilizável

export default function HomeTab() {
  const { profile, isTaster, refreshProfile } = useAuth();
  const { status: streakStatus, refreshStreak, celebrateStreak } = useStreak();
  const { openPaywall }           = usePaywallContext();
  const { colors: T }             = useTheme();
  const userId    = profile?.id ?? '';
  const currentLevel = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const [selectedLevel, setSelectedLevel] = useState<TrailLevel>(currentLevel);
  // Mantem selectedLevel sincronizado se o perfil mudar (ex: promocao organica)
  useEffect(() => { setSelectedLevel(currentLevel); }, [currentLevel]);
  // A trilha do Igorfina (beta) é uma trilha à parte: só o cartão e a trilha mudam.
  // Ranking, saudação e estatísticas continuam no nível do aluno.
  const trailLevel = selectedLevel;
  const level: UserLevel = selectedLevel === 'Igorfina' ? currentLevel : selectedLevel;

  // Promocao organica: checa apos cada focus da home.
  const { event: promotionEvent, ack: ackPromotion, checkAndPromote } = usePromotion();
  useFocusEffect(useCallback(() => { checkAndPromote(); }, [checkAndPromote]));
  // Avaliação na loja: ao voltar para a Início depois de concluir tópicos (regras em lib/storeReview).
  // Espera um pouco para não aparecer junto com a transição de tela ou a promoção de nível.
  useFocusEffect(useCallback(() => {
    const t = setTimeout(() => { maybeRequestReview(profile?.created_at); }, 2500);
    return () => clearTimeout(t);
  }, [profile?.created_at]));

  // Pre-fetch do video de promocao assim que entra na home, se o aluno
  // estiver no nivel atual (Novice -> Inter video, Inter -> Advanced).
  // Da tempo ENORME de baixar antes da promocao real disparar.
  const NEXT_LEVEL_MAP: Record<string, string | null> = {
    Novice: 'Inter', Inter: 'Advanced', Advanced: null,
  };
  usePromotionVideoPrefetch(NEXT_LEVEL_MAP[currentLevel] ?? null);

  // Flag global: guided-chat seta true ao concluir ultima atividade. Home
  // entao cobre tudo com overlay ate o PromotionModal aparecer — esconde
  // o loading do TrailContent que mostra spinner cinza ao trocar de level.
  const promoPending = usePromotionPending();
  const name      = profile?.name ?? profile?.email?.split('@')[0] ?? 'Student';
  const isPt      = systemIsPt; // chrome da home: idioma do device
  const firstName = name.split(' ')[0] ?? name;

  const trialDaysLeft = useMemo(() => {
    if (!profile || profile.is_institutional) return null;
    if (profile.subscription_status !== 'trial') return null;
    if (!profile.trial_ends_at) return null;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [profile]);

  const [streak,          setStreak]          = useState(0);
  const [totalXP,         setTotalXP]         = useState(0);
  const [todayXP,         setTodayXP]         = useState(0);
  const [rank,            setRank]            = useState<number | null>(null);
  const [rankLeader,      setRankLeader]      = useState<RankLeaderEvent | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [aiGreeting,      setAiGreeting]      = useState<string | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(true);
  // Placement opcional (Fase 1): pop único na Home pra quem ainda não fez o
  // teste. Sempre dispensável. Flag por device em SecureStore.
  const [showPlacementPrompt, setShowPlacementPrompt] = useState(false);
  const placementDone = profile?.placement_test_done === true;
  // Convite visto/fechado: por conta (antes era por aparelho e uma conta nova no mesmo celular nunca via).
  const placementKey = profile?.id ? `placement_prompt_dismissed_${profile.id}` : null;

  // Família Queizy: "Quem vai te acompanhar?" 1x por conta neste aparelho (Igorfina marcado), e de novo
  // ao tocar na foto da saudação. Vem antes da janela do teste de nível (uma de cada vez).
  const [familySheet, setFamilySheet] = useState<'first' | 'switch' | null>(null);
  const [familyPickDone, setFamilyPickDone] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const familyKey = profile?.id ? `family_pick_done_${profile.id}` : null;
  useEffect(() => {
    if (!familyKey) return;
    let alive = true;
    SecureStore.getItemAsync(familyKey).catch(() => null).then(v => {
      if (!alive) return;
      if (v) { setFamilyPickDone(true); return; }
      splashGate.then(() => setTimeout(() => { if (alive) setFamilySheet('first'); }, 700));
    });
    return () => { alive = false; };
  }, [familyKey]);
  const confirmFamily = useCallback(async (id: CharacterId) => {
    if (!profile?.id || familySaving) return;
    setFamilySaving(true);
    try {
      if (id !== characterInfo(profile.active_character).id) {
        const { error } = await supabase.from('charlotte_users').update({ active_character: id }).eq('id', profile.id);
        if (!error) await refreshProfile();
      }
      if (familyKey) await SecureStore.setItemAsync(familyKey, id).catch(() => {});
      markFamilyMemberPicked(); // some o convite "Conheça a Família Queizy"
    } finally {
      setFamilySaving(false);
      setFamilySheet(null);
      setFamilyPickDone(true);
    }
  }, [profile?.id, profile?.active_character, familyKey, familySaving, refreshProfile]);

  // Uma coisa de cada vez (todos): 1ª abertura = só a Família; o convite do teste de nível vem depois da 1ª atividade.
  const [tasterDone, setTasterDone] = useState<number | null>(null);
  // "Como você conheceu" (conta nova): na volta da 1ª atividade, depois da Família e antes do convite do teste de nível.
  const askAcquisition = (profile?.created_at ?? '') >= '2026-10-27T00:00:00Z';
  const [acquisitionDone, setAcquisitionDone] = useState(false);
  const acquisitionArmed = askAcquisition && familyPickDone && familySheet === null && !loading && (tasterDone ?? 0) >= 1;
  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    supabase.from('learn_history_v2').select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('completed', true)
      .then(({ count }) => setTasterDone(count ?? 0));
  }, [profile?.id]));

  useEffect(() => {
    if (loading || placementDone || !familyPickDone) return;
    // Mesma experiência para todos (degustação ou assinante): o convite vem depois da 1ª atividade concluída,
    // nunca empilhado com o aceite e a Família na primeira entrada. Na degustação, some ao fechar o tópico grátis
    // (aí a oferta da degustação já abre sozinha).
    if (tasterDone === null || tasterDone < 1 || (isTaster && tasterDone >= 4)) return;
    if (askAcquisition && !acquisitionDone) return; // a pergunta de origem vem antes
    if (!placementKey) return;
    // Conta antiga que já fechou o convite na versão anterior (marcação por aparelho) não vê de novo.
    const legacy = profile?.created_at && profile.created_at < '2026-10-22T14:50:00Z'
      ? SecureStore.getItemAsync('PLACEMENT_PROMPT_DISMISSED').catch(() => null) : Promise.resolve(null);
    Promise.all([SecureStore.getItemAsync(placementKey), legacy]).then(([own, old]) => { const v = own || old;
      if (!v) {
        const t = setTimeout(() => setShowPlacementPrompt(true), 800);
        return () => clearTimeout(t);
      }
    }).catch(() => {});
  }, [loading, placementDone, familyPickDone, isTaster, tasterDone, placementKey, profile?.created_at, askAcquisition, acquisitionDone]);

  const dismissPlacementPrompt = useCallback(() => {
    setShowPlacementPrompt(false);
    if (placementKey) SecureStore.setItemAsync(placementKey, '1').catch(() => {});
  }, [placementKey]);

  const handleTakePlacement = useCallback(() => {
    dismissPlacementPrompt();
    // Degustação: o teste de nível é do plano pago. Abre a oferta com essa frase (X / "Continuar na degustação").
    if (isTaster) { openPaywall('placement'); return; }
    // direct=1: já escolheu fazer o teste no pop → pula o intro do placement.
    router.push('/(app)/placement-test?direct=1');
  }, [dismissPlacementPrompt, isTaster, openPaywall]);

  // Charlotte greeting animado em WebP com alpha. expo-image faz loop nativo
  // e não toca AVAudioSession (substitui expo-video que floodava MediaPlayback
  // events no Live Voice — benchmark 2026-05-15).
  // Família Queizy: quem fala na tela inicial é o personagem escolhido (padrão Charlotte).
  const avatarSrc = characterInfo(profile?.active_character).avatar;
  // Hora da saudação: recalcula quando o app volta para o primeiro plano
  // (quem abriu de manhã e voltou à tarde vê "Good afternoon").
  const [heroHour, setHeroHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setHeroHour(new Date().getHours());
    });
    return () => sub.remove();
  }, []);
  // Saudação sempre em inglês (marca da Charlotte, decisão de produto); a fala
  // da IA logo abaixo segue o nível do aluno.
  const heroTitle = `${heroHour < 12 ? 'Good morning' : heroHour < 18 ? 'Good afternoon' : 'Good evening'}, ${firstName}!`;

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();
      const [prog, prac, achToday] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp,last_practice_date')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('charlotte_practices')
          .select('xp_earned')
          .eq('user_id', userId)
          .gte('created_at', todayISO),
        supabase.from('user_achievements')
          .select('xp_bonus')
          .eq('user_id', userId)
          .gte('earned_at', todayISO),
      ]);

      const todayXPVal    = (prac.data ?? []).reduce((s, p) => s + (p.xp_earned ?? 0), 0)
                          + (achToday.data ?? []).reduce((s: number, a: any) => s + (a.xp_bonus ?? 0), 0);
      const userTotalXP   = prog.data?.total_xp ?? 0;

      // Conta fora do ranking (equipe, revisão das lojas): sem posição no topo nem celebração.
      const { rank: myRank } = await fetchMyRank(userId, level, userTotalXP);

      const todayStr = localTodayStr();
      const yesterdayStr = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })();
      const lastPracticeDate = prog.data?.last_practice_date ?? null;
      const streakAlive = lastPracticeDate === todayStr || lastPracticeDate === yesterdayStr;
      const streakDays  = streakAlive ? (prog.data?.streak_days ?? 0) : 0;

      setStreak(streakDays);
      // Regra do servidor (conta a proteção da semana): corrige o número se a falta de ontem foi protegida.
      refreshStreak().then(s => { if (s) setStreak(s.streak); });
      setTotalXP(userTotalXP);
      setTodayXP(todayXPVal);
      setRank(myRank);

      // Liderança do ranking do nível (XP total) e da semana: celebra uma vez por conquista (perdeu e voltou =
      // celebra de novo). A da semana vale para a semana corrente (zera segunda, horário de Brasília) e só a partir
      // de WEEK_LEADER_MIN_XP, para não celebrar quem fez uma atividade na segunda de manhã e está sozinho.
      // Contas fora do ranking (equipe, revisão das lojas) se veriam como 1º pela contagem acima: ficam de fora.
      const leaderKey = `rank_leader_${userId}_${level}`;
      const weekKey = `rank_week_leader_${userId}_${level}_${brtWeekStart()}`;
      (async () => {
        let allTime: RankLeaderEvent | null = null;
        if (myRank === 1 && !(await SecureStore.getItemAsync(leaderKey).catch(() => null))) {
          const [{ data: top }, { count: players }] = await Promise.all([
            supabase.from('charlotte_leaderboard_cache').select('user_id, total_xp').eq('user_level', level).order('total_xp', { ascending: false }).limit(2),
            supabase.from('charlotte_leaderboard_cache').select('*', { count: 'exact', head: true }).eq('user_level', level),
          ]);
          const second = (top ?? []).find((r: { user_id: string }) => String(r.user_id) !== String(userId)) as { total_xp: number } | undefined;
          await SecureStore.setItemAsync(leaderKey, '1').catch(() => {});
          allTime = { scope: 'all', level, totalXP: userTotalXP, leadXP: second ? Math.max(0, userTotalXP - second.total_xp) : null, players: players ?? 1 };
        } else if (myRank != null && myRank > 1) {
          SecureStore.deleteItemAsync(leaderKey).catch(() => {});
        }

        let week: RankLeaderEvent | null = null;
        if (myRank != null) {
          const { data: wk } = await supabase.rpc('weekly_ranking', { p_level: level });
          const list = (wk ?? []) as { user_id: string; week_xp: number; pos: number }[];
          const me = list.find(r => String(r.user_id) === String(userId));
          if (me && Number(me.pos) === 1 && Number(me.week_xp) >= WEEK_LEADER_MIN_XP && list.length >= 3) {
            if (!(await SecureStore.getItemAsync(weekKey).catch(() => null))) {
              await SecureStore.setItemAsync(weekKey, '1').catch(() => {});
              const second = list.find(r => String(r.user_id) !== String(userId));
              week = { scope: 'week', level, totalXP: Number(me.week_xp), leadXP: second ? Math.max(0, Number(me.week_xp) - Number(second.week_xp)) : null, players: list.length };
            }
          } else if (me && Number(me.pos) > 1) {
            SecureStore.deleteItemAsync(weekKey).catch(() => {});
          }
        }

        // Líder nas duas ao mesmo tempo: uma celebração só (a do geral, que é maior).
        const ev = allTime ?? week;
        if (!ev) return;
        await splashGate;
        setRankLeader(ev);
      })().catch(() => {});

      // Brand intro jingle — so dispara DEPOIS do splash sumir (gate via
      // splashGate Promise resolvida pelo SplashOverlay no fim do fade).
      // Sem isso, o intro tocava por baixo do splash e terminava antes
      // do user ver a home.
      const introWillPlay = !_introPlayedThisJsSession;
      // Igorfina escolhido na Família: depois do jingle, uma fala gravada por ele (rodízio entre aberturas).
      const igorOpening = introWillPlay && characterInfo(profile?.active_character).id === 'igorfina';
      if (introWillPlay) {
        _introPlayedThisJsSession = true;
        splashGate.then(() => {
          soundEngine.play('intro_app').catch(() => {});
          if (igorOpening) setTimeout(() => { voiceSFX.playIgorOpening().catch(() => {}); }, 3100);
        });
      }
      // Offset usado pra shiftar streak_alive e Tier 4 quando o intro toca primeiro.
      // intro dura ~3s => proximos sons em t=splash_done+3100ms (+ a fala do Igor, até ~3,5s).
      const introOffset = introWillPlay ? 3100 + (igorOpening ? 3500 : 0) : 0;

      // Streak sound + Tier 4 (voz)
      if (!_streakSoundPlayedThisSession && streakDays > 0) {
        const today     = localTodayStr();
        const streakKey = `streak_sound_played_${userId}`;
        const lastOpenKey = `last_open_date_${userId}`;
        SecureStore.getItemAsync(streakKey).then(lastPlayed => {
          if (lastPlayed !== today) {
            _streakSoundPlayedThisSession = true;
            SecureStore.setItemAsync(streakKey, today).catch(() => {});
            // Tambem espera o splash sair antes de tocar.
            splashGate.then(() => {
              setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), introOffset + 800);
              // A voz dos marcos (7 e 30 dias) toca na tela da sequência, no dia em que o marco chega.
            });
          } else {
            _streakSoundPlayedThisSession = true;
          }
        }).catch(() => {});

        // Welcome back — se ultimo acesso foi ha 3+ dias
        SecureStore.getItemAsync(lastOpenKey).then(lastOpen => {
          if (lastOpen) {
            const diffMs = Date.now() - new Date(lastOpen).getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays >= 3) {
              setTimeout(() => voiceSFX.play('welcome_back').catch(() => {}), introOffset + 2300);
            }
          }
          SecureStore.setItemAsync(lastOpenKey, new Date().toISOString()).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[HomeTab] fetchData error:', e);
    }
  }, [userId, level, refreshStreak]);

  // Praticou hoje por outro caminho (chat livre, ligação): a tela da sequência abre ao voltar para cá.
  useFocusEffect(useCallback(() => { if (userId) celebrateStreak(); }, [userId, celebrateStreak]));

  useEffect(() => {
    if (!userId) return;
    identifyUser(userId, level);
    track('app_open');
    reportOtaStatus();
    supabase.from('charlotte_users').update({ last_seen_at: new Date().toISOString(), ...getAppVersionFields() }).eq('id', userId).then(() => {});
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    fetchData();
    // Metas: o servidor credita o XP das missões concluídas e a comemoração aparece (GoalsCelebration).
    // Ao voltar de uma lição para a tela inicial, o aluno já vê a missão concluída.
    // Se creditou agora, recarrega para o XP do topo já somar.
    fetchGoals().then(g => { if (g?.granted.length) fetchData(); });
  }, [fetchData]));

  // ── AI Greeting ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const who = profile?.active_character || 'charlotte';
    if (profile && greetingCache.level && (greetingCache.level !== level || greetingCache.character !== who)) {
      resetGreetingCache();
      setAiGreeting(null);
      setGreetingLoading(true);
      prefetchGreeting(profile);
    }
    if (greetingCache.text) {
      setAiGreeting(greetingCache.text);
      setGreetingLoading(false);
      return;
    }
    if (!userId || !name) return;

    // Hardcoded fallback — used when API fails, times out, or returns empty.
    const h = new Date().getHours();
    // Sem nome nem cumprimento: o título do hero já mostra os dois.
    // Mesmo idioma da fala da IA: segue o nível (Novice em português; Inter e Advanced em inglês).
    const fallback = (profile?.charlotte_level ?? level) === 'Novice'
      ? (h < 12 ? 'Começar o dia praticando faz toda a diferença.'
       : h < 18 ? 'Uma lição rápida agora já te deixa mais perto da meta.'
                : 'Ainda dá tempo de uma prática rápida hoje.')
      : (h < 12 ? 'Starting the day with practice makes all the difference.'
       : h < 18 ? 'One quick lesson now gets you closer to your goal.'
                : "There's still time for a quick practice today.");

    const showFallback = () => {
      unstable_batchedUpdates(() => {
        setAiGreeting(prev => prev ?? fallback);
        setGreetingLoading(false);
      });
    };

    // API already finished with no result — show fallback immediately.
    if (greetingCache.fetched && !greetingCache.pending) {
      showFallback();
      return;
    }

    // API in-flight: poll every 50ms + 3s hard timeout.
    const minDotsMs  = 600;
    const fetchStart = Date.now();
    let   settled    = false;

    const resolve = (text: string) => {
      if (settled) return;
      settled = true;
      const elapsed = Date.now() - fetchStart;
      const delay   = Math.max(0, minDotsMs - elapsed);
      setTimeout(() => {
        unstable_batchedUpdates(() => {
          setAiGreeting(text || fallback);
          setGreetingLoading(false);
        });
      }, delay);
    };

    const poll = setInterval(() => {
      if (greetingCache.text) {
        clearInterval(poll);
        resolve(greetingCache.text);
      } else if (!greetingCache.pending) {
        clearInterval(poll);
        resolve(fallback);
      }
    }, 50);

    // Fica no loading até a fala da IA chegar; a requisição corta em 5s e aí entra o fallback.
    // Sem troca de texto depois que algo aparece. Rede de segurança um pouco acima dos 5s.
    const timeout = setTimeout(() => {
      clearInterval(poll);
      resolve(fallback);
    }, 5500);

    return () => { clearInterval(poll); clearTimeout(timeout); };
  }, [userId, name, level, profile]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Auto-scroll pra trilha: quando o topico "atual" monta, mede sua posicao
  // dentro do ScrollView e rola ate la. So roda 1x por mount (nao re-scrolla
  // depois que user moveu manualmente).
  const trailScrollRef = useRef<ScrollView>(null);
  const trailScrolledRef = useRef(false);
  // FAB scroll: toggle entre topo e topico ativo
  const [scrollY, setScrollY] = useState(0);
  // STATE (nao ref) — ref nao dispara re-render, FAB nao aparecia ate
  // o user rolar manualmente. Com state, mudanca dispara re-render e
  // o conditional do FAB reavalia assim que o trail mede a posicao.
  const [activeTopicY, setActiveTopicY] = useState(0);
  const activeTopicYRef = useRef<number>(0);
  // Tela baixa (iPhone SE/8, fonte ou zoom grandes): a trilha fixa embaixo do topo ficava espremida.
  //   1 = o card do nível (e trilhas extras) rola junto com a trilha; a saudação continua fixa.
  //   2 = caso extremo: a saudação também rola.
  const [scrollLevel, setScrollLevel] = useState<0 | 1 | 2>(0);
  const updateBannerHRef = useRef(0);
  const topBlockHRef = useRef(0);
  // Trilha finalizada (nenhum modulo ativo) — reportado pelo TrailContent.
  // Fonte de verdade pro goDown: evita usar um activeTopicYRef obsoleto que
  // sobra quando o user conclui a trilha na mesma sessao (mesmo nivel, sem
  // passar pelo handleLevelChange que zeraria o ref).
  const trailFinishedRef = useRef(false);
  const isNearTop = scrollY < 80;
  // goDown:
  //  - trilha em andamento → para no modulo ativo (onde a trilha esta);
  //  - trilha finalizada    → rola ate o final (scrollToEnd nativo).
  const goDown = useCallback(() => {
    const sv = trailScrollRef.current;
    if (!sv) return;
    if (trailFinishedRef.current) {
      sv.scrollToEnd({ animated: true });
      return;
    }
    const y = activeTopicYRef.current;
    if (y > 0) {
      sv.scrollTo({ y: Math.max(0, y - 24), animated: true });
    } else {
      // Em andamento mas Y ainda nao medido (raro) — fallback pro fim.
      sv.scrollToEnd({ animated: true });
    }
  }, []);
  const goTop = useCallback(() => {
    trailScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Reset SINCRONO de scroll-state quando o usuario troca de nivel pelo
  // dropdown. Feito no handler (antes do novo render) pra NAO entrar em
  // race com o onLayout do modulo ativo do novo nivel — se fosse num
  // useEffect([level]), o effect poderia rodar DEPOIS do onLayout e zerar
  // o Y recem-medido. Aqui zera antes, e o onLayout do novo nivel repopula.
  const handleLevelChange = useCallback((lvl: TrailLevel) => {
    activeTopicYRef.current = 0;
    trailFinishedRef.current = false;
    trailScrolledRef.current = false;
    setActiveTopicY(0);
    setScrollY(0);
    setSelectedLevel(lvl);
  }, []);


  const tryScroll = useCallback((node: any, attempt = 0) => {
    if (!node || !trailScrollRef.current) return;
    const sv = trailScrollRef.current as any;
    const svHandle =
      typeof sv.getInnerViewNode === 'function' ? sv.getInnerViewNode() :
      findNodeHandle(sv);
    const nodeHandle = findNodeHandle(node);
    if (svHandle == null || nodeHandle == null) {
      if (attempt < 5) requestAnimationFrame(() => tryScroll(node, attempt + 1));
      return;
    }
    UIManager.measureLayout(
      nodeHandle,
      svHandle,
      () => {
        if (attempt < 5) requestAnimationFrame(() => tryScroll(node, attempt + 1));
      },
      (_x: number, y: number) => {
        if (y > 0) {
          activeTopicYRef.current = y;
          setActiveTopicY(y); // dispara re-render pro FAB aparecer
          trailScrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: false });
          trailScrolledRef.current = true;
        } else if (attempt < 5) {
          requestAnimationFrame(() => tryScroll(node, attempt + 1));
        }
      },
    );
  }, []);

  const handleCurrentTopicRef = useCallback((node: View | null) => {
    if (!node) return;
    // Dois RAFs garantem que o layout foi commitado nos dois lados
    // (ScrollView interno + posicao do node).
    requestAnimationFrame(() => requestAnimationFrame(() => tryScroll(node)));
  }, [tryScroll]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: T.card }}>
          <View style={{ height: 52, backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: C.navyGhost }} />
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </View>
    );
  }

  const statsParams = { sessionXP: String(todayXP), totalXP: String(totalXP), userId: userId ?? '', userLevel: level, userName: name };

  const heroBlock = (
    <>
      {/* Hero — a Charlotte fala com o aluno: balão no formato do logo,
          centralizado, com a saudação em destaque e a fala da IA embaixo. */}
      <View style={{ marginHorizontal: 20, marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
          {/* Tocar na foto troca quem fala com você (Família Queizy). */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setFamilySheet('switch')} hitSlop={8}
            accessibilityLabel={isPt ? `Trocar quem fala com você (agora: ${characterInfo(profile?.active_character).name})` : `Change who talks to you (now: ${characterInfo(profile?.active_character).name})`}>
            <Image
              source={avatarSrc}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.navy }}
              contentFit="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(app)/evolution' as any)} style={{ maxWidth: '78%', marginBottom: 16 }}
            accessibilityLabel={isPt ? 'Ver minha evolução' : 'See my progress'}>
            <View style={{
              backgroundColor: T.card, borderRadius: 18,
              paddingHorizontal: 16, paddingVertical: 13,
              ...Platform.select({
                ios:     { shadowColor: 'rgba(22,19,31,0.10)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
                android: { elevation: 2 },
              }),
            }}>
              {/* Saudação em Tinta com marca-texto Volt "de caneta" (metade de
                  baixo das letras) — o limão aparece sem virar cor de texto. */}
              <MarkerText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, lineHeight: 28 }}>
                {heroTitle}
              </MarkerText>
              {greetingLoading || !aiGreeting ? (
                <View style={{ marginTop: 6 }}><TypingDots /></View>
              ) : (
                <AppText style={{ fontSize: 14, color: C.navyMid, lineHeight: 20, marginTop: 4 }}>
                  {aiGreeting}
                </AppText>
              )}
            </View>
            <Svg width={20} height={14} viewBox="0 0 20 14" style={{ position: 'absolute', left: 8, bottom: -13 }}>
              <Path d="M19 0 L0 14 L7 0 Z" fill={T.card} />
            </Svg>
          </TouchableOpacity>
        </View>
        <StudyingNow />
      </View>

    </>
  );
  const levelBlock = (
    <>
      {/* Card do nível */}
      <View style={{ marginHorizontal: 20, marginTop: 14 }}>
        <View style={{ borderRadius: 22, backgroundColor: T.card, overflow: 'hidden', ...cardShadow }}>
          <TrailBanner
            userId={userId}
            level={trailLevel}
            currentLevel={currentLevel}
            onLevelChange={handleLevelChange}
            flush
          />
          {/* Trilhas extras da Família Queizy (influenciadores): linha fina no próprio cartão. */}
          <ExtraTracksRow />
        </View>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      <HeaderPills
        streak={streak}
        totalXP={totalXP}
        rank={rank}
        statsParams={statsParams}
        trialDaysLeft={trialDaysLeft}
        onPaywallOpen={openPaywall}
        isPt={isPt}
      />

      {/* Aviso de versão nova da loja: fixo logo abaixo do topo (fora da rolagem, nunca fica cortado). */}
      <UpdateBanner style={{ marginHorizontal: 20, marginTop: 10 }} onHeight={h => { updateBannerHRef.current = h ? h + 10 : 0; }} />

      {/* Saudação e card do nível fixos no topo; em tela baixa passam a rolar com a trilha (scrollLevel). */}
      {scrollLevel < 2 && heroBlock}
      {scrollLevel < 1 && levelBlock}

      {/* Learning trail — scrollable below fixed hero */}
      <ScrollView
        ref={trailScrollRef}
        style={{ flex: 1, marginTop: scrollLevel ? 0 : 10 }}
        contentContainerStyle={{ paddingTop: scrollLevel ? 0 : 24, paddingBottom: 40 }}
        onLayout={e => {
          // O card de versão nova (fechável) não conta: sem ele a tela é grande o bastante.
          if (scrollLevel < 2 && e.nativeEvent.layout.height + updateBannerHRef.current < MIN_TRAIL_VIEWPORT) setScrollLevel(l => (l + 1) as 1 | 2);
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      >
        {scrollLevel > 0 && (
          <View onLayout={e => { topBlockHRef.current = e.nativeEvent.layout.height + 34; }} style={{ paddingBottom: 34 }}>
            {scrollLevel === 2 && heroBlock}
            {levelBlock}
          </View>
        )}
        {/* Degustação sem nenhuma atividade concluída (passada a 1ª meia hora): a ligação como alternativa. */}
        {isTaster && tasterDone === 0 && !!profile?.created_at && Date.now() - new Date(profile.created_at).getTime() > 30 * 60000 && <TasteCallCard />}
        {/* Faltou ontem e a proteção da semana segurou: avisa e pede a prática de hoje. */}
        {protectedYesterday(streakStatus) && !streakStatus!.practiced_today && <StreakProtectedCard streak={streakStatus!.streak} />}
        {/* Degustação com o tópico grátis de hoje feito (4 atividades por tópico) e mais dias pela frente: volte amanhã. */}
        {isTaster && tasterDone !== null && !!profile?.created_at && tasterDone >= 4 * tasteFreeUnits(profile.created_at)
          && tasteDayNumber(profile.created_at) < TASTE_DAYS && <TasteTomorrowCard />}
        <TrailContent
          userId={userId}
          level={trailLevel}
          showBanner={false}
          onCurrentTopicRef={handleCurrentTopicRef}
          onActiveModuleY={(y) => {
            // Backup via onLayout — confiavel pra Inter/Advanced onde
            // measureLayout (tryScroll) as vezes falha silencioso.
            if (y > 0) activeTopicYRef.current = y + (scrollLevel ? topBlockHRef.current : 0);
          }}
          onTrailFinished={(finished) => {
            trailFinishedRef.current = finished;
            // Limpa o Y do (ex-)modulo ativo ao finalizar — assim mesmo que o
            // goDown caia no ramo de andamento, nao usa posicao obsoleta.
            if (finished) activeTopicYRef.current = 0;
          }}
        />
      </ScrollView>

      {/* FAB scroll toggle: SEMPRE visivel.
          No topo → ir pro topico ativo (ou fim do trail se nao houver).
          Embaixo → voltar pro topo. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={isNearTop ? goDown : goTop}
        style={{
          position: 'absolute', bottom: 40, right: 18,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: C.navy,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 }, elevation: 8,
        }}
        accessibilityLabel={isNearTop ? 'Ir para tópico atual' : 'Voltar ao topo'}
      >
        {isNearTop
          ? <ArrowDown size={22} color="#DCFF4A" weight="bold" />
          : <ArrowUp size={22} color="#DCFF4A" weight="bold" />}
      </TouchableOpacity>



      <FamilyPickSheet
        visible={familySheet !== null}
        mode={familySheet ?? 'switch'}
        isPt={systemIsPt}
        current={characterInfo(profile?.active_character).id}
        saving={familySaving}
        onConfirm={confirmFamily}
        onClose={() => setFamilySheet(null)}
      />

      <PlacementPromptSheet
        visible={showPlacementPrompt}
        isPt={systemIsPt}
        onTakeTest={handleTakePlacement}
        onStartFromZero={dismissPlacementPrompt}
      />

      {/* Promotion (level-up) vs Graduation (terminal): renderiza um ou outro
          baseado no discriminator do evento. */}
      {/* "Como você conheceu o Queizy?": logo depois da escolha da Família, 1x por conta (o servidor decide).
          Só contas novas (desde que a pergunta existe), para não empilhar com o convite do teste de nível de quem já usa. */}
      <AcquisitionSheet armed={acquisitionArmed} onDone={() => setAcquisitionDone(true)} />
      <RankLeaderModal event={rankLeader} onClose={() => setRankLeader(null)} />
      <PromotionModal
        event={promotionEvent?.type === 'level-up' ? promotionEvent : null}
        onClose={ackPromotion}
      />
      <GraduationModal
        event={promotionEvent?.type === 'graduation' ? promotionEvent : null}
        onClose={ackPromotion}
      />

      {/* Overlay enquanto promocao esta pendente — esconde TrailContent
          loading + qualquer flash visual ate o modal mostrar o video.
          Modal nativa do iOS renderiza POR CIMA de qualquer View RN,
          entao mantemos o overlay LIGADO mesmo quando event esta set —
          a modal cobre o overlay visualmente. Sem condicional em event
          eliminamos a janela de gap entre overlay sumir e VideoView
          inicializar. Flag eh clearada em PromotionModal.onClose. */}
      {promoPending && (
        <View pointerEvents="auto" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(244,243,250,0.97)',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      )}

    </View>
  );
}
