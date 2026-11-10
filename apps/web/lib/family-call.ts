// lib/family-call.ts — ligação ao vivo com a Família Queizy (ElevenLabs Agents).
//
// O agente no ElevenLabs tem a voz do personagem, as vozes das imitações (troca por tags
// <President>, <Hoops>) e só aceita conexão com token gerado aqui. A cada ligação o servidor
// monta o prompt (personalidade do Free Chat em lib/characters + regras de voz e do nível do
// aluno + nome e tópico) e a primeira fala, que vão como "overrides" da sessão.
import { CHARACTERS, PT_VOICE_TAG, impressionOf, isPortugueseText, splitByLanguage, type Character, type Impression } from '@/lib/characters';
import { SYSTEM_PROMPTS } from '@/lib/live-voice-rules';

export type CallLevel = 'Novice' | 'Inter' | 'Advanced';

/** Agentes do ElevenLabs por personagem (não é segredo: só conecta com token do servidor). */
export const FAMILY_AGENTS: Record<string, string> = {
  igorfina: 'agent_1201m5b3r7pdebb85d81ywb0fc0x',
};

// Fora das regras da Charlotte, só o que é próprio do agente de voz da Família.
const AGENT_NOTES = `VOICE CALL NOTES: this is voice only, so never use emojis, lists or markdown. If the app sends a note saying TIME IS UP, say a short goodbye right away (this overrides any rule about goodbyes).`;

// Novice nos agentes da Família: o modelo do agente é menor que o da ligação da Charlotte e escorregava
// na rampa (pergunta repetida em português, exclamação extra em inglês, imitação longa toda em inglês).
// Formato com exemplo, no FIM do prompt. Não muda a regra da Charlotte, só reforça a mesma regra.
const NOVICE_FORMAT = `BEGINNER FORMAT CHECK (Novice), from turn 3 on, while the student answers in Portuguese, every reply is EXACTLY:
[one short reaction in Portuguese] + [ONE short English question] + [its Portuguese translation in parentheses].
Example: "Nossa, trabalhou muito, hein? What do you do? (O que você faz?)"
- Never ask the question in Portuguese before the English one (wrong: "Como foi seu dia? How was your day? (Como foi seu dia?)").
- Never add an English exclamation or comment besides the question (wrong: "That sounds tiring!").
- Impression turn for a beginner: ONE short catchphrase of the impression in English (max 5 words), then the rest in Portuguese, ending with the ONE short English question and its translation. Max two short sentences. Example: "Tremendous, believe me! Pizza é a melhor comida do mundo. Do you like pizza? (Você gosta de pizza?)"
- Once the student answers in English, you may use up to two short English sentences, as the level rule says.`;

/** Regras da ligação da Charlotte (lib/live-voice-rules) com o nome e o gênero do personagem. */
function baseRules(c: Character, level: CallLevel, name: string): string {
  let t = SYSTEM_PROMPTS[level].replace(/\{NAME\}/g, name);
  if (c.gender === 'm') {
    t = t
      .replace(/Você é Charlotte, amiga do/g, `Você é o ${c.name}, amigo do`)
      .replace(/como amiga ao telefone/g, 'como amigo ao telefone')
      .replace(/Calorosa, paciente, curiosa\. Amiga, não professora\./g, 'Caloroso, paciente, curioso. Amigo, não professor.');
  }
  t = t.replace(/Você é Charlotte/g, `Você é ${c.gender === 'm' ? 'o ' : 'a '}${c.name}`).replace(/\bCharlotte\b/g, c.name);
  // A primeira fala já sai pronta (firstMessage); o route troca {GREETING} por ela.
  return t
    .replace(/Comece com: "\{GREETING\}"/, 'Você já abriu a ligação com: "{GREETING}" (essa foi a sua primeira fala, o TURNO 1).')
    .replace(/Start with: "\{GREETING\}"/, 'You already opened the call with: "{GREETING}".');
}

// Imitações por voz: a etiqueta (callTag em lib/characters) troca a voz no ElevenLabs; o estilo vem do Free Chat.
// Imitação nova precisa da etiqueta cadastrada no agente do ElevenLabs, com a voz dela.

