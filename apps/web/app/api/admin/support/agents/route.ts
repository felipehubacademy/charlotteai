export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support/agents/route.ts
 * CRUD dos atendentes de suporte. Auth por x-admin-secret.
 * GET   -> lista
 * POST  -> cria { name, email?, whatsapp? }
 * PATCH -> atualiza { id, name?, email?, whatsapp?, is_active? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Login próprio (Bearer) com papel que acessa 'support', ou a senha mestra antiga.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'support');
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('support_agents')
    .select('id, name, email, whatsapp, is_active, created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agents: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const name = String(body?.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('support_agents').insert({
    name,
    email: body?.email ? String(body.email).trim().toLowerCase() : null,
    whatsapp: body?.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : null,
    is_active: body?.is_active !== false,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}

export async function PATCH(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const id = String(body?.id ?? '');
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) patch.name = String(body.name).trim();
  if (body?.email !== undefined) patch.email = body.email ? String(body.email).trim().toLowerCase() : null;
  if (body?.whatsapp !== undefined) patch.whatsapp = body.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : null;
  if (body?.is_active !== undefined) patch.is_active = body.is_active === true;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('support_agents').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
