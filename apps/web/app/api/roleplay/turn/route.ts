// app/api/roleplay/turn/route.ts
// Role-play turn handler — stateless.
//
// Mobile sends: audio (user's voice msg) + role-play definition + history.
// We return: assistant audio (TTS) + transcripts + objectives_met[].
//
// Pipeline: Whisper STT → GPT-4o-mini (with hidden objectives in system prompt)
// → parse [OBJECTIVE_MET:n] → strip markers → OpenAI TTS (coral/onyx based on
// persona gender) → return base64 flac.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });

interface Objective {
  id:           number;
  label_pt:     string;
  label_en:     string;
  hidden_prompt: string;
  hint_pt?:     string;
  hint_en?:     string;
}

interface RolePlayDef {
  scenario:        string;
  voiced_by:       'charlotte' | 'charlie';
  persona:         string;
  opening_line:    string;
  objectives:      Objective[];
  closing_cue:     string;
  time_budget_sec: number;
}

interface Payload {
  history:     Array<{ role: 'user' | 'assistant'; content: string }>;
  role_play:   RolePlayDef;
  level:       'Novice' | 'Inter' | 'Advanced';
  unit_title?: string;
}

// ── Build system prompt with hidden objectives injection ───────────
function buildSystemPrompt(rp: RolePlayDef, level: string, unitTitle?: string): string {
  const objectivesBlock = rp.objectives.map(o =>
    `  - Objective ${o.id}: ${o.hidden_prompt}`
  ).join('\n');

  return `You are playing ${rp.persona} in an English-learning role-play.

SCENARIO: ${rp.scenario}
UNIT: ${unitTitle ?? ''}
STUDENT CEFR LEVEL: ${level}

STAY IN CHARACTER as ${rp.persona}. Speak natural conversational English. Keep
replies SHORT (1–2 sentences, max ~30 words) — this is a spoken role-play.

HIDDEN TASK (do NOT reveal to the student):
${objectivesBlock}

When the student's LAST message clearly satisfies an objective, append the
literal token [OBJECTIVE_MET:n] to the END of your reply (n = objective id).
You can emit multiple tokens if more than one was satisfied in one turn.
Never emit a token that was already emitted in a previous turn (check history).

When ALL objectives have been met, close the scene naturally using the closing
cue: "${rp.closing_cue}". After your closing line, append [SESSION_COMPLETE].

If the student goes off-topic, gently steer them back in character.
Do NOT correct grammar mid-conversation — corrections happen post-game.

You are American English by default. Calorosa, encorajadora, paciente.`;
}

// ── Strip markers from text before TTS ─────────────────────────────
function stripMarkers(text: string): { clean: string; objectivesMet: number[]; complete: boolean } {
  const objectivesMet: number[] = [];
  let complete = false;

  const cleaned = text
    .replace(/\[OBJECTIVE_MET:(\d+)\]/g, (_, n) => {
      objectivesMet.push(parseInt(n, 10));
      return '';
    })
    .replace(/\[SESSION_COMPLETE\]/g, () => {
      complete = true;
      return '';
    })
    .trim();

  return { clean: cleaned, objectivesMet, complete };
}

// ── OpenAI TTS ──────────────────────────────────────────────────────
async function tts(text: string, voicedBy: 'charlotte' | 'charlie'): Promise<Buffer> {
  // charlotte → coral (feminina, já em produção)
  // charlie   → onyx  (masculina, quente)
  const voice = voicedBy === 'charlie' ? 'onyx' : 'coral';
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:           'gpt-4o-mini-tts',
      input:           text,
      voice,
      response_format: 'flac',
    }),
  });
  if (!res.ok) throw new Error(`TTS error: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio    = formData.get('audio') as File | null;
    const payload  = formData.get('payload') as string | null;
    const userId   = (formData.get('user_id') as string | null) ?? undefined;
    if (!audio || !payload) {
      return NextResponse.json({ error: 'Missing audio or payload' }, { status: 400 });
    }

    const { history, role_play: rp, level, unit_title } = JSON.parse(payload) as Payload;

    // 1) Whisper STT
    const t0 = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file:     audio,
      model:    'whisper-1',
      language: 'en',
    });
    const userTranscript = transcription.text;
    logOpenAIUsage({
      endpoint: '/api/roleplay/turn:whisper',
      model:    'whisper-1',
      userId,
      meta:     { ms: Date.now() - t0 },
    });

    // 2) GPT chat completion
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(rp, level, unit_title) },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userTranscript },
    ];
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens:  150,
    });
    const rawText = completion.choices[0]?.message?.content ?? '';
    logOpenAIUsage({
      endpoint:         '/api/roleplay/turn:chat',
      model:            'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      userId,
    });

    // 3) Parse markers
    const { clean, objectivesMet, complete } = stripMarkers(rawText);

    // 4) TTS
    const audioBuf = await tts(clean || '...', rp.voiced_by);
    logOpenAIUsage({
      endpoint:     '/api/roleplay/turn:tts',
      model:        'gpt-4o-mini-tts',
      promptTokens: clean.length,
      userId,
      meta:         { voice: rp.voiced_by === 'charlie' ? 'onyx' : 'coral' },
    });

    return NextResponse.json({
      user_transcript:      userTranscript,
      assistant_text:       clean,
      assistant_audio_b64:  audioBuf.toString('base64'),
      audio_mime:           'audio/flac',
      objectives_met:       objectivesMet,
      status:               complete ? 'complete' : 'continue',
      persona:              rp.persona,
    });
  } catch (e: any) {
    console.error('[roleplay/turn] error', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