// Voz em português (personagem com clone em português): a etiqueta troca a voz só nas partes em português.
function portugueseVoiceBlock(c: Character): string {
  if (!c.elevenVoiceIdPt) return '';
  return `PORTUGUESE VOICE (always, in your normal voice): wrap every Portuguese part of your reply in <${PT_VOICE_TAG}>...</${PT_VOICE_TAG}> (the tag switches to your Brazilian Portuguese voice). English always stays OUTSIDE the tag. Never put English inside it and never leave Portuguese outside it.
Example: "<${PT_VOICE_TAG}>Nossa, trabalhou muito, hein?</${PT_VOICE_TAG}> What do you do? <${PT_VOICE_TAG}>(O que você faz?)</${PT_VOICE_TAG}>"
Inside an impression turn, do not use this tag: the whole turn stays in the impression's tag.`;
}

function impressionsBlock(c: Character): string {
  const list = Object.values(c.impressions ?? {})
    .filter((imp): imp is Impression => !!imp?.callTag)
    .map(imp => `- <${imp.callTag}>...</${imp.callTag}>: ${imp.style.replace(/^THIS REPLY ONLY:\s*/, '').replace(/Keep the SAME length limit as a normal reply\.?/i, 'Keep the same two-sentence limit.')}`);
  if (!list.length) return '';
  return `IMPRESSIONS (your signature): do an impression ONLY when you receive a note saying IMPRESSION TIME (the app decides the moment, like in your chat). Then your next reply is ONE whole turn as that impression, and right after it you go back to your normal voice. Wrap the WHOLE impression turn in its voice tag (the tag switches your voice). Never write in ALL CAPS and use at most one exclamation mark per turn: in the voice, caps and stacked exclamations turn into shouting. An impression turn follows the SAME level and language rules and the same two-sentence limit as a normal reply (for a beginner: Portuguese, ending with one short English question and its translation).
${list.join('\n')}`;
}

/** Fala inteira na voz da imitação: com voz em português, cada trecho na etiqueta do idioma dele. */
function tagImpression(imp: Impression, text: string): string {
  const plain = text.replace(/<\/?[A-Za-z]+>/g, '').trim();
  if (!imp.callTagPt) return `<${imp.callTag}>${plain}</${imp.callTag}>`;
  return splitByLanguage(plain).map(s => { const t = s.pt ? imp.callTagPt! : imp.callTag; return `<${t}>${s.text}</${t}>`; }).join(' ');
}

