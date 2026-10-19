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
  return `IMPRESSIONS (your signature): about once every 4 or 5 turns, when it fits what the student said, do ONE whole turn as an impression, then go back to your normal voice. Never do the same impression twice in a row. Wrap the WHOLE impression turn in its voice tag (the tag switches your voice):
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

export function buildCallSession(opts: { characterId: string; level: CallLevel; name: string; topic?: string | null }) {
  const c = CHARACTERS[opts.characterId as keyof typeof CHARACTERS] as Character | undefined;
  if (!c || !c.persona || !FAMILY_AGENTS[c.id]) return null;
  const name = (opts.name || 'friend').split(/\s+/)[0];
  const topic = opts.topic?.trim()
    ? `\nCONTEXT: the student is studying "${opts.topic.trim()}" on their Queizy trail. Bring it up naturally once in a while (a question or a joke using it), without turning the call into a lesson.`
    : '';
  const prompt = `You are on a live voice call in Queizy, an app for Brazilians learning English. Your job: get ${name} talking in English, having fun and gently improving, like a funny friend, not a formal teacher.

${LEVEL_RULES[opts.level]}

${VOICE_RULES}${topic}

${c.persona
  .replace(/ignore her name, age and personality above, but keep EVERY teaching, level, language, length and format rule above\./, 'keep EVERY teaching, level, language and length rule above.')
  .replace(/Do NOT do any impression unless this reply's instructions ask for one\./, 'Do impressions only as described in IMPRESSIONS below.')}

${impressionsBlock(c)}

The student's name is ${name}.`;
  const pool = (opts.level === 'Novice' ? FIRST_MESSAGES_NOVICE : FIRST_MESSAGES)[c.id] ?? [];
  const firstMessage = (pool[Math.floor(Math.random() * pool.length)] ?? 'Hey {name}!').replace(/\{name\}/g, name);
  return { agentId: FAMILY_AGENTS[c.id], prompt, firstMessage, characterName: c.name };
}
