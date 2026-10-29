// /baixar?c=<campanha>[&s=<origem>] — link dos anúncios que levam direto para as lojas (lado "loja" do teste A/B).
// Grava o clique e redireciona: iPhone → App Store (campanha em App Store Connect › Campanhas),
// Android → Google Play (campanha no referrer de instalação), computador → site com a mesma campanha.
import { NextRequest, NextResponse } from 'next/server';
import { cleanCampaign, logAdEvent, platformFromUA, storeUrlFor } from '@/lib/ad-attribution';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const campaign = cleanCampaign(req.nextUrl.searchParams.get('c') ?? req.nextUrl.searchParams.get('utm_campaign'));
  const source = (req.nextUrl.searchParams.get('s') ?? req.nextUrl.searchParams.get('utm_source') ?? 'meta').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'meta';
  const platform = platformFromUA(req.headers.get('user-agent'));
  await logAdEvent({ kind: 'click', arm: 'loja', campaign, source, platform, path: '/baixar' });
  return NextResponse.redirect(storeUrlFor(platform, campaign, source), 302);
}
