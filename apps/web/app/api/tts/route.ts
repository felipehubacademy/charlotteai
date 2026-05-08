// app/api/tts/route.ts — TTS para respostas de audio da Charlotte.
// Provider: OpenAI gpt-4o-mini-tts (coral, flac) para todos os usuarios.
// tts-cached continua no ElevenLabs (vocabulario).

import { NextRequest, NextResponse } from 'next/server';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ── OpenAI TTS ───────────────────────────────────────────────────────────────
async function ttsOpenAI(text: string): Promise<Buffer> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice: 'coral',
      response_format: 'flac',
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS error: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, userId, source } = body as { text: string; userId?: string; source?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }

    const meta = { source: source ?? null, provider: 'openai' };
    console.log(`TTS: OpenAI coral/flac — ${text.length} chars`);

    const buffer = await ttsOpenAI(text);
    logOpenAIUsage({
      endpoint:     '/api/tts',
      model:        'gpt-4o-mini-tts',
      promptTokens: text.length,
      userId:       userId || undefined,
      meta,
    });

    return NextResponse.json({ audio: buffer.toString('base64'), mimeType: 'audio/flac' });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech', details: error?.message }, { status: 500 });
  }
}
