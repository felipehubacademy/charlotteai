// lib/admin-push.ts — alertas da gestão por push no PWA do /admin.
// Cada aparelho que tocou em "Ativar alertas no celular" fica em admin_push_subscriptions.
// Chaves VAPID nas envs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (Vercel). Sem elas, não envia (e-mail segue igual).
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { AdminRole } from '@/lib/admin-roles';
import { loadPrefs, wantsPush, type PushCategory } from '@/lib/admin-prefs';

let configured: boolean | null = null;
function configure(): boolean {
  if (configured != null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@queizy.com', pub!, priv!);
  return configured;
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export interface AdminPush { title: string; body: string; url?: string; tag?: string; category: PushCategory }

/**
 * Manda o alerta para os aparelhos da gestão. `roles` limita a quem recebe (padrão: só admin).
 * Todo alerta entra na caixa do sino (admin_alerts) de cada pessoa, mesmo com o push desligado;
 * as preferências (categoria e horário de silêncio) filtram só o push. Ao tocar no push, a tela
 * abre com o alerta completo no sino (?alerta=id). Inscrições mortas (404/410) são apagadas.
 */
export async function notifyAdmins(msg: AdminPush, roles: AdminRole[] = ['admin']): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: members } = await supabase.from('admin_members').select('user_id, role').eq('active', true).in('role', roles);
  const all = ((members ?? []) as { user_id: string | null }[]).map(m => m.user_id).filter((x): x is string => !!x);
  if (!all.length) return 0;
  const { data: saved } = await supabase.from('admin_alerts').insert(all.map(user_id => ({
    user_id, title: msg.title, body: msg.body, url: msg.url ?? '/admin', category: msg.category, tag: msg.tag ?? null,
  })) as never).select('id, user_id');
  const alertId = new Map(((saved ?? []) as { id: string; user_id: string }[]).map(r => [r.user_id, r.id]));
  // Caixa enxuta: alertas com mais de 90 dias somem.
  await supabase.from('admin_alerts').delete().lt('created_at', new Date(Date.now() - 90 * 86400_000).toISOString());

  if (!configure()) return 0;
  // Preferências de cada um (/admin > Minha conta): categoria desligada ou horário de silêncio.
  const prefs = await loadPrefs(all);
  const ids = all.filter(id => wantsPush(prefs.get(id), msg.category));
  if (!ids.length) return 0;
  const { data: subs } = await supabase.from('admin_push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', ids);
  const base = msg.url ?? '/admin';
  let sent = 0;
  await Promise.all(((subs ?? []) as { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[]).map(async s => {
    const aid = alertId.get(s.user_id);
    const url = aid ? `${base}${base.includes('?') ? '&' : '?'}alerta=${aid}` : base;
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url, tag: msg.tag });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
      sent++;
      await supabase.from('admin_push_subscriptions').update({ last_ok_at: new Date().toISOString() } as never).eq('id', s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from('admin_push_subscriptions').delete().eq('id', s.id);
      else console.warn('[admin-push]', code, (e as Error).message);
    }
  }));
  return sent;
}
