// app/(app)/(tabs)/index.tsx
// New Home tab — beta only (beta_features includes 'new_layout').
// Header (streak/XP/rank pills) + Charlotte hero card + TrailContent inline.

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Image, Platform,
  ActivityIndicator, RefreshControl, Animated, unstable_batchedUpdates,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fire, Lightning, Trophy } from 'phosphor-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SecureStore from 'expo-secure-store';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { UserLevel } from '@/lib/levelConfig';
import { useTheme } from '@/lib/theme';
import { usePaywallContext } from '@/lib/paywallContext';
import { identifyUser, track } from '@/lib/analytics';
import { greetingCache, resetGreetingCache } from '@/lib/greetingCache';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import { TrailContent } from '@/components/trail/TrailContent';

// Module-level flag — persists for the JS session (like the legacy home screen)
let _streakSoundPlayedThisSession = false;

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

// ── Daily XP goal ─────────────────────────────────────────────────────────────

const DAILY_XP_MILESTONES = [100, 200, 350, 500, 750, 1000];
function getDailyGoal(xp: number): number {
  for (const m of DAILY_XP_MILESTONES) { if (xp < m) return m; }
  return Math.ceil((xp + 1) / 500) * 500;
}

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

// ── XP ring ───────────────────────────────────────────────────────────────────

function XPRing({ todayXP, goal }: { todayXP: number; goal: number }) {
  const SIZE = 50, SW = 5;
  const r    = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;
  const prog = Math.min(todayXP / goal, 1);
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke={C.navyGhost} strokeWidth={SW} fill="none" />
        {prog > 0 && (
          <Circle
            cx={SIZE/2} cy={SIZE/2} r={r}
            stroke={C.greenDark} strokeWidth={SW} fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - prog)}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
          />
        )}
      </Svg>
      <AppText style={{ fontSize: 12, fontWeight: '900', color: C.navy }}>{todayXP}</AppText>
    </View>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────────

