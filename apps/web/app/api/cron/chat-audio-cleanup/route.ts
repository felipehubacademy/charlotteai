// app/api/cron/chat-audio-cleanup/route.ts — áudios do Free Chat ficam salvos por 90 dias.
// Depois disso o arquivo sai do bucket chat-audio e a mensagem fica só com a transcrição
// (audio_path/audio_duration = null). Chamado uma vez por dia pelo GitHub Actions com CRON_SECRET_TOKEN.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KEEP_DAYS = 90;

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let removed = 0;

  for (let round = 0; round < 20; round++) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, audio_path')
      .not('audio_path', 'is', null)
      .lt('created_at', cutoff)
      .limit(100);
    if (error) return NextResponse.json({ error: error.message, removed }, { status: 500 });
    if (!data?.length) break;

    const paths = data.map(r => r.audio_path as string);
    const { error: rmError } = await supabase.storage.from('chat-audio').remove(paths);
    if (rmError) return NextResponse.json({ error: rmError.message, removed }, { status: 500 });

    const { error: upError } = await supabase
      .from('chat_messages')
      .update({ audio_path: null, audio_duration: null })
      .in('id', data.map(r => r.id));
    if (upError) return NextResponse.json({ error: upError.message, removed }, { status: 500 });

    removed += data.length;
    if (data.length < 100) break;
  }

  return NextResponse.json({ ok: true, removed, cutoff });
}
