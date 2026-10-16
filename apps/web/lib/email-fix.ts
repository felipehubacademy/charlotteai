// lib/email-fix.ts — corrigir o e-mail de quem assinou pelo site com o e-mail errado.
//
// A pessoa digita "ana@gmial.com" no checkout: a conta é criada com esse e-mail e o link de
// criar senha vai para uma caixa que não existe. Dois caminhos usam este módulo:
//   1. Tela de sucesso do site ("Não é esse? Corrigir"), no mesmo navegador do checkout (cookie).
//   2. Suporte (IA no e-mail, WhatsApp e chat do app): localiza a compra e confere que é da pessoa.
// Travas: só contas criadas pelo checkout, nunca usadas no app (sem login), dos últimos 30 dias,
// e o e-mail novo não pode ter conta. Se algo não bate, o suporte passa para um atendente.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getCustomer, getPaymentCard, updateCustomerEmail, type WebPlan } from '@/lib/asaas';
import { isValidEmailFormat, isDisposableEmail } from '@/lib/email-validation';
import { sendWebWelcome } from '@/lib/web-welcome';

const DAY = 86400000;
const WINDOW_DAYS = 30;

export type FixError = 'invalid_email' | 'email_in_use' | 'not_found' | 'account_used' | 'too_old' | 'same_email' | 'failed';

export const FIX_ERROR_PT: Record<FixError, string> = {
  invalid_email: 'Confira o e-mail novo.',
  email_in_use: 'Esse e-mail já tem uma conta no Queizy. Fale com o suporte para juntar as duas.',
  not_found: 'Não encontramos a compra.',
  account_used: 'Essa conta já foi usada no app. Fale com o suporte para trocar o e-mail.',
  too_old: 'A compra tem mais de 30 dias. Fale com o suporte para trocar o e-mail.',
  same_email: 'Esse já é o e-mail da conta.',
  failed: 'Não foi possível corrigir agora. Tente de novo em instantes.',
};

type Checkout = { id: string; user_id: string; plan: WebPlan; trial_days: number; status: string; created_at: string; asaas_customer_id: string | null; asaas_payment_id: string | null };
type Account = { id: string; email: string | null; name: string | null; last_seen_at: string | null };

function normEmail(e: string | null | undefined): string {
  return String(e ?? '').trim().toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Parecido o bastante para ser o mesmo e-mail com erro de digitação. */
export function emailsLookAlike(a: string, b: string): boolean {
  const x = normEmail(a), y = normEmail(b);
  if (!x || !y || x === y) return false;
  const [lx, dx] = x.split('@'), [ly, dy] = y.split('@');
  if (lx === ly) return true;                       // mesma parte antes do @, domínio errado
  if (dx === dy && levenshtein(lx, ly) <= 2) return true; // 1 ou 2 letras trocadas no nome
  // No e-mail inteiro, a tolerância cresce com o tamanho (e-mail curto e diferente não passa).
  return levenshtein(x, y) <= Math.min(3, Math.floor(Math.max(x.length, y.length) / 8));
}

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
  const x = n(String(a ?? '')), y = n(String(b ?? ''));
  if (x.length < 2 || y.length < 2) return false;
  // Primeiro e último nome iguais (o meio pode faltar ou vir abreviado).
  return x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
}

async function accountOf(userId: string): Promise<{ account: Account | null; neverSignedIn: boolean }> {
  const supabase = getSupabaseAdmin();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.from('charlotte_users').select('id, email, name, last_seen_at').eq('id', userId).maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ]);
  return { account: data as Account | null, neverSignedIn: !auth?.user?.last_sign_in_at };
}

/**
 * Troca o e-mail da conta criada pelo checkout e manda o link de criar senha para o e-mail novo.
 * Só passa nas travas (conta do checkout, nunca usada, compra recente, e-mail novo livre).
 */
export async function moveCheckoutEmail(checkoutId: string, newEmailRaw: string, source: 'site' | 'support'): Promise<{ ok: true; email: string } | { ok: false; error: FixError }> {
  const supabase = getSupabaseAdmin();
  const newEmail = normEmail(newEmailRaw);
  if (!isValidEmailFormat(newEmail) || isDisposableEmail(newEmail)) return { ok: false, error: 'invalid_email' };

  const { data } = await supabase.from('asaas_checkouts')
    .select('id, user_id, plan, trial_days, status, created_at, asaas_customer_id, asaas_payment_id, created_account')
    .eq('id', checkoutId).maybeSingle();
  const ck = data as (Checkout & { created_account: boolean | null }) | null;
  if (!ck) return { ok: false, error: 'not_found' };
  if (Date.now() - new Date(ck.created_at).getTime() > WINDOW_DAYS * DAY) return { ok: false, error: 'too_old' };
  if (ck.created_account !== true) return { ok: false, error: 'account_used' };

  const { account, neverSignedIn } = await accountOf(ck.user_id);
  if (!account) return { ok: false, error: 'not_found' };
  if (normEmail(account.email) === newEmail) return { ok: false, error: 'same_email' };
  if (account.last_seen_at || !neverSignedIn) return { ok: false, error: 'account_used' };

  const { data: taken } = await supabase.from('charlotte_users').select('id').ilike('email', newEmail).maybeSingle();
  if (taken) return { ok: false, error: 'email_in_use' };

  const { error: authErr } = await supabase.auth.admin.updateUserById(ck.user_id, { email: newEmail, email_confirm: true });
  if (authErr) return { ok: false, error: authErr.message?.toLowerCase().includes('already') ? 'email_in_use' : 'failed' };
  await supabase.from('charlotte_users').update({ email: newEmail, updated_at: new Date().toISOString() } as never).eq('id', ck.user_id);
  if (ck.asaas_customer_id) await updateCustomerEmail(ck.asaas_customer_id, newEmail).catch(() => null);
  // Registro para auditoria (mesma tabela dos eventos do Asaas).
  await supabase.from('asaas_events').insert({
    id: `emailfix_${ck.id}_${Date.now()}`, event: 'EMAIL_FIX',
    payload: { checkoutId: ck.id, userId: ck.user_id, from: account.email, to: newEmail, source },
  } as never);
  // Já pagou ou validou o cartão: o link de criar senha vai de novo, agora para o e-mail certo.
  if (ck.status === 'paid') await sendWebWelcome(ck.user_id, ck.plan, ck.trial_days);
  return { ok: true, email: newEmail };
}

