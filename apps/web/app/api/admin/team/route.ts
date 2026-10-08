// /api/admin/team — equipe do admin (só o papel "owner" acessa).
//   GET    lista membros
//   POST   { email, name, role } adiciona. Se a pessoa ainda não tem conta,
//          cria com senha temporária (devolvida uma única vez para repassar).
//   PATCH  { id, role?, active? } muda papel ou desativa/reativa
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit, AdminRole } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const ROLES: AdminRole[] = ['owner', 'partner', 'finance', 'support', 'viewer'];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'team');
  if (admin instanceof NextResponse) return admin;
  const { data, error } = await getSupabaseAdmin()
    .from('admin_members')
    .select('id, user_id, email, name, role, active, created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

async function findAuthUserId(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  // charlotte_users espelha auth.users (mesmo id) e permite buscar por e-mail.
  const { data } = await supabase.from('charlotte_users').select('id').ilike('email', email).maybeSingle();
  if (data && (data as { id: string }).id) return (data as { id: string }).id;
  // Contas sem perfil no app: procura nas primeiras páginas do Auth.
  for (let page = 1; page <= 10; page++) {
    const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = list?.users?.find(u => (u.email ?? '').toLowerCase() === email);
    if (hit) return hit.id;
    if (!list?.users?.length || list.users.length < 1000) break;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'team');
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim() || null;
  const role = String(body.role ?? '') as AdminRole;
  if (!email.includes('@') || !ROLES.includes(role)) {
    return NextResponse.json({ error: 'E-mail e papel válidos são obrigatórios.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let userId = await findAuthUserId(email);
  let tempPassword: string | null = null;

  if (!userId) {
    tempPassword = randomBytes(9).toString('base64url');
    const { data, error } = await supabase.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error || !data?.user) {
      return NextResponse.json({ error: error?.message ?? 'Não foi possível criar a conta.' }, { status: 500 });
    }
    userId = data.user.id;
  }

  const { data: member, error } = await supabase
    .from('admin_members')
    .upsert({ user_id: userId, email, name, role, active: true, invited_by: admin.userId, updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' })
    .select('id, user_id, email, name, role, active, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(admin, 'team.add', 'admin_member', (member as { id: string }).id, { email, role, newAccount: !!tempPassword });
  return NextResponse.json({ member, tempPassword });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req, 'team');
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase.from('admin_members').select('user_id, role, active').eq('id', id).maybeSingle();
  const cur = current as { user_id: string; role: AdminRole; active: boolean } | null;
  if (!cur) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    update.role = body.role;
  }
  if (body.active !== undefined) update.active = !!body.active;

  // Nunca deixar o admin sem nenhum dono ativo.
  const losingOwner = cur.role === 'owner' && cur.active && (update.role && update.role !== 'owner' || update.active === false);
  if (losingOwner) {
    const { count } = await supabase.from('admin_members').select('id', { count: 'exact', head: true }).eq('role', 'owner').eq('active', true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'É preciso ter pelo menos um dono ativo.' }, { status: 400 });
    }
  }

  const { data, error } = await supabase.from('admin_members').update(update as never).eq('id', id)
    .select('id, user_id, email, name, role, active, created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(admin, 'team.update', 'admin_member', id, update);
  return NextResponse.json({ member: data });
}
