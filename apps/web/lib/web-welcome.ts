// lib/web-welcome.ts — e-mail de boas-vindas da assinatura pelo site, com o link para criar a senha.
// Usado pelo webhook do Asaas e pela correção de e-mail (o link vai para o e-mail novo).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { webSubscriptionWelcomeTemplate } from '@/lib/email-templates';
import type { WebPlan } from '@/lib/asaas';

/** Envia agora, sem fila (usado pela própria fila ao reenviar). */
export async function sendWebWelcomeNow(userId: string, plan: WebPlan, trialDays: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('email, name').eq('id', userId).maybeSingle();
  const user = u as { email: string; name: string | null } | null;
  if (!user?.email) return false;
  const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email, options: { redirectTo: 'https://queizy.com/open' } });
  const passwordUrl = link?.properties?.action_link ?? 'https://queizy.com/open';
  const { subject, html } = webSubscriptionWelcomeTemplate({ name: user.name, email: user.email, plan, trialDays, passwordUrl });
  return sendEmail({ to: user.email, subject, html }).catch(() => false);
}

/** Envia; se o serviço de e-mail recusar (ex.: pico de envios), entra na fila e sai em alguns minutos
 *  com um link de senha novo (lib/email-outbox). */
export async function sendWebWelcome(userId: string, plan: WebPlan, trialDays: number): Promise<boolean> {
  const ok = await sendWebWelcomeNow(userId, plan, trialDays).catch(() => false);
  if (!ok) {
    const { enqueue } = await import('@/lib/email-outbox');
    await enqueue({ kind: 'web_welcome', payload: { userId, plan, trialDays } });
  }
  return ok;
}
