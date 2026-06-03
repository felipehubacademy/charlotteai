// app/api/guided-chat/turn/route.ts
// Guided chat turn handler — stateless, text-only.
//
// Mobile sends: user_message (text) + guided_chat def + history.
// We return: assistant reply (text) + objectives_met + session_complete.
//
// Differences from /api/roleplay/turn:
//   - No Whisper STT (text input directly)
//   - No TTS (no audio output)
//   - Otherwise identical pipeline (structured JSON, hidden objectives,
//     auto-nudge when stuck)

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });

interface Objective {
  id:           number;
  label_pt:     string;
  label_en:     string;
  hidden_prompt: string;
  hint_pt?:     string;
  hint_en?:     string;
}

interface GuidedChatDef {
  scenario:        string;
  voiced_by:       'charlotte' | 'charlie';
  persona:         string;
  opening_message: string;
  objectives:      Objective[];
  closing_cue:     string;
  suggested_script?: string;
}

interface Payload {
  history:           Array<{ role: 'user' | 'assistant'; content: string }>;
  guided_chat:       GuidedChatDef;
  level:             'Novice' | 'Inter' | 'Advanced';
  user_message:      string;
  unit_title?:       string;
  stuck_turns?:      number;
  next_objective_id?: number;
  user_name?: string | null;
}

