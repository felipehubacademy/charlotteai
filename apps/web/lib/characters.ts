// lib/characters.ts — Família Queizy: personagens que o aluno pode escolher para conversar.
// Fase 1: cada conversa do Free Chat é com um personagem e a mensagem da tela inicial sai na voz de
// quem o aluno escolheu na Família; o resto do app (trilha, correções de Gramática e Pronúncia,
// suporte) segue com a Charlotte. Espelho em apps/mobile/lib/characters.ts — manter os ids iguais.
//
// O Igorfina é imitador (como no show do Igor): fala com a própria voz e, de vez em quando, faz
// uma imitação numa resposta inteira. Quem decide QUANDO é o app (conta as respostas da
// conversa) e manda a imitação no cabeçalho x-impression; o servidor só aplica o jeito e a voz.
// Nenhum nome real aparece em texto, tela ou fala.

export type CharacterId = 'charlotte' | 'igorfina';
export type ImpressionId = 'president' | 'hoops';

interface VoiceSettings { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }

export interface Impression {
  id: ImpressionId;
  /** Nome no app (nunca o nome real de quem é imitado). */
  name: string;
  /** Etiqueta da voz no agente de ligação do ElevenLabs (<President>...</President>). */
  callTag: string;
  elevenVoiceId: string;
  elevenSettings: VoiceSettings;
  /** Jeito de falar nesta resposta (inglês). */
  style: string;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** Voz própria no ElevenLabs (null = voz padrão da Charlotte no TTS da OpenAI). */
  elevenVoiceId: string | null;
  elevenSettings?: VoiceSettings;
  /** Voz para as frases em português (o clone em inglês fica para o inglês). */
  elevenVoiceIdPt?: string;
  /** Persona aplicada por cima das regras de ensino da Charlotte (inglês). */
  persona?: string;
  /** Gênero gramatical, para adaptar as regras da Charlotte escritas em português ("amiga" → "amigo"). */
  gender?: 'f' | 'm';
  impressions?: Partial<Record<ImpressionId, Impression>>;
  /** Estilo da mensagem da tela inicial. */
  greetingStylePt?: string;
  greetingStyleEn?: string;
}

// Regras que valem para qualquer personagem de humor.
export const SAFETY = `Hard rules (these override everything above):
- This is playful humor to make practicing English fun. NEVER say or suggest you are a real person, a politician, an athlete or a celebrity. If asked who you are or whether you are someone famous, just say you are Igorfina, from the Queizy family, without repeating or mentioning any real person's name. Never name the people you imitate.
- NEVER talk about politics, elections, parties, governments, real politicians, news, religion, wars or other controversial topics, and never give opinions about real people. If the student brings it up, joke that the only thing you campaign for is better English, and steer back to a fun everyday topic.
- You may mention real sports teams casually, but never real players or anyone else by their real name, and never brands.
- Never insult, mock or belittle the student. Hype them up instead.
- Keep it family-friendly.`;

export const CHARACTERS: Record<CharacterId, Character> = {
  charlotte: { id: 'charlotte', name: 'Charlotte', elevenVoiceId: null },
  igorfina: {
    id: 'igorfina',
    name: 'Igorfina',
    gender: 'm',
    elevenVoiceId: '9QtRgQhaZY2Ge2ttjy5x', // voz do próprio Igor
    elevenVoiceIdPt: 'Ns4bYXHjNeTGuhVk2172', // clone em português (carioca), gravação de 22/10/2026
    // Ajustes dos áudios de referência no ElevenLabs.
    elevenSettings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
    persona: `CHARACTER: You are Igorfina, a stand-up comedian and impressionist from the Queizy family (Charlotte's friend). You are NOT Charlotte: ignore her name, age and personality above, but keep EVERY teaching, level, language, length and format rule above.
How Igorfina talks (his normal voice): relaxed, funny and warm, like a friend doing a bit on stage; quick jokes, playful teasing about everyday life, big reactions to the student's wins; reacts to what the student said and asks one question back. Do NOT do any impression unless this reply's instructions ask for one.
${SAFETY}`,
    impressions: {
      president: {
        id: 'president',
        name: 'Presidente',
        callTag: 'President',
        elevenVoiceId: 'lTvauX7usZGgPtVjHUai', // v2 mais fina (escolhida pelo Igor em 2026-10-20); a original era Ae9Gsa0DTDwfuNkVVkhW
        elevenSettings: { stability: 0.5, similarity_boost: 1, style: 0.5, use_speaker_boost: true },
        style: `THIS REPLY ONLY: switch into your "president" impression, like a sudden bit in your show. Do NOT announce or explain it (never say "impression", "let me do", "impression time" or anything about imitating) and do NOT put the reply in quotes: just start talking as the character, at most with a natural interjection ("Folks...", "Listen..."). Write the whole reply as a booming, over-the-top, self-confident leader giving a speech: superlatives ("tremendous", "incredible", "the best", "huge", "nobody does it better"), short punchy sentences, repetition ("It's great. Really great."), and maybe ONE catchphrase ("Believe me.", "Many people are saying it.", "We're going to win so much."). Treat the student's English like a huge victory. Keep the SAME length limit as a normal reply. Still answer what they said and ask one question back. No politics, no real names.`,
      },
      hoops: {
        id: 'hoops',
        name: 'Astro do basquete',
        callTag: 'Hoops',
        elevenVoiceId: 'eYL3phk0UMwkYIIT2vP7',
        elevenSettings: { stability: 0.4, similarity_boost: 0.6, style: 0.5, use_speaker_boost: true },
        style: `THIS REPLY ONLY: switch into your "basketball superstar" impression, like a sudden bit in your show. Do NOT announce or explain it (never say "impression", "let me do", "impression time" or anything about imitating) and do NOT put the reply in quotes: just start talking as the character, at most with a natural interjection ("Yo...", "Listen up..."). Write the whole reply as a calm, confident basketball legend talking to a teammate: locker-room pep talk, "let's go", "we locked in", "that's championship English", talk of practice, grind, buckets and staying humble but hungry. Keep the SAME length limit as a normal reply. Still answer what they said and ask one question back. No real players or brands.`,
      },
    },
    greetingStylePt: `Você é o Igorfina, comediante e imitador da família Queizy: engraçado, leve e animado, como um amigo fazendo uma piada rápida no palco. É humor para animar o aluno a estudar. Nunca fale de política, notícias ou pessoas reais e nunca diga que é alguém real.`,
    greetingStyleEn: `You are Igorfina, a comedian and impressionist from the Queizy family: funny, light and upbeat, like a friend doing a quick bit on stage. It's humor to get the student excited to study. Never mention politics, news or real people, and never claim to be a real person.`,
  },
};

