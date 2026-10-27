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
 * Manda o alerta para os aparelhos da gestão. `roles` limita a quem recebe (padrão: só admin);
 * as preferências de cada pessoa (categoria e horário de silêncio) filtram em seguida.
 * Inscrições mortas (404/410) são apagadas.
 */
export async function notifyAdmins(msg: AdminPush, roles: AdminRole[] = ['admin']): Promise<number> {
  if (!configure()) return 0;
  const supabase = getSupabaseAdmin();
  const { data: members } = await supabase.from('admin_members').select('user_id, role').eq('active', true).in('role', roles);
  const all = ((members ?? []) as { user_id: string | null }[]).map(m => m.user_id).filter((x): x is string => !!x);
  // Preferências de cada um (/admin > Minha conta): categoria desligada ou horário de silêncio.
  const prefs = await loadPrefs(all);
  const ids = all.filter(id => wantsPush(prefs.get(id), msg.category));
  if (!ids.length) return 0;
  const { data: subs } = await supabase.from('admin_push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', ids);
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? '/admin', tag: msg.tag });
  let sent = 0;
  await Promise.all(((subs ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async s => {
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
