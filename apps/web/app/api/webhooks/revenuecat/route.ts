/**
 * app/api/webhooks/revenuecat/route.ts
 * RevenueCat webhook — keeps charlotte_users.subscription_status in sync
 * whenever a subscription event occurs (purchase, renewal, cancellation, etc.)
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
//   BILLING_ISSUE = falha no pagamento; acesso revogado ate resolver
// Pacotes de minutos avulsos (consumíveis) — grant em segundos de Live Voice.
const MINUTE_PACKS: Record<string, number> = {
  'com.hubacademy.charlotte.minutes10': 10 * 60, //  600 s
  'com.hubacademy.charlotte.minutes30': 30 * 60, // 1800 s
};

const ACTIVE_EVENTS     = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']);
const CANCELLED_EVENTS  = new Set(['CANCELLATION']);
const EXPIRED_EVENTS    = new Set(['EXPIRATION', 'REFUND', 'BILLING_ISSUE']);
const TRIAL_EVENTS      = new Set(['TRIAL_STARTED']);
const TRIAL_CONVERTED   = new Set(['TRIAL_CONVERTED']);

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
  const appUserId = event?.app_user_id as string | undefined; // = Supabase user ID

  if (!eventType || !appUserId) {
    return NextResponse.json({ error: 'Missing event type or app_user_id' }, { status: 400 });
  }

  console.log(`[RC webhook] ${eventType} for user ${appUserId}`);

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
  const { error } = await supabase
    .from('charlotte_users')
    .update({
      subscription_status: subscriptionStatus,
      is_active:           isActive,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', appUserId);

  if (error) {
    console.error('[RC webhook] Supabase update error:', error.message);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  console.log(`[RC webhook] Updated user ${appUserId} → ${subscriptionStatus}`);
  return NextResponse.json({ received: true, eventType, subscriptionStatus });
}