export default function HomeTab() {
  const { profile, isFreshLogin } = useAuth();
  const { openPaywall }           = usePaywallContext();
  const { colors: T }             = useTheme();
  const userId    = profile?.id ?? '';
  const level     = (profile?.charlotte_level ?? 'Novice') as UserLevel;
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

  // Streak sound — same pattern as legacy home
  const isFreshLoginRef  = useRef(isFreshLogin);
  const pendingStreakRef  = useRef(false);
  const greetingPlayer = useVideoPlayer(require('@/assets/charlotte-greeting.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  useEffect(() => { isFreshLoginRef.current = isFreshLogin; }, [isFreshLogin]);
  useEffect(() => {
    if (!isFreshLogin && pendingStreakRef.current) {
      pendingStreakRef.current = false;
      setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), 800);
    }
  }, [isFreshLogin]);

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

      // Streak sound
      if (!_streakSoundPlayedThisSession && streakDays > 0) {
        const today     = localTodayStr();
        const streakKey = `streak_sound_played_${userId}`;
        SecureStore.getItemAsync(streakKey).then(lastPlayed => {
          if (lastPlayed !== today) {
            _streakSoundPlayedThisSession = true;
            SecureStore.setItemAsync(streakKey, today).catch(() => {});
            if (isFreshLoginRef.current) {
              pendingStreakRef.current = true;
            } else {
              setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), 800);
            }
          } else {
            _streakSoundPlayedThisSession = true;
          }
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
    if (greetingCache.level && greetingCache.level !== level) {
      resetGreetingCache();
      setAiGreeting(null);
      setGreetingLoading(true);
    }
    if (greetingCache.text) {
      setAiGreeting(greetingCache.text);
      setGreetingLoading(false);
      return;
    }
    if (!userId || !name) return;
    if (greetingCache.fetched && !greetingCache.pending) {
      setGreetingLoading(false);
      return;
    }
    const minDotsMs  = 600;
    const fetchStart = Date.now();
    const poll = setInterval(() => {
      if (greetingCache.text) {
        clearInterval(poll);
        const elapsed = Date.now() - fetchStart;
        const delay   = Math.max(0, minDotsMs - elapsed);
        setTimeout(() => {
          unstable_batchedUpdates(() => {
            setAiGreeting(greetingCache.text);
            setGreetingLoading(false);
          });
        }, delay);
      } else if (!greetingCache.pending) {
        clearInterval(poll);
        setGreetingLoading(false);
      }
    }, 50);
    return () => clearInterval(poll);
  }, [userId, name, level, profile]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

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

      {/* Safe-area + header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: T.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, height: 52,
          backgroundColor: T.card,
          borderBottomWidth: 1, borderBottomColor: C.navyGhost,
        }}>
          {/* Stats pills → stats screen */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(app)/stats', params: statsParams })}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: streak ? 'rgba(251,146,60,0.12)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Fire size={15} color={streak ? C.orange : C.navyLight} weight="fill" />
              <AppText style={{ fontSize: 13, fontWeight: '800', color: streak ? C.orange : C.navyLight }}>{streak}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: totalXP > 0 ? 'rgba(61,136,0,0.10)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Lightning size={15} color={totalXP > 0 ? C.greenDark : C.navyLight} weight="fill" />
              <AppText style={{ fontSize: 13, fontWeight: '800', color: totalXP > 0 ? C.greenDark : C.navyLight }}>{totalXP.toLocaleString()}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: rank ? 'rgba(234,179,8,0.12)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Trophy size={15} color={rank ? C.gold : C.navyLight} weight="fill" />
              <AppText style={{ fontSize: 13, fontWeight: '800', color: rank ? C.gold : C.navyLight }}>{rank ? `#${rank}` : '—'}</AppText>
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Trial badge */}
          {trialDaysLeft !== null && (
            <TouchableOpacity
              onPress={openPaywall} activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(61,136,0,0.10)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10, borderWidth: 1, borderColor: 'rgba(61,136,0,0.20)' }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3D8800' }} />
              <AppText style={{ fontSize: 12, fontWeight: '700', color: '#3D8800' }}>
                {isPt ? `${trialDaysLeft}d grátis` : `${trialDaysLeft}d trial`}
              </AppText>
            </TouchableOpacity>
          )}

        </View>
      </SafeAreaView>

      {/* Charlotte hero card — fixed */}
      <View style={{ marginHorizontal: 20, marginTop: 8 }}>
        <View style={{ borderRadius: 22, backgroundColor: T.card, overflow: 'hidden', ...cardShadow }}>
          {/* Navy strip with bust + chat bubble */}
          <View style={{ backgroundColor: C.heroStrip, paddingRight: 20, flexDirection: 'row', alignItems: 'center', minHeight: 140 }}>
            {/* borderRadius força clipping no Android (overflow:hidden sozinho nao funciona com VideoView) */}
            <View style={{ width: 118, height: 165, marginBottom: -15, flexShrink: 0, alignSelf: 'flex-end', overflow: 'hidden', borderRadius: 1, backgroundColor: C.heroStrip }}>
              <VideoView
                player={greetingPlayer}
                style={{ width: 118, height: Math.round(118 * 16 / 9), backgroundColor: C.heroStrip }}
                contentFit="cover"
                nativeControls={false}
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

          {/* Divider + XP — zIndex:1 para ficar sobre o overflow da Charlotte */}
          <View style={{ zIndex: 1, backgroundColor: T.card }}>
          <View style={{ height: 1, backgroundColor: C.navyGhost }} />

          {/* XP progress — tappable → stats screen */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(app)/stats', params: statsParams })}
            activeOpacity={0.75}
            style={{ padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <XPRing todayXP={todayXP} goal={getDailyGoal(todayXP)} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                  <AppText style={{ fontSize: 11, color: C.navyMid, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    {isPt ? 'XP de hoje' : "Today's XP"}
                  </AppText>
                  <AppText style={{ fontSize: 11, fontWeight: '800', color: C.greenDark }}>
                    {todayXP} / {getDailyGoal(todayXP)}
                  </AppText>
                </View>
                <View style={{ height: 8, backgroundColor: C.navyGhost, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${(todayXP / getDailyGoal(todayXP)) * 100}%` as any,
                    backgroundColor: C.greenDark,
                    borderRadius: 4,
                  }} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Learning trail — scrollable below fixed hero */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      >
        <TrailContent userId={userId} level={level} />
      </ScrollView>

    </View>
  );
}
