// GET /api/admin/me — quem está logado no admin e o que pode acessar.
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, areasFor, ROLE_LABEL } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req, { allowPendingMfa: true });
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Membro da equipe que entrou só com a senha: falta o código das duas etapas.
  if (!admin.legacy && !admin.mfa) return NextResponse.json({ error: 'mfa_required' }, { status: 401 });
  // Tela inicial escolhida em Minha conta (só para quem entrou com e-mail).
  let homePath: string | null = null;
  if (!admin.legacy && admin.userId) {
    const { data } = await getSupabaseAdmin().from('admin_prefs').select('home_path').eq('user_id', admin.userId).maybeSingle();
    homePath = (data as { home_path?: string | null } | null)?.home_path ?? null;
  }
  return NextResponse.json({
    homePath,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    roleLabel: ROLE_LABEL[admin.role],
    areas: areasFor(admin.role),
    legacy: admin.legacy,
  });
}
