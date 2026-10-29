// Ranking — o nível do aluno como um evento: cabeçalho com marca-texto e contagem regressiva (Semana),
// palco do top 3 (components/stats/Podium), a posição do aluno com a onda da marca até quem está acima,
// e a lista do 4º em diante. Duas abas: Semana (XP desde segunda 0h, horário de Brasília; zera toda
// segunda e dá chance para quem entrou agora) e Geral (XP total).

import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timer, UsersThree } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { MarkerText } from '@/components/ui/MarkerText';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { C, ScreenHeader, firstName } from '@/components/stats/StatsUI';
import { RankAvatar } from '@/components/stats/RankAvatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { RecentAchievements } from '@/components/social/RecentAchievements';
import { Podium } from '@/components/stats/Podium';
import { FriendSearchEntry } from '@/components/social/FriendSearch';

const isPt = systemIsPt;

interface Entry { userId: string; totalXp: number; name: string; rank: number; avatarUrl?: string | null }
type Row = { user_id: string; name: string | null; avatar_url: string | null; pos: number };

/** Tempo até segunda 0h no horário de Brasília (quando o ranking da semana zera). */
function untilReset(now = Date.now()): string {
  const brt = new Date(now - 3 * 3600000);
  const daysToMon = (8 - brt.getUTCDay()) % 7 || 7;
  const next = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() + daysToMon) + 3 * 3600000;
  const mins = Math.max(0, Math.floor((next - now) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return isPt ? `${d}d ${h}h` : `${d}d ${h}h`;
  return isPt ? `${h}h ${m}min` : `${h}h ${m}m`;
}

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
  const [reset, setReset]     = useState(untilReset());
  // Conta fora do ranking (equipe, revisão das lojas): vê o ranking, mas não entra na classificação.
  const [hidden, setHidden]   = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('charlotte_users').select('hide_from_ranking').eq('id', userId).maybeSingle()
      .then(({ data }) => setHidden(!!(data as { hide_from_ranking?: boolean } | null)?.hide_from_ranking));
  }, [userId]);
  useEffect(() => { const t = setInterval(() => setReset(untilReset()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (userId) { setLoading(true); (scope === 'week' ? loadWeek : loadAll)(); } }, [userId, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (all: Entry[], myXp: number, myRankIfMissing: number) => {
    const mine = all.find(e => e.userId === userId) ?? { userId, totalXp: myXp, name: userName, rank: myRankIfMissing, avatarUrl: null };
    const prev = [...all].reverse().find(e => e.totalXp > mine.totalXp) ?? null;
    setEntries(all.slice(0, 20));
    setMe(mine);
    setAbove(prev);
  };

  // Semana: o banco devolve a lista ordenada, com foto (contas fora do ranking não entram).
  const loadWeek = async () => {
    try {
      const { data } = await supabase.rpc('weekly_ranking', { p_level: userLevel });
      const all: Entry[] = ((data ?? []) as (Row & { week_xp: number })[])
        .map(r => ({ userId: String(r.user_id), totalXp: Number(r.week_xp), name: r.name ?? '', rank: Number(r.pos), avatarUrl: r.avatar_url }));
      apply(all, 0, all.length + 1);
    } catch { setEntries([]); setMe(null); setAbove(null); }
    finally { setLoading(false); }
  };

  // Geral: o mesmo ranking do #N do topo das telas (cache), com foto.
  const loadAll = async () => {
    try {
      const [{ data }, { data: myRow }] = await Promise.all([
        supabase.rpc('alltime_ranking', { p_level: userLevel, p_limit: 20 }),
        supabase.from('charlotte_progress').select('total_xp').eq('user_id', userId).maybeSingle(),
      ]);
      const all: Entry[] = ((data ?? []) as (Row & { total_xp: number })[])
        .map(r => ({ userId: String(r.user_id), totalXp: Number(r.total_xp), name: r.name ?? '', rank: Number(r.pos), avatarUrl: r.avatar_url }));
      const xp = (myRow as { total_xp?: number } | null)?.total_xp ?? 0;
      let rank = all.length + 1;
      if (!all.some(e => e.userId === userId)) {
        const { count } = await supabase.from('charlotte_leaderboard_cache').select('user_id', { count: 'exact', head: true })
          .eq('user_level', userLevel).gt('total_xp', xp);
        rank = (count ?? 0) + 1;
      }
      apply(all, xp, rank);
    } catch { setEntries([]); setMe(null); setAbove(null); }
    finally { setLoading(false); }
  };

  const you = isPt ? 'você' : 'you';
  const inTop = entries.some(e => e.userId === userId);
  const gap = me && above ? Math.max(1, above.totalXp - me.totalXp + 1) : 0;
  const ranked = me && !hidden;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={`Ranking ${userLevel}`} />

      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Cabeçalho de evento */}
        <View style={{ marginHorizontal: 20, marginBottom: 14 }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <MarkerText display style={{ fontSize: 32, lineHeight: 38, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>
              {scope === 'week' ? (isPt ? 'Ranking da semana' : "This week's ranking") : (isPt ? 'Ranking geral' : 'All-time ranking')}
            </MarkerText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              {scope === 'week' ? <Timer size={15} color={C.volt} weight="bold" /> : <UsersThree size={15} color={C.volt} weight="bold" />}
              <AppText style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {scope === 'week' ? (isPt ? `Fecha em ${reset}` : `Ends in ${reset}`) : (isPt ? 'XP desde o começo' : 'XP since day one')}
              </AppText>
            </View>
            {scope === 'week' && (
              <AppText style={{ fontSize: 13, color: C.mid, flexShrink: 1 }}>
                {isPt ? 'Zera toda segunda.' : 'Resets every Monday.'}
              </AppText>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(22,19,31,0.06)', borderRadius: 999, padding: 4 }}>
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
          <View style={{ paddingVertical: 80, alignItems: 'center' }}><ActivityIndicator size="large" color={C.ink} /></View>
        ) : entries.length === 0 ? (
          <AppText style={{ fontSize: 14, color: C.light, textAlign: 'center', marginTop: 40, marginHorizontal: 32 }}>
            {scope === 'week'
              ? (isPt ? 'Ninguém pontuou nesta semana ainda. Faça uma atividade e saia na frente.' : 'Nobody has scored this week yet. Do an activity and take the lead.')
              : (isPt ? 'O ranking ainda está vazio.' : 'The ranking is still empty.')}
          </AppText>
        ) : (
          <>
            <Podium
              entries={entries.slice(0, 3).map(e => ({ userId: e.userId, name: e.userId === userId ? userName || e.name : e.name, xp: e.totalXp, rank: e.rank, avatarUrl: e.avatarUrl }))}
              userId={userId} youLabel={you} />

            {/* Sua posição: a onda da marca mostra quanto falta para passar quem está acima. */}
            {ranked && me && (
              <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <AppText display style={{ fontSize: 40, lineHeight: 44, fontWeight: '800', color: C.ink }}>{isPt ? `${me.rank}º` : `#${me.rank}`}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 12, fontWeight: '800', color: C.light, letterSpacing: 1, textTransform: 'uppercase' }}>{isPt ? 'Sua posição' : 'Your position'}</AppText>
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 2 }}>
                      {me.totalXp.toLocaleString()} XP{scope === 'week' ? (isPt ? ' nesta semana' : ' this week') : ''}
                    </AppText>
                  </View>
                </View>
                {me.rank > 1 && above ? (
                  <>
                    <View style={{ marginTop: 14 }}><QueizyWave progress={above.totalXp > 0 ? me.totalXp / above.totalXp : 0} /></View>
                    <AppText style={{ fontSize: 14, color: C.mid, marginTop: 8, lineHeight: 20 }}>
                      {isPt
                        ? `Faltam ${gap.toLocaleString()} XP para passar ${firstName(above.name, `o ${above.rank}º`)} e ficar em ${above.rank}º.`
                        : `${gap.toLocaleString()} XP to pass ${firstName(above.name, `#${above.rank}`)} and take #${above.rank}.`}
                    </AppText>
                  </>
                ) : me.rank === 1 ? (
                  <AppText style={{ fontSize: 14, color: C.mid, marginTop: 8 }}>{isPt ? 'Você está no topo. Agora é defender o trono.' : "You're on top. Now defend your crown."}</AppText>
                ) : null}
              </View>
            )}
            {me && hidden && (
              <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.ghost, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
                <AppText style={{ fontSize: 13, color: C.mid, lineHeight: 18 }}>
                  {isPt ? 'Sua conta é da equipe e fica fora da classificação.' : 'Your account is a team account and is not ranked.'}
                </AppText>
              </View>
            )}

            {(entries.length > 3 || (!inTop && ranked)) && (
              <View style={{ marginHorizontal: 16, backgroundColor: C.card, borderRadius: 24, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
                {entries.slice(3).map((e, i) => (
                  <ListRow key={e.userId} e={e} isUser={e.userId === userId} name={e.userId === userId ? userName || e.name : e.name} you={you} first={i === 0} />
                ))}
                {!inTop && ranked && me && (
                  <>
                    <AppText style={{ textAlign: 'center', color: C.light, fontSize: 16, letterSpacing: 2, paddingVertical: 2 }}>···</AppText>
                    <ListRow e={me} isUser name={userName} you={you} first />
                  </>
                )}
              </View>
            )}
          </>
        )}

        <RecentAchievements />
        <View style={{ marginTop: 16 }}><FriendSearchEntry /></View>
      </ScrollView>
    </View>
  );
}

function ListRow({ e, isUser, name, you, first }: { e: Entry; isUser: boolean; name: string; you: string; first?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14,
      marginHorizontal: isUser ? 6 : 0, borderRadius: isUser ? 16 : 0,
      backgroundColor: isUser ? C.voltBg : 'transparent',
      borderTopWidth: first || isUser ? 0 : 1, borderTopColor: C.border,
    }}>
      <AppText style={{ width: 26, fontSize: 15, fontWeight: '800', color: C.light, textAlign: 'center' }}>{e.rank}</AppText>
      <RankAvatar id={e.userId} name={name} url={e.avatarUrl} size={38} />
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{firstName(name, `#${e.rank}`)}</AppText>
        {isUser && <AppText style={{ fontSize: 12, fontWeight: '700', color: C.green }}>{you}</AppText>}
      </View>
      <AppText style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>{e.totalXp.toLocaleString()} XP</AppText>
    </View>
  );
}
