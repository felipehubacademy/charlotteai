// lib/web-welcome.ts — e-mail de boas-vindas da assinatura pelo site, com o link para criar a senha.
// Usado pelo webhook do Asaas e pela correção de e-mail (o link vai para o e-mail novo).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { webSubscriptionWelcomeTemplate } from '@/lib/email-templates';
import type { WebPlan } from '@/lib/asaas';

export async function sendWebWelcome(userId: string, plan: WebPlan, trialDays: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('email, name').eq('id', userId).maybeSingle();
  const user = u as { email: string; name: string | null } | null;
  if (!user?.email) return false;
  const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email, options: { redirectTo: 'https://queizy.com/open' } });
  const passwordUrl = link?.properties?.action_link ?? 'https://queizy.com/open';
  const { subject, html } = webSubscriptionWelcomeTemplate({ name: user.name, email: user.email, plan, trialDays, passwordUrl });
  return sendEmail({ to: user.email, subject, html }).catch(() => false);
}
