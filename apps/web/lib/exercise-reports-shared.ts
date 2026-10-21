// lib/exercise-reports-shared.ts — tipos e rótulos dos reportes dos exercícios, sem nada de servidor
// (o painel do /admin roda no navegador). A leitura do banco fica em lib/exercise-reports.ts.

export interface ExerciseReport {
  id: string; created_at: string; user_id: string; screen: string; reason: string; comment: string | null;
  level: string | null; module_id: string | null; unit_id: string | null; activity: string | null; step_idx: number | null;
  exercise: Record<string, unknown> | null; user_answer: string | null; transcript: string | null;
  app_version: string | null; platform: string | null; status: 'open' | 'fixed' | 'dismissed';
  name?: string | null; email?: string | null;
}

export const REASON_PT: Record<string, string> = {
  answer_right: 'Minha resposta estava certa',
  speech: 'O app não entendeu minha fala',
  audio: 'O áudio não toca ou está errado',
  confusing: 'Exercício confuso ou com erro',
  other: 'Outro problema',
};
export const SCREEN_PT: Record<string, string> = {
  'learn-session': 'Trilha', roleplay: 'Role-play', 'guided-chat': 'Guided Chat',
  'practice-grammar': 'Practice (Gramática)', 'practice-pronunciation': 'Practice (Pronúncia)',
  placement: 'Teste de nível', 'vocab-review': 'Revisão de vocabulário',
};

/** Texto curto do que estava na tela (frase, pergunta ou persona). */
export function exerciseText(r: Pick<ExerciseReport, 'exercise'>): string {
  const e = (r.exercise ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '');
  const phrase = e.phrase && typeof e.phrase === 'object' ? (e.phrase as Record<string, unknown>).text : '';
  return pick('sentence') || pick('question') || pick('text') || pick('prompt') || pick('word') || pick('term')
    || (typeof phrase === 'string' ? phrase : '') || (pick('persona') ? `Conversa com ${pick('persona')}` : '') || '';
}
