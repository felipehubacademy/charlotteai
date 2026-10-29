// lib/myRank.ts — posição do aluno no ranking do nível, igual em todas as telas (tela inicial, Practice,
// Live Voice, Seu progresso). Lê charlotte_leaderboard_cache, que todos podem ler e que já deixa de fora as
// contas fora do ranking (equipe, revisão das lojas). Conta fora do ranking não tem posição: rank null.
import { supabase } from '@/lib/supabase';

export interface MyRank { rank: number | null; outOfRanking: boolean }

export async function fetchMyRank(userId: string, level: string, totalXp: number): Promise<MyRank> {
  const [{ data: me }, { count }] = await Promise.all([
    supabase.from('charlotte_users').select('hide_from_ranking').eq('id', userId).maybeSingle(),
    supabase.from('charlotte_leaderboard_cache').select('user_id', { count: 'exact', head: true })
      .eq('user_level', level).gt('total_xp', totalXp),
  ]);
  const outOfRanking = !!(me as { hide_from_ranking?: boolean } | null)?.hide_from_ranking;
  if (outOfRanking || totalXp <= 0) return { rank: null, outOfRanking };
  return { rank: (count ?? 0) + 1, outOfRanking };
}

export interface TopEntry { userId: string; name: string; totalXp: number }

/** Os primeiros do ranking geral do nível (nome já vem abreviado do cache, ex.: "Jennifer F."). */
export async function fetchTop(level: string, limit = 3): Promise<TopEntry[]> {
  const { data } = await supabase.from('charlotte_leaderboard_cache').select('user_id, display_name, total_xp')
    .eq('user_level', level).order('total_xp', { ascending: false }).limit(limit);
  return ((data ?? []) as { user_id: string; display_name: string | null; total_xp: number }[])
    .map(r => ({ userId: String(r.user_id), name: r.display_name ?? '', totalXp: r.total_xp ?? 0 }));
}
