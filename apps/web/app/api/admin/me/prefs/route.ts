// /api/admin/me/prefs — tela Minha conta do /admin (cada pessoa só mexe nas próprias preferências).
// GET: preferências + aparelhos com alertas ativos. PUT: salva preferências e nome.
// DELETE { deviceId }: remove um aparelho dos alertas. POST { action: 'signout_all' }: sai de todos os aparelhos.
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, areasFor, ROLE_LABEL } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_PREFS, PUSH_CATEGORIES, EMAIL_REPORTS, type AdminPrefs } from '@/lib/admin-prefs';

export const dynamic = 'force-dynamic';

async function me(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || admin.legacy || !admin.userId) return null;
  return admin as typeof admin & { userId: string };
}

export async function GET(req: NextRequest) {
  const admin = await me(req);
  if (!admin) return NextResponse.json({ error: 'Entre com seu e-mail para ver suas configurações.' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: row }, { data: devices }] = await Promise.all([
    supabase.from('admin_prefs').select('*').eq('user_id', admin.userId).maybeSingle(),
    supabase.from('admin_push_subscriptions').select('id, user_agent, created_at, last_ok_at').eq('user_id', admin.userId).order('created_at', { ascending: false }),
  ]);
  const prefs: AdminPrefs = { ...DEFAULT_PREFS, ...((row ?? {}) as Partial<AdminPrefs>) };
  return NextResponse.json({
    profile: { name: admin.name, email: admin.email, role: admin.role, roleLabel: ROLE_LABEL[admin.role], areas: areasFor(admin.role) },
    prefs, devices: devices ?? [],
    catalog: { push: PUSH_CATEGORIES, email: EMAIL_REPORTS },
  });
}

const hour = (v: unknown) => (v === null || v === '' || v === undefined) ? null : Math.max(0, Math.min(23, Math.round(Number(v))));
const flags = (v: unknown, keys: string[]) => {
  const o: Record<string, boolean> = {};
  if (v && typeof v === 'object') for (const k of keys) if (typeof (v as Record<string, unknown>)[k] === 'boolean') o[k] = (v as Record<string, boolean>)[k];
  return o;
};

export async function PUT(req: NextRequest) {
  const admin = await me(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (typeof body.name === 'string' && body.name.trim()) {
    await supabase.from('admin_members').update({ name: body.name.trim().slice(0, 80) } as never).eq('user_id', admin.userId);
  }
  const areas = areasFor(admin.role) as string[];
  const home = typeof body.home_path === 'string' && body.home_path.startsWith('/admin') ? body.home_path : null;
  const row = {
    user_id: admin.userId,
    push_alerts: flags(body.push_alerts, PUSH_CATEGORIES.map(c => c.key)),
    quiet_start: hour(body.quiet_start), quiet_end: hour(body.quiet_end),
    quiet_allow_critical: body.quiet_allow_critical !== false,
    email_reports: flags(body.email_reports, EMAIL_REPORTS.map(c => c.key)),
    home_path: home && areas.length ? home : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('admin_prefs').upsert(row as never, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await me(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { deviceId } = await req.json().catch(() => ({}));
  if (deviceId) await getSupabaseAdmin().from('admin_push_subscriptions').delete().eq('id', deviceId).eq('user_id', admin.userId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const admin = await me(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'signout_all') return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 400 });
  const { error } = await getSupabaseAdmin().auth.admin.signOut(token, 'global');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
