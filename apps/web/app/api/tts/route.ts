// app/api/tts/route.ts — TTS das respostas em áudio do Practice e de outras falas.
// Charlotte: OpenAI gpt-audio (coral, flac) via lib/charlotte-voice. Personagens da Família Queizy
// (ex.: Igorfina): ElevenLabs com a voz do personagem (body.character). tts-cached continua no
// ElevenLabs (vocabulário).

import { requestUserId } from '@/lib/request-user';
import { NextRequest, NextResponse } from 'next/server';
import { checkAiAccess } from '@/lib/entitlement';
import { logOpenAIUsage, logElevenLabsUsage } from '@/lib/openai-usage';
import { characterOf, impressionOf, voiceFor, voiceSegments, concatMp3, withVocalTics } from '@/lib/characters';
import { speak } from '@/lib/charlotte-voice';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// ── ElevenLabs (voz do personagem) ───────────────────────────────────────────
async function ttsElevenLabs(text: string, voiceId: string, settings: unknown, model = 'eleven_multilingual_v2'): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ElevenLabs não configurado');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, voice_settings: settings }),
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
    const { text, source, character, impression } = body as { text: string; source?: string; character?: string; impression?: string };
    const userId = await requestUserId(request); // aluno do login (o userId do corpo não vale)
    // Plano e limite do aluno (lib/entitlement): sem assinatura, 402; acima do limite, 429.
    const denied = await checkAiAccess(userId, 'tts');
    if (denied) return denied;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }
    if (text.length > 1500) return NextResponse.json({ error: 'Text too long' }, { status: 413 });

    // Personagem com voz própria: ElevenLabs. Se falhar, cai na voz padrão (o aluno não fica sem áudio).
    const c = characterOf(character);
    const imp = impressionOf(c, impression);
    const voice = voiceFor(c, imp);
    if (voice) {
      // Trilha (source 'learn') e abertura do role-play (texto fixo do currículo): tenta o arquivo pronto
      // antes de gerar; a abertura era gerada de novo para cada aluno (auditoria de 16/11).
      const fixedText = source === 'learn' || source === 'roleplay-opener';
      const cachePath = fixedText && c.id !== 'charlotte' ? lsAudioPath(c.id, imp?.id ?? null, text) : null;
      if (cachePath) {
        const { data } = await getSupabaseAdmin().storage.from(LS_BUCKET).download(cachePath);
        if (data) return NextResponse.json({ audio: Buffer.from(await data.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', cached: true });
      }
      try {
        // Português na voz em português do personagem e inglês na voz normal, emendados num áudio só.
        // Sons do personagem (ex.: Allday) entram só no áudio; na trilha e na abertura não, para o áudio guardado ficar igual para todos.
        const segs = voiceSegments(c, imp, fixedText ? text : withVocalTics(imp, text));
        const parts = await Promise.all(segs.map(sg => ttsElevenLabs(sg.text, sg.voiceId, sg.settings, sg.model)));
        const buf = concatMp3(parts);
        if (cachePath) {
          await getSupabaseAdmin().storage.from(LS_BUCKET).upload(cachePath, buf, { contentType: 'audio/mpeg', upsert: true })
            .catch((e: unknown) => console.warn('TTS cache upload falhou:', e));
        }
        logElevenLabsUsage({ endpoint: '/api/tts', charCount: text.length, model: imp?.elevenModel ?? 'eleven_multilingual_v2', userId: userId || undefined, meta: { source: source ?? null, character: c.id, impression: imp?.id ?? null } });
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
