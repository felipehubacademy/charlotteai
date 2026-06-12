// app/(app)/(tabs)/index.tsx
// New Home tab — beta only (beta_features includes 'new_layout').
// Header (streak/XP/rank pills) + Charlotte hero card + TrailContent inline.

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, RefreshControl, Animated, unstable_batchedUpdates,
  findNodeHandle, UIManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { AppText } from '@/components/ui/Text';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { UserLevel } from '@/lib/levelConfig';
import { useTheme } from '@/lib/theme';
import { usePaywallContext } from '@/lib/paywallContext';
import { identifyUser, track } from '@/lib/analytics';
import { greetingCache, resetGreetingCache, prefetchGreeting } from '@/lib/greetingCache';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import { splashGate } from '@/lib/splashGate';
import { voiceSFX } from '@/lib/voiceSFX';
import { ArrowDown, ArrowUp } from 'phosphor-react-native';
import { TrailContent } from '@/components/trail/TrailContent';
import { TrailBanner } from '@/components/trail/TrailBanner';
import { PromotionModal } from '@/components/trail/PromotionModal';
import { GraduationModal } from '@/components/trail/GraduationModal';
import { usePromotion } from '@/lib/curriculum-v2/usePromotion';
import { usePromotionVideoPrefetch } from '@/hooks/usePromotionVideoPrefetch';
import { usePromotionPending } from '@/lib/promotionState';
import { NewLayoutWelcomeSheet } from '@/components/onboarding/NewLayoutWelcomeSheet';

