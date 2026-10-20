// lib/learnAttempts.ts — registra cada tentativa da trilha (o que o aluno falou ou escreveu, a
// resposta esperada, a nota, se pulou, se saiu no meio, se o microfone ou o reconhecimento falhou).
// learn_history_v2 guarda só a nota final da atividade; sem isto, erro de correção (aluno fala
// certo e reprova) e abandono no meio ficam invisíveis. Vira o painel "Onde os alunos travam" no
// /admin e o alerta diário. Nunca lança nem atrasa a tela: grava em segundo plano.
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getAppVersionFields } from './appVersion';

export type AttemptEvent = 'attempt' | 'skip' | 'exit' | 'asr_error' | 'mic_blocked';

export interface AttemptLog {
  level: string;
  moduleId?: string | null;
  unitId?: string | null;
  activityType: 'speaking' | 'grammar';
  stepIdx?: number;
  event?: AttemptEvent;
  expected?: string | null;
  answer?: string | null;
  alternatives?: string[] | null;
  score?: number | null;
  passed?: boolean | null;
  /** 'device' = reconhecimento do celular; 'server' = transcrição pelo servidor; 'typed' = digitado. */
  source?: 'device' | 'server' | 'typed' | null;
  errorCode?: string | null;
}

let version: string | null | undefined;

export function logAttempt(userId: string | undefined | null, a: AttemptLog): void {
  if (!userId) return;
  if (version === undefined) { try { version = getAppVersionFields().app_version; } catch { version = null; } }
  const row = {
    user_id: userId,
    level: a.level,
    module_id: a.moduleId ?? null,
    unit_id: a.unitId ?? null,
    activity_type: a.activityType,
    step_idx: a.stepIdx ?? null,
    event: a.event ?? 'attempt',
    expected: a.expected ?? null,
    answer: a.answer ? a.answer.slice(0, 500) : null,
    alternatives: a.alternatives && a.alternatives.length > 1 ? a.alternatives.slice(0, 5) : null,
    score: typeof a.score === 'number' ? Math.round(a.score) : null,
    passed: a.passed ?? null,
    source: a.source ?? null,
    error_code: a.errorCode ?? null,
    platform: Platform.OS,
    app_version: version,
  };
  Promise.resolve(supabase.from('learn_attempts').insert(row)).then(({ error }) => {
    if (error) console.warn('[learnAttempts] insert failed', error.message);
  }).catch(() => {});
}
