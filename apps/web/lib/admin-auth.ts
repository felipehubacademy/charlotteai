// lib/admin-auth.ts
// Autenticação e permissões do /admin.
//
// Cada pessoa entra com a própria conta (Supabase Auth) e precisa estar em
// admin_members com um papel ativo. O cliente manda o access token no header
// Authorization: Bearer <token>.
//
// Compatibilidade: o header x-admin-secret (senha única antiga) ainda vale
// como "admin", para scripts e para a transição. Remover quando a equipe
// estiver toda com login próprio.

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { markInviteAccepted } from '@/lib/admin-invite';

import { PERMISSIONS, ROLE_LABEL, type AdminRole, type AdminArea } from '@/lib/admin-roles';

export type { AdminRole, AdminArea };
export { ROLE_LABEL };

export interface AdminContext {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: AdminRole;
  legacy: boolean;
  /** Login confirmado com o código do app autenticador (duas etapas). */
  mfa: boolean;
}

/** Computador de confiança (30 dias): o navegador manda a chave no header x-admin-device; aqui só o hash. */
export const TRUSTED_DEVICE_DAYS = 30;
export const hashDeviceToken = (t: string) => createHash('sha256').update(t).digest('hex');
async function isTrustedDevice(userId: string, deviceToken: string): Promise<boolean> {
  if (!deviceToken || deviceToken.length < 20) return false;
  const { data } = await getSupabaseAdmin().from('admin_trusted_devices').select('id')
    .eq('user_id', userId).eq('token_hash', hashDeviceToken(deviceToken)).gt('expires_at', new Date().toISOString()).maybeSingle();
  return !!data;
}

/** Nível de garantia do token do Supabase: 'aal2' = passou pela segunda etapa. */
function tokenAal(token: string): string | null {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).aal ?? null; } catch { return null; }
}

export function can(role: AdminRole, area: AdminArea): boolean {
  return PERMISSIONS[role]?.includes(area) ?? false;
}

export function areasFor(role: AdminRole): AdminArea[] {
  return PERMISSIONS[role] ?? [];
}

/**
 * Identifica quem está chamando. null = não é admin.
 * Login com e-mail exige as duas etapas (código do app autenticador), salvo em computador de confiança
 * (x-admin-device, 30 dias). Só o /api/admin/me aceita
 * o login sem a segunda etapa (allowPendingMfa), para a tela de login saber que falta o código.
 */
export async function getAdmin(req: NextRequest, opts?: { allowPendingMfa?: boolean }): Promise<AdminContext | null> {
  // A senha mestra não entra mais no /admin (pulava a verificação em duas etapas): só e-mail, senha e código.

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return null;

  const { data: member } = await supabase
    .from('admin_members')
    .select('role, active, name, email, accepted_at')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  const m = member as { role: AdminRole; active: boolean; name: string | null; email: string; accepted_at: string | null } | null;
  if (!m || !m.active) return null;
  // Primeiro acesso de quem foi convidado: marca o aceite e avisa quem convidou.
  if (!m.accepted_at) await markInviteAccepted(userData.user.id).catch(e => console.warn('[admin] aceite', e));

  // Segunda etapa feita nesta sessão, ou computador marcado como de confiança há menos de 30 dias.
  const mfa = tokenAal(token) === 'aal2' || await isTrustedDevice(userData.user.id, req.headers.get('x-admin-device') ?? '');
  if (!mfa && !opts?.allowPendingMfa) return null;
  return { userId: userData.user.id, email: m.email, name: m.name, role: m.role, legacy: false, mfa };
}

/**
 * Exige um admin com acesso à área. Retorna o contexto ou uma resposta de
 * erro pronta (401 sem login, 403 sem permissão).
 */
export async function requireAdmin(
  req: NextRequest,
  area: AdminArea,
): Promise<AdminContext | NextResponse> {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!can(admin.role, area)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return admin;
}

/** Registra uma ação no log de auditoria (não bloqueia em caso de erro). */
export async function audit(
  admin: AdminContext,
  action: string,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await getSupabaseAdmin().from('admin_audit_log').insert({
      actor_id: admin.userId,
      actor_email: admin.email ?? (admin.legacy ? 'senha-mestra' : null),
      action, entity, entity_id: entityId, details: details ?? null,
    } as never);
  } catch (e) {
    console.warn('[admin audit] failed:', e);
  }
}
