// lib/signup-welcome.ts — e-mail de "conta criada" para quem acabou de se cadastrar e está na degustação.
// Roda junto do cron /api/cron/email-outbox (a cada 5 minutos). Uma vez por pessoa (signup_welcome_sent_at).
// Quem já entrou com assinatura ou teste (site ou loja) não recebe: tem o e-mail próprio desses fluxos.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { signupWelcomeTemplate } from '@/lib/email-templates';
import { sendOrQueue } from '@/lib/email-outbox';
import { notifyAdmins } from '@/lib/admin-push';

// Só contas criadas a partir do lançamento deste e-mail (ninguém antigo recebe de repente).
const SIGNUP_WELCOME_FROM = '2026-10-29T21:30:00Z';

export async function sendSignupWelcomes(): Promise<{ sent: number }> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Math.max(Date.parse(SIGNUP_WELCOME_FROM), Date.now() - 48 * 3600_000)).toISOString();
  const { data } = await supabase.from('charlotte_users')
    .select('id')
    .gte('created_at', since)
    .is('signup_welcome_sent_at', null)
    .eq('subscription_status', 'none')
    .eq('is_institutional', false)
    .limit(20);
  let sent = 0;
  for (const { id } of (data ?? []) as { id: string }[]) {
    // Marca antes de enviar: duas rodadas ao mesmo tempo não mandam duas vezes.
    const { data: u } = await supabase.from('charlotte_users')
      .update({ signup_welcome_sent_at: new Date().toISOString() })
      .eq('id', id).is('signup_welcome_sent_at', null)
      .select('name, email').maybeSingle();
    const row = u as { name: string | null; email: string | null } | null;
    if (!row?.email) continue;
    const first = (row.name ?? '').trim().split(/\s+/)[0] || row.email.split('@')[0];
    const name = first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1);
    const { subject, html } = signupWelcomeTemplate({ name });
    await sendOrQueue({ kind: 'signup_welcome', to: row.email, subject, html });
    sent++;
  }
  await alertLate(supabase).catch(() => {});
  return { sent };
}

// Conferência automática: cadastro de 20 a 25 minutos atrás ainda sem o e-mail (ou com o envio preso na fila)
// vira alerta no sino do /admin. A janela tem o tamanho de uma rodada do cron, então cada conta avisa uma vez só.
async function alertLate(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
  const from = new Date(Math.max(Date.parse(SIGNUP_WELCOME_FROM), Date.now() - 25 * 60_000)).toISOString();
  const to = new Date(Date.now() - 20 * 60_000).toISOString();
  if (from >= to) return;
  const { data: late } = await supabase.from('charlotte_users').select('email')
    .gte('created_at', from).lt('created_at', to).eq('subscription_status', 'none').eq('is_institutional', false)
    .is('signup_welcome_sent_at', null);
  const { count: stuck } = await supabase.from('email_outbox').select('id', { count: 'exact', head: true })
    .in('kind', ['signup_welcome', 'trial_welcome']).is('sent_at', null).gte('created_at', from).lt('created_at', to);
  const n = (late ?? []).length;
  if (!n && !stuck) return;
  await notifyAdmins({
    title: 'E-mail de boas-vindas atrasado',
    body: n
      ? `${n} cadastro(s) com mais de 20 minutos sem o e-mail "Sua conta no Queizy está pronta".`
      : `${stuck} e-mail(s) de boas-vindas parados na fila de reenvio.`,
    url: '/admin', tag: 'signup_welcome_late', category: 'emails',
  });
}
