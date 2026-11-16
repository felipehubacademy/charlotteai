// Desligada em 16/11/2026 (auditoria de segurança): ninguém chama mais esta rota e ela ficava aberta.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const gone = () => NextResponse.json({ error: 'gone' }, { status: 410 });
export const GET = gone;
export const POST = gone;
