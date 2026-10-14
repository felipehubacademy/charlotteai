// app/api/tts/route.ts — TTS das respostas em áudio do Practice e de outras falas.
// Charlotte: OpenAI gpt-audio (coral, flac) via lib/charlotte-voice. Personagens da Família Queizy
// (ex.: Igorfina): ElevenLabs com a voz do personagem (body.character). tts-cached continua no
// ElevenLabs (vocabulário).

import { NextRequest, NextResponse } from 'next/server';
import { logOpenAIUsage, logElevenLabsUsage } from '@/lib/openai-usage';
import { characterOf, impressionOf, voiceFor } from '@/lib/characters';
import { speak } from '@/lib/charlotte-voice';

export const dynamic = 'force-dynamic';

// ── ElevenLabs (voz do personagem) ───────────────────────────────────────────
async function ttsElevenLabs(text: string, voiceId: string, settings: unknown): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ElevenLabs não configurado');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, userId, source, character, impression } = body as { text: string; userId?: string; source?: string; character?: string; impression?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }

    // Personagem com voz própria: ElevenLabs. Se falhar, cai na voz padrão (o aluno não fica sem áudio).
    const c = characterOf(character);
    const imp = impressionOf(c, impression);
    const voice = voiceFor(c, imp);
    if (voice) {
      try {
        const buf = await ttsElevenLabs(text, voice.voiceId, voice.settings);
        logElevenLabsUsage({ endpoint: '/api/tts', charCount: text.length, model: 'eleven_multilingual_v2', userId: userId || undefined, meta: { source: source ?? null, character: c.id, impression: imp?.id ?? null } });
        return NextResponse.json({ audio: buf.toString('base64'), mimeType: 'audio/mpeg' });
      } catch (e) {
        console.error('TTS ElevenLabs (personagem) falhou, usando voz padrão:', e);
      }
    }

    const meta = { source: source ?? null, provider: 'openai' };
    console.log(`TTS: OpenAI coral/flac — ${text.length} chars`);

    const v = await speak(text);
    logOpenAIUsage({
      endpoint:         '/api/tts',
      model:            v.model,
      promptTokens:     v.promptTokens,
      completionTokens: (v.audioTokens ?? 0) + (v.textTokens ?? 0),
      userId:           userId || undefined,
      meta:             { ...meta, chars: text.length },
    });

    return NextResponse.json({ audio: v.audio.toString('base64'), mimeType: 'audio/flac' });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech', details: error?.message }, { status: 500 });
  }
}
