// /api/admin/alerts — caixa de alertas do sino (cada pessoa vê só os seus).
//   GET                         últimos 100 alertas + quantos não lidos
//   PATCH { id, read }          marca um como lido ou não lido
//   PATCH { all: true }         marca todos como lidos
//   DELETE { id }               exclui um
//   DELETE { read: true }       exclui todos os já lidos
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!admin.userId) return NextResponse.json({ alerts: [], unread: 0 });
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { count }] = await Promise.all([
    supabase.from('admin_alerts').select('id, title, body, url, category, created_at, read_at')
      .eq('user_id', admin.userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('admin_alerts').select('id', { count: 'exact', head: true }).eq('user_id', admin.userId).is('read_at', null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [], unread: count ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (body.all === true) {
    await supabase.from('admin_alerts').update({ read_at: new Date().toISOString() } as never).eq('user_id', admin.userId).is('read_at', null);
    return NextResponse.json({ ok: true });
  }
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await supabase.from('admin_alerts').update({ read_at: body.read === false ? null : new Date().toISOString() } as never)
    .eq('id', id).eq('user_id', admin.userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (body.read === true) {
    await supabase.from('admin_alerts').delete().eq('user_id', admin.userId).not('read_at', 'is', null);
    return NextResponse.json({ ok: true });
  }
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await supabase.from('admin_alerts').delete().eq('id', id).eq('user_id', admin.userId);
  return NextResponse.json({ ok: true });
}
