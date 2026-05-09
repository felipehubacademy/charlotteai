// app/(app)/(tabs)/practice.tsx
// Practice tab (new layout) — header pills + Charlotte hero card (vídeo + balão de fala)
// + trail de cards alternados com chip de status por modo.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  TextT, Microphone, ChatTeardropText, Phone, Lock, CaretRight,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { useAuth } from '@/hooks/useAuth';
import { usePaywallContext } from '@/lib/paywallContext';
import { supabase } from '@/lib/supabase';
import { LEVEL_CONFIG, UserLevel, ChatMode } from '@/lib/levelConfig';
import { getLiveVoiceStatus, getPoolForLevel, UNLIMITED_POOL_SECONDS } from '@/lib/liveVoiceUsage';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import LiveVoiceModal from '@/components/voice/LiveVoiceModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getModeIcon(mode: ChatMode | 'live', color: string, size = 24) {
  switch (mode) {
    case 'grammar':       return <TextT size={size} color={color} weight="fill" />;
    case 'pronunciation': return <Microphone size={size} color={color} weight="fill" />;
    case 'chat':          return <ChatTeardropText size={size} color={color} weight="fill" />;
    case 'live':          return <Phone size={size} color={color} weight="fill" />;
  }
}

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  heroStrip: '#18193D',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 4 },
}) as object;

// ── Constants ─────────────────────────────────────────────────────────────────

const PRONUN_UNLOCK_XP = 1920;
const CHAT_UNLOCK_XP   = 2800;

const MODE_TYPES: Record<string, string[]> = {
  grammar:       ['grammar'],
  pronunciation: ['pronunciation', 'audio_message'],
  chat:          ['text_message', 'chat'],
  live:          ['live_voice'],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModeCard {
  mode:        ChatMode | 'live';
  title:       string;
  description: string;
  route?:      '/(app)/grammar' | '/(app)/pronunciation' | '/(app)/chat';
  accentColor: string;
  locked?:     boolean;
  lockLevel?:  string;
  lockXP?:     number;
  currentXP?:  number;
}

interface RecentPractice {
  practice_type: string;
  created_at:    string;
  xp_earned?:    number | null;
}

// ── Days-since-last-practice por modo ─────────────────────────────────────────

function computeDaysSince(cards: ModeCard[], recent: RecentPractice[]): Record<string, number> {
  const now = Date.now();
  const result: Record<string, number> = {};
  for (const card of cards) {
    const types = MODE_TYPES[card.mode] ?? [];
    const last  = recent
      .filter(p => types.includes(p.practice_type))
      .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];
    result[card.mode] = last
      ? Math.floor((now - new Date(last.created_at).getTime()) / 86_400_000)
      : 999;
  }
  return result;
}

// ── Suggestion algorithm ──────────────────────────────────────────────────────

const FIRST_TIME_REASONS: Record<string, { en: string; pt: string }> = {
  grammar:       { en: "You haven't tried Grammar yet — give it a shot today.",       pt: 'Você ainda não tentou a Gramática — experimente hoje.' },
  pronunciation: { en: "You haven't tried Pronunciation yet — give it a shot today.", pt: 'Você ainda não tentou a Pronúncia — experimente hoje.' },
  chat:          { en: "You haven't tried Free Chat yet — give it a shot today.",      pt: 'Você ainda não tentou o Free Chat — experimente hoje.' },
  live:          { en: "You haven't tried Live Voice yet — give it a shot today.",     pt: 'Você ainda não tentou o Live Voice — experimente hoje.' },
};

