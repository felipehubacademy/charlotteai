// lib/admin-users-list.ts — lista de /admin/users (GET /api/admin/users) com engajamento e números dos cards.
// A tela filtra, ordena e pagina no navegador, então a lista de alunos vem inteira; o que é por aluno
// (engajamento, progresso, unidades da trilha) já vem somado do banco (admin_users_aggregates).
import { readAll } from '@/lib/db-batch';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { computeUsersBlock } from '@/lib/admin-overview';
import { isTeamAccount, brtDay, brtDayStart } from '@/lib/admin-subscriptions';
import { chargeIndex, subscriptionKind, phaseOfKind, firstChargeDay, type ChargeRevRow, type ChargeCkRow } from '@/lib/admin-subscriptions';

interface CharlotteUser {
  id: string; email: string; name: string | null;
  charlotte_level: string | null; is_institutional: boolean;
  is_active: boolean; subscription_status: string;
  trial_ends_at: string | null; must_change_password: boolean;
  placement_test_done: boolean; created_at: string;
  last_seen_at: string | null;
  [key: string]: unknown;
}
type EngRow = { user_id: string; total_xp: number | string; last_active: string | null; lesson_count: number | string; message_count: number | string; session_days: number | string };

type TrailRow = { user_id: string; novice: number; inter: number; advanced: number };
interface UserProgress {
  user_id: string; streak_days: number | null; total_xp: number | null; last_practice_date: string | null;
}

