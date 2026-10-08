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
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import { PERMISSIONS, ROLE_LABEL, type AdminRole, type AdminArea } from '@/lib/admin-roles';

export type { AdminRole, AdminArea };
export { ROLE_LABEL };

export interface AdminContext {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: AdminRole;
  legacy: boolean;
}

export function can(role: AdminRole, area: AdminArea): boolean {
  return PERMISSIONS[role]?.includes(area) ?? false;
}

export function areasFor(role: AdminRole): AdminArea[] {
  return PERMISSIONS[role] ?? [];
}

/** Identifica quem está chamando. null = não é admin. */
export async function getAdmin(req: NextRequest): Promise<AdminContext | null> {
  const secret = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  if (process.env.ADMIN_SECRET && secret && secret === process.env.ADMIN_SECRET) {
    return { userId: null, email: null, name: 'Senha mestra', role: 'admin', legacy: true };
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return null;

  const { data: member } = await supabase
    .from('admin_members')
    .select('role, active, name, email')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  const m = member as { role: AdminRole; active: boolean; name: string | null; email: string } | null;
  if (!m || !m.active) return null;

  return { userId: userData.user.id, email: m.email, name: m.name, role: m.role, legacy: false };
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
