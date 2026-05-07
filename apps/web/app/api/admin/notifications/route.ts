export const dynamic = 'force-dynamic';

/**
 * app/api/admin/notifications/route.ts
 *
 * GET  — token health, stats 24h/7d, byType, byCategory, timeseries 30d, recent logs
 * POST — manually trigger a notification task (same tasks as scheduler)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  sendDailyReminders,
  sendCharlotteMessages,
  sendStreakReminders,
  sendGoalReminders,
  sendWeeklyChallenges,
  sendEngagementPushes,
} from '@/lib/expo-notification-service';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

type TaskType = 'daily' | 'praise' | 'streak' | 'goal' | 'weekly' | 'engagement';

// ── Category sets (mirror metrics route) ──────────────────────────────────────
const CORE_TYPES       = new Set(['streak_reminder', 'daily_reminder', 'charlotte_message', 'xp_milestone', 'goal_reminder', 'weekly_challenge']);
const PREVENTION_TYPES = new Set(['streak_saver', 'streak_milestone_ahead', 'level_imminent', 'micro_checkin', 'cadence_drop', 'weekly_recap', 'charlotte_checkin']);
const REVENUE_TYPES    = new Set(['trial_ending_72h', 'trial_ending_24h', 'sub_expired_1d']);
const WINBACK_TYPES    = new Set(['streak_broken', 'reengagement_3d', 'reengagement_7d', 'reengagement_14d', 'reengagement_30d']);

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url    = new URL(req.url);
  const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const type   = url.searchParams.get('type') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const PER_PAGE = 30;

  const supabase = getSupabaseAdmin();
  const now      = new Date();
  const ago24h   = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const ago7d    = new Date(now.getTime() - 7  * 86400 * 1000).toISOString();
  const ago30d   = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();

  // Run all queries in parallel
  const [
    tokenRes,
    logs24h,
    logs7d,
    logs30d,
    logsPage,
    logsCount,
  ] = await Promise.all([
    // Token health
    supabase
      .from('charlotte_users')
      .select('expo_push_token') as unknown as Promise<{ data: { expo_push_token: string | null }[] | null }>,

    // Stats 24h
    supabase
      .from('notification_logs')
      .select('status')
      .gte('created_at', ago24h) as unknown as Promise<{ data: { status: string }[] | null }>,

    // Stats 7d + byType + byCategory
    supabase
      .from('notification_logs')
      .select('user_id, notification_type, status')
      .gte('created_at', ago7d) as unknown as Promise<{ data: { user_id: string; notification_type: string; status: string }[] | null }>,

    // Timeseries 30d — only sent, only date needed
    supabase
      .from('notification_logs')
      .select('created_at')
      .gte('created_at', ago30d)
      .eq('status', 'sent') as unknown as Promise<{ data: { created_at: string }[] | null }>,

    // Recent logs (paginated)
    (() => {
      let q = supabase
        .from('notification_logs')
        .select('id, user_id, notification_type, status, message_title, message_body, error_message, created_at')
        .not('created_at', 'is', null)
        .order('created_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      if (type)   q = q.eq('notification_type', type);
      if (status) q = q.eq('status', status);
      return q;
    })() as unknown as Promise<{ data: Log[] | null }>,

    // Total count for pagination
    (() => {
      let q = supabase
        .from('notification_logs')
        .select('id', { count: 'exact', head: true });
      if (type)   q = q.eq('notification_type', type);
      if (status) q = q.eq('status', status);
      return q;
    })() as unknown as Promise<{ count: number | null }>,
  ]);

  // ── Token health ────────────────────────────────────────────────────────────
  const allUsers   = tokenRes.data ?? [];
  const withToken  = allUsers.filter(u => u.expo_push_token?.startsWith('ExponentPushToken[')).length;
  const tokenStats = { total: allUsers.length, withToken, withoutToken: allUsers.length - withToken };

  // ── Stats 24h ───────────────────────────────────────────────────────────────
  const rows24h = (logs24h.data ?? []).filter(r => r.status !== 'scheduler_lock');
  const stats24h = {
    sent:   rows24h.filter(r => r.status === 'sent').length,
    failed: rows24h.filter(r => r.status === 'failed').length,
  };

  // ── Stats 7d + byType + byCategory ─────────────────────────────────────────
  const rows7d   = (logs7d.data ?? []).filter(r => r.status !== 'scheduler_lock');
  const sent7d   = rows7d.filter(r => r.status === 'sent').length;
  const failed7d = rows7d.filter(r => r.status === 'failed').length;
  const stats7d  = {
    sent: sent7d, failed: failed7d,
    deliveryRate: sent7d + failed7d === 0 ? 100 : Math.round((sent7d / (sent7d + failed7d)) * 100),
  };

  // byType
  const typeMap: Record<string, { sent: number; failed: number; users: Set<string> }> = {};
  for (const r of rows7d) {
    if (!typeMap[r.notification_type]) typeMap[r.notification_type] = { sent: 0, failed: 0, users: new Set() };
    if (r.status === 'sent')   typeMap[r.notification_type].sent++;
    if (r.status === 'failed') typeMap[r.notification_type].failed++;
    typeMap[r.notification_type].users.add(r.user_id);
  }
  const byType = Object.entries(typeMap)
    .map(([t, v]) => ({ type: t, sent: v.sent, failed: v.failed, uniqueUsers: v.users.size }))
    .sort((a, b) => b.sent - a.sent);

  // byCategory (from sent rows only)
  const byCategory = { core: 0, prevention: 0, revenue: 0, winback: 0 };
  for (const r of rows7d.filter(r => r.status === 'sent')) {
    if      (CORE_TYPES.has(r.notification_type))       byCategory.core++;
    else if (PREVENTION_TYPES.has(r.notification_type)) byCategory.prevention++;
    else if (REVENUE_TYPES.has(r.notification_type))    byCategory.revenue++;
    else if (WINBACK_TYPES.has(r.notification_type))    byCategory.winback++;
  }

  // ── Timeseries 30d ──────────────────────────────────────────────────────────
  const tsMap: Record<string, number> = {};
  for (const r of logs30d.data ?? []) {
    const day = r.created_at.slice(0, 10);
    tsMap[day] = (tsMap[day] ?? 0) + 1;
  }
  const timeseries = Object.entries(tsMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Logs with user names ────────────────────────────────────────────────────
  const rawLogs = logsPage.data ?? [];
  const uids    = [...new Set(rawLogs.map(l => l.user_id).filter(Boolean))];
  let userMap: Record<string, { name: string | null; email: string | null }> = {};
  if (uids.length) {
    const { data: users } = await supabase
      .from('charlotte_users')
      .select('id, name, email')
      .in('id', uids) as unknown as { data: { id: string; name: string | null; email: string | null }[] | null };
    for (const u of users ?? []) userMap[u.id] = { name: u.name, email: u.email };
  }

  const logs = rawLogs.map(l => ({
    ...l,
    userName:  userMap[l.user_id]?.name  ?? null,
    userEmail: userMap[l.user_id]?.email ?? null,
  }));

  return NextResponse.json({
    tokenStats, stats24h, stats7d, byType, byCategory, timeseries,
    logs, page, total: logsCount.count ?? 0, perPage: PER_PAGE,
  });
}

// ── POST — manual trigger ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const task = body.task as TaskType | undefined;
  if (!task) return NextResponse.json({ error: 'Missing task' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });

  const t0 = Date.now();
  try {
    switch (task) {
      case 'daily':      await sendDailyReminders(supabase);      break;
      case 'praise':     await sendCharlotteMessages(supabase);   break;
      case 'streak':     await sendStreakReminders(supabase);      break;
      case 'goal':       await sendGoalReminders(supabase);        break;
      case 'weekly':     await sendWeeklyChallenges(supabase);     break;
      case 'engagement': await sendEngagementPushes(supabase);     break;
      default: return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true, task, ms: Date.now() - t0 });
  } catch (err) {
    return NextResponse.json({ ok: false, task, error: String(err), ms: Date.now() - t0 }, { status: 500 });
  }
}

// ── Local types ───────────────────────────────────────────────────────────────
interface Log {
  id: string; user_id: string; notification_type: string;
  status: string; message_title: string | null; message_body: string | null;
  error_message: string | null; created_at: string;
}
