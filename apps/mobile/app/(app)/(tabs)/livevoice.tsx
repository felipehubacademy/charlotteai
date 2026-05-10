// app/(app)/(tabs)/livevoice.tsx
// Live Voice tab — hero com video da Charlotte + ring de pool mensal +
// resumo da última chamada + botão Start now. Beta only (new_layout).

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Platform,
  RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Phone, CaretRight } from 'phosphor-react-native';
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface LastCall {
  id:               string;
  started_at:       string;
  duration_seconds: number;
  summary:          string | null;
}

// ── Pool ring ─────────────────────────────────────────────────────────────────

function PoolRing({ used, total, isUnlimited, isPt }: {
  used: number; total: number; isUnlimited: boolean; isPt: boolean;
}) {
  const SIZE = 160, SW = 12;
  const r    = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;

  const ratio = isUnlimited ? 0 : Math.min(used / total, 1);
  const color = isUnlimited
    ? C.greenDark
    : ratio >= 0.85 ? C.red
    : ratio >= 0.6  ? C.gold
                    : C.greenDark;

  const usedMin  = Math.floor(used / 60);
  const totalMin = Math.floor(total / 60);
  const remainMin = totalMin - usedMin;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: SIZE }}>
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
            <AppText style={{ fontSize: 28, fontWeight: '900', color: C.greenDark }}>∞</AppText>
            <AppText style={{ fontSize: 11, color: C.navyMid, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
              {isPt ? 'Ilimitado' : 'Unlimited'}
            </AppText>
          </>
        ) : (
          <>
            <AppText style={{ fontSize: 32, fontWeight: '900', color: C.navy }}>{remainMin}</AppText>
            <AppText style={{ fontSize: 11, color: C.navyMid, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isPt ? 'min restantes' : 'min remaining'}
            </AppText>
            <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '500', marginTop: 4 }}>
              {usedMin}/{totalMin} {isPt ? 'usados' : 'used'}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

// ── Last call card ────────────────────────────────────────────────────────────

function LastCallCard({ call, isPt }: { call: LastCall; isPt: boolean }) {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);

  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `Há ${days} dias` : `${days} days ago`;

  return (
    <View style={{
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      ...cardShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyMid, textTransform: 'uppercase', letterSpacing: 1 }}>
          {isPt ? 'Última chamada' : 'Last call'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: C.navyGhost, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyMid }}>{whenLabel}</AppText>
          </View>
          <View style={{ backgroundColor: C.navyGhost, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyMid }}>{minutes} min</AppText>
          </View>
        </View>
      </View>
      <AppText style={{ fontSize: 14, color: C.navy, lineHeight: 20 }}>
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
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
        >

          {/* ── Hero card: vídeo + balão ── */}
          <View style={{
            borderRadius: 22,
            backgroundColor: C.card,
            overflow: 'hidden',
            ...cardShadow,
          }}>
            <View style={{ height: 3, backgroundColor: accent }} />

            <View style={{ backgroundColor: C.heroStrip, flexDirection: 'row', alignItems: 'center', minHeight: 160, paddingRight: 20 }}>
              <View style={{ width: 130, height: 180, marginBottom: -16, flexShrink: 0, alignSelf: 'flex-end', overflow: 'hidden', borderRadius: 1, backgroundColor: C.heroStrip }}>
                <VideoView
                  player={liveVoicePlayer}
                  style={{ width: 130, height: Math.round(130 * 16 / 9), backgroundColor: C.heroStrip }}
                  contentFit="cover"
                  nativeControls={false}
                />
              </View>
              <View style={{ flex: 1, paddingVertical: 18 }}>
                <View style={{ backgroundColor: '#3B3A5A', borderRadius: 18, borderTopLeftRadius: 0, paddingHorizontal: 14, paddingVertical: 12, alignSelf: 'flex-start' }}>
                  <AppText style={{ fontSize: 14, color: '#FFFFFF', lineHeight: 20, fontWeight: '500' }}>
                    {isPt ? 'Vamos conversar?' : "Want to talk?"}
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* ── Pool ring ── */}
          <View style={{
            backgroundColor: C.card,
            borderRadius: 22,
            paddingVertical: 24,
            alignItems: 'center',
            ...cardShadow,
          }}>
            <PoolRing used={poolUsed} total={poolTotal} isUnlimited={poolUnlimited} isPt={isPt} />
            <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '500', marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>
              {poolUnlimited
                ? (isPt ? 'Você tem chamadas ilimitadas neste plano.' : 'You have unlimited calls on this plan.')
                : isLimitReached
                  ? (isPt ? 'Limite mensal atingido. Renova no início do próximo mês.' : 'Monthly limit reached. Renews at the start of next month.')
                  : (isPt ? 'O pool reseta no início de cada mês.' : 'Pool resets at the start of each month.')}
            </AppText>
          </View>

          {/* ── Last call summary ── */}
          {lastCall && <LastCallCard call={lastCall} isPt={isPt} />}

          {/* ── Start now button ── */}
          <TouchableOpacity
            onPress={startCall}
            disabled={isLimitReached}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 10,
              backgroundColor: isLimitReached ? C.navyGhost : accent,
              borderRadius: 16, paddingVertical: 18,
              opacity: isLimitReached ? 0.5 : 1,
            }}
          >
            <Phone size={20} color={isLimitReached ? C.navyMid : '#FFFFFF'} weight="fill" />
            <AppText style={{ fontSize: 16, fontWeight: '800', color: isLimitReached ? C.navyMid : '#FFFFFF' }}>
              {isLimitReached
                ? (isPt ? 'Limite atingido' : 'Limit reached')
                : (isPt ? 'Começar agora' : 'Start now')
              }
            </AppText>
            {!isLimitReached && <CaretRight size={14} color="#FFFFFF" weight="bold" />}
          </TouchableOpacity>

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
