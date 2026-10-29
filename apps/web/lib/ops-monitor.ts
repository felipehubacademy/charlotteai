// lib/ops-monitor.ts — vigia do checkout e dos pagamentos, quase em tempo real.
//
//   logOpsError       grava erro das rotas críticas (checkout, webhook do pagamento, login) em ops_errors;
//                     nunca lança (não pode atrapalhar a venda)
//   runCheckoutWatch  roda a cada 5 min (cron /api/cron/checkout-watch): confere os sinais abaixo e avisa por
//                     e-mail (administradores) e WhatsApp (ALERT_WHATSAPP), no máximo 1 aviso por tipo a cada hora
//
// Sinais: erro em rota crítica; processador fora do ar ou no limite; pico de cartão recusado (robôs);
// vendas pararam; pagou e ficou sem acesso (corrige sozinho); webhook mudo; fila de e-mails travada.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { notifyAdmins } from '@/lib/admin-push';
import { reportRecipients } from '@/lib/admin-prefs';
import { sendWhatsAppText, sendAlertTemplate } from '@/lib/whatsapp';
import { grantAccess, type CheckoutRow } from '@/lib/asaas-activation';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ALERT_EVERY_MS = HOUR;

export type OpsArea = 'checkout' | 'webhook' | 'auth' | 'asaas';

export async function logOpsError(area: OpsArea, route: string, err: unknown, detail?: Record<string, unknown>): Promise<void> {
  try {
    const e = err as { message?: string; status?: number; body?: unknown };
    const message = (e?.message ?? String(err)).slice(0, 500);
    await getSupabaseAdmin().from('ops_errors').insert({
      area, route, message,
      detail: { ...(detail ?? {}), ...(e?.status ? { status: e.status } : {}), ...(e?.body ? { body: e.body } : {}) },
    } as never);
  } catch { /* nunca atrapalha a rota */ }
}

type Alert = { kind: string; message: string };

async function recentlyAlerted(kind: string): Promise<boolean> {
  const { count } = await getSupabaseAdmin().from('ops_alerts').select('id', { count: 'exact', head: true })
    .eq('kind', kind).gte('created_at', new Date(Date.now() - ALERT_EVERY_MS).toISOString());
  return (count ?? 0) > 0;
}

async function deliver(alerts: Alert[]): Promise<{ sent: number }> {
  const supabase = getSupabaseAdmin();
  const fresh: Alert[] = [];
  for (const a of alerts) if (!(await recentlyAlerted(a.kind))) fresh.push(a);
  if (!fresh.length) return { sent: 0 };

  const text = `Queizy · alerta do checkout\n\n${fresh.map(a => `• ${a.message}`).join('\n')}\n\nPainel: queizy.com/admin/commercial`;
  const to = await reportRecipients('checkout');
  let emailOk = false;
  const html = `<div style="font-family:-apple-system,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16131F">
    <p><b>Alerta do checkout do Queizy</b></p><ul>${fresh.map(a => `<li>${a.message.replace(/</g, '&lt;')}</li>`).join('')}</ul>
    <p style="color:#8A8494;font-size:13px">Vigia automático (a cada 5 min). Cada tipo de alerta repete no máximo 1 vez por hora.</p></div>`;
  for (const addr of to) emailOk = (await sendEmail({ to: addr, subject: `Queizy: alerta do checkout (${fresh.length})`, html }).catch(() => false)) || emailOk;
  let waOk = false;
  await notifyAdmins({ title: `Alerta do checkout (${fresh.length})`, body: fresh.map(a => a.message).join(' · ').slice(0, 300), url: '/admin/commercial', tag: 'checkout', category: 'checkout' }).catch(() => 0);
  const wa = process.env.ALERT_WHATSAPP;
  // Texto livre só passa dentro da janela de 24 h; fora dela, o modelo aprovado.
  if (wa) waOk = (await sendWhatsAppText(wa, text)).ok || (await sendAlertTemplate(wa, fresh.map(a => a.message).join(' | '))).ok;
  for (const a of fresh) {
    await supabase.from('ops_alerts').insert({ kind: a.kind, message: a.message, sent_email: emailOk, sent_whatsapp: waOk } as never);
  }
  return { sent: fresh.length };
}

const since = (ms: number) => new Date(Date.now() - ms).toISOString();
const brHour = () => Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));

