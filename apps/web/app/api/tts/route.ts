// app/api/tts/route.ts — TTS das respostas em áudio do Practice e de outras falas.
// Charlotte: OpenAI gpt-audio (coral, flac) via lib/charlotte-voice. Personagens da Família Queizy
// (ex.: Igorfina): ElevenLabs com a voz do personagem (body.character). tts-cached continua no
// ElevenLabs (vocabulário).

import { NextRequest, NextResponse } from 'next/server';
import { logOpenAIUsage, logElevenLabsUsage } from '@/lib/openai-usage';
import { characterOf, impressionOf, voiceFor } from '@/lib/characters';
import { speak } from '@/lib/charlotte-voice';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

// ── Frases da trilha do personagem: geradas uma vez e reaproveitadas ─────────────
// Mesmo arquivo e mesma chave que apps/mobile/scripts/generate-ls-audio.mjs (personagem + imitação + texto),
// então frase já pré-gerada não chama o ElevenLabs, e frase nova é gerada só para o 1º aluno.
const LS_BUCKET = 'curriculum-audio';
function lsAudioPath(characterId: string, impressionId: string | null, text: string): string {
  const key = createHash('sha1').update(`${characterId}|${impressionId ?? 'base'}|${text}`.trim().toLowerCase()).digest('hex').slice(0, 16);
  return `ls/${characterId}/${key}.mp3`;
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
      // Trilha (source 'learn'): tenta o arquivo pronto antes de gerar.
      const cachePath = source === 'learn' && c.id !== 'charlotte' ? lsAudioPath(c.id, imp?.id ?? null, text) : null;
      if (cachePath) {
        const { data } = await getSupabaseAdmin().storage.from(LS_BUCKET).download(cachePath);
        if (data) return NextResponse.json({ audio: Buffer.from(await data.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', cached: true });
      }
      try {
        const buf = await ttsElevenLabs(text, voice.voiceId, voice.settings);
        if (cachePath) {
          await getSupabaseAdmin().storage.from(LS_BUCKET).upload(cachePath, buf, { contentType: 'audio/mpeg', upsert: true })
            .catch((e: unknown) => console.warn('TTS cache upload falhou:', e));
        }
        logElevenLabsUsage({ endpoint: '/api/tts', charCount: text.length, model: 'eleven_multilingual_v2', userId: userId || undefined, meta: { source: source ?? null, character: c.id, impression: imp?.id ?? null } });
        return NextResponse.json({ audio: buf.toString('base64'), mimeType: 'audio/mpeg' });
      } catch (e) {
        console.error('TTS ElevenLabs (personagem) falhou, usando voz padrão:', e);
      }
    }

    const meta = { source: source ?? null, provider: 'openai' };
    console.log(`TTS: OpenAI coral/flac — ${text.length} chars`);

    const v = await speak(text);
    for (const c of v.calls) logOpenAIUsage({
      endpoint:         '/api/tts',
      model:            c.model,
      promptTokens:     c.promptTokens,
      completionTokens: c.completionTokens,
      userId:           userId || undefined,
      meta:             { ...meta, chars: text.length, fixed: v.calls.length > 1 },
    });

    return NextResponse.json({ audio: v.audio.toString('base64'), mimeType: 'audio/flac' });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech', details: error?.message }, { status: 500 });
  }
}