function buildSuggestion(
  cards:         ModeCard[],
  daysSince:     Record<string, number>,
  liveRemaining: number | null,
  isPt:          boolean,
): { card: ModeCard; reason: string } | null {
  const hour = new Date().getHours();

  const available = cards.filter(
    c => !c.locked && !(c.mode === 'live' && liveRemaining === 0),
  );
  if (!available.length) return null;

  const score = (card: ModeCard): number => {
    const days = daysSince[card.mode] ?? 0;
    let s = Math.min(days, 7) * 10;
    if (days === 999) s += 20;
    if (hour >= 6  && hour < 12 && card.mode === 'grammar')                                  s += 10;
    if (hour >= 12 && hour < 18 && card.mode === 'chat')                                     s += 10;
    if (hour >= 18 && hour <= 22 && (card.mode === 'pronunciation' || card.mode === 'live')) s += 10;
    return s;
  };

  const best = [...available].sort((x, y) => score(y) - score(x))[0];
  const days = daysSince[best.mode] ?? 0;

  let reason: string;

  if (days === 999) {
    const first = FIRST_TIME_REASONS[best.mode];
    reason = isPt ? first.pt : first.en;
  } else if (days >= 3) {
    reason = isPt
      ? `Você não pratica ${best.title} há ${days} ${days === 1 ? 'dia' : 'dias'} — hora de voltar.`
      : `You haven't practiced ${best.title} in ${days} ${days === 1 ? 'day' : 'days'} — time to pick it up again.`;
  } else if (hour >= 6 && hour < 12 && best.mode === 'grammar') {
    reason = isPt
      ? 'Manhã é o melhor momento para gramática — seu cérebro está afiado.'
      : 'Morning is the best time for a grammar session — your brain is sharp.';
  } else if (hour >= 18 && (best.mode === 'pronunciation' || best.mode === 'live')) {
    reason = isPt
      ? 'À noite é ótimo para praticar fala — sem pressa, sem pressão.'
      : 'Evening is great for speaking practice — no rush, no pressure.';
  } else if (hour >= 12 && hour < 18 && best.mode === 'chat') {
    reason = isPt
      ? 'Boa tarde para uma conversa com a Charlotte — aplique o que aprendeu.'
      : 'Good afternoon for a chat with Charlotte — put what you learned to use.';
  } else {
    reason = isPt
      ? `Você não pratica ${best.title} há ${Math.min(days, 7)} dias — hora de voltar.`
      : `You haven't practiced ${best.title} in ${Math.min(days, 7)} days — time to pick it up again.`;
  }

  return { card: best, reason };
}

// ── Mode chip (status: dias / uso Live / progresso de XP) ─────────────────────

function getChipState(
  card:          ModeCard,
  daysSince:     number | undefined,
  liveRemaining: number | null,
  level:         UserLevel,
  isPt:          boolean,
): { label: string; color: string; bg: string } | null {
  if (card.locked) {
    if (card.lockXP !== undefined && card.currentXP !== undefined) {
      const pct = Math.min(100, Math.round((card.currentXP / card.lockXP) * 100));
      return { label: `${pct}%`, color: C.navyMid, bg: C.navyGhost };
    }
    return { label: card.lockLevel ?? '—', color: C.navyMid, bg: C.navyGhost };
  }
  if (card.mode === 'live' && liveRemaining !== null) {
    if (liveRemaining === 0) return { label: isPt ? 'Limite' : 'Limit', color: C.red, bg: C.redBg };
    if (liveRemaining >= UNLIMITED_POOL_SECONDS) return { label: isPt ? 'Ilimitado' : 'Unlimited', color: C.greenDark, bg: C.greenBg };
    const totalPool = getPoolForLevel(level);
    const usedMin   = Math.round((totalPool - liveRemaining) / 60);
    const totalMin  = Math.round(totalPool / 60);
    const ratio     = (totalPool - liveRemaining) / totalPool;
    const warn      = ratio > 0.8;
    return {
      label: `${usedMin}/${totalMin}m`,
      color: warn ? C.gold      : C.greenDark,
      bg:    warn ? C.goldBg    : C.greenBg,
    };
  }
  if (daysSince === undefined) return null;
  if (daysSince === 999)  return { label: isPt ? 'Novo'  : 'New',     color: C.greenDark, bg: C.greenBg };
  if (daysSince === 0)    return { label: isPt ? 'Hoje'  : 'Today',   color: C.greenDark, bg: C.greenBg };
  if (daysSince === 1)    return { label: isPt ? 'Ontem' : 'Yesterday', color: C.navyMid, bg: C.navyGhost };
  if (daysSince <= 2)     return { label: isPt ? `há ${daysSince}d` : `${daysSince}d ago`, color: C.navyMid, bg: C.navyGhost };
  if (daysSince >= 7)     return { label: '+7d', color: C.gold, bg: C.goldBg };
  return { label: isPt ? `há ${daysSince}d` : `${daysSince}d ago`, color: C.gold, bg: C.goldBg };
}

