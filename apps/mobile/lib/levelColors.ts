// lib/levelColors.ts
// Cores por nível — fonte única. Seguem a jornada da marca Queizy:
//   Novice = Pink (o "queizy", começo) · Inter = Violeta (meio) ·
//   Advanced = Verde Crazy (o "crazy", fluência).
//
// ACCENT é a versão escura, legível como texto/ícone sobre branco e como fundo
// de selo com texto branco (contraste ≥ 5:1). VIVID é a cor da marca, para
// barras, preenchimentos e detalhes decorativos. BG é o fundo claro do nível.

type Level = 'Novice' | 'Inter' | 'Advanced';

export const LEVEL_ACCENT: Record<string, string> = {
  Novice:   '#D12A64',
  Inter:    '#6B4BFF',
  Advanced: '#08804A',
};

export const LEVEL_VIVID: Record<string, string> = {
  Novice:   '#FF4F8B',
  Inter:    '#8B73FF',
  Advanced: '#2BD97C',
};

export const LEVEL_ACCENT_BG: Record<string, string> = {
  Novice:   '#FFEEF4',
  Inter:    '#F1EEFF',
  Advanced: '#E8FBF1',
};

/** Cor de destaque do nível (fallback: Advanced, como nos ternários antigos). */
export function getLevelAccent(level: Level | string | null | undefined): string {
  return LEVEL_ACCENT[level ?? ''] ?? LEVEL_ACCENT.Advanced;
}

/** Fundo claro do nível (fallback: Advanced). */
export function getLevelAccentBg(level: Level | string | null | undefined): string {
  return LEVEL_ACCENT_BG[level ?? ''] ?? LEVEL_ACCENT_BG.Advanced;
}