// Module-level flag — persists for the JS session (like the legacy home screen)
let _streakSoundPlayedThisSession = false;
// Intro brand jingle: toca em todo cold start (1x por sessao JS — reset somente
// quando o processo do app e recriado, igual padrao do Duolingo).
let _introPlayedThisJsSession = false;

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  heroStrip: '#18193D',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  orange:    '#FF6B35',
  gold:      '#F59E0B',
  greenDark: '#3D8800',
  shadow:    'rgba(22,21,58,0.08)',
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
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)', opacity: dot }} />
      ))}
    </View>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { profile } = useAuth();
  const { openPaywall }           = usePaywallContext();
  const { colors: T }             = useTheme();
  const userId    = profile?.id ?? '';
  const currentLevel = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const [selectedLevel, setSelectedLevel] = useState<UserLevel>(currentLevel);
  // Mantem selectedLevel sincronizado se o perfil mudar (ex: promocao organica)
  useEffect(() => { setSelectedLevel(currentLevel); }, [currentLevel]);
  const level     = selectedLevel;

  // Promocao organica: checa apos cada focus da home.
  const { event: promotionEvent, ack: ackPromotion, checkAndPromote } = usePromotion();
  useFocusEffect(useCallback(() => { checkAndPromote(); }, [checkAndPromote]));

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
  const isPt      = level === 'Novice';
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
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [aiGreeting,      setAiGreeting]      = useState<string | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(true);
  const [showWelcomeSheet, setShowWelcomeSheet] = useState(false);

  // Welcome sheet do new layout — aparece 1x por device (flag SecureStore).
  // Substitui os tours antigos: usuario ja conhece as features, so precisa
  // saber pra qual tab cada uma migrou.
  useEffect(() => {
    if (loading) return;
    SecureStore.getItemAsync('NEW_LAYOUT_WELCOME_DONE').then(v => {
      if (!v) {
        // Pequeno delay pra o conteudo render + auto-scroll settle antes do modal
        const t = setTimeout(() => setShowWelcomeSheet(true), 700);
        return () => clearTimeout(t);
      }
    }).catch(() => {});
  }, [loading]);

  const closeWelcomeSheet = useCallback(() => {
    setShowWelcomeSheet(false);
    SecureStore.setItemAsync('NEW_LAYOUT_WELCOME_DONE', '1').catch(() => {});
  }, []);

  // Charlotte greeting animado em WebP com alpha. expo-image faz loop nativo
  // e não toca AVAudioSession (substitui expo-video que floodava MediaPlayback
  // events no Live Voice — benchmark 2026-05-15).
  const greetingSrc = require('@/assets/charlotte-greeting.webp');

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

      const { count: higherCount } = await supabase
        .from('charlotte_leaderboard_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_level', level)
        .gt('total_xp', userTotalXP);
      const computedRank = (higherCount ?? 0) + 1;

      const todayStr = localTodayStr();
      const yesterdayStr = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })();
      const lastPracticeDate = prog.data?.last_practice_date ?? null;
      const streakAlive = lastPracticeDate === todayStr || lastPracticeDate === yesterdayStr;
      const streakDays  = streakAlive ? (prog.data?.streak_days ?? 0) : 0;

      setStreak(streakDays);
      setTotalXP(userTotalXP);
      setTodayXP(todayXPVal);
      setRank(userTotalXP > 0 ? computedRank : null);

      // Brand intro jingle — so dispara DEPOIS do splash sumir (gate via
      // splashGate Promise resolvida pelo SplashOverlay no fim do fade).
      // Sem isso, o intro tocava por baixo do splash e terminava antes
      // do user ver a home.
      const introWillPlay = !_introPlayedThisJsSession;
      if (introWillPlay) {
        _introPlayedThisJsSession = true;
        splashGate.then(() => {
          soundEngine.play('intro_app').catch(() => {});
        });
      }
      // Offset usado pra shiftar streak_alive e Tier 4 quando o intro toca primeiro.
      // intro dura ~3s => proximos sons em t=splash_done+3100ms.
      const introOffset = introWillPlay ? 3100 : 0;

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
              if (streakDays === 7) {
                setTimeout(() => voiceSFX.play('streak_7_days').catch(() => {}), introOffset + 2300);
              } else if (streakDays === 30) {
                setTimeout(() => voiceSFX.play('streak_30_days').catch(() => {}), introOffset + 2300);
              }
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
  }, [userId, level]);

  useEffect(() => {
    if (!userId) return;
    identifyUser(userId, level);
    track('app_open');
    supabase.from('charlotte_users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {});
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line

  useFocusEffect(useCallback(() => {
    if (userId) fetchData();
  }, [fetchData]));

  // ── AI Greeting ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (greetingCache.level && greetingCache.level !== level && profile) {
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
    const fallback = isPt
      ? (h < 12 ? `Bom dia, ${firstName}! Pronto para praticar?`
       : h < 18 ? `Boa tarde, ${firstName}! Vamos praticar um pouco?`
                : `Boa noite, ${firstName}! Que tal uma sessão rápida?`)
      : (h < 12 ? `Good morning, ${firstName}! Ready to practice?`
       : h < 18 ? `Good afternoon, ${firstName}! Let's get some practice in.`
                : `Good evening, ${firstName}! How about a quick session?`);

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

    // 3s safety net — same as legacy home.
    const timeout = setTimeout(() => {
      clearInterval(poll);
      resolve(fallback);
    }, 3000);

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
  const isNearTop = scrollY < 80;
  // Simplificado: down = fim do trail, up = topo. Sempre funciona em
  // todos os niveis. Pra topico ativo no meio (Novice), usuario nao chega
  // direto via FAB — trade-off em troca de garantia de movimento.
  const goActive = useCallback(() => {
    trailScrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  const goTop = useCallback(() => {
    trailScrollRef.current?.scrollTo({ y: 0, animated: true });
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

      {/* Charlotte hero card — fixed */}
      <View style={{ marginHorizontal: 20, marginTop: 8 }}>
        <View style={{ borderRadius: 22, backgroundColor: T.card, overflow: 'hidden', ...cardShadow }}>
          {/* Navy strip with bust + chat bubble */}
          <View style={{ backgroundColor: C.heroStrip, paddingRight: 20, flexDirection: 'row', alignItems: 'center', minHeight: 140 }}>
            <View style={{ width: 95, height: 132, flexShrink: 0, alignSelf: 'flex-end' }}>
              <Image
                source={greetingSrc}
                style={{ width: 95, height: 132 }}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1, paddingLeft: 0, paddingVertical: 16, justifyContent: 'center' }}>
              <View style={{ backgroundColor: '#3B3A5A', borderRadius: 18, borderTopLeftRadius: 0, paddingHorizontal: 14, paddingVertical: greetingLoading ? 10 : 12, alignSelf: 'flex-start' }}>
                {greetingLoading || !aiGreeting ? (
                  <TypingDots />
                ) : (
                  <AppText style={{ fontSize: 14, color: '#FFFFFF', lineHeight: 21, fontWeight: '500' }}>
                    {aiGreeting}
                  </AppText>
                )}
              </View>
            </View>
          </View>

          {/* Divider + TrailBanner — zIndex:1 para ficar sobre o overflow da Charlotte */}
          <View style={{ zIndex: 1, backgroundColor: T.card }}>
          <View style={{ height: 1, backgroundColor: C.navyGhost }} />
          <TrailBanner
            userId={userId}
            level={level}
            currentLevel={currentLevel}
            onLevelChange={setSelectedLevel}
            useV2={profile?.beta_features?.includes('curriculum_v2') ?? false}
            flush
          />
          </View>
        </View>
      </View>

      {/* Learning trail — scrollable below fixed hero */}
      <ScrollView
        ref={trailScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      >
        <TrailContent
          userId={userId}
          level={level}
          showBanner={false}
          onCurrentTopicRef={handleCurrentTopicRef}
          onActiveModuleY={(y) => {
            // Backup via onLayout — confiavel pra Inter/Advanced onde
            // measureLayout (tryScroll) as vezes falha silencioso.
            if (y > 0) activeTopicYRef.current = y;
          }}
          useV2={profile?.beta_features?.includes('curriculum_v2') ?? false}
        />
      </ScrollView>

      {/* FAB scroll toggle: SEMPRE visivel.
          No topo → ir pro topico ativo (ou fim do trail se nao houver).
          Embaixo → voltar pro topo. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={isNearTop ? goActive : goTop}
        style={{
          position: 'absolute', bottom: 80, right: 18,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: C.navy,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 }, elevation: 8,
        }}
        accessibilityLabel={isNearTop ? 'Ir para tópico atual' : 'Voltar ao topo'}
      >
        {isNearTop
          ? <ArrowDown size={22} color="#FFF" weight="bold" />
          : <ArrowUp size={22} color="#FFF" weight="bold" />}
      </TouchableOpacity>

      <NewLayoutWelcomeSheet
        visible={showWelcomeSheet}
        onClose={closeWelcomeSheet}
      />

      {/* Promotion (level-up) vs Graduation (terminal): renderiza um ou outro
          baseado no discriminator do evento. */}
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
