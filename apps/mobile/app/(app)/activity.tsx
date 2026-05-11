import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, Lightning, RocketLaunch, Target, Trophy,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.08)',
  green:     '#3D8800',
  greenLight:'#F0FFD9',
  gold:      '#D97706',
};

type Level = 'Novice' | 'Inter' | 'Advanced';

interface ActivityRow {
  id: string;
  type: string;
  xp: number;
  timestamp: Date;
  isMission: boolean;
}

interface ActivityData {
  rows: ActivityRow[];
  totalXP: number;
  loading: boolean;
  error: string | null;
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function ActivityScreen() {
  const params = useLocalSearchParams<{
    userId:    string;
    userLevel: string;
    userName:  string;
  }>();

  const userId    = params.userId    ?? '';
  const userLevel = (params.userLevel ?? 'Inter') as Level;
  const isPortuguese = userLevel === 'Novice';

  const [data, setData] = useState<ActivityData>({
    rows: [], totalXP: 0, loading: true, error: null,
  });

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Labels alinhados ao novo layout (Free Chat, Grammar, Pronunciation, etc).
      const typeLabels: Record<string, string> = {
        text_message:      'Free Chat',
        audio_message:     isPortuguese ? 'Free Chat (voz)' : 'Free Chat (voice)',
        grammar:           isPortuguese ? 'Gramática'       : 'Grammar',
        grammar_message:   isPortuguese ? 'Gramática'       : 'Grammar',
        pronunciation:     isPortuguese ? 'Pronúncia'       : 'Pronunciation',
        live_voice:        'Live Voice',
        learn_exercise:    isPortuguese ? 'Trilha'          : 'Learning Trail',
        sr_review:         isPortuguese ? 'Revisão'         : 'SR Review',
        vocab_review:      isPortuguese ? 'Vocabulário'     : 'Vocabulary',
        image_recognition: isPortuguese ? 'Reconhecimento'  : 'Recognition',
      };
      const getLabel = (type: string) => {
        if (type.startsWith('mission_reward_')) return isPortuguese ? 'Missão Concluída' : 'Mission Complete';
        if (type.startsWith('weekly_reward_'))  return isPortuguese ? 'Recompensa Semanal' : 'Weekly Reward';
        return typeLabels[type] ?? (isPortuguese ? 'Prática' : 'Practice');
      };

      const { data: rows, error } = await supabase
        .from('charlotte_practices')
        .select('id,practice_type,xp_earned,created_at')
        .eq('user_id', userId)
        .not('practice_type', 'like', 'achievement_reward_%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const activityRows: ActivityRow[] = (rows ?? []).map((p: any) => ({
        id: p.id,
        type: getLabel(p.practice_type),
        xp: p.xp_earned ?? 0,
        timestamp: new Date(p.created_at),
        isMission: (p.practice_type as string).startsWith('mission_reward_'),
      }));

      const totalXP = activityRows.reduce((sum, r) => sum + r.xp, 0);

      setData({ rows: activityRows, totalXP, loading: false, error: null });
    } catch {
      setData(prev => ({ ...prev, loading: false, error: 'Error loading activity' }));
    }
  };

  // ── Group rows by date ────────────────────────────────────────────────────────
  const groupedByDate = data.rows.reduce<Record<string, ActivityRow[]>>((acc, row) => {
    const key = row.timestamp.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  const dateGroups = Object.entries(groupedByDate);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (data.loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
            CHARLOTTE
          </AppText>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }}>
            {isPortuguese ? 'Histórico de Atividades' : 'Activity History'}
          </AppText>
        </View>

        {/* Right spacer to balance layout */}
        <View style={{ width: 22 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        {/* Summary bar */}
        <View style={{
          marginHorizontal: 16, marginBottom: 20,
          backgroundColor: C.card, borderRadius: 20, padding: 16,
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>
              {data.rows.length}
            </AppText>
            <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyLight }}>
              {isPortuguese ? 'sessoes' : 'sessions'}
            </AppText>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Lightning size={16} color={C.green} weight="fill" />
              <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>
                {data.totalXP.toLocaleString()}
              </AppText>
            </View>
            <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyLight }}>
              XP total
            </AppText>
          </View>
        </View>

        {/* Activity list */}
        {data.rows.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
            <RocketLaunch size={48} color={C.navyLight} weight="fill" />
            <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '800', marginTop: 16, marginBottom: 6, textAlign: 'center' }}>
              {isPortuguese ? 'Nenhuma atividade ainda' : 'No activity yet'}
            </AppText>
            <AppText style={{ color: C.navyLight, fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
              {isPortuguese
                ? 'Comece a praticar para ver seu histórico aqui!'
                : 'Start practicing to see your history here!'}
            </AppText>
          </View>
        ) : (
          dateGroups.map(([date, rows]) => (
            <View key={date} style={{ marginBottom: 16 }}>
              {/* Date label */}
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {date}
                </AppText>
              </View>

              {/* Rows for this date */}
              <View style={{
                backgroundColor: C.card, borderRadius: 20,
                marginHorizontal: 16, overflow: 'hidden',
              }}>
                {rows.map((a, i) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 12, paddingHorizontal: 16,
                      borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                      {/* Icon bubble */}
                      <View style={{
                        width: 36, height: 36, borderRadius: 12,
                        backgroundColor: a.isMission ? C.gold + '18' : C.ghost,
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {a.isMission
                          ? <Target size={16} color={C.gold} weight="fill" />
                          : <Trophy size={16} color={C.navyLight} weight="regular" />}
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: C.navy, fontSize: 13, fontWeight: '600' }}>
                          {a.type}
                        </AppText>
                        <AppText style={{ color: C.navyLight, fontSize: 11, fontWeight: '500', marginTop: 1 }}>
                          {a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </AppText>
                      </View>
                    </View>

                    <View style={{
                      backgroundColor: C.greenLight, paddingHorizontal: 10,
                      paddingVertical: 4, borderRadius: 8, flexShrink: 0,
                    }}>
                      <AppText style={{ color: C.green, fontSize: 12, fontWeight: '800' }}>
                        +{a.xp}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {data.rows.length >= 50 && (
          <View style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 8 }}>
            <AppText style={{ fontSize: 12, fontWeight: '500', color: C.navyLight, textAlign: 'center' }}>
              {isPortuguese
                ? 'Mostrando as 50 atividades mais recentes'
                : 'Showing the 50 most recent activities'}
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