export function characterOf(id: unknown): Character {
  return typeof id === 'string' && id in CHARACTERS ? CHARACTERS[id as CharacterId] : CHARACTERS.charlotte;
}

export function impressionOf(c: Character, id: unknown): Impression | null {
  return typeof id === 'string' ? c.impressions?.[id as ImpressionId] ?? null : null;
}

/** Aplica o personagem (e a imitação desta resposta, se houver) a um system prompt da Charlotte. */
export function applyCharacterToSystem(system: string, c: Character, impression: Impression | null = null): string {
  if (c.id === 'charlotte' || !c.persona) return system;
  const renamed = system
    .replace(/Você é a Charlotte|Você é Charlotte/g, `Você é o ${c.name}`)
    .replace(/\bCharlotte\b/g, c.name);
  return `${renamed}\n\n${c.persona}${impression ? `\n\n${impression.style}` : ''}`;
}

// ── Português x inglês na mesma fala ────────────────────────────────────────
const PT_WORDS = new Set(('você voce não nao que de do da dos das pra para eu é e um uma com isso isto tá ta muito mas como se te os as no na nos nas em meu minha '
  + 'vamos agora bora sim fala bom boa legal tudo foi tem seu sua por mais bem aqui ele ela quer diz fazer faz está esta estou sou já ja hoje '
  + 'então entao também tambem porque quando onde qual quem ou só so assim cara irmão mermão beleza demais gente vai vou ser era tô to').split(' '));
const EN_WORDS = new Set(('the you is are i to and what do does your my it in of that this how can yes we have was be with for on he she they '
  + 'did will would like where who why when there their our an at from about just so really').split(' '));

