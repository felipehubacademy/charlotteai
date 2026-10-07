// Metas — meta de XP do dia, missões do dia e desafio da semana.
// Abre a partir da tela de Progresso (seção Metas).

import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CalendarBlank } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { C, ScreenHeader, SectionTitle, MissionRow } from '@/components/stats/StatsUI';
import { useAuth } from '@/hooks/useAuth';
import { useGoalsData, daysLeftInWeek } from '@/hooks/useGoalsData';
import { systemIsPt } from '@/lib/systemLang';
import { getDailyGoal } from '@/lib/dailyGoal';
import { UserLevel } from '@/lib/levelConfig';

const isPt = systemIsPt;

export default function GoalsScreen() {
  const { profile } = useAuth();
  const level  = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const goals  = useGoalsData(profile?.id ?? '', level);

  const goal      = getDailyGoal(goals.todayXP);
  const left      = Math.max(0, goal - goals.todayXP);
  const doneCount = goals.missions.filter(m => m.completed).length;
  const weekly    = goals.weekly;
  const daysLeft  = daysLeftInWeek();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Metas' : 'Goals'} />

      {goals.loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* ── Meta de hoje ──────────────────────────────────────────────── */}
          <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20 }}>
            <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {isPt ? 'Meta de hoje' : "Today's goal"}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
              <AppText display style={{ fontSize: 46, fontWeight: '800', color: '#FFFFFF', lineHeight: 50 }}>
                {goals.todayXP}
              </AppText>
              <AppText style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                / {goal} XP
              </AppText>
            </View>
            <View style={{ marginTop: 12 }}>
              <QueizyWave progress={goals.todayXP / goal} height={14} strokeWidth={4} doneColor="#2BD97C" />
            </View>
            <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 12 }}>
              {goals.todayXP === 0
                ? (isPt ? 'Comece com uma missão aí embaixo.' : 'Start with one of the missions below.')
                : (isPt ? `Faltam ${left} XP para bater a meta.` : `${left} XP to hit the goal.`)}
            </AppText>
          </View>

          {/* ── Missões do dia ────────────────────────────────────────────── */}
          <SectionTitle
            title={isPt ? 'Missões do dia' : 'Daily missions'}
            meta={`${doneCount}/${goals.missions.length} ${isPt ? (doneCount === 1 ? 'feita' : 'feitas') : 'done'}`}
          />
          {goals.missions.map(m => (
            <MissionRow key={m.id} mission={m} isPt={isPt} onPress={() => router.push(m.destination as any)} />
          ))}

          {/* ── Desafio da semana ─────────────────────────────────────────── */}
          {weekly && (
            <>
              <SectionTitle title={isPt ? 'Desafio da semana' : 'Weekly challenge'} />
              <View style={{
                marginHorizontal: 16, backgroundColor: C.card, borderRadius: 20, padding: 18,
                borderWidth: 1, borderColor: C.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AppText display style={{ flex: 1, fontSize: 22, fontWeight: '800', color: C.ink }}>
                    {isPt ? weekly.challenge.title.pt : weekly.challenge.title.en}
                  </AppText>
                  <View style={{ backgroundColor: weekly.completed ? '#E3F6EC' : C.volt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <AppText style={{ fontSize: 12, fontWeight: '800', color: weekly.completed ? C.green : C.ink }}>
                      +{weekly.challenge.xpReward} XP
                    </AppText>
                  </View>
                </View>
                <AppText style={{ fontSize: 14, color: C.mid, marginTop: 4, marginBottom: 14 }}>
                  {isPt ? weekly.challenge.sub.pt : weekly.challenge.sub.en}
                </AppText>
                <QueizyWave progress={weekly.current / weekly.challenge.target} height={14} strokeWidth={4} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <AppText style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.ink }}>
                    {Math.min(weekly.current, weekly.challenge.target)} / {weekly.challenge.target}{' '}
                    <AppText style={{ fontSize: 13, fontWeight: '600', color: C.mid }}>
                      {isPt ? weekly.challenge.unit.pt : weekly.challenge.unit.en}
                    </AppText>
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CalendarBlank size={13} color={C.light} weight="bold" />
                    <AppText style={{ fontSize: 12, fontWeight: '700', color: C.light }}>
                      {weekly.completed
                        ? (isPt ? 'Concluído' : 'Completed')
                        : isPt
                          ? (daysLeft === 1 ? 'termina hoje' : `${daysLeft} dias restantes`)
                          : (daysLeft === 1 ? 'ends today' : `${daysLeft} days left`)}
                    </AppText>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
