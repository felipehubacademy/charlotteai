/**
 * app/api/notifications/scheduler/route.ts
 *
 * RN-only notification scheduler. Meant to be called once per hour by
 * cron-job.org via GET with `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Every run the endpoint invokes every sender. Each sender filters users
 * by the user's OWN timezone (charlotte_users.timezone, default
 * America/Sao_Paulo) so that:
 *   - daily_reminder fires when the user's local hour == 11
 *   - goal_reminder when local hour == 16
 *   - praise + streak when local hour == 18
 *   - weekly_challenge when local day == Monday and local hour == 9
 *
 * With a single hourly cron the scheduling targets are inside the code,
 * not in cron-job.org — timezone changes per user are handled without
 * reconfiguring the cron.
 *
 * Also supports manual triggering via POST or `?force_task=TYPE` query
 * param (same CRON_SECRET).
 *
 * Base grande: a rodada de hora em hora conta os alunos com push e divide os pushes que leem a base
 * toda (lembrete diário, elogio, desafios e engajamento) em fatias de até SHARD_SIZE alunos. A chamada
 * principal faz a fatia 0 e chama esta mesma rota com `?shard=i&of=n` para as outras, cada uma com seus
 * 120 s. Se uma rodada passar de SLOW_MS, a gestão é avisada antes de estourar o tempo.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import {
  sendDailyReminders,
  sendCharlotteMessages,
  sendStreakReminders,
  sendGoalReminders,
  sendWeeklyChallenges,
  sendEngagementPushes,
  sendBuddyRivalry,
  sendTastePushes,
  sendRankingPushes,
  checkExpoReceipts,
} from '@/lib/expo-notification-service';
import { runRallyJobs } from '@/lib/rally-jobs';
import { notifyStaleTickets, closeIdleConversations } from '@/lib/support-service';
import { analyzePendingConversations } from '@/lib/support-insights';
import { runAiCostReport } from '@/lib/ai-cost-report';
import { processOutbox } from '@/lib/email-outbox';
import { endLegacyTrials } from '@/lib/legacy-trial';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendSignupWelcomes } from '@/lib/signup-welcome';
import { syncProviderCosts } from '@/lib/cost-sync';
import { runPushWatch } from '@/lib/push-watch';
import { notifyAdmins } from '@/lib/admin-push';
import type { PushShard } from '@/lib/expo-notification-service';

const CRON_SECRET = process.env.CRON_SECRET ?? '';

type TaskType = 'daily' | 'praise' | 'streak' | 'goal' | 'weekly' | 'engagement' | 'buddy' | 'taste' | 'ranking' | 'legacy_trial' | 'rally' | 'support_sla' | 'support_insights' | 'support_autoclose' | 'ai_costs' | 'cost_sync' | 'email_outbox' | 'push_receipts' | 'push_watch';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  const userAgent  = request.headers.get('user-agent') ?? '';
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;
  // cron-job.org sends its UA even without CRON_SECRET matching — accept as fallback
  // only if the secret is not configured (dev environments).
  if (!CRON_SECRET && userAgent.includes('cron-job.org')) return true;
  return false;
}

const SHARD_SIZE = 5000;
const SLOW_MS = 60_000;
const SHARDED: TaskType[] = ['daily', 'praise', 'goal', 'weekly', 'engagement'];
const ALL: PushShard = { i: 0, n: 1 };

async function runTask(task: TaskType, forced = false, shard: PushShard = ALL): Promise<{ task: TaskType }> {
  // Chave de servidor: as views do banco são security_invoker (29/10), a chave pública não lê mais usuários e atividades.
  const supabase = getSupabaseAdmin();

  switch (task) {
    case 'daily':
      await sendDailyReminders(supabase, shard);
      break;
    case 'praise':
      await sendCharlotteMessages(supabase, shard);
      break;
    case 'streak':
      await sendStreakReminders(supabase);
      break;
    case 'goal':
      await sendGoalReminders(supabase, shard);
      break;
    case 'weekly':
      await sendWeeklyChallenges(supabase, shard);
      break;
    case 'buddy':
      await sendBuddyRivalry(supabase);
      break;
    case 'legacy_trial': // teste antigo venceu → degustação + push e e-mail com os 7 dias grátis da loja
      await endLegacyTrials();
      break;
    case 'ranking': // ranking da semana: subiu, perdeu, risco de perder (19h) e venceu a semana (segunda 10h)
      await sendRankingPushes(supabase);
      break;
    case 'taste': // degustação: 1 push por dia, fluxo próprio (os genéricos não vão para ela)
      await sendTastePushes(supabase);
      break;
    case 'rally':
      await runRallyJobs();
      break;
    case 'engagement':
      await sendEngagementPushes(supabase, shard);
      break;
    case 'support_sla': // ticket de suporte sem resposta há 2 h → e-mail ao atendente
      await notifyStaleTickets();
      break;
    case 'support_insights': // conversas paradas há 1 h → análise com IA (aba Insights do /admin)
      await analyzePendingConversations();
      break;
    case 'support_autoclose': // atendimento parado: IA 2 h, atendente 24 h → encerrado (sem mensagem)
      await closeIdleConversations();
      break;
    case 'email_outbox': // e-mails que falharam no envio (fila). O agendamento de 5 min do GitHub Actions atrasa horas.
      await processOutbox();
      await sendSignupWelcomes(); // "conta criada" de quem escapou do envio na hora do cadastro
      break;
    case 'push_receipts': // recibos de entrega do Expo dos pushes de 15 min a 24 h atrás (entregue ou erro)
      await checkExpoReceipts();
      break;
    case 'push_watch': // 12h (Brasília): push diário que parou de sair (lib/push-watch) avisa a gestão
      console.log('[SCHEDULER] push_watch', JSON.stringify(await runPushWatch(forced)));
      break;
    case 'cost_sync': // (mantido para chamada manual) mesma coisa da 1ª etapa de 'ai_costs'
      console.log('[SCHEDULER] cost_sync', JSON.stringify(await syncProviderCosts()));
      break;
    case 'ai_costs': // 1) custo real dos provedores por uso → linha do mês no Financeiro (toda hora);
      //              2) 8h (Brasília): e-mail de custos de IA. As duas usam a mesma leitura da OpenAI (lib/provider-costs).
      console.log('[SCHEDULER] cost_sync', JSON.stringify(await syncProviderCosts().catch(e => [{ erro: String(e) }])));
      await runAiCostReport({ force: forced });
      break;
    default:
      throw new Error(`Unknown task: ${task}`);
  }
  return { task };
}

// Every hourly run invokes every sender. Each sender drops users whose
// per-user local hour does not match the task's target hour, so this is
// cheap when no one is at the right local time.
const HOURLY_TASKS: TaskType[] = ['daily', 'goal', 'praise', 'streak', 'weekly', 'engagement', 'buddy', 'taste', 'ranking', 'legacy_trial', 'rally', 'support_sla', 'support_insights', 'support_autoclose', 'ai_costs', 'email_outbox', 'push_receipts', 'push_watch'];

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceTask = url.searchParams.get('force_task') as TaskType | null;

  // force_task: synchronous — caller waits for result
  if (forceTask) {
    try {
      const result = await runTask(forceTask, true);
      return NextResponse.json({
        success: true,
        forced: true,
        timestamp: new Date().toISOString(),
        ...result,
      });
    } catch (error) {
      console.error('[SCHEDULER] Error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  }

  // Hourly run: respond 200 immediately so cron-job.org does not time out,
  // then continue processing all tasks inside the Vercel function lifetime
  // (maxDuration: 120s in vercel.json) via after().
  const now = new Date();
  const shardParam = url.searchParams.get('shard');
  if (shardParam !== null) {
    // Fatia chamada pela rodada principal: só os pushes que leem a base toda.
    const shard = { i: Number(shardParam), n: Number(url.searchParams.get('of') ?? 1) };
    after(() => runTimed(SHARDED, shard));
    return NextResponse.json({ success: true, scheduled: true, shard });
  }
  const n = await shardCount();
  if (n > 1) {
    await Promise.allSettled(Array.from({ length: n - 1 }, (_, k) =>
      fetch(`${url.origin}/api/notifications/scheduler?shard=${k + 1}&of=${n}`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` }, signal: AbortSignal.timeout(15000),
      }).then(r => { if (!r.ok) throw new Error(`fatia ${k + 1}: HTTP ${r.status}`); })
        .catch(e => notifyAdmins({
          title: 'Pushes para os alunos não saíram', body: `A fatia ${k + 1} de ${n} da rodada não começou (${e instanceof Error ? e.message : e}).`,
          url: '/admin/notifications', tag: `push-shard-${k + 1}`, category: 'pushes',
        }).catch(() => {}))));
  }
  after(() => runTimed(HOURLY_TASKS, { i: 0, n }));

  return NextResponse.json({
    success: true,
    scheduled: true,
    hourUTC: now.getUTCHours(),
    timestamp: now.toISOString(),
  });
}

// Quantas fatias: alunos com push / SHARD_SIZE. Sem CRON_SECRET (desenvolvimento) não há como chamar as fatias.
async function shardCount(): Promise<number> {
  if (!CRON_SECRET) return 1;
  const { count, error } = await getSupabaseAdmin().from('charlotte_users')
    .select('id', { count: 'exact', head: true }).like('expo_push_token', 'ExponentPushToken[%');
  if (error) { console.error('[SCHEDULER] contagem de alunos falhou:', error.message); return 1; }
  return Math.max(1, Math.ceil((count ?? 0) / SHARD_SIZE));
}

// Roda as tarefas em paralelo e avisa a gestão se alguma passar de SLOW_MS (limite da rodada: 120 s).
async function runTimed(tasks: TaskType[], shard: PushShard): Promise<void> {
  const slow: string[] = [];
  await Promise.allSettled(tasks.map(async t => {
    const t0 = Date.now();
    try { await runTask(t, false, SHARDED.includes(t) ? shard : ALL); }
    finally {
      const ms = Date.now() - t0;
      if (ms > SLOW_MS) slow.push(`${t} ${Math.round(ms / 1000)} s`);
    }
  }));
  if (slow.length) {
    console.warn('[SCHEDULER] rodada lenta', shard, slow);
    await notifyAdmins({
      title: 'Rodada dos pushes perto do limite de tempo',
      body: `Fatia ${shard.i + 1} de ${shard.n}: ${slow.join(', ')} (limite de 120 s). Diminuir SHARD_SIZE no scheduler antes que pushes deixem de sair.`.slice(0, 300),
      url: '/admin/notifications', tag: 'push-slow', category: 'pushes',
    }).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const task = body.task as TaskType | undefined;
    if (!task) {
      return NextResponse.json({ error: 'Missing body.task' }, { status: 400 });
    }
    const result = await runTask(task);
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ [SCHEDULER] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
