// /api/support/whatsapp-code — código curto que liga a conversa do WhatsApp ao aluno (Bearer do app).
//   POST → { code: 'Q7F3K2' }
// O botão "Falar no WhatsApp" põe o código na mensagem já escrita; o webhook troca o
// código pelo aluno (lib/support-whatsapp.ts). Vale 7 dias; reaproveita o código vigente.
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sem 0/O, 1/I/L
const TTL_DAYS = 7;

function newCode(): string {
  const bytes = crypto.randomBytes(5);
  return 'Q' + [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('');
}

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Mais de 1 dia de validade ainda: reaproveita (não gera um código por toque).
  const { data: current } = await supabase.from('support_link_codes').select('code, expires_at')
    .eq('user_id', user.id).gte('expires_at', new Date(Date.now() + 86400000).toISOString())
    .order('created_at', { ascending: false }).limit(1);
  if (current?.[0]) return NextResponse.json({ code: (current[0] as { code: string }).code });

  const expires_at = new Date(Date.now() + TTL_DAYS * 86400000).toISOString();
  for (let i = 0; i < 4; i++) {
    const code = newCode();
    const { error } = await supabase.from('support_link_codes').insert({ code, user_id: user.id, expires_at } as never);
    if (!error) return NextResponse.json({ code });
  }
  return NextResponse.json({ error: 'Não foi possível gerar o código' }, { status: 500 });
}
