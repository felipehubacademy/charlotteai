export const dynamic = 'force-dynamic';

/**
 * app/api/admin/users/route.ts
 * Admin API — list, create, update and delete charlotte users.
 * Protected by ADMIN_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { inviteTemplate } from '@/lib/email-templates';
import { usersListQuery, type UsersFilter, type UsersSort } from '@/lib/admin-users-list';


// Login próprio (Bearer) com papel que acessa 'users', ou a senha mestra antiga.
async function checkAuth(req: NextRequest, area: 'users' | 'users:write' | 'users:delete' = 'users') {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, area);
}

// ── GET /api/admin/users — página da lista (filtro, busca e ordem no servidor) + contagens + números dos cards ────────────────
export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await usersListQuery({
    page: Number(sp.get('page') ?? 1) || 1,
    per: Number(sp.get('per') ?? 25) || 25,
    q: sp.get('q') ?? '',
    filter: (sp.get('filter') ?? 'all') as UsersFilter,
    sort: (sp.get('sort') ?? 'created_at') as UsersSort,
    dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
    fresh: sp.get('fresh') === '1',
    idsOnly: sp.get('ids') === '1',
  }));
}

// ── POST /api/admin/users — create a new user ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await checkAuth(req, 'users:write'))) return NextResponse.json({ error: 'Sem permissão para editar alunos.' }, { status: 403 });

  const body = await req.json();
  let { password } = body;
  const {
    email, name,
    charlotte_level       = null,
    is_institutional      = true,
    is_active             = true,
    subscription_status   = 'none',
    must_change_password  = true,
    placement_test_done   = false,
    is_admin              = false,
  } = body;

  // Senha temporária vai no e-mail de convite: espaço colado no começo/fim impede o primeiro login.
  if (typeof password === 'string') password = password.trim();
  // Toda conta precisa de nome, e-mail e senha.
  if (!String(name ?? '').trim() || !String(email ?? '').trim().includes('@') || !password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Profile fields shared between create and "already exists" update paths
  const profileFields = {
    name:                name || null,
    is_institutional,
    must_change_password,
    placement_test_done,
    is_active,
    subscription_status: is_institutional ? 'none' : subscription_status,
    is_admin,
    ...(charlotte_level ? { charlotte_level } : {}),
  };

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || null, is_institutional },
  });

  if (authError) {
    // ── Usuário já existe no auth.users — tentar atualizar perfil ─────────────
    const alreadyExists =
      /already registered|already been registered/i.test(authError.message ?? '');

    if (!alreadyExists) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 1. Busca UUID em charlotte_users pelo email (caminho mais rápido)
    const { data: existingProfile } = await supabase
      .from('charlotte_users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    let userId: string | undefined = existingProfile?.id as string | undefined;

    // 2. Último recurso: Management REST API do auth
    if (!userId) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
        },
      );
      const json = await res.json();
      userId = (json?.users?.[0]?.id) as string | undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário já registrado mas UUID não encontrado. Verifique no Supabase.' },
        { status: 409 },
      );
    }

    // Upsert charlotte_users — cria se não existir, atualiza se existir
    const { error: upsertErr } = await supabase
      .from('charlotte_users')
      .upsert(
        { id: userId, email, charlotte_level: charlotte_level || 'Novice', ...profileFields },
        { onConflict: 'id' },
      );

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Atualiza senha e confirma email no auth.users
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email,
      email_confirm: true,
    });

    // Envia email de convite
    if (email && name) {
      const { subject, html } = inviteTemplate({ name, email, tempPassword: password });
      sendEmail({ to: email, subject, html }).catch(() => {});
    }

    return NextResponse.json({ success: true, userId, note: 'existing_user_updated' });
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from('charlotte_users')
    .update(profileFields)
    .eq('id', userId);

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Envia email de convite (fire-and-forget — nao bloqueia resposta)
  if (email && name) {
    const { subject, html } = inviteTemplate({ name, email, tempPassword: password });
    sendEmail({ to: email, subject, html }).catch(() => {});
  }

  return NextResponse.json({ success: true, userId });
}

// ── PATCH /api/admin/users — update a user ────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!(await checkAuth(req, 'users:write'))) return NextResponse.json({ error: 'Sem permissão para editar alunos.' }, { status: 403 });

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Allowed editable fields (email included — updates both charlotte_users and auth.users)
  const allowed = [
    'name', 'email', 'charlotte_level', 'is_institutional',
    'is_active', 'subscription_status', 'trial_ends_at',
    'must_change_password', 'placement_test_done', 'beta_features',
    'is_admin',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  const hasEmail = Boolean(fields.email);

  if (Object.keys(updates).length === 0 && !hasEmail) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  // Garantir que institucional nunca fique com subscription_status != 'none'
  if (updates.is_institutional === true) updates.subscription_status = 'none';
  else if ('is_institutional' in updates && !updates.is_institutional && 'subscription_status' in updates) {
    // nao faz nada — deixa o valor enviado
  }

  // Update charlotte_users (only if there are fields beyond auth-only)
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('charlotte_users')
      .update(updates)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync email in auth.users (admin bypass — no confirmation email sent)
  if (hasEmail) {
    const { error: emailError } = await supabase.auth.admin.updateUserById(
      id,
      { email: fields.email as string, email_confirm: true },
    );
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/admin/users — delete a user ───────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await checkAuth(req, 'users:delete'))) return NextResponse.json({ error: 'Sem permissão para excluir alunos.' }, { status: 403 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Deleting auth user cascades to charlotte.users via ON DELETE CASCADE
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
