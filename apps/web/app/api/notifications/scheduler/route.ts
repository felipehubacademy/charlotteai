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
} from '@/lib/expo-notification-service';
import { runRallyJobs } from '@/lib/rally-jobs';
import { notifyStaleTickets, closeIdleConversations } from '@/lib/support-service';
import { analyzePendingConversations } from '@/lib/support-insights';
import { runAiCostReport } from '@/lib/ai-cost-report';
import { processOutbox } from '@/lib/email-outbox';
import { getSupabase } from '@/lib/supabase';

const CRON_SECRET = process.env.CRON_SECRET ?? '';

type TaskType = 'daily' | 'praise' | 'streak' | 'goal' | 'weekly' | 'engagement' | 'buddy' | 'taste' | 'rally' | 'support_sla' | 'support_insights' | 'support_autoclose' | 'ai_costs' | 'email_outbox';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  const userAgent  = request.headers.get('user-agent') ?? '';
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;
  // cron-job.org sends its UA even without CRON_SECRET matching — accept as fallback
  // only if the secret is not configured (dev environments).
  if (!CRON_SECRET && userAgent.includes('cron-job.org')) return true;
  return false;
}

async function runTask(task: TaskType, forced = false): Promise<{ task: TaskType }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  switch (task) {
    case 'daily':
      await sendDailyReminders(supabase);
      break;
    case 'praise':
      await sendCharlotteMessages(supabase);
      break;
    case 'streak':
      await sendStreakReminders(supabase);
      break;
    case 'goal':
      await sendGoalReminders(supabase);
      break;
    case 'weekly':
      await sendWeeklyChallenges(supabase);
      break;
    case 'buddy':
      await sendBuddyRivalry(supabase);
      break;
    case 'taste': // degustação: 1 push por dia, fluxo próprio (os genéricos não vão para ela)
      await sendTastePushes(supabase);
      break;
    case 'rally':
      await runRallyJobs();
      break;
    case 'engagement':
      await sendEngagementPushes(supabase);
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
      break;
    case 'ai_costs': // 8h (Brasília): e-mail de custos de IA (anteontem, já fechado) com alertas (OpenAI e ElevenLabs)
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
const HOURLY_TASKS: TaskType[] = ['daily', 'goal', 'praise', 'streak', 'weekly', 'engagement', 'buddy', 'taste', 'rally', 'support_sla', 'support_insights', 'support_autoclose', 'ai_costs', 'email_outbox'];

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
  after(async () => {
    await Promise.allSettled(HOURLY_TASKS.map(t => runTask(t)));
  });

  return NextResponse.json({
    success: true,
    scheduled: true,
    hourUTC: now.getUTCHours(),
    timestamp: now.toISOString(),
  });
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
