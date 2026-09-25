// app/(app)/goals.tsx
// Goals screen — Daily Missions + Weekly Challenge, navigated from home banner.

import React, { useCallback, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { HomeData, Mission, buildMissions } from '@/lib/missions';
import { getWeeklyChallenge, fetchWeeklyData, WeeklyChallengeState } from '@/lib/weeklyChallenge';
import { UserLevel } from '@/lib/levelConfig';
import { localMidnightUTC } from '@/lib/dateUtils';

// Static palette — matches module-level C in index.tsx
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  shadow:    'rgba(22,21,58,0.08)',
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: C.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, badge, isPt }: { label: string; badge?: string; isPt?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 16 }}>
      <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy, flex: 1 }}>
        {label}
      </AppText>
      {badge ? (
        <View style={{ backgroundColor: C.navyGhost, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
          <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyMid }}>
            {badge} {isPt ? 'feito' : 'done'}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function MissionNode({ mission, alignRight, showConnector, isPt, onPress }: {
  mission: Mission;
  alignRight: boolean;
  showConnector: boolean;
  isPt?: boolean;
  onPress?: () => void;
}) {
  const NODE = 58;
  return (
    <View style={{ marginBottom: showConnector ? 10 : 0 }}>
      <View style={{ flexDirection: alignRight ? 'row-reverse' : 'row', alignItems: 'center' }}>

        {/* Circle node */}
        <View style={{
          width: NODE, height: NODE, borderRadius: NODE / 2,
          backgroundColor: mission.completed ? mission.accentBg : C.card,
          borderWidth: 1.5,
          borderColor: mission.completed ? `${mission.accentColor}40` : C.navyGhost,
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          ...cardShadow,
        }}>
          {mission.completed ? mission.doneIcon : mission.icon}
        </View>

        {/* Horizontal connector */}
        <View style={{ width: 14, height: 1.5, backgroundColor: C.navyGhost, flexShrink: 0 }} />

        {/* Card */}
        <TouchableOpacity
          onPress={mission.completed ? undefined : onPress}
          activeOpacity={mission.completed ? 1 : 0.75}
          style={{
            flex: 1,
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 11,
            borderWidth: 1,
            borderColor: mission.completed ? `${mission.accentColor}30` : C.navyGhost,
            ...cardShadow,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{
              flex: 1, fontSize: 14, fontWeight: '700',
              color: mission.completed ? C.navyLight : C.navy,
              textDecorationLine: mission.completed ? 'line-through' : 'none',
            }}>
              {mission.label}
            </AppText>
            <View style={{
              backgroundColor: mission.completed ? C.greenBg : C.bg,
              borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <AppText style={{
                fontSize: 11, fontWeight: '800',
                color: mission.completed ? C.greenDark : C.navyLight,
              }}>
                +{mission.xpReward} XP
              </AppText>
            </View>
          </View>

          {mission.completed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <CheckCircle size={12} color={mission.accentColor} weight="fill" />
              <AppText style={{ fontSize: 12, color: C.navyLight }}>
                {isPt ? 'Concluída hoje' : 'Completed today'}
              </AppText>
            </View>
          ) : (
            <AppText style={{ fontSize: 12, color: C.navyLight, marginTop: 3 }}>
              {mission.sub}
            </AppText>
          )}

          {!mission.completed && mission.progress > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1, height: 4, backgroundColor: C.navyGhost, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${mission.progress * 100}%` as any,
                  backgroundColor: mission.accentColor,
                  borderRadius: 2,
                }} />
              </View>
              <AppText style={{ fontSize: 10, color: C.navyLight, fontWeight: '600' }}>
                {mission.progressLabel}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { profile } = useAuth();
  const level   = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId  = profile?.id ?? '';
  const isPt    = systemIsPt; // suporte/chrome: idioma do device

  const [missions,     setMissions]     = useState<Mission[]>([]);
  const [weeklyState,  setWeeklyState]  = useState<WeeklyChallengeState | null>(null);
  const [loading,      setLoading]      = useState(true);

  const fetchGoalsData = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();
      const [prog, prac, weeklyRaw] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('charlotte_practices')
          .select('practice_type,xp_earned')
          .eq('user_id', userId)
          .gte('created_at', todayISO),
        fetchWeeklyData(userId),
      ]);

      const practices = prac.data ?? [];
      const todayXP   = practices.reduce((s, p) => s + (p.xp_earned ?? 0), 0);

      const homeData: HomeData = {
        streakDays:    prog.data?.streak_days ?? 0,
        totalXP:       prog.data?.total_xp   ?? 0,
        todayXP,
        rank:          null,
        todayMessages: practices.filter(p => ['text_message', 'audio_message'].includes(p.practice_type)).length,
        todayAudios:   practices.filter(p => p.practice_type === 'audio_message').length,
      };

      setMissions(buildMissions(homeData, level));
      setWeeklyState(getWeeklyChallenge(
        weeklyRaw.weeklyMessages,
        weeklyRaw.weeklyXP,
        homeData.streakDays,
        weeklyRaw.weeklyLessons,
        weeklyRaw.weeklyAudios,
        weeklyRaw.weeklyGrammarMessages,
        level,
        weeklyRaw.weeklyActiveDays,
      ));
    } catch (e) {
      console.warn('[Goals] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => {
    fetchGoalsData();
  }, [fetchGoalsData]));

  const doneMissions = missions.filter(m => m.completed).length;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.navy} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header — safe area branca igual ao my-vocabulary */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14, gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.navyGhost,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={C.navy} weight="bold" />
          </TouchableOpacity>
          <AppText style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Metas' : 'Goals'}
          </AppText>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Daily Missions ── */}
        <SectionHeader
          label={isPt ? 'Missões do dia' : 'Daily Missions'}
          badge={`${doneMissions}/${missions.length}`}
          isPt={isPt}
        />
        <View style={{ paddingHorizontal: 20 }}>
          {missions.map((m, index) => (
            <MissionNode
              key={m.id}
              mission={m}
              alignRight={index % 2 === 1}
              showConnector={index < missions.length - 1}
              isPt={isPt}
              onPress={() => router.push(m.destination as any)}
            />
          ))}
        </View>

        {/* ── Weekly Challenge ── */}
        {weeklyState && (
          <>
            <SectionHeader label={isPt ? 'Desafio da semana' : 'Weekly Challenge'} />
            <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
              <View style={{
                borderRadius: 18, overflow: 'hidden',
                backgroundColor: weeklyState.challenge.bgColor,
                borderWidth: 1,
                borderColor: weeklyState.challenge.color + '25',
                ...cardShadow,
              }}>
                <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 8,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AppText style={{
                        fontSize: 10, fontWeight: '800',
                        color: weeklyState.challenge.color,
                        letterSpacing: 0.8, textTransform: 'uppercase',
                      }}>
                        {isPt ? 'Desafio da semana' : 'Weekly Challenge'}
                      </AppText>
                      {weeklyState.completed && (
                        <View style={{
                          backgroundColor: weeklyState.challenge.color + '20',
                          borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        }}>
                          <AppText style={{ fontSize: 9, fontWeight: '800', color: weeklyState.challenge.color }}>
                            {isPt ? 'COMPLETO' : 'DONE'}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: weeklyState.challenge.color }}>
                      +{weeklyState.challenge.xpReward} XP
                    </AppText>
                  </View>

                  <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy, marginBottom: 2 }}>
                    {isPt ? weeklyState.challenge.title.pt : weeklyState.challenge.title.en}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: C.navyMid, marginBottom: 10 }}>
                    {isPt ? weeklyState.challenge.sub.pt : weeklyState.challenge.sub.en}
                  </AppText>

                  {/* Progress bar */}
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(22,21,58,0.06)' }}>
                    <View style={{
                      height: 8, borderRadius: 4,
                      backgroundColor: weeklyState.challenge.color,
                      width: `${Math.round((weeklyState.current / weeklyState.challenge.target) * 100)}%` as any,
                      maxWidth: '100%',
                    }} />
                  </View>
                  <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 4, textAlign: 'right' }}>
                    {weeklyState.current} / {weeklyState.challenge.target}{' '}
                    {isPt ? weeklyState.challenge.unit.pt : weeklyState.challenge.unit.en}
                  </AppText>
                </View>
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}
