// lib/characters.ts — Família Queizy no app (espelho de apps/web/lib/characters.ts: mesmos ids).
// Fase 1: cada conversa do Free Chat é com um personagem; a mensagem da Início sai na voz de quem
// o aluno escolheu na Família (charlotte_users.active_character). O resto do app segue com a Charlotte.

export type CharacterId = 'charlotte' | 'igorfina';
export type ImpressionId = 'president' | 'hoops';

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  avatar: number; // require(...) do PNG
  taglinePt: string;
  taglineEn: string;
  impressions?: { id: ImpressionId; labelPt: string; labelEn: string }[];
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  charlotte: {
    id: 'charlotte',
    name: 'Charlotte',
    avatar: require('../assets/charlotte-avatar.png'),
    taglinePt: 'Sua tutora. Conversa leve para praticar o inglês do dia a dia.',
    taglineEn: 'Your tutor. Easygoing chats to practice everyday English.',
  },
  igorfina: {
    id: 'igorfina',
    name: 'Igorfina',
    avatar: require('../assets/igorfina-avatar.png'),
    taglinePt: 'Comediante e imitador. No meio da conversa, ele solta uma imitação.',
    taglineEn: 'Comedian and impressionist. Mid-chat, he drops an impression.',
    impressions: [
      { id: 'president', labelPt: 'Presidente', labelEn: 'President' },
      { id: 'hoops', labelPt: 'Astro do basquete', labelEn: 'Hoops star' },
    ],
  },
};

export const CHARACTER_LIST: CharacterInfo[] = [CHARACTERS.charlotte, CHARACTERS.igorfina];

export function characterInfo(id: string | null | undefined): CharacterInfo {
  return id && id in CHARACTERS ? CHARACTERS[id as CharacterId] : CHARACTERS.charlotte;
}

export function impressionLabel(c: CharacterInfo, id: string | null | undefined, isPt: boolean): string | null {
  const imp = c.impressions?.find(i => i.id === id);
  return imp ? (isPt ? imp.labelPt : imp.labelEn) : null;
}

// Imitações do Igorfina (como no show do Igor): de vez em quando uma resposta sai imitando.
//  QUANDO: a frequência cai ao longo da conversa (por volta da 4ª, 8ª, 13ª, 20ª, 29ª e 40ª resposta,
//          depois a cada 12), e cada posição varia uma resposta para mais ou para menos, sorteada
//          por conversa (fixa para a mesma conversa) — o aluno não percebe o padrão.
//  QUAL:   pelo assunto da última mensagem do aluno (esporte → Astro do basquete; trabalho,
//          negócios, provas, conquistas → Presidente). Sem assunto claro, sorteio com mais chance
//          para a imitação que não saiu da última vez.
const BASE_REPLIES = [4, 8, 13, 20, 29, 40];

/** Hash simples e estável de um texto (para o sorteio fixo por conversa). */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Posições das imitações nesta conversa (com o deslocamento de −1, 0 ou +1 de cada uma). */
function impressionReplies(sessionKey: string): number[] {
  const h = hashOf(sessionKey || 'nova');
  return BASE_REPLIES.map((n, i) => n + (((h >>> (i * 3)) % 3) - 1)).map((n, i, a) => (i > 0 && n <= a[i - 1] ? a[i - 1] + 2 : n));
}

/** A n-ésima resposta (1 = primeira) desta conversa é uma imitação? */
export function isImpressionReply(n: number, sessionKey: string): boolean {
  const list = impressionReplies(sessionKey);
  if (list.includes(n)) return true;
  const last = list[list.length - 1];
  return n > last && (n - last) % 12 === 0;
}

const TOPICS: Record<ImpressionId, RegExp> = {
  hoops: /\b(sports?|esportes?|academia|gym|treino\w*|trein\w+|workout|train\w*|jog(o|os|ar)|games?|match|partida|teams?|basquete|basketball|nba|futebol|soccer|football|corr(ida|er|i)|run(ning)?|bike|pedal\w*|nad(ar|ei|o)|swim\w*|competi\w+|campeonato|cardio|squats?|agachamento|m[uú]scul\w+|muscle|fitness|crossfit|quadra|court|bola|ball)\b/i,
  president: /\b(trabalh\w*|work(ing)?|jobs?|emprego|chefe|boss|reuni[aã]o|meetings?|neg[oó]cio\w*|business|deals?|empresa|company|dinheiro|money|sal[aá]rio|salary|provas?|exams?|tests?|entrevista|interview|apresenta\w+|presentation|discurso|speech|promo[cç][aã]o|promotion|projetos?|projects?|conquist\w+|achievement|vendas?|sales?|clientes?|clients?|lideran[cç]a|leader\w*)\b/i,
};

/** Qual imitação usar nesta resposta, pelo assunto da mensagem do aluno e pela anterior. */
export function pickImpression(c: CharacterInfo, userText: string, lastImpression: ImpressionId | null): ImpressionId | null {
  const ids = (c.impressions ?? []).map(i => i.id);
  if (!ids.length) return null;
  const hits = ids.filter(id => TOPICS[id]?.test(userText));
  if (hits.length === 1) return hits[0];
  // Sem assunto claro (ou os dois): sorteio, com 75% de chance para a que não saiu da última vez.
  const others = ids.filter(id => id !== lastImpression);
  if (lastImpression && others.length && Math.random() < 0.75) return others[Math.floor(Math.random() * others.length)];
  return ids[Math.floor(Math.random() * ids.length)];
}
