// Ranking — top 20 do nível do aluno, com a posição dele em destaque e
// quanto falta para passar quem está logo acima. Duas abas: Semana (XP desde segunda 0h,
// horário de Brasília; zera toda segunda e dá chance para quem entrou agora) e Geral (XP total).

import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { C, ScreenHeader, Card, RankRow, firstName } from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { RecentAchievements } from '@/components/social/RecentAchievements';
import { FriendSearchEntry } from '@/components/social/FriendSearch';

const isPt = systemIsPt;

interface Entry { userId: string; totalXp: number; name: string; rank: number }

export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{ userId: string; userLevel: string; userName: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const userId    = params.userId || profile?.id || '';
  const userLevel = params.userLevel || profile?.charlotte_level || 'Inter';
  const userName  = params.userName || profile?.name || '';

  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe]           = useState<Entry | null>(null);
  const [above, setAbove]     = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope]     = useState<'week' | 'all'>('week');
  // Conta fora do ranking (equipe, revisão das lojas): vê a lista, mas não entra na classificação.
  const [hidden, setHidden]   = useState(false);
  useEffect(() => {
    if (!userId) return;
    supabase.from('charlotte_users').select('hide_from_ranking').eq('id', userId).maybeSingle()
      .then(({ data }) => setHidden(!!(data as { hide_from_ranking?: boolean } | null)?.hide_from_ranking));
  }, [userId]);

  useEffect(() => { if (userId) { setLoading(true); (scope === 'week' ? loadWeek : load)(); } }, [userId, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // Semana: o banco já devolve a lista ordenada (contas fora do ranking não entram).
  const loadWeek = async () => {
    try {
      const { data } = await supabase.rpc('weekly_ranking', { p_level: userLevel });
      const all: Entry[] = ((data ?? []) as { user_id: string; name: string | null; week_xp: number; pos: number }[])
        .map(r => ({ userId: r.user_id, totalXp: Number(r.week_xp), name: r.name ?? '', rank: Number(r.pos) }));
      const mine = all.find(e => e.userId === userId) ?? { userId, totalXp: 0, name: userName, rank: all.length + 1 };
      const prev = [...all].reverse().find(e => e.totalXp > mine.totalXp) ?? null;
      setEntries(all.slice(0, 20));
      setMe(mine);
      setAbove(prev);
    } catch {
      setEntries([]); setMe(null); setAbove(null);
    } finally {
      setLoading(false);
    }
  };

  // Geral: o mesmo cache do #N do cabeçalho (legível por todos e já sem as contas fora do ranking).
  const load = async () => {
    try {
      const [{ data: rows }, { data: myRow }] = await Promise.all([
        supabase.from('charlotte_leaderboard_cache').select('user_id, display_name, total_xp')
          .eq('user_level', userLevel).order('total_xp', { ascending: false }).limit(20),
        supabase.from('charlotte_progress').select('total_xp').eq('user_id', userId).maybeSingle(),
      ]);
      const list: Entry[] = ((rows ?? []) as { user_id: string; display_name: string | null; total_xp: number }[])
        .map((r, i) => ({ userId: String(r.user_id), totalXp: r.total_xp ?? 0, name: r.display_name ?? '', rank: i + 1 }));
      let mine = list.find(e => e.userId === userId) ?? null;
      let prev: Entry | null = mine && mine.rank > 1 ? list[mine.rank - 2] : null;
      if (!mine) {
        const xp = (myRow as { total_xp?: number } | null)?.total_xp ?? 0;
        const { count } = await supabase.from('charlotte_leaderboard_cache')
          .select('user_id', { count: 'exact', head: true }).eq('user_level', userLevel).gt('total_xp', xp);
        mine = { userId, totalXp: xp, name: userName, rank: (count ?? 0) + 1 };
        const { data: next } = await supabase.from('charlotte_leaderboard_cache').select('user_id, display_name, total_xp')
          .eq('user_level', userLevel).gt('total_xp', xp).order('total_xp', { ascending: true }).limit(1);
        if (next?.[0]) prev = { userId: String(next[0].user_id), totalXp: next[0].total_xp ?? 0, name: next[0].display_name ?? '', rank: mine.rank - 1 };
      }
      setEntries(list);
      setMe(mine);
      setAbove(prev);
    } catch {
      // lista vazia
    } finally {
      setLoading(false);
    }
  };

  const you = isPt ? '(você)' : '(you)';
  const inTop = entries.some(e => e.userId === userId);
  const gap = me && above ? Math.max(1, above.totalXp - me.totalXp + 1) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={`Ranking ${userLevel}`} />
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: 'rgba(22,19,31,0.06)', borderRadius: 999, padding: 4 }}>
        {(['week', 'all'] as const).map(k => (
          <TouchableOpacity key={k} onPress={() => setScope(k)} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center', backgroundColor: scope === k ? C.ink : 'transparent' }}>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: scope === k ? '#FFFFFF' : C.ink }}>
              {k === 'week' ? (isPt ? 'Semana' : 'This week') : (isPt ? 'Geral' : 'All time')}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {scope === 'week' && (
            <AppText style={{ fontSize: 13, color: C.light, textAlign: 'center', marginBottom: 12 }}>
              {isPt ? 'Conta o XP desde segunda. Zera toda segunda às 0h.' : 'Counts XP since Monday. Resets every Monday at midnight.'}
            </AppText>
          )}
          <FriendSearchEntry />
          {me && hidden && (
            <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <AppText style={{ fontSize: 14, color: '#FFFFFF', lineHeight: 20 }}>
                {isPt ? 'Sua conta está fora da classificação (conta da equipe). Você vê o ranking, mas não aparece nele.' : "Your account is outside the ranking (team account). You can see it, but you don't appear on it."}
              </AppText>
            </View>
          )}
          {me && !hidden && (
            <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {isPt ? 'Sua posição' : 'Your position'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
                <AppText display style={{ fontSize: 46, fontWeight: '800', color: C.volt, lineHeight: 50 }}>
                  {isPt ? `${me.rank}º` : `#${me.rank}`}
                </AppText>
                <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  {me.totalXp.toLocaleString()} XP{scope === 'week' ? (isPt ? ' nesta semana' : ' this week') : ''}
                </AppText>
              </View>
              <AppText style={{ fontSize: 14, color: '#FFFFFF', marginTop: 10, lineHeight: 20 }}>
                {me.rank === 1
                  ? (isPt ? 'Você está no topo. Agora é defender o lugar.' : "You're on top. Now hold the spot.")
                  : above
                    ? (isPt
                        ? `Faltam ${gap.toLocaleString()} XP para passar ${firstName(above.name, `o ${above.rank}º`)}.`
                        : `${gap.toLocaleString()} XP to pass ${firstName(above.name, `#${above.rank}`)}.`)
                    : ''}
              </AppText>
            </View>
          )}

          {entries.length === 0 ? (
            <AppText style={{ fontSize: 14, color: C.light, textAlign: 'center', marginTop: 40 }}>
              {scope === 'week'
                ? (isPt ? 'Ninguém pontuou nesta semana ainda. Faça uma atividade e saia na frente.' : 'Nobody has scored this week yet. Do an activity and take the lead.')
                : (isPt ? 'O ranking ainda está vazio.' : 'The ranking is still empty.')}
            </AppText>
          ) : (
            <Card style={{ paddingVertical: 6 }}>
              {entries.map((e, i) => (
                <RankRow
                  key={e.userId}
                  rank={e.rank}
                  name={firstName(e.userId === userId ? userName || e.name : e.name, `#${e.rank}`)}
                  xp={e.totalXp}
                  isUser={e.userId === userId}
                  youLabel={you}
                  last={i === entries.length - 1 && inTop}
                />
              ))}
              {!inTop && me && !hidden && (
                <>
                  <AppText style={{ textAlign: 'center', color: C.light, fontSize: 16, letterSpacing: 2, paddingVertical: 4 }}>···</AppText>
                  <RankRow rank={me.rank} name={firstName(userName, isPt ? 'Você' : 'You')} xp={me.totalXp} isUser youLabel={you} last />
                </>
              )}
            </Card>
          )}

          <RecentAchievements />
        </ScrollView>
      )}
    </View>
  );
}
