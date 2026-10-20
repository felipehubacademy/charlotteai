// /api/checkout/asaas/direct — checkout próprio: cartão e Pix no queizy.com, pela API do Asaas.
//   POST { method, name, email, phone, cpf, cep, number, street?, aff?, coupon?, sandbox?, card? }
//        cartão (monthly / annual): cria a assinatura; com teste grátis libera o acesso na hora
//        Pix (annual_pix): cria a cobrança e devolve o QR code para mostrar na página
//        → { id, done } ou { id, pix: { image, payload, expiresAt } } ou { id, pending: true }
//   GET  ?id=  a tela consulta até o pagamento cair → { paid }
//
// O cartão só passa por aqui a caminho do Asaas: nunca é gravado nem vai para log.
// sandbox: ambiente de testes do Asaas, só para os e-mails da equipe (SANDBOX_EMAIL). Nada ali é cobrado.
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  asaasConfigured, asaasSandboxConfigured, AsaasError, ensurePayer, createCardSubscription, createPixPayment,
  getPaymentIn, paymentsOfSubscription, PAID_STATUSES, type CardData,
} from '@/lib/asaas';
import { prepareWebCheckout, checkoutRowFields } from '@/lib/web-checkout';
import { activateTrial, handlePaymentPaid, type CheckoutRow } from '@/lib/asaas-activation';

export const dynamic = 'force-dynamic';

// Equipe: o próprio e-mail com +qualquercoisa. Quem digitar esses e-mails sem ser da equipe não ganha
// nada: a conta (e o acesso de teste) fica num e-mail que só a equipe recebe.
const SANDBOX_EMAIL = /^(felipe\.xavier1987(\+[^@]*)?@gmail\.com|[^@]+@hubacademybr\.com)$/i;

// Robôs testando cartão roubado: depois de 3 recusas na última hora (por IP, e-mail ou CPF), bloqueia.
const CARD_FAILS_MAX = 3;
const CARD_WINDOW_MS = 60 * 60000;

const ROW_COLS = 'id, user_id, plan, method, trial_days, asaas_payment_id, status, asaas_customer_id, asaas_subscription_id, sandbox, pending_payment_id';
type Row = CheckoutRow & { pending_payment_id: string | null };

