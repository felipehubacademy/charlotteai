// Desligada em 29/10/2026 (auditoria de segurança): lista de leads sem login, e nada do app ou do site usa esta rota.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ error: 'gone' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'gone' }, { status: 410 });
}