function ModeChip(props: {
  card: ModeCard; daysSince?: number; liveRemaining: number | null; level: UserLevel; isPt: boolean;
}) {
  const state = getChipState(props.card, props.daysSince, props.liveRemaining, props.level, props.isPt);
  if (!state) return null;
  return (
    <View style={{ backgroundColor: state.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
      <AppText style={{ fontSize: 11, fontWeight: '700', color: state.color }}>{state.label}</AppText>
    </View>
  );
}

// ── Trail connector (SVG curved dotted path) ──────────────────────────────────

const NODE  = 52;
const CURVE = 22;

function TrailConnector({ direction, width }: { direction: 'lr' | 'rl'; width: number }) {
  const h  = 36;
  const cx = NODE / 2;
  const rx = width - NODE / 2;

  const d = direction === 'lr'
    ? `M ${cx} 0 L ${cx} ${h - CURVE} Q ${cx} ${h} ${cx + CURVE} ${h} L ${rx - CURVE} ${h} Q ${rx} ${h} ${rx} ${h - CURVE} L ${rx} 0`
    : `M ${rx} 0 L ${rx} ${h - CURVE} Q ${rx} ${h} ${rx - CURVE} ${h} L ${cx + CURVE} ${h} Q ${cx} ${h} ${cx} ${h - CURVE} L ${cx} 0`;

  return (
    <Svg width={width} height={h} style={{ marginVertical: -2 }}>
      <Path
        d={d}
        fill="none"
        stroke={C.navyLight}
        strokeWidth={2}
        strokeDasharray="5 6"
        strokeLinecap="round"
        opacity={0.35}
      />
    </Svg>
  );
}

// ── Trail of cards ────────────────────────────────────────────────────────────

interface TrailPathProps {
  cards:         ModeCard[];
  daysSince:     Record<string, number>;
  liveRemaining: number | null;
  level:         UserLevel;
  isPt:          boolean;
  onPress:       (card: ModeCard) => void;
}

function TrailPath({ cards, daysSince, liveRemaining, level, isPt, onPress }: TrailPathProps) {
  const [containerW, setContainerW] = React.useState(0);

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)}>
      {containerW > 0 && cards.map((card, index) => {
        const isRight = index % 2 === 1;

        const nodeRow = (
          <TouchableOpacity
            key={card.mode}
            onPress={() => onPress(card)}
            activeOpacity={card.locked ? 0.6 : 0.78}
            style={{
              flexDirection: isRight ? 'row-reverse' : 'row',
              alignItems: 'center',
              opacity: card.locked ? 0.55 : 1,
              gap: 14,
            }}
          >
            <View style={{
              width: NODE, height: NODE, borderRadius: NODE / 2, flexShrink: 0,
              backgroundColor: card.locked ? C.navyGhost : a(card.accentColor, 0.10),
              borderWidth: 2,
              borderColor: card.locked ? C.border : a(card.accentColor, 0.40),
              alignItems: 'center', justifyContent: 'center',
            }}>
              {card.locked
                ? <Lock size={20} color={C.navyLight} weight="fill" />
                : getModeIcon(card.mode, card.accentColor, 22)
              }
            </View>

            <View style={{
              flex: 1,
              backgroundColor: C.card,
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: C.border,
              ...cardShadow,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <AppText style={{ fontSize: 15, fontWeight: '800', color: card.locked ? C.navyMid : C.navy, flex: 1 }}>
                  {card.title}
                </AppText>
                <ModeChip card={card} daysSince={daysSince[card.mode]} liveRemaining={liveRemaining} level={level} isPt={isPt} />
              </View>
              <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '500' }}>
                {card.description}
              </AppText>
            </View>
          </TouchableOpacity>
        );

        const hasNext = index < cards.length - 1;
        const direction = isRight ? 'rl' : 'lr';

        return (
          <React.Fragment key={card.mode}>
            {nodeRow}
            {hasNext && <TrailConnector direction={direction} width={containerW} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticeTab() {
  const { profile }       = useAuth();
  const { openPaywall }   = usePaywallContext();
  const level   = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId  = profile?.id ?? '';
  const config  = LEVEL_CONFIG[level];
  const isPt    = level === 'Novice';
  const accent  = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  // Header stats
  const [streak,  setStreak]  = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [todayXP, setTodayXP] = useState(0);
  const [rank,    setRank]    = useState<number | null>(null);

  // Practice-specific
  const [liveVoiceRemaining, setLiveVoiceRemaining] = useState<number | null>(null);
  const [recentPractices,    setRecentPractices]    = useState<RecentPractice[]>([]);
  const [showLiveVoice,      setShowLiveVoice]      = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);

  const trialDaysLeft = useMemo(() => {
    if (!profile || profile.is_institutional) return null;
    if (profile.subscription_status !== 'trial') return null;
    if (!profile.trial_ends_at) return null;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [profile]);

  const greetingPlayer = useVideoPlayer(require('@/assets/charlotte-greeting.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const cutoff   = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const todayISO = localMidnightUTC().toISOString();

      const [prog, lv, recent, achToday] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp,last_practice_date')
          .eq('user_id', userId)
          .maybeSingle(),
        getLiveVoiceStatus(level).catch(() => ({ secondsRemaining: null as number | null })),
        supabase.from('charlotte_practices')
          .select('practice_type,created_at,xp_earned')
          .eq('user_id', userId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false }),
        supabase.from('user_achievements')
          .select('xp_bonus')
          .eq('user_id', userId)
          .gte('earned_at', todayISO),
      ]);

      const userTotalXP = prog.data?.total_xp ?? 0;
      const todayXPVal  = (recent.data ?? [])
        .filter(p => new Date(p.created_at).getTime() >= localMidnightUTC().getTime())
        .reduce((s, p) => s + (p.xp_earned ?? 0), 0)
        + (achToday.data ?? []).reduce((s: number, x: { xp_bonus?: number | null }) => s + (x.xp_bonus ?? 0), 0);

      const { count: higherCount } = await supabase
        .from('charlotte_leaderboard_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_level', level)
        .gt('total_xp', userTotalXP);
      const computedRank = (higherCount ?? 0) + 1;

      const todayStr     = localTodayStr();
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
      setLiveVoiceRemaining(lv.secondsRemaining);
      setRecentPractices(recent.data ?? []);
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const hasGrammar = config.tabs.includes('grammar');
  const hasPronun  = level !== 'Novice' ? config.tabs.includes('pronunciation') : totalXP >= PRONUN_UNLOCK_XP;
  const hasChat    = level !== 'Novice' ? config.tabs.includes('chat')          : totalXP >= CHAT_UNLOCK_XP;
  const hasLive    = level === 'Advanced' || level === 'Inter';

  const modeCards: ModeCard[] = useMemo(() => [
    {
      mode: 'grammar', title: isPt ? 'Gramática' : 'Grammar',
      description: isPt ? 'Regras e exercícios' : 'Rules & exercises',
      route: '/(app)/grammar', accentColor: accent,
      locked: !hasGrammar, lockLevel: 'Intermediate',
    },
    {
      mode: 'pronunciation', title: isPt ? 'Pronúncia' : 'Pronunciation',
      description: isPt ? 'Fala e feedback em tempo real' : 'Speaking & real-time feedback',
      route: '/(app)/pronunciation', accentColor: accent,
      locked: !hasPronun,
      lockLevel:  level === 'Novice' ? undefined : 'Intermediate',
      lockXP:     level === 'Novice' && !hasPronun ? PRONUN_UNLOCK_XP : undefined,
      currentXP:  level === 'Novice' && !hasPronun ? totalXP          : undefined,
    },
    {
      mode: 'chat', title: 'Free Chat',
      description: isPt ? 'Conversa livre com Charlotte' : 'Free conversation with Charlotte',
      route: '/(app)/chat', accentColor: accent,
      locked: !hasChat,
      lockLevel:  level === 'Novice' ? undefined : 'Intermediate',
      lockXP:     level === 'Novice' && !hasChat ? CHAT_UNLOCK_XP : undefined,
      currentXP:  level === 'Novice' && !hasChat ? totalXP        : undefined,
    },
    {
      mode: 'live', title: 'Live Voice',
      description: isPt ? 'Chamada em tempo real com Charlotte' : 'Real-time call with Charlotte',
      accentColor: accent,
      locked: !hasLive, lockLevel: 'Intermediate',
    },
  ], [isPt, accent, hasGrammar, hasPronun, hasChat, hasLive, totalXP, level]);

  const daysSinceMap = useMemo(
    () => computeDaysSince(modeCards, recentPractices),
    [modeCards, recentPractices],
  );

  const suggestion = useMemo(
    () => buildSuggestion(modeCards, daysSinceMap, liveVoiceRemaining, isPt),
    [modeCards, daysSinceMap, liveVoiceRemaining, isPt],
  );

  const otherCards = useMemo(
    () => modeCards.filter(c => c.mode !== suggestion?.card.mode),
    [modeCards, suggestion],
  );

  const handlePress = useCallback((card: ModeCard) => {
    if (card.locked) {
      if (card.lockXP !== undefined && card.currentXP !== undefined) {
        const pct = Math.min(100, Math.round((card.currentXP / card.lockXP) * 100));
        Alert.alert(
          card.title,
          `Para desbloquear ${card.title} você precisa de ${card.lockXP.toLocaleString('pt-BR')} XP.\n\nProgresso: ${card.currentXP.toLocaleString('pt-BR')} / ${card.lockXP.toLocaleString('pt-BR')} XP (${pct}%)`,
          [{ text: 'Entendido' }],
        );
      } else {
        Alert.alert(
          isPt ? `Recurso ${card.lockLevel}` : `${card.lockLevel} Feature`,
          isPt
            ? `${card.title} será desbloqueado ao atingir o nível ${card.lockLevel}.`
            : `${card.title} unlocks at the ${card.lockLevel} level.`,
          [{ text: isPt ? 'Entendido' : 'Got it' }],
        );
      }
      return;
    }
    if (card.mode === 'live') {
      if (liveVoiceRemaining === 0) {
        const totalMin = Math.floor(getPoolForLevel(level) / 60);
        Alert.alert(
          isPt ? 'Limite mensal atingido' : 'Monthly limit reached',
          isPt
            ? `Você usou seus ${totalMin} min de Live Voice deste mês.`
            : `You've used your ${totalMin}-min monthly allowance.`,
          [{ text: 'OK' }],
        );
      } else {
        soundEngine.setMuted(true);
        setShowLiveVoice(true);
      }
      return;
    }
    if (card.route) router.push(card.route);
  }, [liveVoiceRemaining, level, isPt]);

  const statsParams = { sessionXP: String(todayXP), totalXP: String(totalXP), userId, userLevel: level, userName: profile?.name ?? 'Student' };

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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
        >

          {/* ── Hero suggestion card ── */}
          {suggestion && (
            <TouchableOpacity
              onPress={() => handlePress(suggestion.card)}
              activeOpacity={0.85}
              style={{
                borderRadius: 22,
                backgroundColor: C.card,
                overflow: 'hidden',
                ...cardShadow,
              }}
            >
              <View style={{ height: 3, backgroundColor: suggestion.card.accentColor }} />

              {/* Navy strip: vídeo + balão de fala */}
              <View style={{ backgroundColor: C.heroStrip, flexDirection: 'row', alignItems: 'center', minHeight: 140, paddingRight: 20 }}>
                <View style={{ width: 118, height: 165, marginBottom: -15, flexShrink: 0, alignSelf: 'flex-end', overflow: 'hidden', borderRadius: 1, backgroundColor: C.heroStrip }}>
                  <VideoView
                    player={greetingPlayer}
                    style={{ width: 118, height: Math.round(118 * 16 / 9), backgroundColor: C.heroStrip }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                </View>
                <View style={{ flex: 1, paddingVertical: 16 }}>
                  <View style={{ backgroundColor: '#3B3A5A', borderRadius: 18, borderTopLeftRadius: 0, paddingHorizontal: 14, paddingVertical: 12, alignSelf: 'flex-start' }}>
                    <AppText style={{ fontSize: 13, color: '#FFFFFF', lineHeight: 19, fontWeight: '500' }}>
                      {suggestion.reason}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Faixa branca: ícone + título + chip + descrição + botão */}
              <View style={{ zIndex: 1, backgroundColor: C.card }}>
                <View style={{ height: 1, backgroundColor: C.navyGhost }} />
                <View style={{ padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: a(suggestion.card.accentColor, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                      {getModeIcon(suggestion.card.mode, suggestion.card.accentColor, 20)}
                    </View>
                    <View style={{ flex: 1, paddingTop: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy, flex: 1 }}>
                          {suggestion.card.title}
                        </AppText>
                        <ModeChip
                          card={suggestion.card}
                          daysSince={daysSinceMap[suggestion.card.mode]}
                          liveRemaining={liveVoiceRemaining}
                          level={level}
                          isPt={isPt}
                        />
                      </View>
                      <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '500', marginTop: 2 }}>
                        {suggestion.card.description}
                      </AppText>
                    </View>
                  </View>

                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 6,
                    backgroundColor: suggestion.card.accentColor,
                    borderRadius: 12, paddingVertical: 13,
                  }}>
                    <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      {isPt ? 'Começar agora' : 'Start now'}
                    </AppText>
                    <CaretRight size={13} color="#FFFFFF" weight="bold" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Section header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy, flex: 1 }}>
              {isPt ? 'Outros modos' : 'Other modes'}
            </AppText>
          </View>

          {/* ── Trail of cards ── */}
          <TrailPath
            cards={otherCards}
            daysSince={daysSinceMap}
            liveRemaining={liveVoiceRemaining}
            level={level}
            isPt={isPt}
            onPress={handlePress}
          />

        </ScrollView>
      )}

      {showLiveVoice && (
        <LiveVoiceModal
          isOpen={showLiveVoice}
          userLevel={level}
          userName={profile?.name ?? 'Student'}
          onClose={() => {
            setShowLiveVoice(false);
            soundEngine.setMuted(false);
            loadData();
          }}
        />
      )}

    </View>
  );
}