export async function runCheckoutWatch(): Promise<{ alerts: Alert[]; fixed: number; sent: number }> {
  const supabase = getSupabaseAdmin();
  const alerts: Alert[] = [];

  // 1. Erros nas rotas críticas (últimos 10 min).
  const { data: errs } = await supabase.from('ops_errors').select('area, route, message').gte('created_at', since(10 * MIN)).order('created_at', { ascending: false }).limit(50);
  const byArea = new Map<string, { n: number; route: string; message: string }>();
  for (const e of (errs ?? []) as { area: string; route: string; message: string }[]) {
    const cur = byArea.get(e.area);
    if (cur) cur.n++; else byArea.set(e.area, { n: 1, route: e.route, message: e.message });
  }
  const label: Record<string, string> = { checkout: 'no checkout', webhook: 'no webhook do pagamento', auth: 'no login/e-mails de acesso', asaas: 'no processador de pagamento' };
  for (const [area, e] of byArea) {
    alerts.push({ kind: `error_${area}`, message: `${e.n} erro(s) ${label[area] ?? area} nos últimos 10 min. Último: ${e.route}: ${e.message}` });
  }

  // 2. Pico de cartão recusado (15 min): robô testando cartão ou processador recusando tudo.
  const { count: declines } = await supabase.from('checkout_attempts').select('id', { count: 'exact', head: true })
    .eq('kind', 'card').eq('ok', false).gte('created_at', since(15 * MIN));
  if ((declines ?? 0) >= 5) alerts.push({ kind: 'card_declines', message: `${declines} cartões recusados nos últimos 15 min (robô testando cartão ou processador recusando).` });

  // 3. Vendas pararam: 5+ checkouts abertos em 2 h e nenhum pago (das 8h à meia-noite).
  const h = brHour();
  if (h >= 8) {
    const { data: cks } = await supabase.from('asaas_checkouts').select('status').eq('sandbox', false).gte('created_at', since(2 * HOUR));
    const list = (cks ?? []) as { status: string }[];
    if (list.length >= 5 && !list.some(c => c.status === 'paid')) {
      alerts.push({ kind: 'no_sales', message: `${list.length} checkouts abertos nas últimas 2 h e nenhum pago. Vale testar uma compra.` });
    }
  }

  // 4. Pagou e ficou sem acesso: corrige sozinho e avisa.
  const { data: paid } = await supabase.from('asaas_checkouts')
    .select('id, user_id, plan, method, trial_days, created_at, paid_at, asaas_payment_id, status, asaas_customer_id, asaas_subscription_id, sandbox, refunded_at')
    .eq('status', 'paid').eq('sandbox', false).is('refunded_at', null).gte('created_at', since(400 * DAY));
  let fixed = 0;
  const fixedEmails: string[] = [];
  for (const r of (paid ?? []) as (CheckoutRow & { created_at: string; paid_at: string | null; refunded_at: string | null })[]) {
    const { data: u } = await supabase.from('charlotte_users').select('email, subscription_status, subscription_product, subscription_expires_at').eq('id', r.user_id).maybeSingle();
    const user = u as { email: string; subscription_status: string | null; subscription_product: string | null; subscription_expires_at: string | null } | null;
    if (!user) continue;
    const okNow = (user.subscription_product ?? '').startsWith('web_') && ['active', 'cancelled'].includes(user.subscription_status ?? '');
    if (okNow) continue;
    // Até quando deveria ir: teste grátis (até a 1ª cobrança + 1 dia) ou período pago.
    const base = r.paid_at ? new Date(r.paid_at) : new Date(r.created_at);
    const until = r.trial_days > 0 && !r.asaas_payment_id
      ? new Date(new Date(r.created_at).getTime() + (r.trial_days + 1) * DAY)
      : new Date(base.getTime() + (r.plan === 'monthly' ? 33 : 368) * DAY);
    if (until.getTime() < Date.now()) continue; // período já acabou: não é caso de devolver
    await grantAccess(r.user_id, r.plan, until, r.method).catch(() => null);
    fixed++; fixedEmails.push(user.email);
  }
  if (fixed) alerts.push({ kind: 'access_fixed', message: `${fixed} assinante(s) do site estavam sem acesso e o acesso foi devolvido: ${fixedEmails.join(', ')}.` });

  // 5. Webhook mudo: 3+ compras pela página do processador em 3 h e nenhum evento recebido.
  const { count: hostedPaid } = await supabase.from('asaas_checkouts').select('id', { count: 'exact', head: true })
    .eq('channel', 'hosted').eq('sandbox', false).gte('created_at', since(3 * HOUR));
  const { count: events } = await supabase.from('asaas_events').select('id', { count: 'exact', head: true })
    .gte('created_at', since(3 * HOUR)).not('event', 'in', '(NOTICE,PAYMENT_PAID_LOCK,CHECKOUT_FALLBACK)');
  if ((hostedPaid ?? 0) >= 3 && (events ?? 0) === 0) {
    alerts.push({ kind: 'webhook_silent', message: `${hostedPaid} checkouts na página do processador nas últimas 3 h e nenhum aviso do processador chegou. Conferir o webhook.` });
  }

  // 6. Fila de e-mails travada (3+ tentativas sem sair).
  const { count: stuck } = await supabase.from('email_outbox').select('id', { count: 'exact', head: true }).is('sent_at', null).gte('attempts', 3);
  if ((stuck ?? 0) > 0) alerts.push({ kind: 'email_stuck', message: `${stuck} e-mail(s) presos na fila depois de 3 tentativas (pode ser link de senha de quem comprou).` });

  const { sent } = await deliver(alerts);
  return { alerts, fixed, sent };
}
