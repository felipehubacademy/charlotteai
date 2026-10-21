// lib/exercise-reports.ts — reportes que os alunos mandam pela bandeira dos exercícios do app
// (public.exercise_reports). Usado no /admin (Pedagógico) e no alerta diário "Onde os alunos travaram".
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import type { ExerciseReport } from '@/lib/exercise-reports-shared';
export * from '@/lib/exercise-reports-shared';

export async function listReports(opts: { days?: number; status?: string } = {}): Promise<ExerciseReport[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from('exercise_reports').select('*').order('created_at', { ascending: false }).limit(300);
  if (opts.days) q = q.gte('created_at', new Date(Date.now() - opts.days * 86400000).toISOString());
  if (opts.status) q = q.eq('status', opts.status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as ExerciseReport[];
  const ids = [...new Set(rows.map(r => r.user_id))];
  if (ids.length) {
    const { data: us } = await sb.from('charlotte_users').select('id, name, email').in('id', ids);
    const by = new Map(((us ?? []) as { id: string; name: string | null; email: string | null }[]).map(u => [u.id, u]));
    for (const r of rows) { const u = by.get(r.user_id); r.name = u?.name ?? null; r.email = u?.email ?? null; }
  }
  return rows;
}
