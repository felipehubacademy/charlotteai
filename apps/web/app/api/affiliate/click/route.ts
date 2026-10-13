// /api/affiliate/click — conta um clique no link queizy.com/a/CODIGO (público, sem login).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { affiliateByCode } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const aff = await affiliateByCode(String(body.code ?? ''));
  if (!aff || aff.status !== 'active') return NextResponse.json({ ok: false });
  const platform = ['ios', 'android', 'desktop'].includes(body.platform) ? body.platform : null;
  await getSupabaseAdmin().from('affiliate_clicks').insert({ affiliate_id: aff.id, platform } as never);
  return NextResponse.json({ ok: true });
}