export async function usersListPayload() {
  const supabase = getSupabaseAdmin();

  // Lista de alunos (em páginas) + o que é por aluno, já somado no banco numa ida só: antes vinham também todas as
  // linhas concluídas da trilha e o progresso inteiro, e o engajamento era refeito a cada página de 1.000.
  const [users, agg] = await Promise.all([
    // readAll (lib/db-batch): ordem única para as páginas não pularem linhas e erro explícito em vez de lista vazia.
    readAll<CharlotteUser>('alunos', () => supabase.from('charlotte_users').select('*').order('created_at', { ascending: false }).order('id')),
    supabase.rpc('admin_users_aggregates' as never).then(({ data, error }) => {
      if (error) throw new Error(`[engajamento] ${error.message}`);
      return data as unknown as { engagement: EngRow[]; progress: UserProgress[]; trail: TrailRow[] };
    }),
  ]);

  // ── Aggregate practices per user ──────────────────────────────────────────
  const now   = new Date();
  const d1    = new Date(now); d1.setDate(d1.getDate() - 1);
  const d7    = new Date(now); d7.setDate(d7.getDate() - 7);

  type EngMap = Record<string, {
    totalXP: number; lastActive: string | null;
    lessonCount: number; messageCount: number; sessionDays: number;
  }>;
  const engMap: EngMap = {};

  for (const r of agg.engagement) {
    engMap[r.user_id] = {
      totalXP: Number(r.total_xp ?? 0),
      lastActive: r.last_active ? new Date(r.last_active).toISOString() : null,
      lessonCount: Number(r.lesson_count ?? 0), messageCount: Number(r.message_count ?? 0),
      sessionDays: Number(r.session_days ?? 0),
    };
  }

  // ── Trilha nova: unidades concluídas (as 4 atividades) por nível (contadas no banco) ─────────
  type ProgMap = Record<string, { novice: number; inter: number; advanced: number }>;
  const progMap: ProgMap = {};
  for (const r of agg.trail) progMap[r.user_id] = { novice: Number(r.novice), inter: Number(r.inter), advanced: Number(r.advanced) };

  // ── Progress map (streak + total_xp + last_practice_date) ───────────────
  type ProgressEntry = { streak: number; totalXP: number; lastPracticeDate: string | null };
  const progressMap: Record<string, ProgressEntry> = {};
  const todayUTC = new Date().toISOString().slice(0, 10);
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  for (const up of agg.progress) {
    const uid = String(up.user_id).toLowerCase();
    const lpd = up.last_practice_date ?? null;
    // Streak está ativo apenas se praticou hoje ou ontem (UTC como aproximação para admin)
    const activeStreak = lpd === todayUTC || lpd === yesterdayUTC;
    progressMap[uid] = {
      streak:           activeStreak ? (up.streak_days ?? 0) : 0,
      totalXP:          up.total_xp ?? 0,
      lastPracticeDate: lpd,
    };
  }

  // ── Attach engagement to each user ───────────────────────────────────────
  const usersWithEng = users.map(u => {
    const uid  = String(u.id).toLowerCase();
    const e    = engMap[uid];
    const p    = progMap[uid];
    const prog = progressMap[uid];
    return {
      ...u,
      engagement: e ? {
        totalXP:      prog?.totalXP ?? e.totalXP, // charlotte_progress.total_xp tem achievements inclusos
        // Usa o mais recente entre: última prática (engMap), last_practice_date
        // do charlotte_progress (fonte confiável, não sofre truncamento de 1000 rows),
        // e last_seen_at (abertura do app).
        lastActive:   [e.lastActive, prog?.lastPracticeDate, u.last_seen_at].filter(Boolean).sort().at(-1) ?? null,
        sessionDays:  e.sessionDays,
        lessonCount:  e.lessonCount,
        messageCount: e.messageCount,
      } : (prog ? { totalXP: prog.totalXP, lastActive: [prog.lastPracticeDate, u.last_seen_at].filter(Boolean).sort().at(-1) ?? null, sessionDays: 0, lessonCount: 0, messageCount: 0 } : null),
      trailProgress: p ?? null,
      streak:        prog?.streak ?? 0,
      longestStreak: 0,
    };
  });

  // ── Fase da assinatura (regra única de lib/admin-subscriptions, a mesma de Métricas e Visão geral) ──
  // pagante: já houve cobrança (loja ou site, sem reembolso total) e ainda tem acesso;
  // teste_loja / teste_site: 7 dias grátis com cartão; teste_antigo: teste sem cartão do app (até 21/10).
  const [revRows, siteRows] = await Promise.all([
    readAll<ChargeRevRow>('receita', () => supabase.from('revenue_events').select('app_user_id, event_type, store, price_purchased, purchased_at').order('id')),
    readAll<ChargeCkRow>('checkouts do site', () => supabase.from('asaas_checkouts').select('user_id, value_brl, trial_days, status, asaas_payment_id, paid_at, refunded_at, created_at')
      .eq('sandbox', false).order('created_at', { ascending: true }).order('id')),
  ]);
  const { firstChargeAt, siteCk } = chargeIndex(revRows, siteRows);
  const nowMs = now.getTime();
  const phaseOf = (u: { id: string; subscription_status: string; subscription_product: string | null; subscription_expires_at: string | null; trial_ends_at: string | null }) =>
    phaseOfKind(subscriptionKind(u, firstChargeAt.has(String(u.id)), nowMs));
  for (const u of usersWithEng as any[]) u.sub_phase = u.is_institutional ? null : phaseOf(u);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total         = usersWithEng.length;
  const institutional = usersWithEng.filter(u => u.is_institutional).length;
  const subscribers   = (usersWithEng as any[]).filter(u => u.sub_phase === 'pagante').length;
  const onTrial       = (usersWithEng as any[]).filter(u => String(u.sub_phase ?? '').startsWith('teste')).length;
  // De onde vem o teste: loja (cartão na loja), site (cartão no site) ou sem cartão (teste antigo do app).
  const trialBy = (phase: string) => (usersWithEng as any[]).filter(u => u.sub_phase === phase).length;
  const trialSplit = { loja: trialBy('teste_loja'), site: trialBy('teste_site'), semCartao: trialBy('teste_antigo') };
  // Detalhe do card "Em teste grátis" (no passar do mouse): por origem, quantos vão ser cobrados e quando,
  // e quantos cancelaram durante o teste (seguem com acesso até o fim dos 7 dias, sem cobrança).
  const day = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10) : '');
  // Site: o Asaas cobra no fim do teste (início + dias grátis, em data UTC); o acesso tem 1 dia de folga depois disso.
  const chargeDay = (u: any) => firstChargeDay(u, siteCk);
  const detailOf = (phase: string) => {
    const list = (usersWithEng as any[]).filter(u => u.sub_phase === phase);
    const cancelled = list.filter(u => u.subscription_status === 'cancelled');
    const toCharge = list.filter(u => u.subscription_status !== 'cancelled');
    const byDay = new Map<string, number>();
    for (const u of (phase === 'teste_antigo' ? list : toCharge)) {
      const d = phase === 'teste_antigo' ? day(u.trial_ends_at) : chargeDay(u);
      if (d) byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return {
      total: list.length, toCharge: toCharge.length, cancelled: cancelled.length,
      cancelledUntil: cancelled.map(chargeDay).sort().slice(-1)[0] ?? null,
      byDay: [...byDay.entries()].sort().map(([date, count]) => ({ date, count })),
    };
  };
  const trialDetail = { loja: detailOf('teste_loja'), site: detailOf('teste_site'), semCartao: detailOf('teste_antigo') };
  const trialExpired  = usersWithEng.filter(u => {
    if (u.is_institutional) return false;
    // Conta status='expired' OU status='trial' com data já vencida (cron atrasado)
    if (u.subscription_status === 'expired') return true;
    if (u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < now) return true;
    return false;
  }).length;

  // Funil do painel: alunos (sem institucionais) → degustação ou teste grátis → pagantes; e quem cancelou.
  const students = (usersWithEng as any[]).filter(u => !u.is_institutional);
  const totalStudents = students.length;
  // Degustação: nunca entrou em teste nem pagou (status 'none'). Ela dura 5 dias desde o cadastro (lib/taste).
  const tasters = students.filter(u => (u.subscription_status ?? 'none') === 'none');
  const tasteDays = 5;
  const tasteCut = new Date(now.getTime() - tasteDays * 86400000);
  const tasteActive = tasters.filter(u => new Date(u.created_at) >= tasteCut).length;
  const taste = { total: tasters.length, active: tasteActive, ended: tasters.length - tasteActive };
  // Cancelados: desligaram a renovação. Seguem com acesso até o vencimento (no teste ou já pagantes).
  const cancelledList = students.filter(u => u.subscription_status === 'cancelled');
  const cancelled = {
    total: cancelledList.length,
    inTrial: cancelledList.filter(u => String(u.sub_phase ?? '').startsWith('teste')).length,
    paid: cancelledList.filter(u => u.sub_phase === 'pagante').length,
    noAccess: cancelledList.filter(u => !u.sub_phase).length,
  };

  const d30   = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60   = new Date(now); d60.setDate(d60.getDate() - 60);
  const last30 = usersWithEng.filter(u => new Date(u.created_at) >= d30).length;
  // Novos nas últimas 24 h e nas 24 h anteriores (para comparar).
  const d2 = new Date(now); d2.setDate(d2.getDate() - 2);
  const last24h = usersWithEng.filter(u => new Date(u.created_at) >= d1).length;
  const prev24h = usersWithEng.filter(u => new Date(u.created_at) >= d2 && new Date(u.created_at) < d1).length;
  const prev30 = usersWithEng.filter(u => new Date(u.created_at) >= d60 && new Date(u.created_at) < d30).length;
  const growthPct = prev30 === 0 ? null : Math.round(((last30 - prev30) / prev30) * 100);

  // Engagement stats — mesma regra da Visão geral: ativo = fez alguma atividade (não só abriu o app),
  // hoje no calendário de Brasília; equipe fora.
  const todayStartIso = new Date(brtDayStart(brtDay(now.getTime()))).toISOString();
  const d7StartIso = new Date(brtDayStart(brtDay(now.getTime()) - 6)).toISOString();
  const practiceLast = (u: any) => engMap[String(u.id).toLowerCase()]?.lastActive ?? null;
  const notTeamUsers = (usersWithEng as any[]).filter(u => !isTeamAccount(u));
  const activeToday = notTeamUsers.filter(u => (practiceLast(u) ?? '') >= todayStartIso).length;
  const activeWeek = notTeamUsers.filter(u => (practiceLast(u) ?? '') >= d7StartIso).length;

  // Números dos cards: a mesma partição da Visão geral (lib/admin-overview), para baterem sempre.
  const ub = (await computeUsersBlock()).users;

  return {
    users: usersWithEng,
    stats: {
      total, totalStudents: ub.total, team: total - ub.total, institutional,
      taste: { ...taste, total: ub.taste },
      cancelled: { ...cancelled, inTrial: ub.trialCancelled, paid: ub.payingCancelled },
      subscribers: ub.paying, onTrial: ub.trial,
      trialSplit: { loja: ub.trialStore, site: ub.trialSite, semCartao: ub.trialLegacy },
      trialDetail, trialExpired, noAccess: ub.noAccess,
      last30, last24h, prev24h, growthPct, activeToday, activeWeek,
    },
  };
}
