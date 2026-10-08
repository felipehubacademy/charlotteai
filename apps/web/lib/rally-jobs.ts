// lib/rally-jobs.ts — roda de hora em hora (scheduler de notificações):
//  1. troca de liderança  -> push para quem perdeu a ponta
//  2. perto do fim        -> 2h antes (rally de 24h) ou 24h antes (rally de 7 dias), com a posição
//  3. encerramento        -> vencedor ganha minutos de Live Voice; todos recebem o resultado
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pushIsPt } from '@/lib/expo-notification-service';
import {
  computeStandings, leaderOf, rallyLabel, formatScore, sendDirectPush,
  RALLY_REWARD_SECONDS, type RallyRow, type Standing,
} from '@/lib/rally';

type PushUser = { id: string; expo_push_token: string | null; charlotte_level: string | null; app_language: string | null; live_voice_bonus_seconds: number | null };

export async function runRallyJobs(): Promise<{ updates: number; reminders: number; finalized: number }> {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const { data } = await supabase.from('rallies').select('*').eq('finalized', false).limit(2000);
  const rallies = (data ?? []) as unknown as RallyRow[];
  if (!rallies.length) return { updates: 0, reminders: 0, finalized: 0 };

  const standings = await computeStandings(rallies);
  const ids = [...new Set([...standings.values()].flat().map(s => s.userId))];
  const { data: us } = await supabase.from('charlotte_users')
    .select('id, expo_push_token, charlotte_level, app_language, live_voice_bonus_seconds').in('id', ids.length ? ids : ['-']);
  const people = new Map(((us ?? []) as PushUser[]).map(u => [u.id, u]));
  const ord = (n: number, pt: boolean) => (pt ? `${n}º` : n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
  let updates = 0, reminders = 0, finalized = 0;

  for (const r of rallies) {
    const rows: Standing[] = standings.get(r.id) ?? [];
    const ended = new Date(r.ends_at).getTime() <= now;
    const leader = leaderOf(rows);
    const data = { screen: 'study-together', code: r.code };

    if (ended) {
      const winner = rows.length > 1 ? leader : null;
      if (winner) {
        const w = people.get(winner.userId);
        await supabase.from('charlotte_users')
          .update({ live_voice_bonus_seconds: (w?.live_voice_bonus_seconds ?? 0) + RALLY_REWARD_SECONDS } as never).eq('id', winner.userId);
      }
      await supabase.from('rallies').update({ finalized: true, winner_id: winner?.userId ?? null } as never).eq('id', r.id);
      // Conquistas de rally (Primeira Vitória, Fera dos Rallies).
      if (winner) await supabase.rpc('rn_award_achievements', { p_user_id: winner.userId }).then(undefined, () => {});
      if (rows.length > 1) {
        await Promise.all(rows.map(s => {
          const u = people.get(s.userId); if (!u) return null;
          const pt = pushIsPt(u);
          const title = rallyLabel(r.metric, r.duration_hours, pt);
          if (!winner) {
            return sendDirectPush(u.expo_push_token, pt ? 'Empate no rally' : 'The rally ended in a tie',
              pt ? `${title}: ninguém ficou na frente. Revanche?` : `${title}: nobody pulled ahead. Rematch?`, { ...data, type: 'rally_result' });
          }
          if (s.userId === winner.userId) {
            return sendDirectPush(u.expo_push_token, pt ? 'Você venceu o rally!' : 'You won the rally!',
              pt ? `${title}: ${formatScore(r.metric, s.score, true)}. Você ganhou ${RALLY_REWARD_SECONDS / 60} minutos de Live Voice.`
                 : `${title}: ${formatScore(r.metric, s.score, false)}. You got ${RALLY_REWARD_SECONDS / 60} Live Voice minutes.`, { ...data, type: 'rally_result' });
          }
          return sendDirectPush(u.expo_push_token, pt ? `${winner.name ?? 'Sua dupla'} venceu o rally` : `${winner.name ?? 'Your buddy'} won the rally`,
            pt ? `${title}, com ${formatScore(r.metric, winner.score, true)}. Você ficou em ${ord(s.rank, true)}. Revanche?`
               : `${title}, with ${formatScore(r.metric, winner.score, false)}. You came ${ord(s.rank, false)}. Rematch?`, { ...data, type: 'rally_result' });
        }));
      }
      finalized++;
      continue;
    }

    if (rows.length < 2) continue;

    // 1. Troca de liderança: avisa quem estava na frente.
    if (leader && r.leader_id && leader.userId !== r.leader_id) {
      const prev = rows.find(s => s.userId === r.leader_id);
      const u = people.get(r.leader_id);
      if (prev && u) {
        const pt = pushIsPt(u);
        await sendDirectPush(u.expo_push_token,
          pt ? `${leader.name ?? 'Alguém'} passou você no rally` : `${leader.name ?? 'Someone'} passed you in the rally`,
          pt ? `${rallyLabel(r.metric, r.duration_hours, true)}: ${formatScore(r.metric, leader.score, true)} contra ${formatScore(r.metric, prev.score, true)}. Bora recuperar?`
             : `${rallyLabel(r.metric, r.duration_hours, false)}: ${formatScore(r.metric, leader.score, false)} vs ${formatScore(r.metric, prev.score, false)}. Take it back?`,
          { ...data, type: 'rally_update' });
        updates++;
      }
    }
    if ((leader?.userId ?? null) !== r.leader_id && leader) {
      await supabase.from('rallies').update({ leader_id: leader.userId } as never).eq('id', r.id);
    }

    // 2. Perto do fim.
    const left = new Date(r.ends_at).getTime() - now;
    const window = r.duration_hours === 24 ? 2 * 3600000 : 24 * 3600000;
    if (!r.reminder_sent && left <= window) {
      await Promise.all(rows.map(s => {
        const u = people.get(s.userId); if (!u) return null;
        const pt = pushIsPt(u);
        const span = r.duration_hours === 24 ? (pt ? 'Faltam 2 horas' : '2 hours left') : (pt ? 'Falta 1 dia' : '1 day left');
        const ahead = rows.find(x => x.rank === s.rank - 1) ?? rows[0];
        const body = s.rank === 1
          ? (pt ? `Você está na frente com ${formatScore(r.metric, s.score, true)}. Segura a liderança!` : `You're ahead with ${formatScore(r.metric, s.score, false)}. Hold the lead!`)
          : (pt ? `Você está em ${ord(s.rank, true)}, atrás de ${ahead.name ?? 'sua dupla'} (${formatScore(r.metric, ahead.score, true)}). Ainda dá!`
                : `You're ${ord(s.rank, false)}, behind ${ahead.name ?? 'your buddy'} (${formatScore(r.metric, ahead.score, false)}). Still time!`);
        return sendDirectPush(u.expo_push_token, `${span} · ${rallyLabel(r.metric, r.duration_hours, pt)}`, body, { ...data, type: 'rally_reminder' });
      }));
      await supabase.from('rallies').update({ reminder_sent: true } as never).eq('id', r.id);
      reminders++;
    }
  }
  return { updates, reminders, finalized };
}
