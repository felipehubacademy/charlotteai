// Ranking — top 20 do nível do aluno, com a posição dele em destaque e
// quanto falta para passar quem está logo acima.

import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { C, ScreenHeader, Card, RankRow, firstName } from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';

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

  useEffect(() => { if (userId) load(); }, [userId]);

  const load = async () => {
    try {
      const { data: levelUsers } = await supabase.from('charlotte_users').select('id').eq('charlotte_level', userLevel);
      const ids = (levelUsers ?? []).map((u: any) => u.id as string);
      if (ids.length === 0) return;

      const { data: rows } = await supabase.from('charlotte_progress')
        .select('user_id, total_xp').in('user_id', ids)
        .order('total_xp', { ascending: false }).limit(20);
      const raw = rows ?? [];
      const { data: names } = raw.length > 0
        ? await supabase.from('charlotte_users').select('id, name').in('id', raw.map((r: any) => r.user_id))
        : { data: [] as any[] };
      const nameMap: Record<string, string> = {};
      (names ?? []).forEach((u: any) => { nameMap[u.id] = u.name ?? ''; });

      const list: Entry[] = raw.map((r: any, i: number) => ({
        userId: r.user_id, totalXp: r.total_xp ?? 0, name: nameMap[r.user_id] ?? '', rank: i + 1,
      }));

      let mine = list.find(e => e.userId === userId) ?? null;
      let prev: Entry | null = mine && mine.rank > 1 ? list[mine.rank - 2] : null;

      if (!mine) {
        const { data: my } = await supabase.from('charlotte_progress').select('total_xp').eq('user_id', userId).maybeSingle();
        const xp = my?.total_xp ?? 0;
        const { count } = await supabase.from('charlotte_progress')
          .select('user_id', { count: 'exact', head: true }).in('user_id', ids).gt('total_xp', xp);
        mine = { userId, totalXp: xp, name: userName, rank: (count ?? 0) + 1 };
        // Quem está logo acima: o menor XP maior que o do aluno.
        const { data: next } = await supabase.from('charlotte_progress')
          .select('user_id,total_xp').in('user_id', ids).gt('total_xp', xp)
          .order('total_xp', { ascending: true }).limit(1);
        if (next?.[0]) {
          const { data: n } = await supabase.from('charlotte_users').select('name').eq('id', next[0].user_id).maybeSingle();
          prev = { userId: next[0].user_id, totalXp: next[0].total_xp ?? 0, name: n?.name ?? '', rank: mine.rank - 1 };
        }
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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          {me && (
            <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {isPt ? 'Sua posição' : 'Your position'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
                <AppText display style={{ fontSize: 46, fontWeight: '800', color: C.volt, lineHeight: 50 }}>
                  {isPt ? `${me.rank}º` : `#${me.rank}`}
                </AppText>
                <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                  {me.totalXp.toLocaleString()} XP
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
              {isPt ? 'O ranking ainda está vazio.' : 'The ranking is still empty.'}
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
              {!inTop && me && (
                <>
                  <AppText style={{ textAlign: 'center', color: C.light, fontSize: 16, letterSpacing: 2, paddingVertical: 4 }}>···</AppText>
                  <RankRow rank={me.rank} name={firstName(userName, isPt ? 'Você' : 'You')} xp={me.totalXp} isUser youLabel={you} last />
                </>
              )}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}
