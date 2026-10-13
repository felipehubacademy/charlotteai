// /api/affiliate — o app marca a conta com o afiliado do link (Bearer token do aluno).
//   POST { action: 'attach', code, source? }   source: 'install' | 'link' | 'manual'
// O primeiro link vale e só para contas com até 30 dias (lib/affiliates.ts).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { attributeUser } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  const user = data?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== 'attach') return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  const source = ['install', 'link', 'manual'].includes(body.source) ? body.source : 'link';
  const r = await attributeUser(user.id, String(body.code ?? ''), source);
  return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: r.error === 'invalid_code' ? 404 : 400 });
}
