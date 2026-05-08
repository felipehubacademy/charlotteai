// app/(app)/(tabs)/goals.tsx
// Goals tab — Daily Missions + Weekly Challenge.
// Tab version of app/(app)/goals.tsx (no back button).

import React, { useCallback, useState } from 'react';
import {
  View, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { HomeData, Mission, buildMissions } from '@/lib/missions';
import { getWeeklyChallenge, fetchWeeklyData, WeeklyChallengeState } from '@/lib/weeklyChallenge';
import { UserLevel } from '@/lib/levelConfig';
import { localMidnightUTC } from '@/lib/dateUtils';

const C = {
  bg:        '#F7F6FD',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  border:    'rgba(22,21,58,0.10)',
  shadow:    'rgba(22,21,58,0.08)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: C.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 4 },
});

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

function MissionNode({ mission, alignRight, isPt, onPress }: {
  mission: Mission;
  alignRight: boolean;
  isPt?: boolean;
  onPress?: () => void;
}) {
  const NODE = 58;
  return (
    <View>
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
            borderColor: mission.completed ? `${mission.accentColor}30` : C.border,
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
              backgroundColor: mission.completed ? C.greenBg : C.navyGhost,
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

export default function GoalsTab() {
  const { profile } = useAuth();
  const level   = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId  = profile?.id ?? '';
  const isPt    = level === 'Novice';

  const [missions,    setMissions]    = useState<Mission[]>([]);
  const [weeklyState, setWeeklyState] = useState<WeeklyChallengeState | null>(null);
  const [loading,     setLoading]     = useState(true);

  const fetchGoalsData = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();
      const [prog, prac, weeklyRaw] = await Promise.all([
        supabase.from('charlotte_progress').select('streak_days,total_xp').eq('user_id', userId).maybeSingle(),
        supabase.from('charlotte_practices').select('practice_type,xp_earned').eq('user_id', userId).gte('created_at', todayISO),
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
      console.warn('[GoalsTab] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => {
    fetchGoalsData();
  }, [fetchGoalsData]));

  const doneMissions = missions.filter(m => m.completed).length;

  const goalsPlayer = useVideoPlayer(require('@/assets/charlotte-goals.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const VIDEO_W = 130;
  const VIDEO_H = Math.round(VIDEO_W * 16 / 9); // 231px

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Metas' : 'Goals'}
          </AppText>
        </View>
      </SafeAreaView>

      {/* Charlotte de pé na borda inferior — antes do ScrollView para conteudo rolar por cima */}
      <View style={{ position: 'absolute', bottom: -10, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <View style={{ width: VIDEO_W, height: VIDEO_H, overflow: 'hidden', borderRadius: 1 }}>
          <VideoView
            player={goalsPlayer}
            style={{ width: VIDEO_W, height: VIDEO_H }}
            contentFit="cover"
            nativeControls={false}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* Daily Missions */}
          <SectionHeader
            label={isPt ? 'Missões do dia' : 'Daily Missions'}
            badge={`${doneMissions}/${missions.length}`}
            isPt={isPt}
          />
          <View style={{ paddingHorizontal: 20 }}>
            {missions.map((m, index) => (
              <View key={m.id}>
                <MissionNode
                  mission={m}
                  alignRight={index % 2 === 1}
                  isPt={isPt}
                  onPress={() => router.push(m.destination as any)}
                />
                {index < missions.length - 1 && (
                  <View style={{ alignSelf: 'center', alignItems: 'center', paddingVertical: 3, gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={{ width: 2, height: 6, backgroundColor: C.navyGhost, borderRadius: 1 }} />
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Weekly Challenge */}
          {weeklyState && (
            <>
              <SectionHeader label={isPt ? 'Desafio da semana' : 'Weekly Challenge'} />
              <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
                <View style={{
                  borderRadius: 18, overflow: 'hidden',
                  backgroundColor: weeklyState.challenge.bgColor,
                  borderWidth: 1, borderColor: weeklyState.challenge.color + '25',
                  ...cardShadow,
                }}>
                  <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText style={{
                          fontSize: 10, fontWeight: '800',
                          color: weeklyState.challenge.color,
                          letterSpacing: 0.8, textTransform: 'uppercase',
                        }}>
                          {isPt ? 'Desafio da semana' : 'Weekly Challenge'}
                        </AppText>
                        {weeklyState.completed && (
                          <CheckCircle size={14} color={weeklyState.challenge.color} weight="fill" />
                        )}
                      </View>
                      <View style={{
                        backgroundColor: weeklyState.challenge.color + '20',
                        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                      }}>
                        <AppText style={{ fontSize: 11, fontWeight: '800', color: weeklyState.challenge.color }}>
                          +{weeklyState.challenge.xpReward} XP
                        </AppText>
                      </View>
                    </View>

                    <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy, marginBottom: 2 }}>
                      {isPt ? weeklyState.challenge.title.pt : weeklyState.challenge.title.en}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: C.navyMid, marginBottom: 10 }}>
                      {isPt ? weeklyState.challenge.sub.pt : weeklyState.challenge.sub.en}
                    </AppText>

                    {/* Progress bar */}
                    <View style={{ height: 8, backgroundColor: 'rgba(22,21,58,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round((weeklyState.current / weeklyState.challenge.target) * 100))}%` as any,
                        backgroundColor: weeklyState.challenge.color,
                        borderRadius: 4,
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
        </View>
      )}

    </View>
  );
}
