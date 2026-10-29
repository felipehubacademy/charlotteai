// /api/signup-welcome — o app chama logo depois do cadastro (Bearer): o e-mail "Sua conta no Queizy está pronta"
// sai na hora, sem esperar o cron. O servidor decide se cabe (degustação, uma vez só): lib/signup-welcome.
import { NextRequest, NextResponse } from 'next/server';
import { requestUserId } from '@/lib/request-user';
import { sendSignupWelcomeTo } from '@/lib/signup-welcome';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await requestUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sent = await sendSignupWelcomeTo(userId).catch(() => false);
  return NextResponse.json({ sent });
}
