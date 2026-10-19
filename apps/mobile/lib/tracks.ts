// lib/tracks.ts — trilhas extras da Família Queizy (trilhas de influenciadores).
//
// Ficam fora do seletor de nível: aparecem na faixa "Trilhas da Família Queizy" da Início e
// abrem numa tela própria (/(app)/track). Cada trilha é um "nível" do curriculum v2 (pasta
// própria em data/curriculum-v2), com o progresso em learn_history_v2 pelo id da trilha.
//
// Para publicar uma trilha nova: escreva o conteúdo (docs/curriculum/v2/<pasta>/), compile com
// --level=<pasta>, acrescente o id em Level (curriculum-v2/types.ts) e uma entrada aqui.

import type { Level } from '@/lib/curriculum-v2/types';
import type { CharacterId, ImpressionId } from '@/lib/characters';

export interface ExtraTrack {
  id:          Level;           // nível do curriculum v2 (ex.: 'Igorfina')
  character:   CharacterId;     // avatar e voz
  titlePt:     string;
  titleEn:     string;
  hostPt:      string;          // "com o Igorfina"
  hostEn:      string;
  /** Só aparece para quem tem esta chave em beta_features (enquanto não lança para todos). */
  betaFlag?:   string;
  /** Degustação: a única unidade aberta para quem ainda não assina. A que dá o "uau". */
  tasteUnit:   { moduleId: string; unitId: string };
  /** Revisão: quem tem esta chave em beta_features (e não está na degustação) vê todas as
   *  unidades abertas, sem a ordem obrigatória. Só para a equipe e o dono da trilha; alunos,
   *  inclusive institucionais, seguem em ordem. */
  reviewFlag?: string;
}

export const EXTRA_TRACKS: ExtraTrack[] = [
  {
    id: 'Igorfina',
    character: 'igorfina',
    titlePt: 'Manual do F#did@',
    titleEn: 'Survival Manual',
    hostPt: 'com o Igorfina',
    hostEn: 'with Igorfina',
    // O "uau": o presidente exagerado ("the best, tremendous") ensinando the best / the worst.
    tasteUnit: { moduleId: 'M06', unitId: 'F27' },
    reviewFlag: 'igorfina_trail', // Felipe e Igor: trilha toda aberta para revisar
  },
];

export function extraTrack(level: string | null | undefined): ExtraTrack | null {
  return EXTRA_TRACKS.find(t => t.id === level) ?? null;
}

export function isExtraTrack(level: string | null | undefined): boolean {
  return !!extraTrack(level);
}

/** Trilhas que este aluno vê (as em beta só com a chave). */
export function visibleTracks(betaFeatures: string[] | null | undefined): ExtraTrack[] {
  return EXTRA_TRACKS.filter(t => !t.betaFlag || (betaFeatures ?? []).includes(t.betaFlag));
}

/** Imitação do tópico (persona_outfit igorfina_president / igorfina_hoops), ou undefined. */
export function unitImpression(unit: { roleplay?: { persona_outfit?: string } | null } | null | undefined): ImpressionId | undefined {
  return unit?.roleplay?.persona_outfit?.match(/^igorfina_(president|hoops)$/)?.[1] as ImpressionId | undefined;
}