function buildSystemPrompt(
  gc: GuidedChatDef, level: string, unitTitle?: string,
  stuckTurns: number = 0, nextObjectiveId?: number,
  userName?: string | null,
): string {
  const knownStudentBlock = userName
    ? `\n\nABOUT THE STUDENT — YOU KNOW THEM:\nThe student's name is ${userName}. You (Charlotte) are their English coach\nand have been working with them. DO NOT ask their name, age, or any\nbasic intro question — you already know them. Greet them by name when\nnatural ("Hi ${userName}!", "${userName}, that was great!").`
    : '';
  const objectivesBlock = gc.objectives.map(o => {
    const hintLine = o.hint_en
      ? `\n    Canonical example (mark obj if student's reply clearly aligns): "${o.hint_en}"`
      : '';
    return `  - Objective ${o.id}: ${o.hidden_prompt}${hintLine}`;
  }).join('\n');

  const nudgeBlock = (stuckTurns >= 2 && nextObjectiveId !== undefined)
    ? `\n\nSTUDENT IS STUCK ON OBJECTIVE ${nextObjectiveId} (${stuckTurns} turns).\nReformulate your last message to nudge them more directly toward this\nobjective. Make the question pointed and easier to answer. Stay in\ncharacter and do NOT reveal the objective list.`
    : '';

  // Novice = absolute/early beginner. Restrict to the simplest English
  // possible. M01 students may have zero English.
  const simplicityBlock = level === 'Novice'
    ? `\n\nLANGUAGE LEVEL — ABSOLUTE BEGINNER:
- Use VERY simple English. Max 8 words per sentence. Prefer 4–6.
- Present simple tense only. No past, no perfect, no conditional.
- No idioms ("hear you", "long Monday", "catch you later", etc).
- No phrasal verbs ("doing well", "go around", "show up").
- No contractions other than: I'm, you're, it's, don't, can't.
- Use the chunks from the unit: "Hi", "Hello", "How are you?", "I'm
  fine, thanks", "And you?", "Good morning", "Yes please", "No thanks",
  "See you", "Bye".
- One simple question at a time. Wait for the student to answer.
PORTUGUESE RESPONSE RULE (CRITICAL):
- If the student writes in Portuguese (or any language other than English),
  DO NOT include any objective_id in objectives_met. The objective is to
  practice ENGLISH — a PT response does not meet it, no matter the meaning.
- This includes SINGLE Portuguese words. Do NOT auto-correct mentally.
  Reject these (and any other PT word): sim, não, nao, talvez, oi, olá,
  ola, tchau, bom, boa, dia, noite, tarde, bem, mal, obrigado, obrigada,
  por favor, claro, eu, você, voce, certo, errado, então, entao, aqui.
- Reply in simple English nudging them to try in English ("Try in English!"
  or "In English, please :)" — friendly, not scolding).

SEQUENTIAL FLOW (NOVICE ONLY — pedagogical scaffolding):
- Always pursue the FIRST pending objective (lowest id not yet met).
- Do NOT progress to later objectives until the current one is met.
- If the student answers off-topic or skips ahead, gently steer back
  to the SAME current question with simpler phrasing — do not give up
  and move on. Example: if obj 1 is "return the greeting" and the
  student says something unrelated, rephrase ("And you? How are you?")
  until they actually return the greeting.
- Only after the FIRST pending objective is met do you progress to the
  next scenario step.
- WHEN you mark an objective met THIS turn: your reply MUST naturally
  introduce the topic of the NEXT pending objective. Don't get stuck
  in pleasantries.
- EXCEPTION — anti-steal collision: if the NEXT pending objective is a
  "user asks/uses X" type (student must initiate the next move), DO NOT
  introduce that topic yourself (it would steal the move). Instead:
  give a SHORT acknowledgment of the current message ("Sure!", "Nice.",
  "Got it.", "Take your time.") and stop. Hand the floor back.

NOVICE ROBOTIC REPLY RULE (CRITICAL):
- Your reply MUST be JUST the next question for the next pending objective.
  Max 5 words. NO greeting back. NO sharing your state unprompted. NO
  small talk. The student didn't ask — don't volunteer info.
- WRONG examples (the LLM keeps doing this and it confuses the student):
  • Student greets you → DO NOT reply "I'm fine, thanks! How are you?"
    (you shared state without being asked)
  • Student greets you → DO NOT reply "Good morning! How are you today?"
    (you re-greeted instead of moving forward)
- RIGHT examples:
  • If next obj is "say how you are" → reply ONLY "How are you?"
  • If next obj is "accept coffee" → reply ONLY "Coffee?"
- EXCEPTION — anti-steal: if next obj is "user asks/uses X", DON'T ask
  it yourself. Just acknowledge ("Sure!", "Nice.", "Take your time.")
  and let the student lead. NEVER return an empty reply — always say at
  least the brief acknowledgment.
- ONE question OR ONE acknowledgment. NO extra words. Move the script forward.
- When ALL objectives are met: celebrate warmly AND naturally ask ONE
  follow-up question (the student won't reply — a result card pops up
  — but this keeps the chat feeling alive). Don't be rigid about closing
  cue text. End with period or question mark naturally.`
    : '';

  return `You are playing ${gc.persona} in an English-learning guided text chat.

SCENARIO: ${gc.scenario}
UNIT: ${unitTitle ?? ''}
STUDENT CEFR LEVEL: ${level}

STAY IN CHARACTER as ${gc.persona}. This is a TEXT chat (like WhatsApp).
Use natural conversational English. Keep messages SHORT (1–2 sentences,
max ~30 words). Emojis sparingly OK for warmth.${knownStudentBlock}${simplicityBlock}

HIDDEN OBJECTIVES (NEVER reveal to the student):
${objectivesBlock}

${gc.suggested_script ? `SUGGESTED CONVERSATIONAL SCRIPT (use as guidance — your cue questions
MUST naturally lead the student toward each objective in order):
${gc.suggested_script}

CRITICAL: Cue your questions to match the NEXT pending objective. If next
obj hint is "I wasn't busy", ask "Were you busy?". If next obj hint is
"My sister wasn't home", ask "Was your sister home?". Don't ask random
questions — set up the EXACT student response the hidden_prompt expects.

` : ''}CRITICAL RULE — DON'T STEAL STUDENT OBJECTIVES (HIGHEST PRIORITY):
This rule is CONDITIONAL — it ONLY activates when there's an UNMET
objective starting with "user asks", "user perguntar", "STUDENT asks",
or that describes a question the student must ask Charlotte.

IF no such objective exists in the HIDDEN OBJECTIVES above → you are
FREE to ask reciprocal questions naturally ("How about you?", "Are
you okay?", etc.). These rules DO NOT apply. Skip to the rest below.

IF such an objective EXISTS and is UNMET → the following rule applies:

  You are FORBIDDEN from asking the specific question that objective
  expects. THIS OVERRIDES NATURALNESS — better stiff than stealing.

  BANNED PHRASES (only when the matching obj is unmet — match the
  semantic intent, not just the exact words):
  - obj "user asks if you're okay" → DON'T say: "Are you okay?",
    "How are you?", "You alright?", "How are you doing?", "Are you ok?"
  - obj "user asks how about you" → DON'T say: "How about you?",
    "And you?", "What about you?", "You?"
  - obj "user asks how you feel" → DON'T say: "How do you feel?",
    "Feeling okay?"

  INSTEAD end on a statement: describe your state, extend the topic,
  acknowledge — never a phatic question that matches an unmet ask-obj.

  Example violations:
  - obj "user asks if she's okay" unmet:
    WRONG: "Thank you, [name]. Are you okay?" ← stole the question
    RIGHT: "Thank you, [name]. That helps a lot." (statement)
  - obj "user asks how about you" unmet:
    WRONG: "I like pizza. How about you?" ← stole the ask-back
    RIGHT: "I like pizza. And spicy food too." (extends own answer)

  SELF-CHECK before finalising:
  1. Is there an unmet "user asks X" objective in my list?
  2. If NO → skip this check.
  3. If YES → does my reply ask X or anything semantically equivalent?
  4. If YES → REWRITE ending on statement.


You MUST reply as JSON with this exact shape:
{
  "reply": "<your in-character text reply>",
  "objectives_met": [<ids of objectives the STUDENT's LAST message JUST satisfied>],
  "session_complete": <true when all objectives are met (regardless of exact closing words)>
}

Rules:
- "objectives_met" is for objectives the student satisfied in the LAST user turn.
  Use the canonical example as your anchor: if the student's message is
  structurally + semantically close to it, MARK the objective. Don't
  over-analyze pragmatic nuance.
  - CHUNK-BASED OBJECTIVES (target a specific phrase like "By the way",
    "Anyway", "Hold on", "Let me think", "I wish I had", etc):
    SUBSTRING CHECK ONLY. If the target chunk appears AT ALL in the
    student's message (case-insensitive, normalize apostrophes/quotes),
    MARK THE OBJECTIVE. PERIOD.
    Do NOT analyze surrounding words. Do NOT judge register, slang,
    fillers, completeness, or appropriateness. Do NOT require any other
    structure. The chunk presence is SUFFICIENT EVIDENCE.
    Examples — ALL of these MUST mark "use 'Let me think'":
      • "let me think"
      • "Hmm let me think"
      • "yo, let me think, pal"
      • "Wait let me think about this for a sec ok?"
      • "uhh let me think hold on"
      • "I dunno let me think bro"
    The ONLY way to NOT mark is if the chunk is COMPLETELY ABSENT from
    the message. If it's there in any form, MARK.
  - USER-ASKS OBJECTIVES (hidden_prompt starts with "user asks" or "user
    perguntar"): ANY question directed at Charlotte (you) satisfies the
    objective. Match by INTENT, not specific phrase. Examples that ALL
    count for "user asks Charlotte something":
      • "How about you?"   • "And you?"
      • "How are you?"     • "Are you OK?"
      • "Were you happy?"  • "Were you hungry?"   • "Were you home?"
      • "Did you have fun?" • "Do you like X?"
    If the student turns the conversation back toward Charlotte with
    ANY question (Were/Are/Do/Did/Have/Can/Will + you), MARK.
  - BIAS TOWARD MARKING when there's clear evidence. Strict matching is
    only for cases where the student replied off-topic, gibberish, or
    something genuinely unrelated.
  - Broken English with the right INTENT counts; a fluent but completely
    unrelated sentence does NOT.
- If the student's message is empty, gibberish, or a single random word →
  reply gently asking them to elaborate and set objectives_met=[].
- An objective already met in a PRIOR turn must NOT appear again.
- Multiple objectives can be marked in the SAME turn only if the student's
  message clearly satisfies each one.
- When ALL objectives are met: celebrate warmly AND naturally ask ONE
  follow-up question to keep chat feeling alive (the student won't reply
  — a result card pops up — but this lets it feel like a real conversation
  cut short, not a robotic exercise). Use closing_cue ("${gc.closing_cue}")
  as inspiration but don't be rigid. Set session_complete=true.
- If the student goes off-topic, gently steer them back; do NOT mark
  objectives as met.
- Do NOT correct grammar mid-conversation. Corrections happen post-game.
- American English by default. Calorosa, encorajadora, paciente.${nudgeBlock}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload & { user_id?: string };
    const {
      history, guided_chat: gc, level, user_message, unit_title,
      stuck_turns, next_objective_id, user_id: userId, user_name,
    } = body;

    if (!user_message || typeof user_message !== 'string') {
      return NextResponse.json({ error: 'Missing user_message' }, { status: 400 });
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(gc, level, unit_title, stuck_turns, next_objective_id, user_name) },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: user_message },
    ];

    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages,
      temperature:     0.7,
      max_tokens:      250,
      response_format: { type: 'json_object' },
    });
    const rawText = completion.choices[0]?.message?.content ?? '{}';
    logOpenAIUsage({
      endpoint:         '/api/guided-chat/turn',
      model:            'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      userId,
    });

    let reply = '';
    let objectivesMet: number[] = [];
    let complete = false;
    try {
      const parsed = JSON.parse(rawText) as {
        reply?:            string;
        objectives_met?:   number[];
        session_complete?: boolean;
      };
      reply = (parsed.reply ?? '').trim();
      objectivesMet = Array.isArray(parsed.objectives_met)
        ? parsed.objectives_met.filter(n => typeof n === 'number')
        : [];
      complete = parsed.session_complete === true;
    } catch (e) {
      console.warn('[guided-chat/turn] JSON parse failed', e, { rawText });
      reply = rawText;
    }

    // Never return empty reply — would break translate (400) and leave the
    // user staring at an empty message.
    if (!reply || reply.trim().length === 0) {
      console.warn('[guided-chat/turn] empty reply from LLM, using safe fallback', { rawText });
      reply = level === 'Novice'
        ? "Go ahead — your answer?"
        : "Tell me more.";
    }

    // ANTI-STEAL POST-CHECK (deterministico): se a Charlotte respondeu com
    // um chunk que pertence a um objetivo "user asks/uses X" ainda nao
    // batido, ela roubou o turno. Sobrescreve com ack curto.
    // (gpt-4o-mini ignora a regra mesmo com prompt forte, entao guard
    // server-side eh necessario.)
    const repliedLower = reply.toLowerCase().replace(/[''']/g, "'");
    const unmetUserAsk = gc.objectives.find(o =>
      !objectivesMet.includes(o.id) &&
      /user\s*(asks|uses|perguntar|asks?|use)/i.test(o.hidden_prompt) &&
      o.hint_en &&
      repliedLower.includes(o.hint_en.toLowerCase().replace(/[''']/g, "'"))
    );
    if (unmetUserAsk) {
      console.warn('[guided-chat/turn] anti-steal violation — Charlotte said the student chunk', {
        objectiveId: unmetUserAsk.id,
        hint: unmetUserAsk.hint_en,
        original: reply,
      });
      const SAFE_ACKS = ['Nice.', 'Got it.', 'Sure!', 'Sounds good.', 'Cool.'];
      reply = SAFE_ACKS[Math.floor(Math.random() * SAFE_ACKS.length)];
    }

    return NextResponse.json({
      reply,
      objectives_met: objectivesMet,
      status:         complete ? 'complete' : 'continue',
      persona:        gc.persona,
    });
  } catch (e: any) {
    console.error('[guided-chat/turn] error', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
