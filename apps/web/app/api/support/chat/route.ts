// /api/support/chat — chat de suporte dentro do app ("Fale com a Charlotte"). Bearer do aluno.
//   GET                          → { status, messages }   histórico e situação do atendimento
//   POST { text, lang: 'pt'|'en' } → { status, messages } manda a mensagem e devolve o chat atualizado
// Mesmo cérebro do WhatsApp (lib/support-app.ts).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAppChat, handleAppMessage } from '@/lib/support-app';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function userFrom(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getAppChat(user.id));
}

export async function POST(req: NextRequest) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim();
  if (!text) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  // Limite simples contra abuso: 30 mensagens por hora no chat de suporte.
  const supabase = getSupabaseAdmin();
  const { data: conv } = await supabase.from('support_conversations').select('id').eq('channel', 'app').eq('external_id', user.id).maybeSingle();
  if (conv) {
    const { count } = await supabase.from('support_messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', (conv as { id: string }).id).eq('direction', 'in').gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if ((count ?? 0) >= 30) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  return NextResponse.json(await handleAppMessage(user.id, text, body.lang === 'en' ? 'en' : 'pt'));
}
