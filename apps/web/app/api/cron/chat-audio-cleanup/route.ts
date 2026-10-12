// app/api/cron/chat-audio-cleanup/route.ts — áudios do Free Chat ficam salvos por 90 dias.
// Depois disso o arquivo sai do bucket chat-audio e a mensagem fica só com a transcrição
// (audio_path/audio_duration = null). Parte dos arquivos do Storage (rpc chat_audio_expired), então
// também apaga áudios de mensagens que o limite de 100 por modo já removeu.
// Chamado uma vez por dia pelo Cron da Vercel (vercel.json), que manda o CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KEEP_DAYS = 90;

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let removed = 0;

  for (let round = 0; round < 10; round++) {
    const { data, error } = await supabase.rpc('chat_audio_expired', { cutoff, max_rows: 500 });
    if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
    const paths = ((data ?? []) as { name: string }[]).map(r => r.name);
    if (!paths.length) break;

    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: upError } = await supabase
        .from('chat_messages')
        .update({ audio_path: null, audio_duration: null })
        .in('audio_path', chunk);
      if (upError) return NextResponse.json({ error: upError.message, removed }, { status: 500 });
      const { error: rmError } = await supabase.storage.from('chat-audio').remove(chunk);
      if (rmError) return NextResponse.json({ error: rmError.message, removed }, { status: 500 });
      removed += chunk.length;
    }
    if (paths.length < 500) break;
  }

  return NextResponse.json({ ok: true, removed, cutoff });
}
