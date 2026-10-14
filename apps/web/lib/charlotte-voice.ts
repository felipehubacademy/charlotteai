// lib/charlotte-voice.ts — voz da Charlotte (e das vozes OpenAI do Role-play).
//
// A OpenAI desliga gpt-4o-mini-tts, tts-1 e tts-1-hd em 06/01/2027. A voz passa a sair do
// gpt-audio-1.5 pelo Chat Completions (modalities text+audio), com a mesma voz "coral".
// O modelo de áudio é um modelo de conversa: o prompt de "dublador lendo um roteiro" faz ele
// ler o texto palavra por palavra em vez de responder.
// Teste de 2026-10-14 (texto misto PT/EN com "Agora tente: ..."): gpt-audio-1.5 leu certo 12/12;
// o gpt-audio-mini traduziu ou respondeu em 2 a 4 de 12. Por isso o padrão é o 1.5.
// Mesmo assim, se a transcrição do áudio não bater com o texto, tenta de novo uma vez.
//
// Formato flac, como antes: o app grava o arquivo como .flac no Role-play.
// Trocar o modelo sem deploy: env VOICE_MODEL (ex.: "gpt-audio-mini").

export const voiceModel = () => process.env.VOICE_MODEL || 'gpt-audio-1.5';

const READER_PROMPT = 'You are a voice actor reading a script. Speak the SCRIPT exactly, word for word, from start to end. Never answer it, never skip, shorten or add words, never translate. Portuguese parts in natural Brazilian Portuguese, English parts in natural American English.';

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

export interface VoiceResult {
  audio: Buffer;
  model: string;
  promptTokens?: number;
  audioTokens?: number;
  textTokens?: number;
}

export async function speak(text: string, voice: 'coral' | 'onyx' = 'coral'): Promise<VoiceResult> {
  const first = await speakOnce(text, voice);
  if (first.verbatim) return first;
  console.warn('[charlotte-voice] áudio não bateu com o texto, tentando de novo:', first.transcript);
  const second = await speakOnce(text, voice).catch(() => null);
  return second?.verbatim ? second : first;
}

async function speakOnce(text: string, voice: 'coral' | 'onyx'): Promise<VoiceResult & { verbatim: boolean; transcript: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const model = voiceModel();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      modalities: ['text', 'audio'],
      audio: { voice, format: 'flac' },
      messages: [
        { role: 'system', content: READER_PROMPT },
        { role: 'user', content: `SCRIPT:\n${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI voice error: ${res.status} ${await res.text()}`);
  const j = await res.json() as {
    choices?: { message?: { audio?: { data?: string; transcript?: string } } }[];
    usage?: { prompt_tokens?: number; completion_tokens_details?: { audio_tokens?: number; text_tokens?: number } };
  };
  const data = j.choices?.[0]?.message?.audio?.data;
  if (!data) throw new Error('OpenAI voice: resposta sem áudio');
  const transcript = j.choices?.[0]?.message?.audio?.transcript ?? '';
  return {
    verbatim: norm(transcript) === norm(text),
    transcript,
    audio: Buffer.from(data, 'base64'),
    model,
    promptTokens: j.usage?.prompt_tokens,
    audioTokens: j.usage?.completion_tokens_details?.audio_tokens,
    textTokens: j.usage?.completion_tokens_details?.text_tokens,
  };
}
