// Rótulos em português dos tipos de exercício e de prática usados no Pedagógico.

export const EXERCISE_LABEL: Record<string, string> = {
  multiple_choice: 'Múltipla escolha',
  word_bank: 'Banco de palavras',
  fill_gap: 'Completar lacuna',
  fix_error: 'Corrigir erro',
  read_answer: 'Leitura e resposta',
  word_order: 'Ordenar palavras',
  short_write: 'Escrita curta',
  repeat: 'Repetir em voz alta',
  listen_write: 'Ouvir e escrever',
  minimal_pairs: 'Pares mínimos',
  sentence_stress: 'Acento da frase',
  shadowing: 'Shadowing',
  'v2:grammar': 'Gramática (nota)',
  'v2:speaking': 'Listening & Speaking (nota)',
  'v2:roleplay': 'Role-play (concluído)',
  'v2:chat': 'Guided Chat (concluído)',
};

export const PRACTICE_LABEL: Record<string, string> = {
  learn_exercise: 'Trilha',
  audio_message: 'Pronúncia',
  grammar_message: 'Gramática',
  text_message: 'Chat livre',
  sr_review: 'Revisão espaçada',
  vocab_review: 'Vocabulário',
  roleplay: 'Role-play (trilha)',
  guided_chat: 'Guided Chat (trilha)',
};

export const exLabel = (t: string) => EXERCISE_LABEL[t] ?? t;
export const practiceLabel = (t: string) => PRACTICE_LABEL[t] ?? t;

export function accColor(v: number | null): string {
  if (v == null) return 'var(--t3)';
  if (v >= 75) return 'var(--ok)';
  if (v >= 55) return 'var(--warn)';
  return 'var(--err)';
}

export function ago(iso: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}
