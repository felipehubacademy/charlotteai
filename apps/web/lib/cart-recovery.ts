// lib/cart-recovery.ts — carrinho abandonado da assinatura pelo site (checkout do Asaas).
//
// Quem abriu o checkout e não pagou recebe até 3 e-mails: ~3h depois ("Faltou pouco"),
// 24h (benefícios) e 72h (última chamada; com cupom se existir um cupom VOLTA valendo,
// criado na área Comercial do /admin). Para sozinho quando a pessoa assina.
// Pode rodar quantas vezes for: cada etapa sai uma vez por checkout (recovery_stage).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { cartRecoveryTemplate } from '@/lib/email-templates';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { resolveCoupon } from '@/lib/asaas';

const HOUR = 3600000;
const STAGE_AFTER_H: Record<1 | 2 | 3, number> = { 1: 3, 2: 24, 3: 72 };
const MAX_AGE_H = 7 * 24;            // checkout mais velho que isso não entra
export const RECOVERY_COUPON = 'VOLTA';

type Row = { id: string; user_id: string; plan: 'monthly' | 'annual'; method: string | null; trial_days: number; status: string; created_at: string; recovery_stage: number };
type User = { id: string; name: string | null; email: string | null; subscription_status: string | null; subscription_expires_at: string | null; is_institutional: boolean | null; marketing_opt_out: boolean | null; email_bounced: boolean | null };

export async function runCartRecovery(opts: { dryRun?: boolean; onlyEmail?: string | null } = {}) {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const since = new Date(now - MAX_AGE_H * HOUR).toISOString();
  const { data } = await supabase.from('asaas_checkouts')
    .select('id, user_id, plan, method, trial_days, status, created_at, recovery_stage')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(2000);
  const rows = (data ?? []) as Row[];

  // Por pessoa, só o checkout mais recente conta; se ela pagou qualquer um, nada de lembrete.
  const paidUsers = new Set(rows.filter(r => r.status === 'paid').map(r => r.user_id));
  const latest = new Map<string, Row>();
  for (const r of rows) if (!latest.has(r.user_id)) latest.set(r.user_id, r);
  const pending = [...latest.values()].filter(r => r.status !== 'paid' && !paidUsers.has(r.user_id) && r.recovery_stage < 3);
  if (!pending.length) return { checked: rows.length, sent: 0, items: [] as unknown[] };

  const { data: us } = await supabase.from('charlotte_users')
    .select('id, name, email, subscription_status, subscription_expires_at, is_institutional, marketing_opt_out, email_bounced')
    .in('id', pending.map(r => r.user_id));
  const users = new Map(((us ?? []) as User[]).map(u => [u.id, u]));
  const coupon = await resolveCoupon(RECOVERY_COUPON).catch(() => null);
  const { data: c } = coupon?.ok ? await supabase.from('coupons').select('duration_cycles').eq('code', RECOVERY_COUPON).maybeSingle() : { data: null };
  const recoveryCoupon = coupon?.ok && coupon.kind === 'coupon'
    ? { code: coupon.code, pct: coupon.pct, firstOnly: (c as { duration_cycles: number | null } | null)?.duration_cycles === 1 }
    : null;

  const items: { checkout: string; email: string | null; stage: number; action: string }[] = [];
  let sent = 0;
  for (const r of pending) {
    const u = users.get(r.user_id);
    // Teste: só a conta indicada (as outras ficam de fora, sem mudar o estado delas).
    if (opts.onlyEmail && u?.email?.toLowerCase() !== opts.onlyEmail.toLowerCase()) continue;
    const ageH = (now - new Date(r.created_at).getTime()) / HOUR;
    const next = (r.recovery_stage + 1) as 1 | 2 | 3;
    if (ageH < STAGE_AFTER_H[next]) continue;
    const active = (u?.subscription_status === 'active' || u?.subscription_status === 'cancelled' || u?.subscription_status === 'trial')
      && !!u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() > now;
    const skip = !u?.email ? 'sem e-mail'
      : /@(hubacademybr\.com|queizy\.com)$/i.test(u.email) ? 'equipe'
      : u.marketing_opt_out ? 'descadastrado'
      : u.email_bounced ? 'e-mail volta'
      : u.is_institutional ? 'institucional'
      : active ? 'já tem acesso' : null;
    if (skip) { items.push({ checkout: r.id, email: u?.email ?? null, stage: next, action: `pulado: ${skip}` }); continue; }
    // Atrasado (ex.: o cron ficou parado): pula para a etapa devida, sem mandar as anteriores.
    const due = ([3, 2, 1] as const).find(s => s >= next && ageH >= STAGE_AFTER_H[s]) ?? next;
    if (opts.dryRun) { items.push({ checkout: r.id, email: u!.email, stage: due, action: 'enviaria' }); continue; }
    const plan = r.plan === 'monthly' ? 'monthly' : 'annual';
    const { subject, html } = cartRecoveryTemplate({
      stage: due, name: u!.name, plan, trialDays: r.trial_days,
      coupon: due === 3 ? recoveryCoupon : null, unsubscribeUrl: unsubscribeUrl(r.user_id),
    });
    // Marca antes de enviar: se o envio falhar, não repete em loop.
    await supabase.from('asaas_checkouts').update({ recovery_stage: due, recovery_last_at: new Date().toISOString() } as never).eq('id', r.id);
    const ok = await sendEmail({ to: u!.email!, subject, html }).catch(() => false);
    items.push({ checkout: r.id, email: u!.email, stage: due, action: ok ? 'enviado' : 'falhou' });
    if (ok) sent++;
  }
  return { checked: rows.length, sent, items };
}