// ── Suporte ─────────────────────────────────────────────────────────────────

export interface SupportFixInput {
  correctEmail?: string | null;   // o e-mail certo (remetente do e-mail ou o que a pessoa escreveu)
  wrongEmail?: string | null;     // o e-mail digitado no checkout, se a pessoa souber
  fullName?: string | null;       // nome usado no pagamento
  cardLast4?: string | null;      // 4 últimos dígitos do cartão (se pagou no cartão)
}

export type SupportFixResult =
  | { status: 'fixed'; email: string }
  | { status: 'need_info'; missing: ('correctEmail' | 'identity')[] }
  | { status: 'escalate'; reason: string };

/**
 * Localiza a compra feita com o e-mail errado e confere se é da pessoa antes de corrigir.
 * Conferência: nome do pagamento igual (primeiro e último) E, se houve cobrança no cartão,
 * os 4 últimos dígitos. Sem dados suficientes: pede. Ambíguo ou fora das travas: atendente.
 */
export async function resolveSupportEmailFix(input: SupportFixInput): Promise<SupportFixResult> {
  const supabase = getSupabaseAdmin();
  const correct = normEmail(input.correctEmail);
  if (!correct || !isValidEmailFormat(correct)) return { status: 'need_info', missing: ['correctEmail'] };

  const { data: owner } = await supabase.from('charlotte_users').select('id').ilike('email', correct).maybeSingle();
  if (owner) return { status: 'escalate', reason: 'O e-mail certo já tem conta: juntar as contas é com um atendente.' };

  const since = new Date(Date.now() - WINDOW_DAYS * DAY).toISOString();
  const { data: rows } = await supabase.from('asaas_checkouts')
    .select('id, user_id, plan, trial_days, status, created_at, asaas_customer_id, asaas_payment_id, created_account')
    .eq('status', 'paid').eq('created_account', true).gte('created_at', since).limit(500);
  const checkouts = (rows ?? []) as (Checkout & { created_account: boolean })[];
  if (!checkouts.length) return { status: 'escalate', reason: 'Nenhuma compra recente pelo site que possa ser a do aluno.' };

  const ids = [...new Set(checkouts.map(c => c.user_id))];
  const { data: users } = await supabase.from('charlotte_users').select('id, email, name, last_seen_at').in('id', ids);
  const byId = new Map(((users ?? []) as Account[]).map(u => [u.id, u]));
  const wrong = normEmail(input.wrongEmail);
  const candidates = checkouts.filter(c => {
    const u = byId.get(c.user_id);
    if (!u?.email || u.last_seen_at) return false;
    return wrong ? normEmail(u.email) === wrong || emailsLookAlike(u.email, wrong) && emailsLookAlike(u.email, correct) : emailsLookAlike(u.email, correct);
  });
  if (!candidates.length) {
    return wrong
      ? { status: 'escalate', reason: `Nenhuma compra recente com o e-mail ${wrong} (ou parecido) sem uso no app.` }
      : { status: 'need_info', missing: ['identity'] };
  }
  if (candidates.length > 1) return { status: 'escalate', reason: 'Mais de uma compra parecida: precisa de um atendente para escolher.' };

  const ck = candidates[0];
  if (!input.fullName) return { status: 'need_info', missing: ['identity'] };
  const customer = ck.asaas_customer_id ? await getCustomer(ck.asaas_customer_id).catch(() => null) : null;
  const buyerName = customer?.name ?? byId.get(ck.user_id)?.name ?? null;
  if (!namesMatch(buyerName, input.fullName)) return { status: 'escalate', reason: 'O nome informado não bate com o do pagamento.' };
  if (ck.asaas_payment_id) {
    const card = await getPaymentCard(ck.asaas_payment_id).catch(() => null);
    if (card?.last4) {
      if (!input.cardLast4) return { status: 'need_info', missing: ['identity'] };
      if (String(input.cardLast4).replace(/\D/g, '').slice(-4) !== card.last4) return { status: 'escalate', reason: 'Os 4 últimos dígitos do cartão não batem.' };
    }
  }

  const r = await moveCheckoutEmail(ck.id, correct, 'support');
  if (r.ok) return { status: 'fixed', email: r.email };
  return { status: 'escalate', reason: `Correção bloqueada: ${FIX_ERROR_PT[r.error]}` };
}