/** Ligação inteira com uma imitação (o aluno escolheu "Presidente" na ligação): toda fala na voz dela. */
function wholeImpressionBlock(imp: Impression): string {
  const style = imp.style
    .replace(/^THIS REPLY ONLY: switch into/, 'For this WHOLE call, stay in')
    .replace(/, like a sudden bit in your show\./, ': the student chose to call this character, so you never drop it.')
    .replace(/Keep the SAME length limit as a normal reply\.?/i, 'Keep the same two-sentence limit.');
  return `THIS CALL IS WITH YOUR "${imp.name.toUpperCase()}" CHARACTER (the student picked it). ${style}
${imp.callTagPt
    ? `Wrap EVERY English part in <${imp.callTag}>...</${imp.callTag}> and EVERY Portuguese part in <${imp.callTagPt}>...</${imp.callTagPt}> (the tags switch to this character's English and Brazilian Portuguese voices). Never speak outside these tags and never use any other voice tag.`
    : `Wrap EVERY reply, from the first to the last, in <${imp.callTag}>...</${imp.callTag}> (the tag switches to this character's voice), including the Portuguese parts. Never speak outside the tag and never use any other voice tag.`} Never write in ALL CAPS and use at most one exclamation mark per turn: in the voice, caps and stacked exclamations turn into shouting. Every reply follows the SAME level and language rules and the two-sentence limit. For a beginner (Novice), each reply after the greeting is, like an impression turn: ONE short catchphrase of the character in English (max 5 words), then a short reaction in Portuguese, ending with ONE short English question and its translation in parentheses.
If the student asks who you are, you are Igorfina doing your character, from the Queizy family; never say or confirm who the character imitates.`;
}

const FIRST_MESSAGES: Record<string, string[]> = {
  igorfina: [
    "Hey {name}! Igorfina here, live from my tiny kitchen stage. What's the best thing that happened to you this week?",
    "{name}! You called me? I'm honored. Quick question: what did you eat today?",
    "Hello hello, {name}! Your favorite comedian is on the line. So, what are you doing right now?",
    "{name}, my friend! Perfect timing, I was getting bored. Tell me, how was your day?",
  ],
};
// Ligação inteira com uma imitação: abertura de reserva no jeito dela (sem o nome do Igorfina).
const IMPRESSION_FIRST_MESSAGES: Record<string, { default: string[]; Novice: string[] }> = {
  president: {
    default: ["{name}! Tremendous to hear from you, really tremendous. So tell me, how's your day going?", "Folks, {name} is on the line. Believe me, this is a great call. What are you up to today?"],
    Novice: ["Alô, {name}! Que ligação incrível, acredite. Tudo bem com você?"],
  },
  hoops: {
    default: ["Yo {name}! Let's go, we're locked in today. How's your day going?", "{name}, my teammate! Good to hear you. What have you been up to?"],
    Novice: ["Fala, {name}! Bora, time. Tudo certo com você?"],
  },
  rodela: {
    default: ["{name}, what a pleasure. You see, every conversation is a small chance to grow. How has your day been?"],
    Novice: ["Olá, {name}. Que bom ouvir você. Como você está?"],
  },
  olimpia: {
    default: ["{name}! Time for some heavy English today. How's your day going, champ?"],
    Novice: ["Fala, {name}! Bora treinar esse inglês pesado. Tudo bem com você?"],
  },
  cariri: {
    default: ["{name}, no excuses today. Tell me, how's your routine going?"],
    Novice: ["E aí, {name}! Sem desculpas hoje, hein? Tudo bem com você?"],
  },
  jalim: {
    default: ["My dear friend {name}! Kindly tell me, how is your day going?"],
    Novice: ["Meu querido amigo {name}! Que alegria. Tudo bem com você?"],
  },
  allday: {
    default: ["{name}, let's go! All day, every day. How's your day going?"],
    Novice: ["Bora, {name}! Todo dia, o dia todo. Tudo certo com você?"],
  },
};
// Novice: como a Charlotte, o TURNO 1 é só cumprimentar e perguntar como vai, em português.
const FIRST_MESSAGES_NOVICE: Record<string, string[]> = {
  igorfina: [
    "Alô, {name}! Aqui é o Igorfina. Tudo bem com você?",
    "Fala, {name}! Que bom te ouvir. Como você tá?",
    "Ei, {name}! O Igorfina na linha. Tudo certo por aí?",
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
  Novice: ["Oi de novo, {name}! Onde a gente parou?", "{name}, voltou! Bora continuar de onde parou?"],
  Inter: ["Hey {name}, you're back! So, where were we?", "There you are, {name}! Let's pick up where we left off."],
  Advanced: ["Welcome back, {name}! Shall we pick up where we left off?", "{name}! Right, where were we?"],
};

export function buildCallSession(opts: { characterId: string; impressionId?: string | null; level: CallLevel; name: string } & CallContext) {
  const c = CHARACTERS[opts.characterId as keyof typeof CHARACTERS] as Character | undefined;
  if (!c || !c.persona || !FAMILY_AGENTS[c.id]) return null;
  // Imitação escolhida para a ligação inteira (só as que têm voz no agente).
  const whole = opts.impressionId ? impressionOf(c, opts.impressionId) : null;
  if (opts.impressionId && !whole?.callTag) return null;
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
  // Base: as regras por nível da ligação da Charlotte, inteiras. Por cima: personalidade do personagem
  // (que manda ignorar o nome e o jeito dela, mas manter todas as regras de ensino), imitações e contexto.
  const prompt = whole
    ? `${baseRules(c, opts.level, name)}

${c.persona.replace(/Do NOT do any impression unless this reply's instructions ask for one\./, 'In this call you speak ONLY as the character below.')}

${wholeImpressionBlock(whole)}

${AGENT_NOTES}${topic}${memory}${resume}${opts.level === 'Novice' ? `\n\n${NOVICE_FORMAT}` : ''}`
    : `${baseRules(c, opts.level, name)}

${c.persona.replace(/Do NOT do any impression unless this reply's instructions ask for one\./, 'Do impressions only as described in IMPRESSIONS below.')}

${impressionsBlock(c)}

${AGENT_NOTES}${topic}${memory}${resume}${opts.level === 'Novice' ? `\n\n${NOVICE_FORMAT}` : ''}${portugueseVoiceBlock(c) ? `\n\n${portugueseVoiceBlock(c)}` : ''}`;
  const impPool = whole ? IMPRESSION_FIRST_MESSAGES[whole.id] : null;
  const pool = resumeLines.length ? RESUME_LINES[opts.level]
    : impPool ? (opts.level === 'Novice' ? impPool.Novice : impPool.default)
    : (opts.level === 'Novice' ? FIRST_MESSAGES_NOVICE : FIRST_MESSAGES)[c.id] ?? [];
  const pick = (pool[Math.floor(Math.random() * pool.length)] ?? 'Hey {name}!').replace(/\{name\}/g, name);
  // Imitação: a primeira fala também sai na voz dela.
  const firstMessage = whole ? tagImpression(whole, pick) : pick;
  return { agentId: FAMILY_AGENTS[c.id], prompt, firstMessage, characterName: whole ? whole.name : c.name, impression: whole };
}

/** Primeira fala gerada na hora com o contexto do aluno (horário, dia, tópico, sequência, memória).
 *  Roda junto do pedido de token, enquanto o telefone chama; se falhar ou passar de 2,5 s, usa a lista fixa. */
export async function generateOpener(opts: {
  characterId: string; impressionId?: string | null; level: CallLevel; name: string; fallback: string;
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
  // Mesmo TURNO 1 da ligação da Charlotte. Novice: só cumprimentar e perguntar como vai, em
  // português (o inglês entra aos poucos depois). Inter/Advanced: cumprimento curto em inglês.
  const novice = opts.level === 'Novice';
  const whole = opts.impressionId ? impressionOf(c, opts.impressionId) : null;
  const impressionHint = whole
    // Só o tom do personagem: o estilo inteiro (bordões em inglês, histórias) fazia a abertura sair longa e em inglês no Novice.
    ? `Open AS your "${whole.name}" character (the student chose to call it): its tone, at most ONE very short signature word or expression. Correct, natural English only (never broken grammar). The language and length rule above always wins.`
    : !novice && Math.random() < 0.2
    ? 'This time, open as ONE of your impressions, wrapped in its voice tag (<President>...</President> or <Hoops>...</Hoops>).'
    : 'Open in your normal voice (no tags).';
  const task = novice
    ? `Write ONLY your first line, in Brazilian Portuguese only (no English yet): greet ${name} by name with your humor and END by asking how they are ("Tudo bem?" or "Como você tá?"). Do not ask anything else (no "pronto pra...?", no questions about plans). Max 15 words.`
    : `Write ONLY your first line, in English: a warm, funny greeting using their name plus ONE easy question to get them talking. Max 2 short sentences, max 25 words. Use AT MOST one detail from the context (pick what makes the best opener; often just the time of day or a follow-up on the last call).`;
  const system = `${c.persona.split('Hard rules')[0]}
You are opening a live voice call with ${name}, an English student (${opts.level} level). No emojis, no quotes, no stage directions. ${impressionHint}
Never mention politics, news, real people, teams or brands.
${task}`;
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
    let text = String(j.choices?.[0]?.message?.content ?? '').trim().replace(/^["“]|["”]$/g, '');
    // Regra do TURNO 1 conferida: Novice curto e em português; os outros, curto. Fora disso, a lista fixa.
    const plain = text.replace(/<\/?[A-Za-z]+>/g, '');
    const words = plain.split(/\s+/).filter(Boolean).length;
    if (novice ? (words > 18 || !isPortugueseText(plain)) : words > 32) return opts.fallback;
    // Ligação com a imitação: a fala inteira na voz dela, mesmo se o modelo esquecer a etiqueta.
    if (whole) text = tagImpression(whole, text);
    return text.replace(/<\/?[A-Za-z]+>/g, '').length >= 8 && text.length <= 300 ? text : opts.fallback;
  } catch {
    return opts.fallback;
  }
}
