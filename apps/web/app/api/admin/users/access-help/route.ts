// POST /api/admin/users/access-help { email, when } — manda ao aluno um link novo de criar senha num e-mail pessoal
// (lib/email-templates accessHelpTemplate). Para quem assinou e não conseguiu entrar.
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendAccessHelp } from '@/lib/access-help';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'users:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const when = String(body.when ?? 'recentemente').trim().slice(0, 40);
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('id, name, email').ilike('email', email).maybeSingle();
  const user = u as { id: string; name: string | null; email: string } | null;
  if (!user) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  const r = await sendAccessHelp(user, when);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  await audit(admin, 'user.access_help', 'user', user.id, { email: user.email });
  return NextResponse.json({ ok: true, subject: r.subject });
}
