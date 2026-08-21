/**
 * lib/purchases.ts
 * RevenueCat integration layer.
 *
 * Responsabilidades:
 *  1. Inicializar o SDK com a API key correta por plataforma
 *  2. Identificar o usuário (login/logout)
 *  3. Buscar offerings (planos disponíveis)
 *  4. Comprar / restaurar compras
 *  5. Verificar entitlement "Premium" localmente
 *  6. Sincronizar status com Supabase após compra/restauração
 *
 * Product IDs (configurados no App Store Connect + RevenueCat):
 *   com.hubacademy.charlotte.monthly  — R$ 29,90/mês  (7-day trial)
 *   com.hubacademy.charlotte.yearly   — R$ 199,90/ano (7-day trial)
 *
 * Entitlement ID: "Premium" (confirmado no dashboard RevenueCat 2026-08-21)
 * Offering ID:    "default"
 */

import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// ── API Keys ──────────────────────────────────────────────────────────────────
// Replace REVENUECAT_IOS_KEY and REVENUECAT_ANDROID_KEY with your actual keys
// from RevenueCat Dashboard → Project Settings → API Keys → Public app-specific keys
const RC_IOS_KEY     = 'appl_ZfuDMNvBXEVXSjWSAErBuiihcPv';
const RC_ANDROID_KEY = 'goog_hIkklVeoKyULqjSKpqojZUiZwVg';

export const ENTITLEMENT_ID = 'Premium';
export const PRODUCT_MONTHLY = 'com.hubacademy.charlotte.monthly';
export const PRODUCT_YEARLY  = 'com.hubacademy.charlotte.yearly';

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPurchases() {
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
}

// ── Identify user ─────────────────────────────────────────────────────────────
export async function identifyUser(userId: string) {
  try {
    console.log('[purchases] identifyUser START', userId);
    const r = await Purchases.logIn(userId);
    console.log('[purchases] identifyUser OK', {
      created: r.created,
      anonymous: r.customerInfo.originalAppUserId?.startsWith('$RCAnonymousID'),
      activeEntitlements: Object.keys(r.customerInfo.entitlements.active),
    });
  } catch (e) {
    console.warn('[purchases] identifyUser error:', e);
  }
}

export async function resetUser() {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('[purchases] resetUser error:', e);
  }
}

// ── Fetch current offering ────────────────────────────────────────────────────
export interface OfferingResult {
  offering: PurchasesOffering | null;
  errorMessage?: string;
  diagnostics?: string;
}

export async function getOfferingDetailed(): Promise<OfferingResult> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (current && current.availablePackages.length > 0) {
      return { offering: current };
    }

    // Sem offering atual OU offering existe mas sem pacotes disponíveis
    const allOfferings = Object.keys(offerings.all);
    const diag = [
      `Platform: ${Platform.OS}`,
      `offerings.current: ${current ? current.identifier : 'null'}`,
      `offerings.all keys: [${allOfferings.join(', ')}]`,
      `current.packages: ${current?.availablePackages.length ?? 0}`,
    ].join(' | ');

    console.warn('[purchases] no current offering or no packages:', diag);

    return {
      offering: null,
      errorMessage: current
        ? 'Os produtos deste app ainda não estão prontos. Isso pode acontecer se os IAPs ainda não foram aprovados pela Apple ou se o Paid Apps Agreement não está ativo.'
        : 'Nenhuma oferta de plano disponível. Verifique se o RevenueCat está conectado ao App Store Connect.',
      diagnostics: diag,
    };
  } catch (e: any) {
    const raw = e?.message ?? e?.code ?? String(e);
    console.warn('[purchases] getOffering error:', e);
    return {
      offering: null,
      errorMessage: `Erro ao buscar planos: ${raw}`,
      diagnostics: raw,
    };
  }
}

// Legacy wrapper — mantém compatibilidade com callers existentes
export async function getOffering(): Promise<PurchasesOffering | null> {
  const r = await getOfferingDetailed();
  return r.offering;
}

// ── Listen for customer info updates (purchases, renewals, expirations) ─────
// Used in AuthProvider to sync local profile state immediately on purchase,
// independent of Supabase write / replication delay.
export function onCustomerInfoUpdate(cb: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

// ── Check entitlement ─────────────────────────────────────────────────────────
export async function checkPremiumAccess(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch (e) {
    console.warn('[purchases] checkPremiumAccess error:', e);
    return false;
  }
}

// ── Purchase a package ────────────────────────────────────────────────────────
export async function purchasePackage(
  pkg: import('react-native-purchases').PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo; cancelled?: boolean; errorCode?: number }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false, cancelled: true };
    // e?.code pode vir string ('7') ou number — normaliza
    const rawCode = e?.code;
    const errorCode = typeof rawCode === 'number' ? rawCode : Number(rawCode);
    return { success: false, errorCode: Number.isFinite(errorCode) ? errorCode : undefined };
  }
}

