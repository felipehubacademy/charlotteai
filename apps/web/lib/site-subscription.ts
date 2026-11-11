// lib/site-subscription.ts — cancelar a assinatura feita pelo site (processador de pagamento).
//
// Fonte única para os três caminhos: o botão do app (Perfil > Assinatura > Gerenciar assinatura),
// a IA do suporte (quando o aluno confirma que quer cancelar) e o /admin (atendente).
//
//   - cancela a renovação no processador (todas as assinaturas ativas da compra);
//   - deleteOpen: apaga também cobranças em aberto (pendente ou vencida), para não cair cobrança depois
//     de quem pediu para cancelar (ex.: cartão recusado que o processador ainda tentaria de novo);
//   - no teste grátis o acesso termina no último dia grátis às 23h59 (Brasília); fora dele, segue até o
//     fim do período pago (subscription_expires_at não muda).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { activeSubscriptionsOf, cancelSubscription, deletePayment, subscriptionPayments, AsaasError } from '@/lib/asaas';
import { logOpsError } from '@/lib/ops-monitor';

export type SiteCancelResult =
  | { status: 'cancelled'; deletedCharges: number }
  | { status: 'no_renewal' }          // Pix anual: não renova sozinho, não há o que cancelar
  | { status: 'not_site' }            // a conta não tem compra pelo site
  | { status: 'not_found' }           // compra existe, mas a assinatura não foi achada no processador
  | { status: 'error'; message: string };

export async function cancelSiteSubscription(userId: string, opts: { deleteOpen?: boolean; email?: string | null; source: string }): Promise<SiteCancelResult> {
  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from('asaas_checkouts').select('id, method, asaas_subscription_id, asaas_customer_id, sandbox, created_at, trial_days, asaas_payment_id')
    .eq('user_id', userId).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const ck = row as {
    id: string; method: string | null; asaas_subscription_id: string | null; asaas_customer_id: string | null; sandbox: boolean | null;
    created_at: string; trial_days: number; asaas_payment_id: string | null;
  } | null;
  if (!ck) return { status: 'not_site' };
  if (ck.method === 'annual_pix') return { status: 'no_renewal' };
  const sandbox = !!ck.sandbox;
  let deletedCharges = 0;
  try {
    // Compra pela página do processador: o id da assinatura pode ainda não estar guardado (só chega na 1ª cobrança).
    const ids = ck.asaas_subscription_id ? [ck.asaas_subscription_id] : (await activeSubscriptionsOf(userId, sandbox, ck.asaas_customer_id, opts.email ?? null)).map(s => s.id);
    if (!ids.length) {
      await logOpsError('checkout', `cancelar assinatura (${opts.source})`, new Error('assinatura não encontrada no processador'), { user: userId, checkout: ck.id });
      return { status: 'not_found' };
    }
    if (!ck.asaas_subscription_id) await supabase.from('asaas_checkouts').update({ asaas_subscription_id: ids[0] } as never).eq('id', ck.id);
    for (const id of ids) {
      if (opts.deleteOpen && !sandbox) {
        for (const p of await subscriptionPayments(id)) {
          if (p.status === 'PENDING' || p.status === 'OVERDUE') { await deletePayment(p.id); deletedCharges++; }
        }
      }
      await cancelSubscription(id, sandbox);
    }
  } catch (e) {
    await logOpsError('checkout', `cancelar assinatura (${opts.source})`, e, { user: userId });
    return { status: 'error', message: e instanceof AsaasError ? e.message : 'Não foi possível cancelar agora.' };
  }

  const patch: Record<string, unknown> = { subscription_status: 'cancelled', updated_at: new Date().toISOString() };
  if (ck.trial_days > 0 && !ck.asaas_payment_id) {
    const charge = new Date(new Date(ck.created_at).getTime() + ck.trial_days * 86_400_000);
    const chargeDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(charge); // AAAA-MM-DD
    const lastFree = new Date(`${chargeDay}T00:00:00-03:00`);
    patch.subscription_expires_at = new Date(lastFree.getTime() - 1000).toISOString(); // véspera da cobrança, 23h59m59
  }
  // Quem já estava sem acesso (cobrança recusada, vencida) continua "expired": não volta para "cancelled".
  const { data: u } = await supabase.from('charlotte_users').select('subscription_status').eq('id', userId).maybeSingle();
  if ((u as { subscription_status: string | null } | null)?.subscription_status === 'expired') delete patch.subscription_status;
  await supabase.from('charlotte_users').update(patch as never).eq('id', userId);
  return { status: 'cancelled', deletedCharges };
}
