// POST /api/meta-pageview { eventId, url, fbc? } — a visita também pelo servidor (API de Conversões da Meta),
// com o mesmo event_id do pixel no navegador: conta quem tem bloqueador ou sai antes de o pixel carregar,
// e a Meta junta os dois sem contar em dobro. Chamado pelo components/CookieConsent a cada página.
import { NextRequest, NextResponse } from 'next/server';
import { sendCapiEvent } from '@/lib/meta-capi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { eventId?: string; url?: string; fbc?: string };
  const eventId = String(b.eventId ?? '').slice(0, 64);
  const url = String(b.url ?? '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(eventId) || !/^https:\/\/(www\.)?queizy\.com(\/|$)/.test(url)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const fbc = req.cookies.get('_fbc')?.value ?? (typeof b.fbc === 'string' && /^fb\.1\.\d+\.[\w-]{10,500}$/.test(b.fbc) ? b.fbc : null);
  const ok = await sendCapiEvent({
    event: 'PageView', eventId,
    tracking: { fbp: req.cookies.get('_fbp')?.value ?? null, fbc, ip, ua: req.headers.get('user-agent'), url: url.slice(0, 500) },
  });
  return NextResponse.json({ ok });
}
