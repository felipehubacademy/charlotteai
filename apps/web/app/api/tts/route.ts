// app/api/tts/route.ts — ElevenLabs TTS (Rachel) for Charlotte's audio responses
// Used as fallback when pre-generated CDN files are not available.

import { NextRequest, NextResponse } from 'next/server';
import { logElevenLabsUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — clear American English

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error('TTS: ELEVENLABS_API_KEY not set');
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }
    console.log('TTS: using ElevenLabs Rachel');

    const body = await request.json();
    const { text, userId, source } = body as { text: string; userId?: string; source?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.80,
          style: 0.10,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('ElevenLabs TTS error:', err);
      return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');

    logElevenLabsUsage({ endpoint: '/api/tts', charCount: text.length, userId: userId || undefined, meta: source ? { source } : undefined });

    return NextResponse.json({ audio: base64, mimeType: 'audio/mp3' });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech', details: error?.message },
      { status: 500 }
    );
  }
}
