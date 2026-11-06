// lib/push-watch.ts — vigia dos pushes que deveriam sair e não saíram.
// O alerta de falha (lib/expo-notification-service, sendExpoPush) só pega push que tentou sair e falhou.
// Quando a rotina nem chega a tentar (leitura do banco com erro tratada como "ninguém"), nada falha e
// nada avisa: assim os pushes de engajamento ficaram parados de 27/10 a 06/11/2026.
// Roda no scheduler de hora em hora e confere às 12h (Brasília): cada grupo de push diário que teve
// menos de 25% da média dos 7 dias anteriores nas últimas 24 h, ou nenhum envio, avisa a gestão.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notifyAdmins } from '@/lib/admin-push';

const DAY = 86400000;
const CHECK_HOUR_BRT = 12;

// Grupos que saem todo dia. `always`: zero envios em 24 h já é alerta, mesmo com média baixa.
// `since`: o grupo mudou de público nessa data e a média só conta daí em diante (antes, comparar com a
// semana velha daria alarme falso). Lembrete diário: a degustação deixou de receber em 06/11/2026 (de ~800
// para ~180 por dia).
const GROUPS: { label: string; types: string[]; always?: boolean; since?: string }[] = [
  { label: 'lembrete diário', types: ['daily_reminder'], always: true, since: '2026-11-06T14:40:00Z' },
  { label: 'degustação', types: ['taste_daily', 'taste_nudge', 'taste_ended', 'taste_offer'], always: true },
  { label: 'sequência', types: ['streak_reminder', 'streak_saver'] },
  { label: 'engajamento', types: ['micro_checkin', 'level_imminent', 'cadence_drop', 'charlotte_checkin', 'streak_milestone_ahead'], always: true },
  { label: 'volta ao app', types: ['reengagement_3d', 'reengagement_7d', 'reengagement_14d', 'reengagement_30d'] },
];

async function sentBetween(types: string[], fromMs: number, toMs: number): Promise<number> {
  const { count, error } = await getSupabaseAdmin().from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .in('notification_type', types).eq('status', 'sent')
    .gte('created_at', new Date(fromMs).toISOString()).lt('created_at', new Date(toMs).toISOString());
  if (error) throw new Error(`push-watch: ${error.message}`);
  return count ?? 0;
}

export async function runPushWatch(force = false): Promise<{ checked: boolean; alerts: string[] }> {
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  if (!force && hour !== CHECK_HOUR_BRT) return { checked: false, alerts: [] };
  const now = Date.now();
  const alerts: string[] = [];
  for (const g of GROUPS) {
    const last = await sentBetween(g.types, now - DAY, now);
    const from = Math.max(now - 8 * DAY, g.since ? new Date(g.since).getTime() : 0);
    const days = (now - DAY - from) / DAY;
    // Menos de 1 dia de histórico desde a mudança: só vale a regra do zero.
    const avg = days >= 1 ? (await sentBetween(g.types, from, now - DAY)) / days : 0;
    if ((g.always && last === 0) || (avg >= 5 && last < avg * 0.25)) {
      alerts.push(`${g.label}: ${last} nas últimas 24 h (média de ${Math.round(avg)} por dia na semana anterior)`);
    }
  }
  if (alerts.length) {
    await notifyAdmins({
      title: 'Pushes para os alunos pararam de sair',
      body: alerts.join(' · ').slice(0, 300),
      url: '/admin/notifications', tag: 'push-silence', category: 'pushes',
    }).catch(e => console.warn('[push-watch] alerta da gestão falhou:', e));
  }
  console.log('[push-watch]', alerts.length ? alerts.join(' | ') : 'ok');
  return { checked: true, alerts };
}
