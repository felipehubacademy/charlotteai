// lib/rally.ts — Rallies: disputas de 24 horas ou 7 dias entre amigos.
// Placar calculado ao vivo, sempre na janela [starts_at, min(agora, ends_at)]:
//   xp        soma do XP ganho (charlotte_practices)
//   practices número de práticas de estudo
//   accuracy  nota média da trilha (Gramática + Listening & Speaking), mínimo 3 atividades
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isStudy } from '@/lib/learning-stats';

export type RallyMetric = 'xp' | 'practices' | 'accuracy';
export const RALLY_METRICS: RallyMetric[] = ['xp', 'practices', 'accuracy'];
export const RALLY_DURATIONS = [24, 168] as const;
export const RALLY_REWARD_SECONDS = 5 * 60;
export const RALLY_MAX_PARTICIPANTS = 10;
export const RALLY_MAX_ACTIVE_CREATED = 3;
export const RALLY_MIN_ANSWERS = 3;

export interface RallyRow {
  id: string; code: string; creator_id: string; metric: RallyMetric; duration_hours: number;
  starts_at: string; ends_at: string; leader_id: string | null; reminder_sent: boolean;
  finalized: boolean; winner_id: string | null; created_at: string;
}

export interface Standing { userId: string; name: string | null; avatarUrl: string | null; score: number | null; rank: number }

export const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || null;

/** Texto curto da disputa, no idioma de quem lê. */
export function rallyLabel(metric: RallyMetric, hours: number, pt: boolean): string {
  const span = hours === 24 ? (pt ? 'em 24 horas' : 'in 24 hours') : (pt ? 'em 7 dias' : 'in 7 days');
  if (metric === 'xp') return pt ? `Quem faz mais XP ${span}` : `Most XP ${span}`;
  if (metric === 'practices') return pt ? `Quem pratica mais ${span}` : `Most practices ${span}`;
  return pt ? `Quem acerta mais na trilha ${span}` : `Best trail accuracy ${span}`;
}

export function formatScore(metric: RallyMetric, score: number | null, pt: boolean): string {
  if (score == null) return '—';
  if (metric === 'xp') return `${score} XP`;
  if (metric === 'practices') return pt ? `${score} ${score === 1 ? 'prática' : 'práticas'}` : `${score} ${score === 1 ? 'practice' : 'practices'}`;
  return `${score}%`;
}

/** Placar de vários rallies de uma vez (uma consulta por fonte de dados). */
export async function computeStandings(rallies: RallyRow[]): Promise<Map<string, Standing[]>> {
  const out = new Map<string, Standing[]>();
  if (!rallies.length) return out;
  const supabase = getSupabaseAdmin();
  const { data: parts } = await supabase.from('rally_participants').select('rally_id, user_id').in('rally_id', rallies.map(r => r.id));
  const byRally = new Map<string, string[]>();
  for (const p of (parts ?? []) as { rally_id: string; user_id: string }[]) {
    byRally.set(p.rally_id, [...(byRally.get(p.rally_id) ?? []), p.user_id]);
  }
  const users = [...new Set([...byRally.values()].flat())];
  if (!users.length) return out;
  const from = new Date(Math.min(...rallies.map(r => new Date(r.starts_at).getTime()))).toISOString();
  const needAcc = rallies.some(r => r.metric === 'accuracy');

  const [profiles, practices, hist2] = await Promise.all([
    supabase.from('charlotte_users').select('id, name, avatar_url').in('id', users),
    supabase.from('charlotte_practices').select('user_id, xp_earned, practice_type, created_at').in('user_id', users).gte('created_at', from).limit(50000),
    needAcc ? supabase.from('learn_history_v2').select('user_id, activity_type, score, updated_at').in('user_id', users).gte('updated_at', from).limit(20000) : Promise.resolve({ data: [] }),
  ]);
  const prof = new Map(((profiles.data ?? []) as { id: string; name: string | null; avatar_url: string | null }[]).map(p => [p.id, p]));
  const pr = (practices.data ?? []) as { user_id: string; xp_earned: number | null; practice_type: string; created_at: string }[];
  const h2 = ((hist2.data ?? []) as { user_id: string; activity_type: string; score: number | string | null; updated_at: string }[])
    .filter(r => (r.activity_type === 'grammar' || r.activity_type === 'speaking') && r.score != null);

  const now = Date.now();
  for (const r of rallies) {
    const a = new Date(r.starts_at).getTime();
    const b = Math.min(now, new Date(r.ends_at).getTime());
    const inW = (iso: string) => { const t = new Date(iso).getTime(); return t >= a && t <= b; };
    const rows: Standing[] = (byRally.get(r.id) ?? []).map(uid => {
      let score: number | null;
      if (r.metric === 'xp') {
        score = pr.filter(p => p.user_id === uid && inW(p.created_at)).reduce((s, p) => s + (p.xp_earned ?? 0), 0);
      } else if (r.metric === 'practices') {
        score = pr.filter(p => p.user_id === uid && inW(p.created_at) && isStudy(p.practice_type)).length;
      } else {
        const v2 = h2.filter(x => x.user_id === uid && inW(x.updated_at));
        score = v2.length < RALLY_MIN_ANSWERS ? null
          : Math.round(v2.reduce((s, x) => s + Number(x.score), 0) / v2.length);
      }
      const p = prof.get(uid);
      return { userId: uid, name: firstName(p?.name), avatarUrl: p?.avatar_url ?? null, score, rank: 0 };
    });
    rows.sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
    rows.forEach((s, i) => { s.rank = i > 0 && rows[i - 1].score === s.score ? rows[i - 1].rank : i + 1; });
    out.set(r.id, rows);
  }
  return out;
}

/** Líder único (com pontuação > 0); empate no topo não tem líder. */
export function leaderOf(rows: Standing[]): Standing | null {
  const top = rows[0];
  if (!top || top.score == null || top.score <= 0) return null;
  if (rows[1] && rows[1].score === top.score) return null;
  return top;
}

/** Push direto (convite, entrada, resultado). Melhor esforço. */
export async function sendDirectPush(token: string | null | undefined, title: string, body: string, data: Record<string, unknown>) {
  if (!token) return;
  let ok = false; let error: string | null = null; let ticketId: string | null = null;
  try {
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([{ to: token, title, body, sound: 'default', priority: 'high', channelId: 'charlotte', data }]),
    });
    const j = await r.json().catch(() => null) as { data?: { status: string; id?: string; message?: string; details?: { error?: string } }[]; errors?: { message: string }[] } | null;
    const t = j?.data?.[0];
    ok = r.ok && t?.status === 'ok';
    ticketId = t?.id ?? null;
    error = ok ? null : (t?.details?.error ?? t?.message ?? j?.errors?.[0]?.message ?? `HTTP ${r.status}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'falha de rede';
  }
  // Comprovante (push é melhor esforço: falha aqui não interrompe nada).
  try {
    await getSupabaseAdmin().from('push_log').insert({ token, type: String(data.type ?? ''), title, ok, error, ticket_id: ticketId } as never);
  } catch { /* ignora */ }
}
