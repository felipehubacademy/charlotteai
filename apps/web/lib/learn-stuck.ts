// lib/learn-stuck.ts — "Onde os alunos travam": lê learn_attempts (cada tentativa da trilha, gravada
// pelo app) e aponta o que costuma virar desistência silenciosa:
//   - frases de fala que muitos alunos reprovam (com o que o app entendeu, para ver se o aluno falou
//     certo e a correção errou, como no caso dos números por extenso);
//   - respostas de gramática que muitos erram (gabarito que talvez precise aceitar outra forma);
//   - onde os alunos saem no meio da atividade;
//   - falhas de microfone e do reconhecimento de voz, por aparelho e versão.
// Usado pelo /admin (Pedagógico) e pelo alerta diário (/api/cron/learn-alerts).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface AttemptRow {
  user_id: string; level: string; module_id: string | null; unit_id: string | null; activity_type: string;
  step_idx: number | null; event: string; expected: string | null; answer: string | null; score: number | null;
  passed: boolean | null; source: string | null; error_code: string | null; platform: string | null;
  app_version: string | null; created_at: string;
}

export interface StuckItem {
  level: string; module: string | null; unit: string | null; expected: string;
  attempts: number; fails: number; students: number; stuckStudents: number; skips: number;
  failRate: number; avgScore: number | null; samples: string[];
}

export interface StuckReport {
  since: string;
  totals: { attempts: number; students: number; fails: number; skips: number; exits: number; asrErrors: number; micBlocked: number };
  speaking: StuckItem[];
  grammar: StuckItem[];
  exits: { level: string; module: string | null; unit: string | null; activity: string; step: number | null; count: number; students: number }[];
  failures: { kind: string; code: string; platform: string; version: string; count: number; students: number }[];
  /** Itens que pedem atenção (para o alerta): reprovação alta em vários alunos, saídas repetidas, falhas técnicas. */
  alerts: string[];
}

