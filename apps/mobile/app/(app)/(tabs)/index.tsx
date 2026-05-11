// app/(app)/(tabs)/index.tsx
// New Home tab — beta only (beta_features includes 'new_layout').
// Header (streak/XP/rank pills) + Charlotte hero card + TrailContent inline.

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Image, Platform,
  ActivityIndicator, RefreshControl, Animated, unstable_batchedUpdates,
  findNodeHandle,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { TrailContent } from '@/components/trail/TrailContent';
import { TrailBanner } from '@/components/trail/TrailBanner';

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

  const greetingPlayer = useVideoPlayer(require('@/assets/charlotte-greeting.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
            setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), 800);
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
  const handleCurrentTopicRef = useCallback((node: View | null) => {
    if (!node || trailScrolledRef.current || !trailScrollRef.current) return;
    // Pequeno delay pra garantir que o layout do scrollview esta pronto
    setTimeout(() => {
      const sv = trailScrollRef.current;
      if (!sv) return;
      const handle = findNodeHandle(sv);
      if (handle == null) return;
      (node as any).measureLayout?.(
        handle,
        (_x: number, y: number) => {
          sv.scrollTo({ y: Math.max(0, y - 24), animated: false });
          trailScrolledRef.current = true;
        },
        () => {},
      );
    }, 60);
  }, []);

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

          {/* Divider + TrailBanner — zIndex:1 para ficar sobre o overflow da Charlotte */}
          <View style={{ zIndex: 1, backgroundColor: T.card }}>
          <View style={{ height: 1, backgroundColor: C.navyGhost }} />
          <TrailBanner userId={userId} level={level} flush />
          </View>
        </View>
      </View>

      {/* Learning trail — scrollable below fixed hero */}
      <ScrollView
        ref={trailScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      >
        <TrailContent
          userId={userId}
          level={level}
          showBanner={false}
          onCurrentTopicRef={handleCurrentTopicRef}
        />
      </ScrollView>

    </View>
  );
}
