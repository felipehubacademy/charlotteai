// POST /api/ad-event — visita ao site vinda de anúncio (lado "site" do teste A/B), chamada uma vez por
// visita pelo AdAttribution quando a URL tem utm_campaign, e os passos seguintes do funil (lib/site-funnel).
import { NextRequest, NextResponse } from 'next/server';
import { logAdEvent, platformFromUA, SITE_FUNNEL_KINDS } from '@/lib/ad-attribution';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { campaign?: string; source?: string; path?: string; kind?: string };
  if (!body.campaign) return NextResponse.json({ ok: false }, { status: 400 });
  const kind = (SITE_FUNNEL_KINDS as readonly string[]).includes(body.kind ?? '') ? body.kind as typeof SITE_FUNNEL_KINDS[number] : 'visit';
  await logAdEvent({ kind, arm: 'site', campaign: body.campaign, source: body.source ?? null, platform: platformFromUA(req.headers.get('user-agent')), path: body.path ?? null });
  return NextResponse.json({ ok: true });
}