// ── Restore purchases ─────────────────────────────────────────────────────────
export interface RestoreResult {
  success: boolean;
  hasPremium: boolean;
  customerInfo?: CustomerInfo;
  errorCode?: number;
}

export async function restorePurchases(): Promise<RestoreResult> {
  try {
    const info = await Purchases.restorePurchases();
    return {
      success: true,
      hasPremium: !!info.entitlements.active[ENTITLEMENT_ID],
      customerInfo: info,
    };
  } catch (e: any) {
    const rawCode = e?.code;
    const errorCode = typeof rawCode === 'number' ? rawCode : Number(rawCode);
    return {
      success: false,
      hasPremium: false,
      errorCode: Number.isFinite(errorCode) ? errorCode : undefined,
    };
  }
}

// ── Sync to Supabase ──────────────────────────────────────────────────────────
// Called after purchase/restore and on app foreground — keeps DB in sync com RC.
// RevenueCat webhook também faz isso server-side, mas este é o sync client-side
// imediato para não depender do webhook.
//
// IMPORTANTE: respeita o grace period de novos usuários (status='none'/null/'trial'):
// quando RC não tem entitlement ativa, só força 'expired' se o user ANTES tinha
// status pago ('active'|'expired'|'cancelled'). Para novos que nunca pagaram,
// preserva o status atual (ex: 'none' durante placement test).
//
// Retorna: status final gravado (pra caller saber se houve force-expire).
export async function syncSubscriptionToSupabase(
  userId: string,
  customerInfo: CustomerInfo,
  opts?: { previousStatus?: string | null },
): Promise<{ updated: boolean; hasPremium: boolean }> {
  // Defesa contra cache stale do RC: mesmo que entitlements.active diga que
  // está ativo, se latestExpirationDate ja passou, trata como expirado.
  // Isso fecha a brecha onde o SDK retorna dados em cache apos a expiracao.
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const rawActive = !!entitlement;
  const expiresAtRaw = customerInfo.latestExpirationDate;
  const expiredByDate = expiresAtRaw
    ? new Date(expiresAtRaw).getTime() < Date.now()
    : false;
  const hasPremium = rawActive && !expiredByDate;
  // User cancelou auto-renew mas ainda tem acesso ate expires_at.
  // RC sinaliza via willRenew=false na entitlement ativa.
  const willRenew = entitlement?.willRenew ?? true;
  const isCancelled = hasPremium && !willRenew;

  // Map product identifier to 'monthly' | 'yearly' | null.
  //
  // Android Google Play Billing v5+ retorna activeSubscriptions como
  // "productId:basePlanId" (ex: "com.hubacademy.charlotte.monthly:monthly").
  // iOS StoreKit retorna apenas "com.hubacademy.charlotte.monthly".
  //
  // Prioridade: entitlement.productIdentifier (geralmente limpo), depois
  // activeSubscriptions[0] com split(':') como fallback. Match por startsWith
  // pra cobrir qualquer variação futura do formato Android.
  const entitlementProduct =
    customerInfo.entitlements.active[ENTITLEMENT_ID]?.productIdentifier ?? null;
  const activeProductRaw = customerInfo.activeSubscriptions?.[0] ?? null;
  const activeProductNormalized = activeProductRaw?.split(':')[0] ?? null;
  const candidate = entitlementProduct ?? activeProductNormalized ?? '';
  const product: 'monthly' | 'yearly' | null =
    candidate.startsWith(PRODUCT_MONTHLY) ? 'monthly' :
    candidate.startsWith(PRODUCT_YEARLY)  ? 'yearly'  : null;

  // Grace period guard: se não tem premium E user nunca teve status pago,
  // preserva o status atual (evita sobrescrever 'none' → 'expired').
  const hadPaidStatus =
    opts?.previousStatus === 'active' ||
    opts?.previousStatus === 'expired' ||
    opts?.previousStatus === 'cancelled';

  if (!hasPremium && !hadPaidStatus) {
    return { updated: false, hasPremium: false };
  }

  const update: Record<string, unknown> = {
    subscription_status:     hasPremium ? (isCancelled ? 'cancelled' : 'active') : 'expired',
    is_active:               hasPremium,
    subscription_product:    hasPremium ? product : null,
    subscription_expires_at: customerInfo.latestExpirationDate ?? null,
    updated_at:              new Date().toISOString(),
  };

  const { error } = await supabase
    .from('charlotte_users')
    .update(update)
    .eq('id', userId);

  if (error) {
    console.warn('[purchases] syncSubscriptionToSupabase error:', error.message);
    return { updated: false, hasPremium };
  }
  return { updated: true, hasPremium };
}
