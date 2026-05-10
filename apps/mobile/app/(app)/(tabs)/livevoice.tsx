// app/(app)/(tabs)/livevoice.tsx
// Live Voice tab — hero com video da Charlotte + ring de pool mensal +
// resumo da última chamada + botão Start now. Beta only (new_layout).

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Phone } from 'phosphor-react-native';
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
  navy:        '#07071C',  // bg principal — mais escuro que o card-mode pra dar peso
  navyMid:     '#1E1D45',
  navyLight:   'rgba(255,255,255,0.55)',
  navyGhost:   'rgba(255,255,255,0.08)',
  textWhite:   '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.7)',
  textDim:     'rgba(255,255,255,0.45)',
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

function LastCallSection({ call, isPt }: { call: LastCall; isPt: boolean }) {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);

  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `há ${days} dias` : `${days} days ago`;

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
      <AppText style={{ fontSize: 10, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
        {isPt ? 'Última chamada' : 'Last call'} · {whenLabel} · {minutes} min
      </AppText>
      <AppText style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 }} numberOfLines={2}>
        {call.summary ?? (isPt ? 'Sem resumo disponível.' : 'No summary available.')}
      </AppText>
    </View>
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
          .select('id,started_at,duration_seconds,summary')
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
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: 28, paddingBottom: 32, gap: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textWhite} />}
        >

          {/* ── Charlotte avatar grande (circular, sem moldura/card) ── */}
          <View style={{
            width: 220, height: 220, borderRadius: 110,
            overflow: 'hidden',
            borderWidth: 3, borderColor: accent,
            backgroundColor: C.navyMid,
          }}>
            <VideoView
              player={liveVoicePlayer}
              style={{ width: '100%', height: '100%', backgroundColor: C.navyMid }}
              contentFit="cover"
              nativeControls={false}
            />
          </View>

          {/* ── Saudação ── */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <AppText style={{ fontSize: 22, fontWeight: '800', color: C.textWhite, letterSpacing: 0.3 }}>
              Charlotte
            </AppText>
            <AppText style={{ fontSize: 15, fontWeight: '500', color: C.textMuted }}>
              {isPt ? 'Vamos conversar?' : 'Want to talk?'}
            </AppText>
          </View>

          {/* ── Pool ring ── */}
          <PoolRing used={poolUsed} total={poolTotal} isUnlimited={poolUnlimited} isPt={isPt} />

          {/* ── Last call (texto solto, sem card) ── */}
          {lastCall && <LastCallSection call={lastCall} isPt={isPt} />}

          {/* Spacer pra empurrar o botão pro fim em telas grandes */}
          <View style={{ flex: 1, minHeight: 12 }} />

          {/* ── Start button (redondo grande, igual end-call mas accent) ── */}
          <View style={{ alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={startCall}
              disabled={isLimitReached}
              activeOpacity={0.85}
              style={{
                width: 84, height: 84, borderRadius: 42,
                backgroundColor: isLimitReached ? C.navyGhost : accent,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: isLimitReached ? 'transparent' : accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.45, shadowRadius: 14,
                elevation: 8,
                opacity: isLimitReached ? 0.6 : 1,
              }}
            >
              <Phone size={32} color={isLimitReached ? C.textDim : '#FFFFFF'} weight="fill" />
            </TouchableOpacity>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: isLimitReached ? C.textDim : C.textWhite, letterSpacing: 0.5 }}>
              {isLimitReached
                ? (isPt ? 'Limite atingido' : 'Limit reached')
                : (isPt ? 'Começar agora' : 'Start now')
              }
            </AppText>
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
