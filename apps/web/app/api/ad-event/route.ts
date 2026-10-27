// POST /api/ad-event — visita ao site vinda de anúncio (lado "site" do teste A/B). Chamado uma vez por
// visita pelo componente AdAttribution quando a URL tem utm_campaign.
import { NextRequest, NextResponse } from 'next/server';
import { logAdEvent, platformFromUA } from '@/lib/ad-attribution';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { campaign?: string; source?: string; path?: string };
  if (!body.campaign) return NextResponse.json({ ok: false }, { status: 400 });
  await logAdEvent({ kind: 'visit', arm: 'site', campaign: body.campaign, source: body.source ?? null, platform: platformFromUA(req.headers.get('user-agent')), path: body.path ?? null });
  return NextResponse.json({ ok: true });
}
