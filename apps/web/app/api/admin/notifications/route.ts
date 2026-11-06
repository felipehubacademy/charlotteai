export const dynamic = 'force-dynamic';

/**
 * app/api/admin/notifications/route.ts
 *
 * GET — alunos com push ativo, envios 24h/7d, por tipo (7d), volume diário (30d) e últimos envios.
 * Sem disparo manual: o agendador (/api/notifications/scheduler) roda de hora em hora sozinho.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notificationStats } from '@/lib/admin-notification-stats';

async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'notifications');
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

  // Números do topo somados no banco (lib/admin-notification-stats); aqui só a página de envios.
  const [stats, logsPage, logsCount] = await Promise.all([
    notificationStats(new Date()),

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
  const { tokenStats, stats24h, stats7d, byType, timeseries } = stats;

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