function luhn(n: string): boolean {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Valida e normaliza o cartão do formulário. Devolve a mensagem de erro ou os dados prontos. */
function readCard(raw: unknown): string | CardData {
  const c = (raw ?? {}) as Record<string, unknown>;
  const number = String(c.number ?? '').replace(/\D/g, '');
  const holderName = String(c.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const [mm, yy] = String(c.expiry ?? '').split('/').map(s => s.replace(/\D/g, ''));
  const ccv = String(c.cvv ?? '').replace(/\D/g, '');
  if (number.length < 13 || number.length > 19 || !luhn(number)) return 'Confira o número do cartão.';
  if (holderName.split(' ').length < 2) return 'Informe o nome como está impresso no cartão.';
  const month = Number(mm); const year = 2000 + Number(yy);
  if (!mm || !yy || yy.length !== 2 || month < 1 || month > 12) return 'Confira a validade do cartão (MM/AA).';
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Esse cartão está vencido.';
  if (ccv.length < 3 || ccv.length > 4) return 'Confira o código de segurança (CVV).';
  return { holderName, number, expiryMonth: String(month).padStart(2, '0'), expiryYear: String(year), ccv };
}

async function cardFails(ip: string | null, email: string, cpf: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - CARD_WINDOW_MS).toISOString();
  const counts = await Promise.all([
    ip ? supabase.from('checkout_attempts').select('id', { count: 'exact', head: true }).eq('kind', 'card').eq('ok', false).eq('ip', ip).gte('created_at', since) : null,
    supabase.from('checkout_attempts').select('id', { count: 'exact', head: true }).eq('kind', 'card').eq('ok', false).eq('email', email).gte('created_at', since),
    supabase.from('checkout_attempts').select('id', { count: 'exact', head: true }).eq('kind', 'card').eq('ok', false).eq('cpf', cpf).gte('created_at', since),
  ]);
  return Math.max(...counts.map(c => c?.count ?? 0));
}

function withCookie(res: NextResponse, id: string): NextResponse {
  // A tela de sucesso usa este cookie para mostrar o e-mail e oferecer "Não é esse? Corrigir".
  res.cookies.set('qz_checkout', id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2 * 86400 });
  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  const email = String(body.email ?? '').trim().toLowerCase();
  const sandbox = body.sandbox === true;
  if (sandbox && (!asaasSandboxConfigured() || !SANDBOX_EMAIL.test(email))) {
    return NextResponse.json({ error: 'O modo de teste é só para a equipe.' }, { status: 403 });
  }
  if (!sandbox && !asaasConfigured()) return NextResponse.json({ error: 'A assinatura pelo site abre em breve. Por enquanto, assine pelo app.' }, { status: 503 });

  const isCard = body.method === 'monthly' || body.method === 'annual';
  let card: CardData | null = null;
  if (isCard) {
    const c = readCard(body.card);
    if (typeof c === 'string') return NextResponse.json({ error: c, field: 'card' }, { status: 400 });
    card = c;
  }
  const cpfRaw = String(body.cpf ?? '').replace(/\D/g, '');
  const ipRaw = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  if (isCard && await cardFails(ipRaw, email, cpfRaw) >= CARD_FAILS_MAX) {
    return NextResponse.json({ error: 'Muitas tentativas com cartão recusado. Tente de novo em 1 hora ou, no plano Anual, pague com Pix.' }, { status: 429 });
  }

  const prep = await prepareWebCheckout(req, body);
  if (!prep.ok) return NextResponse.json({ error: prep.error }, { status: prep.status });
  const { ctx } = prep;
  if (!ctx.payer) return NextResponse.json({ error: 'Não achamos esse CEP. Confira os números.' }, { status: 400 });
  const id = randomUUID();
  const base = { id, ...checkoutRowFields(ctx, req), channel: 'direct', sandbox };

  let customer: string;
  try {
    customer = await ensurePayer(ctx.payer, ctx.u.id, sandbox);
  } catch (e) {
    console.error('[checkout/direct] customer failed:', e instanceof AsaasError ? e.body : (e as Error).message);
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento agora.', fallback: true }, { status: 502 });
  }

  // ---- Pix (Anual) ----
  if (!isCard) {
    try {
      const { payment, qr } = await createPixPayment({ customer, value: ctx.value, userId: ctx.u.id, sandbox });
      await supabase.from('asaas_checkouts').insert({ ...base, asaas_customer_id: customer, status: 'created', pending_payment_id: payment.id } as never);
      return withCookie(NextResponse.json({ id, value: ctx.value, pix: { image: qr.encodedImage, payload: qr.payload, expiresAt: qr.expirationDate } }), id);
    } catch (e) {
      console.error('[checkout/direct] pix failed:', e instanceof AsaasError ? e.body : (e as Error).message);
      return NextResponse.json({ error: 'Não foi possível gerar o Pix agora.', fallback: true }, { status: 502 });
    }
  }

  // ---- Cartão (Mensal ou Anual) ----
  let subscriptionId: string;
  try {
    const sub = await createCardSubscription({
      customer, plan: ctx.plan, value: ctx.value, trialDays: ctx.trialDays, userId: ctx.u.id,
      card: card!, payer: ctx.payer, remoteIp: ctx.ip ?? '0.0.0.0', sandbox,
    });
    subscriptionId = sub.id;
  } catch (e) {
    const declined = e instanceof AsaasError && e.status === 400;
    // Só o motivo devolvido pelo Asaas (não repete o cartão).
    console.warn('[checkout/direct] card refused:', e instanceof AsaasError ? e.body : (e as Error).message);
    await supabase.from('checkout_attempts').insert({ kind: 'card', ok: false, ip: ctx.ip, email: ctx.email, cpf: ctx.cpf } as never);
    if (declined) {
      // A mensagem do Asaas já vem em português (ex.: "Transação não autorizada. Verifique os dados do cartão...").
      const msg = e.message && !/^Asaas \d+$/.test(e.message) ? e.message : 'O cartão não foi autorizado. Confira os dados ou use outro cartão.';
      return NextResponse.json({ error: msg, field: 'card' }, { status: 402 });
    }
    return NextResponse.json({ error: 'Não foi possível processar o cartão agora.', fallback: true }, { status: 502 });
  }
  await supabase.from('checkout_attempts').insert({ kind: 'card', ok: true, ip: ctx.ip, email: ctx.email, cpf: ctx.cpf } as never);
  await supabase.from('asaas_checkouts').insert({ ...base, asaas_customer_id: customer, asaas_subscription_id: subscriptionId, status: 'created' } as never);
  // Se liberar o acesso falhar aqui, a tela segue consultando (GET) e tenta de novo.
  const row = await loadRow(id);
  const done = row ? await settle(row).catch(e => { console.error('[checkout/direct] settle failed:', (e as Error).message); return false; }) : false;
  return withCookie(NextResponse.json({ id, value: ctx.value, done, pending: !done }), id);
}

async function loadRow(id: string): Promise<Row | null> {
  const { data } = await getSupabaseAdmin().from('asaas_checkouts').select(ROW_COLS).eq('id', id).eq('channel', 'direct').maybeSingle();
  return (data as Row | null) ?? null;
}

/**
 * Leva a compra até o fim, se já der: teste grátis → libera o acesso; cobrança paga → mesmo caminho do
 * webhook (uma vez por cobrança). Pode ser chamada de novo pela tela: se algo falhou antes, tenta outra vez.
 */
async function settle(row: Row): Promise<boolean> {
  if (row.status === 'paid') return true;
  const supabase = getSupabaseAdmin();
  const sandbox = !!row.sandbox;
  if (row.asaas_subscription_id && row.trial_days > 0) {
    // Cartão validado na criação da assinatura: começa o teste grátis.
    await activateTrial(row);
    await supabase.from('asaas_checkouts').update({ status: 'paid', updated_at: new Date().toISOString() } as never).eq('id', row.id);
    return true;
  }
  const payments = row.pending_payment_id
    ? [await getPaymentIn(row.pending_payment_id, sandbox)]
    : row.asaas_subscription_id ? await paymentsOfSubscription(row.asaas_subscription_id, sandbox) : [];
  const paid = payments.find(p => PAID_STATUSES.includes(p.status));
  if (!paid) return false;
  await handlePaymentPaid(row, paid);
  return true;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  // Só o navegador que fez a compra consulta.
  if (!id || req.cookies.get('qz_checkout')?.value !== id) return NextResponse.json({ paid: false }, { status: 404 });
  const row = await loadRow(id);
  if (!row) return NextResponse.json({ paid: false }, { status: 404 });
  try {
    return NextResponse.json({ paid: await settle(row) });
  } catch (e) {
    console.error('[checkout/direct] settle failed:', e instanceof AsaasError ? e.body : (e as Error).message);
    return NextResponse.json({ paid: false });
  }
}
