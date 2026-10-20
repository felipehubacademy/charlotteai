// lib/family-call.ts — ligação ao vivo com a Família Queizy (ElevenLabs Agents).
//
// O agente no ElevenLabs tem a voz do personagem, as vozes das imitações (troca por tags
// <President>, <Hoops>) e só aceita conexão com token gerado aqui. A cada ligação o servidor
// monta o prompt (personalidade do Free Chat em lib/characters + regras de voz e do nível do
// aluno + nome e tópico) e a primeira fala, que vão como "overrides" da sessão.
import { CHARACTERS, type Character } from '@/lib/characters';

export type CallLevel = 'Novice' | 'Inter' | 'Advanced';

/** Agentes do ElevenLabs por personagem (não é segredo: só conecta com token do servidor). */
export const FAMILY_AGENTS: Record<string, string> = {
  igorfina: 'agent_1201m5b3r7pdebb85d81ywb0fc0x',
};

const LEVEL_RULES: Record<CallLevel, string> = {
  Novice: `STUDENT LEVEL: beginner (Novice). They know little English and are shy.
- Speak simple, slow English with very common words. Mix in Portuguese freely to support them (about half and half), but always give them a short English sentence to repeat or answer.
- Ask easy questions they can answer in 1 to 5 words (yes/no, either/or, "What's your favorite food?").
- Celebrate every attempt. If they answer in Portuguese, give them the English version and invite them to say it.`,
  Inter: `STUDENT LEVEL: intermediate (Inter). They can hold a conversation but make mistakes, hesitate and can feel shy.
- Speak about 95% English. For a hard word, add a quick Portuguese translation ("hiking, caminhada").
- If they hesitate or switch to Portuguese, keep replying in SIMPLE English and give them the key word they needed. Encourage them ("take your time", "you're doing great").`,
  Advanced: `STUDENT LEVEL: advanced. They speak well and want natural, fluent conversation.
- Speak 100% natural English, with idioms and real-life expressions (explain one briefly if they don't get it).
- Push them a bit: ask for opinions, stories and details.`,
};

const VOICE_RULES = `THIS IS A LIVE VOICE CALL (not text):
- TURN LENGTH (most important): at most TWO short sentences per turn: one short reaction (max 10 words) + one short question (max 12 words). Never lecture, never list things, never use bullet points, emojis or markdown.
- Correct mistakes lightly and only when it matters: repeat their sentence the right way, naturally, inside your reaction ("Ah, you WENT to the beach! Nice!"). Never say "wrong".
- Your own English is always correct.
- If the student wants to stop, say a short funny goodbye.`;

/** Imitações por voz: a tag troca a voz no ElevenLabs; o estilo vem do Free Chat (lib/characters). */
const IMPRESSION_TAGS: Record<string, string> = { president: 'President', hoops: 'Hoops' };

function impressionsBlock(c: Character): string {
  const list = Object.entries(c.impressions ?? {})
    .filter(([id]) => IMPRESSION_TAGS[id])
    .map(([id, imp]) => `- <${IMPRESSION_TAGS[id]}>...</${IMPRESSION_TAGS[id]}>: ${imp!.style.replace(/^THIS REPLY ONLY:\s*/, '').replace(/Keep the SAME length limit as a normal reply\.?/i, 'Keep the same two-sentence limit.')}`);
  if (!list.length) return '';
  return `IMPRESSIONS (your signature): do an impression ONLY when you receive a note saying IMPRESSION TIME (the app decides the moment, like in your chat). Then your next reply is ONE whole turn as that impression, and right after it you go back to your normal voice. Wrap the WHOLE impression turn in its voice tag (the tag switches your voice):
${list.join('\n')}`;
}

const FIRST_MESSAGES: Record<string, string[]> = {
  igorfina: [
    "Hey {name}! Igorfina here, live from my tiny kitchen stage. What's the best thing that happened to you this week?",
    "{name}! You called me? I'm honored. Quick question: what did you eat today?",
    "Hello hello, {name}! Your favorite comedian is on the line. So, what are you doing right now?",
    "{name}, my friend! Perfect timing, I was getting bored. Tell me, how was your day?",
  ],
};
const FIRST_MESSAGES_NOVICE: Record<string, string[]> = {
  igorfina: [
    "Oi, {name}! It's Igorfina! Tudo bem? How are you today?",
    "{name}! Que bom te ouvir! Let's talk a little in English, ok? What's your favorite food?",
  ],
};

export interface CallContext {
  /** Tópico atual na trilha do nível e na trilha do personagem (se o aluno estiver nela). */
  topic?: string | null;
  trackTopic?: string | null;
  /** Memória das últimas ligações com este personagem (mais recente primeiro). */
  memories?: string[];
  /** Retomada depois da pausa por inatividade: as últimas falas da mesma ligação. */
  resume?: { who: 'ai' | 'user'; text: string }[] | null;
}

// Retomada depois da pausa por inatividade: volta ao assunto em vez de cumprimentar de novo.
const RESUME_LINES: Record<CallLevel, string[]> = {
  Novice: ["{name}, voltou! Good! Where were we?", "Oi de novo, {name}! Ready? Let's continue!"],
  Inter: ["Hey {name}, you're back! So, where were we?", "There you are, {name}! Let's pick up where we left off."],
  Advanced: ["Welcome back, {name}! Shall we pick up where we left off?", "{name}! Right, where were we?"],
};

