export const dynamic = 'force-dynamic';

/**
 * app/api/admin/notifications/route.ts
 *
 * GET — alunos com push ativo, envios 24h/7d, por tipo (7d), volume diário (30d) e últimos envios.
 * Sem disparo manual: o agendador (/api/notifications/scheduler) roda de hora em hora sozinho.
 */

import { isTeamAccount } from '@/lib/admin-subscriptions';
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'notifications');
}

// O PostgREST devolve no máximo 1000 linhas por consulta; a semana passa disso.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await build(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    fetchAll<{ expo_push_token: string | null; email: string | null; is_institutional: boolean | null; hide_from_ranking: boolean | null }>((f, t) => supabase.from('charlotte_users').select('expo_push_token, email, is_institutional, hide_from_ranking').order('id').range(f, t) as never),
    fetchAll<{ status: string }>((f, t) => supabase.from('notification_logs').select('status').gte('created_at', ago24h).order('created_at').range(f, t) as never),
    fetchAll<{ user_id: string; notification_type: string; status: string }>((f, t) =>
      supabase.from('notification_logs').select('user_id, notification_type, status').gte('created_at', ago7d).order('created_at').range(f, t) as never),
    fetchAll<{ created_at: string }>((f, t) =>
      supabase.from('notification_logs').select('created_at').gte('created_at', ago30d).eq('status', 'sent').order('created_at').range(f, t) as never),

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
  const allUsers   = tokenRes.filter(u => !isTeamAccount(u)); // equipe fora, como nas outras telas
  const withToken  = allUsers.filter(u => u.expo_push_token?.startsWith('ExponentPushToken[')).length;
  const tokenStats = { total: allUsers.length, withToken, withoutToken: allUsers.length - withToken };

  // ── Stats 24h ───────────────────────────────────────────────────────────────
  const rows24h = logs24h.filter(r => r.status !== 'scheduler_lock');
  const stats24h = {
    sent:   rows24h.filter(r => r.status === 'sent').length,
    failed: rows24h.filter(r => r.status === 'failed').length,
  };

  // ── Stats 7d + byType ─────────────────────────────────────────
  const rows7d   = logs7d.filter(r => r.status !== 'scheduler_lock');
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


  // ── Timeseries 30d ──────────────────────────────────────────────────────────
  const tsMap: Record<string, number> = {};
  for (const r of logs30d) {
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
    tokenStats, stats24h, stats7d, byType, timeseries,
    logs, page, total: logsCount.count ?? 0, perPage: PER_PAGE,
  });
}

interface Log {
  id: string; user_id: string; notification_type: string; status: string;
  message_title: string | null; message_body: string | null; error_message: string | null; created_at: string;
}
