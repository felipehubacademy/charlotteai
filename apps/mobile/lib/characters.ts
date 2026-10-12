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

// Imitações do Igorfina: como no show, de vez em quando uma resposta sai imitando e
// a frequência vai caindo ao longo da conversa (4ª, 8ª, 13ª, 20ª, 29ª, 40ª resposta, depois a cada 12).
const IMPRESSION_REPLIES = [4, 8, 13, 20, 29, 40];
function isImpressionReply(n: number): boolean {
  if (IMPRESSION_REPLIES.includes(n)) return true;
  return n > 40 && (n - 40) % 12 === 0;
}

/** Imitação da n-ésima resposta da conversa (1 = primeira), ou null. Alterna entre as imitações. */
export function impressionForReply(c: CharacterInfo, n: number, sessionSeed = 0): ImpressionId | null {
  const list = c.impressions ?? [];
  if (!list.length || !isImpressionReply(n)) return null;
  const k = n <= 40 ? IMPRESSION_REPLIES.indexOf(n) : 6 + (n - 40) / 12;
  return list[(k + sessionSeed) % list.length].id;
}
