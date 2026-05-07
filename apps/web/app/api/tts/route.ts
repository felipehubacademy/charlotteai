// app/api/tts/route.ts — TTS para respostas de audio da Charlotte.
// Provider selecionado por beta_features do usuario:
//   - "openai_tts" → OpenAI tts-1-hd (nova) — beta, ~10x mais barato
//   - default       → ElevenLabs Multilingual v2 (Rachel)

import { NextRequest, NextResponse } from 'next/server';
import { logElevenLabsUsage, logOpenAIUsage } from '@/lib/openai-usage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY     = process.env.OPENAI_API_KEY;
const ELEVENLABS_VOICE   = '21m00Tcm4TlvDq8ikWAM'; // Rachel

async function getUserProfile(userId: string): Promise<{ betaFeatures: string[]; level: string }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('charlotte_users')
    .select('beta_features, charlotte_level')
    .eq('id', userId)
    .single();
  return {
    betaFeatures: (data?.beta_features as string[]) ?? [],
    level:        (data?.charlotte_level as string) ?? 'Novice',
  };
}

// Instructions identicas ao primeiro teste aprovado — nao alterar sem teste A/B
const TTS_INSTRUCTIONS = 'You are Charlotte, a warm and encouraging English tutor. Speak naturally and expressively — enthusiastic when praising, gentle when correcting, clear and engaging when teaching. Use a friendly American English accent. Never sound robotic or flat.';

// ── ElevenLabs ───────────────────────────────────────────────────────────────
async function ttsElevenLabs(text: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not set');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs error: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── OpenAI TTS ───────────────────────────────────────────────────────────────
async function ttsOpenAI(text: string, instructions: string): Promise<Buffer> {
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

    // Seleciona provider e configuracao vocal com base no perfil do usuario
    const { betaFeatures, level } = userId ? await getUserProfile(userId) : { betaFeatures: [], level: 'Novice' };
    const useOpenAI = betaFeatures.includes('openai_tts');
    const ttsInstructions = TTS_INSTRUCTIONS;

    const meta = { source: source ?? null, provider: useOpenAI ? 'openai' : 'elevenlabs' };
    console.log(`TTS: ${useOpenAI ? 'OpenAI coral/flac (beta)' : 'ElevenLabs Rachel/mp3'} — ${text.length} chars`);

    let buffer: Buffer;
    if (useOpenAI) {
      buffer = await ttsOpenAI(text, ttsInstructions);
      logOpenAIUsage({
        endpoint:     '/api/tts',
        model:        'gpt-4o-mini-tts',
        promptTokens: text.length,
        userId:       userId || undefined,
        meta,
      });
    } else {
      buffer = await ttsElevenLabs(text);
      logElevenLabsUsage({ endpoint: '/api/tts', charCount: text.length, userId: userId || undefined, meta });
    }

    return NextResponse.json({ audio: buffer.toString('base64'), mimeType: useOpenAI ? 'audio/flac' : 'audio/mp3' });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech', details: error?.message }, { status: 500 });
  }
}
