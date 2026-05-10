// app/(app)/(tabs)/livevoice.tsx
// Live Voice tab — hero com video da Charlotte + ring de pool mensal +
// resumo da última chamada + botão Start now. Beta only (new_layout).

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Image,
  RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Phone, ChatCircle, X } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { useAuth } from '@/hooks/useAuth';
import { usePaywallContext } from '@/lib/paywallContext';
import { supabase } from '@/lib/supabase';
import { UserLevel } from '@/lib/levelConfig';
import { getLiveVoiceStatus, getPoolForLevel, UNLIMITED_POOL_SECONDS } from '@/lib/liveVoiceUsage';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import LiveVoiceModal from '@/components/voice/LiveVoiceModal';

// ── Palette ───────────────────────────────────────────────────────────────────
// Tela full navy — todos os elementos em stack sobre o mesmo fundo.

const C = {
  navy:        '#18193D',  // mesmo do hero da Home (heroStrip)
  navyMid:     '#3B3A5A',  // tom do balão de fala
  navyLight:   'rgba(255,255,255,0.55)',
  navyGhost:   'rgba(255,255,255,0.10)',
  textWhite:   '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.78)',
  textDim:     'rgba(255,255,255,0.48)',
  greenAccent: '#A3FF3C',
  greenDark:   '#3D8800',
  gold:        '#F59E0B',
  red:         '#EF4444',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface LastCall {
  id:               string;
  started_at:       string;
  duration_seconds: number;
  summary:          string | null;
  transcript:       string | null;
}

// ── Pool ring ─────────────────────────────────────────────────────────────────
// Versão dark: ring fino branco com progresso colorido, número grande no centro.

function PoolRing({ used, total, isUnlimited, isPt }: {
  used: number; total: number; isUnlimited: boolean; isPt: boolean;
}) {
  const SIZE = 130, SW = 6;
  const r    = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;

  const ratio = isUnlimited ? 0 : Math.min(used / total, 1);
  const color = isUnlimited
    ? C.greenAccent
    : ratio >= 0.85 ? C.red
    : ratio >= 0.6  ? C.gold
                    : C.greenAccent;

  const usedMin  = Math.floor(used / 60);
  const totalMin = Math.floor(total / 60);
  const remainMin = totalMin - usedMin;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: SIZE, width: SIZE }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke={C.navyGhost} strokeWidth={SW} fill="none" />
        {!isUnlimited && (
          <Circle
            cx={SIZE/2} cy={SIZE/2} r={r}
            stroke={color} strokeWidth={SW} fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - ratio)}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {isUnlimited ? (
          <>
            <AppText style={{ fontSize: 28, fontWeight: '900', color: C.greenAccent }}>∞</AppText>
            <AppText style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isPt ? 'Ilimitado' : 'Unlimited'}
            </AppText>
          </>
        ) : (
          <>
            <AppText style={{ fontSize: 30, fontWeight: '900', color: C.textWhite, lineHeight: 34 }}>{remainMin}</AppText>
            <AppText style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isPt ? 'min restantes' : 'min remaining'}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

// ── Last call (texto solto, sem card) ─────────────────────────────────────────

function LastCallSection({ call, isPt, onPress }: {
  call: LastCall; isPt: boolean; onPress: () => void;
}) {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);

  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `há ${days} dias` : `${days} days ago`;

  const hasTranscript = !!(call.transcript && call.transcript.trim().length > 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={hasTranscript ? 0.7 : 1}
      disabled={!hasTranscript}
      style={{ alignItems: 'center', paddingHorizontal: 32 }}
    >
      <AppText style={{ fontSize: 10, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
        {isPt ? 'Última chamada' : 'Last call'} · {whenLabel} · {minutes} min
      </AppText>
      <AppText style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 }} numberOfLines={2}>
        {call.summary ?? (isPt ? 'Sem resumo disponível.' : 'No summary available.')}
      </AppText>
      {hasTranscript && (
        <AppText style={{ fontSize: 11, color: C.greenAccent, fontWeight: '700', marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          {isPt ? 'Ver conversa →' : 'View conversation →'}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

// ── Transcript modal ──────────────────────────────────────────────────────────
// Parse transcript ("User: text\nCharlotte: text\n...") em turnos e renderiza
// as bolhas no padrão visual da chamada.

function TranscriptModal({ call, isOpen, onClose, isPt }: {
  call: LastCall | null; isOpen: boolean; onClose: () => void; isPt: boolean;
}) {
  const insets = useSafeAreaInsets();

  const turns = useMemo(() => {
    if (!call?.transcript) return [] as Array<{ role: 'user' | 'assistant'; text: string }>;
    return call.transcript.split('\n').reduce((acc, line) => {
      const m = line.match(/^(User|Charlotte):\s*(.+)$/);
      if (m) {
        acc.push({ role: m[1] === 'User' ? 'user' : 'assistant', text: m[2] });
      } else if (acc.length > 0) {
        // Linha de continuação — append na última
        acc[acc.length - 1].text += '\n' + line;
      }
      return acc;
    }, [] as Array<{ role: 'user' | 'assistant'; text: string }>);
  }, [call?.transcript]);

  if (!call) return null;

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, height: 56,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.10)',
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <ChatCircle size={20} color="#7C3AED" weight="fill" />
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText style={{ fontSize: 9, fontWeight: '700', color: '#9896B8', textTransform: 'uppercase', letterSpacing: 1 }}>Charlotte</AppText>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#16153A', letterSpacing: -0.3 }}>
                {isPt ? 'Transcrição da Chamada' : 'Call Transcript'}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#4B4A72" weight="bold" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#F4F3FA' }}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Resumo da chamada no topo */}
          {call.summary && (
            <View style={{
              backgroundColor: '#F0F0FB', borderRadius: 12, padding: 14,
              borderLeftWidth: 3, borderLeftColor: '#7C3AED',
              marginBottom: 4,
            }}>
              <AppText style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {isPt ? 'Resumo' : 'Summary'}
              </AppText>
              <AppText style={{ fontSize: 14, color: '#16153A', lineHeight: 20 }}>
                {call.summary}
              </AppText>
            </View>
          )}

          {turns.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <AppText style={{ color: '#9896B8', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {isPt ? 'Transcrição não disponível para esta chamada.' : 'No transcript available for this call.'}
              </AppText>
            </View>
          ) : (
            turns.map((turn, i) => {
              const isUser = turn.role === 'user';
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                  {!isUser && (
                    <Image
                      source={require('@/assets/charlotte-avatar.png')}
                      style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginTop: 2, flexShrink: 0, backgroundColor: '#16153A' }}
                    />
                  )}
                  <View style={{
                    maxWidth: '78%',
                    backgroundColor: isUser ? '#A3FF3C' : '#FFFFFF',
                    borderRadius: 18,
                    borderBottomRightRadius: isUser ? 4 : 18,
                    borderBottomLeftRadius: isUser ? 18 : 4,
                    paddingHorizontal: 14, paddingVertical: 10,
                    shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}>
                    <AppText style={{ fontSize: 14, fontWeight: '500', color: '#16153A', lineHeight: 20 }}>
                      {turn.text}
                    </AppText>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveVoiceTab() {
  const { profile }     = useAuth();
  const { openPaywall } = usePaywallContext();
  const level   = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId  = profile?.id ?? '';
  const isPt    = level === 'Novice';
  const accent  = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  const [streak,  setStreak]  = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [todayXP, setTodayXP] = useState(0);
  const [rank,    setRank]    = useState<number | null>(null);

  const [poolUsed,        setPoolUsed]        = useState(0);
  const [poolTotal,       setPoolTotal]       = useState(getPoolForLevel(level));
  const [poolUnlimited,   setPoolUnlimited]   = useState(false);
  const [lastCall,        setLastCall]        = useState<LastCall | null>(null);
  const [showLiveVoice,   setShowLiveVoice]   = useState(false);
  const [showTranscript,  setShowTranscript]  = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  const trialDaysLeft = useMemo(() => {
    if (!profile || profile.is_institutional) return null;
    if (profile.subscription_status !== 'trial') return null;
    if (!profile.trial_ends_at) return null;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [profile]);

  const liveVoicePlayer = useVideoPlayer(require('@/assets/charlotte-livevoice.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();

      const [prog, lv, recent, achToday, lastCallRes] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp,last_practice_date')
          .eq('user_id', userId)
          .maybeSingle(),
        getLiveVoiceStatus(level).catch(() => null),
        supabase.from('charlotte_practices')
          .select('xp_earned')
          .eq('user_id', userId)
          .gte('created_at', todayISO),
        supabase.from('user_achievements')
          .select('xp_bonus')
          .eq('user_id', userId)
          .gte('earned_at', todayISO),
        supabase.from('charlotte_live_calls')
          .select('id,started_at,duration_seconds,summary,transcript')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const userTotalXP = prog.data?.total_xp ?? 0;
      const todayXPVal  = (recent.data ?? []).reduce((s: number, p: { xp_earned?: number | null }) => s + (p.xp_earned ?? 0), 0)
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

      if (lv) {
        setPoolUsed(lv.secondsUsed);
        setPoolTotal(lv.poolTotal);
        setPoolUnlimited(!!lv.isUnlimited);
      }
      setLastCall(lastCallRes?.data ?? null);
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

  const startCall = useCallback(() => {
    if (!poolUnlimited && poolUsed >= poolTotal) return;
    soundEngine.setMuted(true);
    setShowLiveVoice(true);
  }, [poolUnlimited, poolUsed, poolTotal]);

  const isLimitReached = !poolUnlimited && poolUsed >= poolTotal;
  const statsParams = { sessionXP: String(todayXP), totalXP: String(totalXP), userId, userLevel: level, userName: profile?.name ?? 'Student' };

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>

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
          <ActivityIndicator size="large" color={C.greenAccent} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textWhite} />}
        >

          {/* ── Hero: balão à esquerda + Charlotte solta à direita ── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: 240, paddingLeft: 24, paddingRight: 0, paddingTop: 24 }}>
            <View style={{ flex: 1, paddingBottom: 36, paddingRight: 8 }}>
              <View style={{
                backgroundColor: C.navyMid,
                borderRadius: 20, borderTopLeftRadius: 4,
                paddingHorizontal: 16, paddingVertical: 14,
                alignSelf: 'flex-start',
              }}>
                <AppText style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>
                  Charlotte
                </AppText>
                <AppText style={{ fontSize: 17, color: '#FFFFFF', lineHeight: 23, fontWeight: '600' }}>
                  {isPt ? 'Vamos conversar?' : 'Want to talk?'}
                </AppText>
              </View>
            </View>

            <View style={{ width: 180, height: 240, alignSelf: 'flex-end', overflow: 'hidden', backgroundColor: 'transparent' }}>
              <VideoView
                player={liveVoicePlayer}
                style={{ width: 180, height: Math.round(180 * 16 / 9), backgroundColor: 'transparent' }}
                contentFit="cover"
                nativeControls={false}
              />
            </View>
          </View>

          {/* ── Start button (redondo grande, no centro) ── */}
          <View style={{ alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 28 }}>
            <TouchableOpacity
              onPress={startCall}
              disabled={isLimitReached}
              activeOpacity={0.85}
              style={{
                width: 96, height: 96, borderRadius: 48,
                backgroundColor: isLimitReached ? C.navyGhost : accent,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: isLimitReached ? 'transparent' : accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5, shadowRadius: 18,
                elevation: 10,
                opacity: isLimitReached ? 0.6 : 1,
              }}
            >
              <Phone size={36} color={isLimitReached ? C.textDim : '#FFFFFF'} weight="fill" />
            </TouchableOpacity>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: isLimitReached ? C.textDim : C.textWhite, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {isLimitReached
                ? (isPt ? 'Limite atingido' : 'Limit reached')
                : (isPt ? 'Começar agora' : 'Start now')
              }
            </AppText>
          </View>

          {/* ── Last call (texto solto, sem card) ── */}
          {lastCall && (
            <LastCallSection
              call={lastCall}
              isPt={isPt}
              onPress={() => setShowTranscript(true)}
            />
          )}

          {/* Spacer pra colar o pool no fim */}
          <View style={{ flex: 1, minHeight: 24 }} />

          {/* ── Pool ring (rodapé) ── */}
          <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
            <PoolRing used={poolUsed} total={poolTotal} isUnlimited={poolUnlimited} isPt={isPt} />
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

      <TranscriptModal
        call={lastCall}
        isOpen={showTranscript}
        isPt={isPt}
        onClose={() => setShowTranscript(false)}
      />

    </View>
  );
}