async function fetchAttempts(since: string): Promise<AttemptRow[]> {
  const supabase = getSupabaseAdmin();
  const out: AttemptRow[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from('learn_attempts')
      .select('user_id, level, module_id, unit_id, activity_type, step_idx, event, expected, answer, score, passed, source, error_code, platform, app_version, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as AttemptRow[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

function stuckBy(rows: AttemptRow[], activity: 'speaking' | 'grammar'): StuckItem[] {
  const map = new Map<string, { item: StuckItem; perUser: Map<string, number>; users: Set<string>; scoreSum: number; scoreN: number }>();
  for (const r of rows) {
    if (r.activity_type !== activity || !r.expected || (r.event !== 'attempt' && r.event !== 'skip')) continue;
    const key = `${r.level}|${r.module_id}|${r.unit_id}|${r.expected}`;
    let g = map.get(key);
    if (!g) {
      g = { item: { level: r.level, module: r.module_id, unit: r.unit_id, expected: r.expected, attempts: 0, fails: 0, students: 0, stuckStudents: 0, skips: 0, failRate: 0, avgScore: null, samples: [] },
        perUser: new Map(), users: new Set(), scoreSum: 0, scoreN: 0 };
      map.set(key, g);
    }
    g.users.add(r.user_id);
    if (r.event === 'skip') { g.item.skips++; continue; }
    g.item.attempts++;
    if (typeof r.score === 'number') { g.scoreSum += Number(r.score); g.scoreN++; }
    if (r.passed === false) {
      g.item.fails++;
      g.perUser.set(r.user_id, (g.perUser.get(r.user_id) ?? 0) + 1);
      const a = (r.answer ?? '').trim();
      if (a && g.item.samples.length < 4 && !g.item.samples.includes(a)) g.item.samples.push(a);
    }
  }
  return [...map.values()].map(g => ({
    ...g.item,
    students: g.users.size,
    stuckStudents: [...g.perUser.values()].filter(n => n >= 2).length,
    failRate: g.item.attempts ? Math.round((g.item.fails / g.item.attempts) * 100) : 0,
    avgScore: g.scoreN ? Math.round(g.scoreSum / g.scoreN) : null,
  }))
    .filter(i => i.fails > 0 || i.skips > 0)
    .sort((a, b) => (b.stuckStudents - a.stuckStudents) || (b.fails + b.skips - a.fails - a.skips))
    .slice(0, 40);
}

export async function stuckReport(days: number): Promise<StuckReport> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await fetchAttempts(since);

  const exitsMap = new Map<string, { level: string; module: string | null; unit: string | null; activity: string; step: number | null; count: number; users: Set<string> }>();
  const failMap = new Map<string, { kind: string; code: string; platform: string; version: string; count: number; users: Set<string> }>();
  for (const r of rows) {
    if (r.event === 'exit') {
      const k = `${r.level}|${r.module_id}|${r.unit_id}|${r.activity_type}|${r.step_idx}`;
      const g = exitsMap.get(k) ?? { level: r.level, module: r.module_id, unit: r.unit_id, activity: r.activity_type, step: r.step_idx, count: 0, users: new Set<string>() };
      g.count++; g.users.add(r.user_id); exitsMap.set(k, g);
    } else if (r.event === 'asr_error' || r.event === 'mic_blocked') {
      const k = `${r.event}|${r.error_code}|${r.platform}|${r.app_version}`;
      const g = failMap.get(k) ?? { kind: r.event, code: r.error_code ?? '—', platform: r.platform ?? '—', version: r.app_version ?? '—', count: 0, users: new Set<string>() };
      g.count++; g.users.add(r.user_id); failMap.set(k, g);
    }
  }

  const speaking = stuckBy(rows, 'speaking');
  const grammar = stuckBy(rows, 'grammar');
  const exits = [...exitsMap.values()].map(({ users, ...e }) => ({ ...e, students: users.size })).sort((a, b) => b.students - a.students || b.count - a.count).slice(0, 30);
  const failures = [...failMap.values()].map(({ users, ...f }) => ({ ...f, students: users.size })).sort((a, b) => b.students - a.students || b.count - a.count);

  const where = (i: { level: string; module: string | null; unit: string | null }) => `${i.level} ${i.module ?? ''}${i.unit ? `/${i.unit}` : ''}`.trim();
  const alerts: string[] = [];
  for (const s of speaking) {
    if (s.stuckStudents >= 2 || (s.students >= 3 && s.failRate >= 50)) {
      alerts.push(`Fala (${where(s)}): "${s.expected}" — ${s.stuckStudents} aluno(s) errou 2+ vezes, ${s.failRate}% de reprovação. O app entendeu: ${s.samples.map(x => `"${x}"`).join(', ') || '—'}`);
    }
  }
  for (const g of grammar) {
    if (g.stuckStudents >= 2 || (g.students >= 3 && g.failRate >= 60)) {
      alerts.push(`Gramática (${where(g)}): gabarito "${g.expected}" — ${g.failRate}% de erro em ${g.students} aluno(s). Respostas: ${g.samples.map(x => `"${x}"`).join(', ') || '—'}`);
    }
  }
  for (const e of exits) {
    if (e.students >= 2) alerts.push(`Saída no meio (${where(e)}, ${e.activity === 'speaking' ? 'fala' : 'gramática'}, passo ${(e.step ?? 0) + 1}): ${e.students} aluno(s).`);
  }
  for (const f of failures) {
    if (f.students >= 2) alerts.push(`${f.kind === 'mic_blocked' ? 'Microfone bloqueado' : `Reconhecimento de voz falhou (${f.code})`} em ${f.platform} ${f.version}: ${f.students} aluno(s).`);
  }

  return {
    since,
    totals: {
      attempts: rows.filter(r => r.event === 'attempt').length,
      students: new Set(rows.map(r => r.user_id)).size,
      fails: rows.filter(r => r.event === 'attempt' && r.passed === false).length,
      skips: rows.filter(r => r.event === 'skip').length,
      exits: rows.filter(r => r.event === 'exit').length,
      asrErrors: rows.filter(r => r.event === 'asr_error').length,
      micBlocked: rows.filter(r => r.event === 'mic_blocked').length,
    },
    speaking, grammar, exits, failures, alerts,
  };
}
