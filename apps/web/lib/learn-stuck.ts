// lib/learn-stuck.ts — "Onde os alunos travam": lê learn_attempts (cada tentativa da trilha, gravada
// pelo app) e aponta o que costuma virar desistência silenciosa:
//   - frases de fala que muitos alunos reprovam (com o que o app entendeu, para ver se o aluno falou
//     certo e a correção errou, como no caso dos números por extenso);
//   - respostas de gramática que muitos erram (gabarito que talvez precise aceitar outra forma);
//   - onde os alunos saem no meio da atividade;
//   - falhas de microfone e do reconhecimento de voz, por aparelho e versão.
// Usado pelo /admin (Pedagógico) e pelo alerta diário (/api/cron/learn-alerts).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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
  /** Os mesmos alertas separados pelo que fazer com eles (o e-mail mostra nessa ordem). */
  alertGroups: { app: string[]; content: string[]; exits: string[]; tech: string[] };
}

// Compara resposta e gabarito sem caixa, pontuação e espaços extras.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

function editRatio(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[b.length] / Math.max(a.length, b.length);
}

/**
 * O erro parece do app (corretor ou reconhecimento de voz) e não do aluno? Na fala: o app entendeu algo
 * igual ou quase igual à frase. Na gramática: a resposta reprovada é o gabarito, ou só um pedaço dele
 * (ex.: "fries" para "The fries"). Erros por confusão real (worse x worst) ficam como conteúdo difícil.
 */
function looksLikeAppIssue(item: StuckItem, activity: 'speaking' | 'grammar'): boolean {
  const c = norm(item.expected);
  return item.samples.some(raw => {
    const u = norm(raw);
    if (!u) return false;
    if (u === c) return true;
    if (activity === 'speaking') return c.length >= 6 && editRatio(u, c) >= 0.85;
    return u.length >= 3 && c.length >= 3 && (c.split(' ').length > 1 || u.split(' ').length > 1) && (u.includes(c) || c.includes(u));
  });
}

// Item agregado pelo banco (learn_stuck_report): contagens prontas; percentuais e média ficam aqui para
// arredondar exatamente como antes (fails / attempts * 100 e soma / n em ponto flutuante).
interface StuckRow {
  activity: 'speaking' | 'grammar'; level: string; module: string | null; unit: string | null; expected: string;
  attempts: number; fails: number; skips: number; students: number; stuckStudents: number;
  scoreSum: string | null; scoreN: number; samples: string[];
}

interface StuckAggregates {
  totals: StuckReport['totals'];
  stuck: StuckRow[];
  exits: StuckReport['exits'];
  failures: StuckReport['failures'];
}

// Agrupamento no banco (migration 20261106160000_learn_stuck_aggregates): devolve só o resultado (até 40
// itens por atividade, 30 saídas, falhas agrupadas e totais), sem teto de tentativas na janela. A regra do
// "stop_rejected" recuperado (Android recusa parar a gravação e o aluno acerta o mesmo passo em até
// 3 minutos) também é aplicada lá.
async function fetchAggregates(since: string): Promise<StuckAggregates> {
  const { data, error } = await getSupabaseAdmin().rpc('learn_stuck_report', { p_since: since });
  if (error) throw new Error(error.message);
  return data as StuckAggregates;
}

function toItems(rows: StuckRow[], activity: 'speaking' | 'grammar'): StuckItem[] {
  // Já vêm na ordem do relatório (alunos presos, depois erros + pulos, depois o mais recente).
  return rows.filter(r => r.activity === activity).map(r => ({
    level: r.level, module: r.module, unit: r.unit, expected: r.expected,
    attempts: r.attempts, fails: r.fails, students: r.students, stuckStudents: r.stuckStudents, skips: r.skips,
    failRate: r.attempts ? Math.round((r.fails / r.attempts) * 100) : 0,
    avgScore: r.scoreN ? Math.round(Number(r.scoreSum) / r.scoreN) : null,
    samples: r.samples,
  }));
}

export async function stuckReport(days: number): Promise<StuckReport> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const agg = await fetchAggregates(since);

  const speaking = toItems(agg.stuck, 'speaking');
  const grammar = toItems(agg.stuck, 'grammar');
  // Remonta na ordem de campos de antes (o jsonb reordena as chaves) para a resposta da rota sair igual.
  const exits = agg.exits.map(e => ({ level: e.level, module: e.module, unit: e.unit, activity: e.activity, step: e.step, count: e.count, students: e.students }));
  const failures = agg.failures.map(f => ({ kind: f.kind, code: f.code, platform: f.platform, version: f.version, count: f.count, students: f.students }));

  const where = (i: { level: string; module: string | null; unit: string | null }) => `${i.level} ${i.module ?? ''}${i.unit ? `/${i.unit}` : ''}`.trim();
  // Limites proporcionais ao movimento: com mais alunos, "2 alunos travaram" deixa de ser sinal. Conta
  // a FATIA dos alunos que fizeram o exercício e ficaram presos. Suspeita de falha do app tem limite menor
  // (é bug, vale olhar mesmo com poucos alunos).
  const totalStudents = agg.totals.students;
  const exitMin = Math.max(2, Math.ceil(totalStudents * 0.03));
  const groups: StuckReport['alertGroups'] = { app: [], content: [], exits: [], tech: [] };
  const evalItems = (items: StuckItem[], activity: 'speaking' | 'grammar') => {
    const rateMin = activity === 'speaking' ? 50 : 60;
    const scored = items.map(i => ({ i, share: i.students ? i.stuckStudents / i.students : 0, app: looksLikeAppIssue(i, activity) }));
    for (const { i, share, app } of scored) {
      const label = activity === 'speaking' ? 'Fala' : 'Gramática';
      const heard = activity === 'speaking' ? 'O app entendeu' : 'Respostas';
      const line = `${label} (${where(i)}): "${i.expected}" — ${i.failRate}% de erro, ${i.stuckStudents} de ${i.students} aluno(s) errou 2+ vezes. ${heard}: ${i.samples.map(x => `"${x}"`).join(', ') || '—'}`;
      if (app && i.stuckStudents >= 2) groups.app.push(line);
      else if (!app && i.students >= 3 && (share >= 0.2 || i.failRate >= rateMin)) groups.content.push(line);
    }
  };
  evalItems(speaking, 'speaking');
  evalItems(grammar, 'grammar');
  for (const e of exits) {
    if (e.students >= exitMin) groups.exits.push(`Saída no meio (${where(e)}, ${e.activity === 'speaking' ? 'fala' : 'gramática'}, passo ${(e.step ?? 0) + 1}): ${e.students} aluno(s).`);
  }
  for (const f of failures) {
    if (f.students >= 2) groups.tech.push(`${f.kind === 'mic_blocked' ? 'Microfone bloqueado' : `Reconhecimento de voz falhou (${f.code})`} em ${f.platform} ${f.version}: ${f.students} aluno(s).`);
  }
  const alerts = [...groups.app, ...groups.content, ...groups.exits, ...groups.tech];

  return {
    since,
    totals: {
      attempts: agg.totals.attempts, students: agg.totals.students, fails: agg.totals.fails, skips: agg.totals.skips,
      exits: agg.totals.exits, asrErrors: agg.totals.asrErrors, micBlocked: agg.totals.micBlocked,
    },
    speaking, grammar, exits, failures, alerts, alertGroups: groups,
  };
}
