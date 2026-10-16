// /api/admin/meta-test — manda um evento de teste para o Pixel "Queizy" pela API de Conversões.
// POST { testEventCode }  (código da aba "Testar eventos" do Gestor de Eventos). Não conta como venda.
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { sendCapiEvent } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const code = String(body?.testEventCode ?? '').trim();
  if (!code) return NextResponse.json({ error: 'Passe { testEventCode }' }, { status: 400 });
  if (!process.env.META_CAPI_TOKEN) return NextResponse.json({ ok: false, error: 'META_CAPI_TOKEN ausente neste deploy' });
  const ok = await sendCapiEvent({
    event: 'StartTrial', eventId: `test_${Date.now()}`, email: 'teste@queizy.com', value: 0, currency: 'BRL',
    tracking: { consent: true, url: 'https://queizy.com/assinar/sucesso', ua: req.headers.get('user-agent') },
    testEventCode: code,
  });
  return NextResponse.json({ ok });
}