/** true quando a frase é mais português do que inglês (acento conta a favor do português). */
export function isPortugueseText(text: string): boolean {
  const words = text.toLowerCase().match(/[a-zà-ú']+/g) ?? [];
  let pt = (text.match(/[áàâãéêíóôõúç]/gi) ?? []).length * 2, en = 0;
  for (const w of words) { if (PT_WORDS.has(w)) pt++; if (EN_WORDS.has(w)) en++; }
  return pt > en;
}

/** Divide a fala em trechos seguidos do mesmo idioma (frase a frase). Frase sem pista fica com o idioma da anterior. */
export function splitByLanguage(text: string): { text: string; pt: boolean }[] {
  // Frases, e também o que vem depois de dois-pontos ("Agora me diz: Where are you from?").
  const sentences = text.split(/(?<=:)\s+/).flatMap(part => (part.match(/[^.!?…]+[.!?…]*["')\]]*\s*/g) ?? [part]).map(x => x.endsWith(' ') ? x : `${x} `));
  const out: { text: string; pt: boolean }[] = [];
  for (const s of sentences) {
    const words = s.toLowerCase().match(/[a-zà-ú']+/g) ?? [];
    const hasCue = /[áàâãéêíóôõúç]/i.test(s) || words.some(w => PT_WORDS.has(w) || EN_WORDS.has(w));
    const pt = hasCue ? isPortugueseText(s) : (out.length ? out[out.length - 1].pt : isPortugueseText(text));
    if (out.length && out[out.length - 1].pt === pt) out[out.length - 1].text += s;
    else out.push({ text: s, pt });
  }
  return out.map(x => ({ ...x, text: x.text.trim() })).filter(x => x.text);
}

/** Trechos da fala com a voz de cada um: português na voz em português do personagem (se tiver), o resto na voz normal.
 *  Imitação fala tudo na voz dela. */
export function voiceSegments(c: Character, impression: Impression | null, text: string): { voiceId: string; settings?: VoiceSettings; text: string }[] {
  const base = voiceFor(c, impression);
  if (!base) return [];
  if (impression || !c.elevenVoiceIdPt) return [{ ...base, text }];
  return splitByLanguage(text).map(seg => ({ voiceId: seg.pt ? c.elevenVoiceIdPt! : base.voiceId, settings: base.settings, text: seg.text }));
}

/** Emenda mp3 de vozes diferentes num áudio só. Cada pedaço do ElevenLabs vem com etiqueta ID3 e um quadro "Info"
 *  que diz a duração DELE: emendado assim, o tocador acha que o áudio acaba no fim do 1º pedaço. Tira os dois. */
export function concatMp3(parts: Buffer[]): Buffer {
  if (parts.length === 1) return parts[0];
  const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const RATES = [44100, 48000, 32000];
  return Buffer.concat(parts.map(b => {
    let o = 0;
    if (b.length > 10 && b.toString('latin1', 0, 3) === 'ID3') {
      o = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
    }
    // 1º quadro: se for o quadro "Info"/"Xing" (MPEG-1 Layer III), pula ele.
    if (b[o] === 0xff && (b[o + 1] & 0xe0) === 0xe0) {
      const br = BITRATES[b[o + 2] >> 4], sr = RATES[(b[o + 2] >> 2) & 3], pad = (b[o + 2] >> 1) & 1;
      const len = br && sr ? Math.floor((144 * br * 1000) / sr) + pad : 0;
      const head = b.toString('latin1', o, o + Math.min(len, 64));
      if (len && (head.includes('Info') || head.includes('Xing'))) o += len;
    }
    return b.subarray(o);
  }));
}

/** Ligação (agente do ElevenLabs): etiqueta <Portugues> nas partes em português, que troca para a voz em português.
 *  Trecho que já está dentro de uma etiqueta de imitação não é mexido. */
export const PT_VOICE_TAG = 'Portugues';
export function tagPortuguese(text: string): string {
  if (/<[A-Za-z]+>/.test(text)) return text;
  return splitByLanguage(text).map(seg => seg.pt ? `<${PT_VOICE_TAG}>${seg.text}</${PT_VOICE_TAG}>` : seg.text).join(' ');
}

/** Voz do ElevenLabs para uma fala: a da imitação, senão a do personagem. */
export function voiceFor(c: Character, impression: Impression | null): { voiceId: string; settings?: VoiceSettings } | null {
  if (impression) return { voiceId: impression.elevenVoiceId, settings: impression.elevenSettings };
  return c.elevenVoiceId ? { voiceId: c.elevenVoiceId, settings: c.elevenSettings } : null;
}

/**
 * Imitação de uma atividade inteira da trilha do Igorfina (Role-play/Guided Chat), pelo figurino
 * do conteúdo: persona_outfit 'igorfina_president' ou 'igorfina_hoops'. Sem figurino de imitação: null.
 */
export function impressionFromOutfit(outfit: unknown): Impression | null {
  const m = typeof outfit === 'string' ? outfit.match(/^igorfina_(president|hoops)$/) : null;
  return m ? impressionOf(CHARACTERS.igorfina, m[1]) : null;
}

/** Conversa inteira com uma imitação (o aluno escolheu "Presidente" no Free Chat ou na ligação). */
export function wholeConversationImpressionStyle(imp: Impression): string {
  return imp.style.replace(/^THIS REPLY ONLY: switch into/, 'For this WHOLE conversation, stay in')
    .replace(/, like a sudden bit in your show\./, ': the student chose to talk to this character, so you never drop it.')
    + ' EVERY reply must sound like this character (its catchphrases or its signature tone), even the short ones. If the student asks who you are, you are Igorfina doing your character, from the Queizy family; never say or confirm who the character imitates.';
}

/** Estilo da imitação valendo para a conversa toda (o texto original é "só nesta resposta"). */
export function wholeActivityImpressionStyle(imp: Impression): string {
  return imp.style.replace(/^THIS REPLY ONLY: switch into/, 'For this WHOLE activity, stay in')
    + ' EVERY reply in this activity must sound like this character (at least one of its catchphrases or its signature tone), even the short ones. Prefer its catchphrases over "my friend".';
}
