// lib/admin-notification-stats.ts — números do topo de /admin/notifications.
// Somados no banco (admin_notification_stats): antes vinham todos os envios de 30 dias e todos os alunos.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Agg = {
  tokenTotal: number; tokenWith: number; sent24h: number; failed24h: number; sent7d: number; failed7d: number;
  byType: { type: string; sent: number; failed: number; uniqueUsers: number }[];
  timeseries: { date: string; count: number }[];
};

/** Alunos com push (equipe fora), envios 24 h e 7 dias (sem scheduler_lock), por tipo (7 dias) e volume diário dos enviados (30 dias). */
export async function notificationStats(now: Date) {
  const { data, error } = await getSupabaseAdmin().rpc('admin_notification_stats' as never, {
    p_ago24h: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    p_ago7d:  new Date(now.getTime() - 7  * 86400 * 1000).toISOString(),
    p_ago30d: new Date(now.getTime() - 30 * 86400 * 1000).toISOString(),
  } as never);
  if (error) throw new Error(`[envios] ${error.message}`); // leitura que falha não vira "zero envios"
  const a = data as Agg;
  const total = Number(a.tokenTotal), withToken = Number(a.tokenWith);
  const sent7d = Number(a.sent7d), failed7d = Number(a.failed7d);
  return {
    tokenStats: { total, withToken, withoutToken: total - withToken },
    stats24h: { sent: Number(a.sent24h), failed: Number(a.failed24h) },
    stats7d: {
      sent: sent7d, failed: failed7d,
      deliveryRate: sent7d + failed7d === 0 ? 100 : Math.round((sent7d / (sent7d + failed7d)) * 100),
    },
    // Mais enviados primeiro; empate na ordem do primeiro envio do tipo (como antes).
    byType: a.byType
      .map(t => ({ type: t.type, sent: Number(t.sent), failed: Number(t.failed), uniqueUsers: Number(t.uniqueUsers) }))
      .sort((x, y) => y.sent - x.sent),
    timeseries: a.timeseries.map(t => ({ date: t.date, count: Number(t.count) })),
  };
}