export function buildCallSession(opts: { characterId: string; level: CallLevel; name: string } & CallContext) {
  const c = CHARACTERS[opts.characterId as keyof typeof CHARACTERS] as Character | undefined;
  if (!c || !c.persona || !FAMILY_AGENTS[c.id]) return null;
  const name = (opts.name || 'friend').split(/\s+/)[0];
  // Tópico e memória são sugestões: a conversa natural e os assuntos do aluno vêm primeiro.
  const topics = [opts.topic?.trim() && `"${opts.topic.trim()}" (their main English trail)`, opts.trackTopic?.trim() && `"${opts.trackTopic.trim()}" (your own trail)`].filter(Boolean);
  const topic = topics.length
    ? `\nOPTIONAL CONTEXT (never force it): the student is studying ${topics.join(' and ')} in Queizy. If it fits the moment, you may use it once in a while (a question or a joke that makes them use that English), but the student's own topics always come first. Never turn the call into a lesson.`
    : '';
  const mem = (opts.memories ?? []).filter(Boolean).slice(0, 3);
  const memory = mem.length
    ? `\nWHAT YOU REMEMBER FROM YOUR LAST CALLS WITH ${name.toUpperCase()} (most recent first):\n${mem.map(m => `- ${m}`).join('\n')}\nUse it like a friend would: a callback joke or a follow-up question when it fits. Never list what you remember.`
    : '';
  const resumeLines = (opts.resume ?? []).filter(l => l && l.text).slice(-8);
  const resume = resumeLines.length
    ? `\nTHIS CALL WAS PAUSED because ${name} went quiet, and now it is back on. The conversation so far ended like this:\n${resumeLines.map(l => `${l.who === 'ai' ? 'You' : name}: ${l.text.replace(/\s+/g, ' ').slice(0, 200)}`).join('\n')}\nContinue from there naturally. Do not greet again or restart the conversation.`
    : '';
  const prompt = `You are on a live voice call in Queizy, an app for Brazilians learning English. Your job: get ${name} talking in English, having fun and gently improving, like a funny friend, not a formal teacher.

${LEVEL_RULES[opts.level]}

${VOICE_RULES}${topic}${memory}${resume}

${c.persona
  .replace(/ignore her name, age and personality above, but keep EVERY teaching, level, language, length and format rule above\./, 'keep EVERY teaching, level, language and length rule above.')
  .replace(/Do NOT do any impression unless this reply's instructions ask for one\./, 'Do impressions only as described in IMPRESSIONS below.')}

${impressionsBlock(c)}

The student's name is ${name}.`;
  const pool = resumeLines.length ? RESUME_LINES[opts.level] : (opts.level === 'Novice' ? FIRST_MESSAGES_NOVICE : FIRST_MESSAGES)[c.id] ?? [];
  const firstMessage = (pool[Math.floor(Math.random() * pool.length)] ?? 'Hey {name}!').replace(/\{name\}/g, name);
  return { agentId: FAMILY_AGENTS[c.id], prompt, firstMessage, characterName: c.name };
}

/** Primeira fala gerada na hora com o contexto do aluno (horário, dia, tópico, sequência, memória).
 *  Roda junto do pedido de token, enquanto o telefone chama; se falhar ou passar de 2,5 s, usa a lista fixa. */
export async function generateOpener(opts: {
  characterId: string; level: CallLevel; name: string; fallback: string;
  localHour: number; weekday: string; streak: number; topic?: string | null; trackTopic?: string | null; memories?: string[];
}): Promise<string> {
  const c = CHARACTERS[opts.characterId as keyof typeof CHARACTERS] as Character | undefined;
  if (!c?.persona || !process.env.OPENAI_API_KEY) return opts.fallback;
  const name = (opts.name || 'friend').split(/\s+/)[0];
  const ctx = [
    `Local time: ${opts.localHour}h, ${opts.weekday}.`,
    opts.streak > 1 ? `Study streak: ${opts.streak} days in a row.` : '',
    opts.topic ? `Studying on their main trail: "${opts.topic}".` : '',
    opts.trackTopic ? `Studying on your trail: "${opts.trackTopic}".` : '',
    opts.memories?.length ? `From your last call: ${opts.memories[0]}` : 'This is your first call together.',
  ].filter(Boolean).join(' ');
  const impressionHint = Math.random() < 0.2
    ? 'This time, open as ONE of your impressions, wrapped in its voice tag (<President>...</President> or <Hoops>...</Hoops>).'
    : 'Open in your normal voice (no tags).';
  const system = `${c.persona.split('Hard rules')[0]}
You are opening a live voice call with ${name}, an English student (${opts.level} level). Write ONLY your first line: a warm, funny greeting using their name plus ONE easy question to get them talking. Max 2 short sentences, max 25 words, in English${opts.level === 'Novice' ? ' with a few simple Portuguese words to make them comfortable' : ''}. Use AT MOST one detail from the context (pick what makes the best opener; often just the time of day or a follow-up on the last call). No emojis, no quotes, no stage directions. ${impressionHint}
Never mention politics, news, real people, teams or brands.`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4.1-mini', temperature: 0.95, max_tokens: 70,
        messages: [{ role: 'system', content: system }, { role: 'user', content: ctx }] }),
    });
    clearTimeout(timer);
    if (!r.ok) return opts.fallback;
    const j = await r.json();
    const text = String(j.choices?.[0]?.message?.content ?? '').trim().replace(/^["“]|["”]$/g, '');
    return text.length >= 8 && text.length <= 260 ? text : opts.fallback;
  } catch {
    return opts.fallback;
  }
}
