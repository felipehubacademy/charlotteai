// app/(app)/(tabs)/practice.tsx
// Practice tab — Charlotte's smart suggestion + 3 compact mode cards.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  TextT, Microphone, ChatTeardropText, Phone, Lock, CaretRight,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LEVEL_CONFIG, UserLevel, ChatMode } from '@/lib/levelConfig';
import { getLiveVoiceStatus, getPoolForLevel } from '@/lib/liveVoiceUsage';
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
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  orange:    '#FF6B35',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  android: {},
}) as object;

// ── Constants ─────────────────────────────────────────────────────────────────

const PRONUN_UNLOCK_XP = 1920;
const CHAT_UNLOCK_XP   = 2800;

// Maps each mode to practice_type values stored in charlotte_practices
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
}

// ── Suggestion algorithm ──────────────────────────────────────────────────────

function buildSuggestion(
  cards:         ModeCard[],
  recent:        RecentPractice[],
  liveRemaining: number | null,
  isPt:          boolean,
): { card: ModeCard; reason: string } | null {
  const now  = new Date();
  const hour = now.getHours();

  const available = cards.filter(
    c => !c.locked && !(c.mode === 'live' && liveRemaining === 0),
  );
  if (!available.length) return null;

  // Days since last practice per mode
  const daysSince: Record<string, number> = {};
  for (const card of available) {
    const types = MODE_TYPES[card.mode] ?? [];
    const last  = recent
      .filter(p => types.includes(p.practice_type))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    daysSince[card.mode] = last
      ? Math.floor((now.getTime() - new Date(last.created_at).getTime()) / 86_400_000)
      : 999;
  }

  const score = (card: ModeCard): number => {
    const days = daysSince[card.mode] ?? 0;
    let s = Math.min(days, 7) * 10;
    if (days === 999) s += 20;
    if (hour >= 6  && hour < 12 && card.mode === 'grammar')                              s += 10;
    if (hour >= 12 && hour < 18 && card.mode === 'chat')                                 s += 10;
    if (hour >= 18 && hour <= 22 && (card.mode === 'pronunciation' || card.mode === 'live')) s += 10;
    return s;
  };

  const best = [...available].sort((a, b) => score(b) - score(a))[0];
  const days = daysSince[best.mode] ?? 0;

  let reason: string;
  if (days === 999) {
    reason = isPt
      ? `Você ainda não experimentou ${best.title} — comece hoje.`
      : `You haven't tried ${best.title} yet — give it a shot today.`;
  } else if (days >= 3) {
    reason = isPt
      ? `Você não pratica ${best.title} há ${days} ${days === 1 ? 'dia' : 'dias'} — hora de voltar.`
      : `You haven't practiced ${best.title} in ${days} ${days === 1 ? 'day' : 'days'} — time to pick it up again.`;
  } else if (hour >= 6 && hour < 12 && best.mode === 'grammar') {
    reason = isPt
      ? 'Manhã é o melhor momento para estudar — sua concentração está no pico.'
      : 'Morning is the best time for grammar — your focus is at its peak.';
  } else if (hour >= 18 && (best.mode === 'pronunciation' || best.mode === 'live')) {
    reason = isPt
      ? 'À noite é ótimo para praticar fala — sem pressa, sem pressão.'
      : 'Evenings are great for speaking practice — no rush, no pressure.';
  } else if (hour >= 12 && hour < 18 && best.mode === 'chat') {
    reason = isPt
      ? 'Use o que aprendeu em uma conversa livre — é assim que a fluência acontece.'
      : "Apply what you've learned in a free conversation — that's how fluency happens.";
  } else {
    reason = isPt
      ? `Continue praticando ${best.title} — consistência é tudo.`
      : `Keep at ${best.title} — consistency is everything.`;
  }

  return { card: best, reason };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticeTab() {
  const { profile } = useAuth();
  const level  = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId = profile?.id ?? '';
  const config = LEVEL_CONFIG[level];
  const isPt   = level === 'Novice';
  const accent = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  const [totalXP,            setTotalXP]            = useState(0);
  const [liveVoiceRemaining, setLiveVoiceRemaining] = useState<number | null>(null);
  const [recentPractices,    setRecentPractices]    = useState<RecentPractice[]>([]);
  const [showLiveVoice,      setShowLiveVoice]      = useState(false);
  const [loading,            setLoading]            = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [prog, lv, recent] = await Promise.all([
        supabase.from('charlotte_progress').select('total_xp').eq('user_id', userId).maybeSingle(),
        getLiveVoiceStatus(level).catch(() => ({ secondsRemaining: null as number | null })),
        supabase.from('charlotte_practices')
          .select('practice_type,created_at')
          .eq('user_id', userId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false }),
      ]);
      setTotalXP(prog.data?.total_xp ?? 0);
      setLiveVoiceRemaining(lv.secondsRemaining);
      setRecentPractices(recent.data ?? []);
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const hasGrammar = config.tabs.includes('grammar');
  const hasPronun  = level !== 'Novice' ? config.tabs.includes('pronunciation') : totalXP >= PRONUN_UNLOCK_XP;
  const hasChat    = level !== 'Novice' ? config.tabs.includes('chat')          : totalXP >= CHAT_UNLOCK_XP;
  const hasLive    = level === 'Advanced' || level === 'Inter';

  const modeCards: ModeCard[] = useMemo(() => [
    {
      mode: 'grammar', title: isPt ? 'Gramática' : 'Grammar',
      route: '/(app)/grammar', accentColor: accent,
      locked: !hasGrammar, lockLevel: 'Intermediate',
    },
    {
      mode: 'pronunciation', title: isPt ? 'Pronúncia' : 'Pronunciation',
      route: '/(app)/pronunciation', accentColor: accent,
      locked: !hasPronun,
      lockLevel:  level === 'Novice' ? undefined : 'Intermediate',
      lockXP:     level === 'Novice' && !hasPronun ? PRONUN_UNLOCK_XP : undefined,
      currentXP:  level === 'Novice' && !hasPronun ? totalXP          : undefined,
    },
    {
      mode: 'chat', title: 'Free Chat',
      route: '/(app)/chat', accentColor: accent,
      locked: !hasChat,
      lockLevel:  level === 'Novice' ? undefined : 'Intermediate',
      lockXP:     level === 'Novice' && !hasChat ? CHAT_UNLOCK_XP : undefined,
      currentXP:  level === 'Novice' && !hasChat ? totalXP        : undefined,
    },
    {
      mode: 'live', title: 'Live Voice',
      accentColor: C.orange,
      locked: !hasLive, lockLevel: 'Intermediate',
    },
  ], [isPt, accent, hasGrammar, hasPronun, hasChat, hasLive, totalXP, level]);

  const suggestion = useMemo(
    () => buildSuggestion(modeCards, recentPractices, liveVoiceRemaining, isPt),
    [modeCards, recentPractices, liveVoiceRemaining, isPt],
  );

  const otherCards = useMemo(
    () => modeCards.filter(c => c.mode !== suggestion?.card.mode),
    [modeCards, suggestion],
  );

  const handlePress = useCallback((card: ModeCard) => {
    if (card.locked) {
      if (card.lockXP !== undefined && card.currentXP !== undefined) {
        const pct = Math.min(100, Math.round((card.currentXP / card.lockXP) * 100));
        Alert.alert(card.title, `Para desbloquear ${card.title} você precisa de ${card.lockXP.toLocaleString('pt-BR')} XP.\n\nProgresso: ${card.currentXP.toLocaleString('pt-BR')} / ${card.lockXP.toLocaleString('pt-BR')} XP (${pct}%)`, [{ text: 'Entendido' }]);
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
          isPt ? `Você usou seus ${totalMin} min de Live Voice deste mês.` : `You've used your ${totalMin}-min monthly allowance.`,
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Praticar' : 'Practice'}
          </AppText>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Hero suggestion card ── */}
          {suggestion ? (
            <TouchableOpacity
              onPress={() => handlePress(suggestion.card)}
              activeOpacity={0.85}
              style={{
                borderRadius: 22,
                backgroundColor: C.navy,
                padding: 22,
                marginBottom: 12,
                ...cardShadow,
              }}
            >
              {/* Charlotte suggests label */}
              <AppText style={{
                fontSize: 10, fontWeight: '700',
                color: 'rgba(255,255,255,0.40)',
                letterSpacing: 1.2, textTransform: 'uppercase',
                marginBottom: 20,
              }}>
                {isPt ? 'Charlotte sugere' : 'Charlotte suggests'}
              </AppText>

              {/* Mode icon */}
              <View style={{
                width: 54, height: 54, borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {getModeIcon(suggestion.card.mode, '#FFFFFF', 26)}
              </View>

              {/* Mode title */}
              <AppText style={{
                fontSize: 26, fontWeight: '900', color: '#FFFFFF',
                marginBottom: 8, lineHeight: 32,
              }}>
                {suggestion.card.title}
              </AppText>

              {/* Reason */}
              <AppText style={{
                fontSize: 14, color: 'rgba(255,255,255,0.60)',
                lineHeight: 22, marginBottom: 24,
              }}>
                {suggestion.reason}
              </AppText>

              {/* CTA button */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: suggestion.card.accentColor,
                borderRadius: 12,
                paddingVertical: 11, paddingHorizontal: 20,
                gap: 6,
              }}>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {isPt ? 'Começar agora' : 'Start now'}
                </AppText>
                <CaretRight size={13} color="#FFFFFF" weight="bold" />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* ── Compact other modes ── */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {otherCards.map(card => (
              <TouchableOpacity
                key={card.mode}
                onPress={() => handlePress(card)}
                activeOpacity={card.locked ? 0.6 : 0.78}
                style={{
                  flex: 1,
                  backgroundColor: C.card,
                  borderRadius: 18,
                  paddingVertical: 18,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: card.locked ? C.border : a(card.accentColor, 0.15),
                  alignItems: 'center',
                  gap: 10,
                  opacity: card.locked ? 0.55 : 1,
                  ...cardShadow,
                }}
              >
                {/* Icon */}
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: card.locked ? 'rgba(22,21,58,0.05)' : a(card.accentColor, 0.12),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {card.locked
                    ? <Lock size={18} color={C.navyLight} weight="fill" />
                    : getModeIcon(card.mode, card.accentColor, 20)
                  }
                </View>

                {/* Title */}
                <AppText style={{
                  fontSize: 11, fontWeight: '700',
                  color: card.locked ? C.navyLight : C.navy,
                  textAlign: 'center', lineHeight: 15,
                }}>
                  {card.title}
                </AppText>

                {/* Lock sub-info */}
                {card.locked && card.lockXP !== undefined && card.currentXP !== undefined && (
                  <AppText style={{ fontSize: 10, color: C.navyLight, fontWeight: '600', textAlign: 'center' }}>
                    {card.currentXP.toLocaleString()}/{card.lockXP.toLocaleString()}
                  </AppText>
                )}
                {card.locked && card.lockLevel && card.lockXP === undefined && (
                  <AppText style={{ fontSize: 10, color: C.navyLight, fontWeight: '600', textAlign: 'center' }}>
                    {card.lockLevel}
                  </AppText>
                )}

                {/* Live Voice remaining minutes */}
                {!card.locked && card.mode === 'live' && liveVoiceRemaining !== null && liveVoiceRemaining > 0 && (
                  <AppText style={{ fontSize: 10, color: card.accentColor, fontWeight: '700', textAlign: 'center' }}>
                    {Math.floor(liveVoiceRemaining / 60)}min
                  </AppText>
                )}
              </TouchableOpacity>
            ))}
          </View>

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
