/**
 * app/api/webhooks/revenuecat/route.ts
 * RevenueCat webhook — keeps charlotte_users.subscription_status in sync
 * whenever a subscription event occurs (purchase, renewal, cancellation, etc.)
 *
 * Desde 2026-10-31: cada aviso é registrado em rc_webhook_events e a assinatura é gravada a partir do estado
 * ATUAL na RevenueCat (lib/rc-subscription, a mesma regra da sincronização do app e da conferência diária),
 * não do tipo do aviso. Assim aviso atrasado, fora de ordem ou de tipo novo não deixa o banco errado.
 * A leitura do aviso (abaixo) fica só como reserva quando a RevenueCat não responde.
 *
 * Setup in RevenueCat Dashboard:
 *   Project Settings → Integrations → Webhooks
 *   URL: https://charlotte.hubacademybr.com/api/webhooks/revenuecat
 *   Authorization header: set a secret and add it to REVENUECAT_WEBHOOK_SECRET env var
 *
 * Docs: https://www.revenuecat.com/docs/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordRevenueEvent } from '@/lib/revenue';
import { welcomeSubscriberTemplate } from '@/lib/email-templates';
import { sendOrQueue } from '@/lib/email-outbox';
import { reconcileStoreSubscription, logRcEvent, type ReconcileResult } from '@/lib/rc-subscription';
import { closeSiteAfterStore } from '@/lib/asaas-reconcile';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role for server-side writes
);

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? '';

// RevenueCat event types that affect subscription status.
//
// Distincao importante:
//   CANCELLATION = user desligou auto-renew; ainda tem acesso ate expires_at
//   EXPIRATION   = assinatura terminou de fato; acesso revogado
//   REFUND       = reembolso emitido; acesso revogado imediato
//   BILLING_ISSUE = falha no pagamento; a loja dá carência: acesso continua, mas não renova (como cancelado)
// Pacotes de minutos avulsos (consumíveis) — grant em segundos de Live Voice.
const MINUTE_PACKS: Record<string, number> = {
  'com.hubacademy.charlotte.minutes10': 10 * 60, //  600 s
  'com.hubacademy.charlotte.minutes30': 30 * 60, // 1800 s
};

const ACTIVE_EVENTS     = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']);
const CANCELLED_EVENTS  = new Set(['CANCELLATION', 'BILLING_ISSUE']);
const EXPIRED_EVENTS    = new Set(['EXPIRATION', 'REFUND']);
const TRIAL_EVENTS      = new Set(['TRIAL_STARTED']);
const TRIAL_CONVERTED   = new Set(['TRIAL_CONVERTED']);
// A loja empurrou o vencimento (Google/Apple estendem teste ou período; a RevenueCat dá acesso
// temporário quando a loja está fora). Só move o prazo para frente; cancelado continua cancelado.
const EXTENSION_EVENTS  = new Set(['SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event     = body?.event;
  const eventType = event?.type as string | undefined;
  // = Supabase user ID. Compra feita antes de o app identificar a conta chega com o ID anônimo da RevenueCat
  // ($RCAnonymousID:...): nesse caso a nossa conta está entre os apelidos (aliases) do aviso.
  const appUserId = pickOurUserId(event);

  if (!eventType || !appUserId) {
    return NextResponse.json({ error: 'Missing event type or app_user_id' }, { status: 400 });
  }

  console.log(`[RC webhook] ${eventType} for user ${appUserId}`);

  // Registro de todo aviso recebido (investigar qualquer caso pelo banco). Reenvio do mesmo aviso não duplica.
  const eventKey = String(event?.id ?? `${eventType}:${appUserId}:${event?.event_timestamp_ms ?? Date.now()}`);
  const eventAt = Number(event?.event_timestamp_ms) > 0 ? new Date(Number(event.event_timestamp_ms)).toISOString() : null;
  const logEvent = (result: unknown) => logRcEvent({
    event_id: eventKey, event_type: eventType, app_user_id: appUserId,
    environment: event?.environment ?? null, event_at: eventAt, payload: event, result,
  });
  await logEvent({ action: 'received' });

  // Receita automática no Financeiro (idempotente; nunca bloqueia o webhook).
  await recordRevenueEvent({ ...event, app_user_id: appUserId });

  // ── Compra de minutos avulsos (consumível) ───────────────────────────────
  // Concede minutos de Live Voice como saldo bônus (não zera no mês). Grant
  // idempotente por event.id (o webhook pode reenviar). Vale pra TODO usuário
  // (inclusive institucional — eles também compram avulso).
  if (eventType === 'NON_RENEWING_PURCHASE') {
    const productId = event?.product_id as string | undefined;
    const eventId   = event?.id as string | undefined;
    const seconds   = productId ? MINUTE_PACKS[productId] : undefined;

    if (!productId || !eventId || !seconds) {
      return NextResponse.json({ received: true, action: 'ignored_non_renewing', productId });
    }

    const { data: granted, error: rpcErr } = await supabase.rpc('grant_live_voice_minutes', {
      p_user_id:    appUserId,
      p_event_id:   eventId,
      p_seconds:    seconds,
      p_product_id: productId,
    });

    if (rpcErr) {
      console.error('[RC webhook] grant_live_voice_minutes error:', rpcErr.message);
      return NextResponse.json({ error: 'grant failed' }, { status: 500 });
    }

    console.log(`[RC webhook] minutes grant user ${appUserId} +${seconds}s (${productId}) granted=${granted}`);
    return NextResponse.json({ received: true, eventType, productId, seconds, granted });
  }

  // ── Assinatura: estado atual na RevenueCat (fonte da verdade) ─────────────
  let rc: ReconcileResult | null = null;
  try {
    rc = await reconcileStoreSubscription(appUserId);
  } catch (e) {
    console.error('[RC webhook] reconcile error:', e);
  }
  if (rc && !(rc.action === 'skipped' && rc.reason === 'store_unavailable')) {
    await logEvent(rc);
    // Assinou na loja depois de cartão recusado no site: não paga nos dois lugares.
    if (rc.action !== 'skipped' && rc.state.hasPremium) {
      await closeSiteAfterStore(appUserId).catch(e => console.error('[RC webhook] encerrar site:', e));
    }
    // Começou o teste grátis pela loja: e-mail de boas-vindas, uma vez só por pessoa.
    if (rc.action !== 'skipped' && isTrialStart(eventType, event)) {
      await sendTrialWelcome(appUserId, rc.state.expiresAt).catch(e => console.error('[RC webhook] trial welcome error:', e));
    }
    console.log(`[RC webhook] ${eventType} user ${appUserId} → ${rc.action}${rc.action !== 'skipped' ? ` (${rc.state.status})` : ` (${rc.reason})`}`);
    return NextResponse.json({ received: true, eventType, reconcile: rc.action });
  }
  // RevenueCat fora do ar (ou sem chave): reserva — lê o próprio aviso, como antes.

  // ── Extensão de prazo ─────────────────────────────────────────────────────
  if (EXTENSION_EVENTS.has(eventType)) {
    const extMs = Number(event?.expiration_at_ms ?? 0);
    if (!(extMs > 0)) return NextResponse.json({ received: true, action: 'ignored_no_expiration', eventType });
    const { data: cur } = await supabase
      .from('charlotte_users')
      .select('is_institutional, subscription_status, subscription_expires_at, trial_ends_at')
      .eq('id', appUserId)
      .maybeSingle();
    if (!cur) return NextResponse.json({ received: true, action: 'unknown_user', eventType });
    if (cur.is_institutional) return NextResponse.json({ received: true, action: 'skipped_institutional', eventType });
    const curMs = cur.subscription_expires_at ? new Date(cur.subscription_expires_at).getTime() : 0;
    if (extMs <= curMs) return NextResponse.json({ received: true, action: 'already_later', eventType });
    const extIso = new Date(extMs).toISOString();
    const keep = ['active', 'trial', 'cancelled'].includes(cur.subscription_status ?? '');
    const inTrial = String(event?.period_type ?? '').toUpperCase() === 'TRIAL';
    const { error: extErr } = await supabase
      .from('charlotte_users')
      .update({
        subscription_expires_at: extIso,
        is_active: true,
        ...(keep ? {} : { subscription_status: 'active' }),
        ...(inTrial && cur.trial_ends_at ? { trial_ends_at: extIso } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appUserId);
    if (extErr) {
      console.error('[RC webhook] extension update error:', extErr.message);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
    console.log(`[RC webhook] ${eventType} user ${appUserId} → expira ${extIso}`);
    return NextResponse.json({ received: true, eventType, expires: extIso });
  }

  // ── Map event → subscription_status ──────────────────────────────────────
  let subscriptionStatus: string | null = null;
  let isActive: boolean | null          = null;

  if (ACTIVE_EVENTS.has(eventType) || TRIAL_CONVERTED.has(eventType)) {
    subscriptionStatus = 'active';
    isActive           = true;
  } else if (TRIAL_EVENTS.has(eventType)) {
    subscriptionStatus = 'trial';
    isActive           = true;
  } else if (CANCELLED_EVENTS.has(eventType)) {
    // User desligou auto-renew mas ainda tem acesso ate expires_at.
    // hasAccess no client valida subscription_expires_at antes de liberar.
    subscriptionStatus = 'cancelled';
    isActive           = true;
  } else if (EXPIRED_EVENTS.has(eventType)) {
    subscriptionStatus = 'expired';
    isActive           = false;
  } else {
    // Unhandled event type — acknowledge but don't update
    return NextResponse.json({ received: true, action: 'ignored', eventType });
  }

  // ── Ignorar usuários institucionais — assinatura gerenciada manualmente ──
  const { data: userRow } = await supabase
    .from('charlotte_users')
    .select('is_institutional')
    .eq('id', appUserId)
    .maybeSingle();

  if (userRow?.is_institutional) {
    console.log(`[RC webhook] Skipped institutional user ${appUserId} (${eventType})`);
    return NextResponse.json({ received: true, action: 'skipped_institutional', eventType });
  }

  // ── Update Supabase ───────────────────────────────────────────────────────
  // Vencimento vem da loja: sem ele, quem renova (ou sai do teste) fica com a data antiga no banco
  // até abrir o app, e o /admin, os avisos e o suporte enxergam a assinatura como vencida.
  const expirationMs = Number(event?.expiration_at_ms ?? 0);
  const expiresIso   = expirationMs > 0 ? new Date(expirationMs).toISOString() : null;
  const { error } = await supabase
    .from('charlotte_users')
    .update({
      subscription_status: subscriptionStatus,
      is_active:           isActive,
      ...(expiresIso ? { subscription_expires_at: expiresIso } : {}),
      ...(expiresIso && TRIAL_EVENTS.has(eventType) ? { trial_ends_at: expiresIso } : {}),
      updated_at:          new Date().toISOString(),
    })
    .eq('id', appUserId);

  if (error) {
    console.error('[RC webhook] Supabase update error:', error.message);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  console.log(`[RC webhook] Updated user ${appUserId} → ${subscriptionStatus}`);

  if (isTrialStart(eventType, event)) await sendTrialWelcome(appUserId, expiresIso).catch(e => console.error('[RC webhook] trial welcome error:', e));

  await logEvent({ action: 'fallback_event', subscriptionStatus });
  return NextResponse.json({ received: true, eventType, subscriptionStatus, fallback: true });
}

// Começo do teste grátis pela loja (a loja manda INITIAL_PURCHASE com period_type TRIAL; TRIAL_STARTED por garantia).
function isTrialStart(eventType: string, event: { period_type?: unknown }): boolean {
  return TRIAL_EVENTS.has(eventType)
    || (eventType === 'INITIAL_PURCHASE' && String(event?.period_type ?? '').toUpperCase() === 'TRIAL');
}

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

async function sendTrialWelcome(userId: string, trialEndsIso: string | null): Promise<void> {
  // Marca antes de enviar: se a loja repetir o aviso, ninguém recebe duas vezes.
  const { data } = await supabase
    .from('charlotte_users')
    .update({ trial_welcome_sent_at: new Date().toISOString() })
    .eq('id', userId)
    .is('trial_welcome_sent_at', null)
    .select('name, email, charlotte_level')
    .maybeSingle();
  const u = data as { name: string | null; email: string | null; charlotte_level: string | null } | null;
  if (!u?.email) return;
  const end = trialEndsIso ? new Date(trialEndsIso) : null;
  const trialEndsAt = end
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(end) + ' de '
      + MONTHS_PT[Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', month: 'numeric' }).format(end)) - 1]
    : '7 dias';
  const { subject, html } = welcomeSubscriberTemplate({
    name: (u.name ?? '').trim().split(/\s+/)[0] || u.email.split('@')[0],
    level: u.charlotte_level ?? 'Novice',
    trialEndsAt,
  });
  await sendOrQueue({ kind: 'trial_welcome', to: u.email, subject, html });
  console.log(`[RC webhook] trial welcome → ${u.email}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function pickOurUserId(event: { app_user_id?: unknown; original_app_user_id?: unknown; aliases?: unknown; transferred_to?: unknown } | undefined): string | undefined {
  const ids = [event?.app_user_id, event?.original_app_user_id, ...(Array.isArray(event?.aliases) ? event!.aliases as unknown[] : [])]
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  return ids.find(x => UUID_RE.test(x)) ?? ids[0];
}
