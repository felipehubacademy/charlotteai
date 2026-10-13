// lib/spacedRepetition.ts
// Sistema SR com algoritmo SM-2.
// sr_items: pool unificado de tópicos da trilha + vocabulário do usuário.

import { supabase } from './supabase';
import { addDaysISO } from './dateUtils';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type SRRating = 'hard' | 'ok' | 'easy';

export type CardType =
  | 'gap_fill'
  | 'reverse'
  | 'context_guess'
  | 'charlotte_challenge'
  | 'listening_gap';

export interface SRItem {
  id:            string;
  sourceType:    'vocabulary' | 'learn_topic';
  sourceId:      string;
  cardType:      CardType;
  content:       Record<string, unknown>;
  userLevel:     string;
  topicTitle:    string;
  easeFactor:    number;
  intervalDays:  number;
  repetitions:   number;
  nextReviewAt:  string;
  lastRating:    SRRating | null;
}

// ReviewItem mantido para compatibilidade com learn-session existente
export interface ReviewItem {
  id:           string;
  userLevel:    string;
  moduleIndex:  number;
  topicIndex:   number;
  topicTitle:   string;
  reviewInterval: number;
  reviewDue:    string;
}

export interface ExerciseError {
  userLevel:    string;
  moduleIndex:  number;
  topicIndex:   number;
  exerciseType: string;
  exerciseData: Record<string, unknown>;
}

// ── SM-2 ─────────────────────────────────────────────────────────────────────

export function calcNextReview(
  rating: SRRating,
  item: Pick<SRItem, 'easeFactor' | 'intervalDays' | 'repetitions'>,
): { easeFactor: number; intervalDays: number; repetitions: number; nextReviewAt: Date } {
  let { easeFactor, intervalDays, repetitions } = item;

  if (rating === 'hard') {
    intervalDays = 1;
    easeFactor   = Math.max(1.3, easeFactor - 0.2);
    repetitions  = 0;
  } else if (rating === 'ok') {
    intervalDays = repetitions === 0 ? 1 : Math.round(intervalDays * easeFactor);
    repetitions += 1;
  } else {
    // "Fácil" tem bônus de 30% e fica sempre pelo menos 1 dia acima do "Ok"
    // (antes os dois arredondavam para o mesmo intervalo).
    const okDays = repetitions === 0 ? 1 : Math.round(intervalDays * easeFactor);
    easeFactor   = Math.min(3.0, easeFactor + 0.15);
    intervalDays = repetitions === 0 ? 4 : Math.max(okDays + 1, Math.round(intervalDays * easeFactor * 1.3));
    repetitions += 1;
  }

  // addDaysISO: meia-noite local + N dias → UTC. Review disponível no fuso do usuário.
  const nextReviewAt = new Date(addDaysISO(intervalDays));

  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}

// ── Agendar itens SR quando tópico é concluído ───────────────────────────────

/**
 * Cria entradas em sr_items para os 4 intervalos SM-2 iniciais (1, 3, 7, 14 dias).
 * Chamado após saveTopicComplete() ter sucesso.
 */
export async function scheduleReviews(
  userId: string,
  level: string,
  moduleIndex: number,
  topicIndex: number,
  topicTitle: string,
): Promise<void> {
  const sourceId = `${level}:${moduleIndex}:${topicIndex}`;

  // Verificar se já existem itens para este tópico (evitar duplicatas em re-conclusão)
  const { data: existing } = await supabase
    .from('sr_items')
    .select('id')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .eq('source_type', 'learn_topic')
    .limit(1);

  if (existing && existing.length > 0) return;

  // 4 cards com intervalos iniciais diferentes — serão ajustados pelo SM-2
  const initialIntervals = [1, 3, 7, 14];
  const cardTypes: CardType[] = ['gap_fill', 'reverse', 'context_guess', 'charlotte_challenge'];

  const rows = initialIntervals.map((days, i) => ({
    user_id:       userId,
    source_type:   'learn_topic',
    source_id:     sourceId,
    card_type:     cardTypes[i],
    content:       {},
    user_level:    level,
    topic_title:   topicTitle,
    ease_factor:   2.5,
    interval_days: days,
    repetitions:   0,
    next_review_at: addDaysISO(days), // meia-noite local + N dias
  }));

  const { error } = await supabase.from('sr_items').insert(rows);
  if (error) console.warn('[spacedRep] scheduleReviews error:', error.message);
}

// ── Schedule SR cards for a user vocabulary item ──────────────────────────────

export async function scheduleVocabReviews(
  userId: string,
  vocabId: string,
  category: string,
  term: string,
  level: string,
): Promise<void> {
  // Choose card types based on category
  let cardTypes: CardType[];
  if (category === 'idiom') {
    cardTypes = ['context_guess', 'gap_fill'];
  } else if (category === 'phrasal_verb') {
    cardTypes = ['context_guess', 'gap_fill'];
  } else if (category === 'grammar') {
    cardTypes = ['charlotte_challenge', 'gap_fill'];
  } else {
    cardTypes = ['gap_fill', 'reverse'];
  }

  const initialIntervals = [1, 5]; // 2 cards: day 1 + day 5

  const rows = initialIntervals.map((days, i) => ({
    user_id:       userId,
    source_type:   'vocabulary',
    source_id:     vocabId,
    card_type:     cardTypes[i] ?? cardTypes[0],
    content:       {},
    user_level:    level,
    topic_title:   term,
    ease_factor:   2.5,
    interval_days: days,
    repetitions:   0,
    next_review_at: addDaysISO(days), // meia-noite local + N dias
  }));

  const { error } = await supabase.from('sr_items').insert(rows);
  if (error) console.warn('[spacedRep] scheduleVocabReviews error:', error.message);
}

// ── Buscar revisões pendentes ─────────────────────────────────────────────────

export async function getPendingReviews(userId: string): Promise<ReviewItem[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sr_items')
    .select('id, source_id, user_level, topic_title, card_type, interval_days, next_review_at')
    .eq('user_id', userId)
    .eq('source_type', 'learn_topic')
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(10);

  if (error) {
    console.warn('[spacedRep] getPending error:', error.message);
    return [];
  }

  return (data ?? []).map(r => {
    const parts = (r.source_id as string).split(':');
    return {
      id:             r.id,
      userLevel:      r.user_level ?? '',
      moduleIndex:    parseInt(parts[1] ?? '0', 10),
      topicIndex:     parseInt(parts[2] ?? '0', 10),
      topicTitle:     r.topic_title ?? '',
      reviewInterval: r.interval_days ?? 0,
      reviewDue:      r.next_review_at,
    };
  });
}

// ── Aplicar rating SM-2 após sessão de review ────────────────────────────────

export async function applyReviewRating(
  itemId: string,
  rating: SRRating,
  currentItem: Pick<SRItem, 'easeFactor' | 'intervalDays' | 'repetitions'>,
): Promise<void> {
  const { easeFactor, intervalDays, repetitions, nextReviewAt } =
    calcNextReview(rating, currentItem);

  const { error } = await supabase
    .from('sr_items')
    .update({
      ease_factor:      easeFactor,
      interval_days:    intervalDays,
      repetitions,
      next_review_at:   nextReviewAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
      last_rating:      rating,
    })
    .eq('id', itemId);

  if (error) console.warn('[spacedRep] applyRating error:', error.message);
}

// ── Compatibilidade retroativa (usado em learn-session existente) ─────────────

export async function markReviewDone(reviewId: string): Promise<void> {
  await applyReviewRating(reviewId, 'easy', {
    easeFactor: 2.5, intervalDays: 14, repetitions: 3,
  });
}

export async function rescheduleReview(
  reviewId: string,
  _userId: string,
  _level: string,
  _moduleIndex: number,
  _topicIndex: number,
  _topicTitle: string,
): Promise<void> {
  await applyReviewRating(reviewId, 'hard', {
    easeFactor: 2.5, intervalDays: 3, repetitions: 0,
  });
}

// ── Tracking de erros em exercícios (inalterado) ──────────────────────────────

export async function trackExerciseError(
  userId: string,
  error: ExerciseError,
): Promise<void> {
  const { error: dbErr } = await supabase
    .from('charlotte_exercise_errors')
    .insert({
      user_id:       userId,
      user_level:    error.userLevel,
      module_index:  error.moduleIndex,
      topic_index:   error.topicIndex,
      exercise_type: error.exerciseType,
      exercise_data: error.exerciseData,
    });

  if (dbErr) console.warn('[spacedRep] trackError error:', dbErr.message);
}

export async function getErrorsByTopic(
  userId: string,
  level: string,
  moduleIndex: number,
  topicIndex: number,
): Promise<ExerciseError[]> {
  const { data, error } = await supabase
    .from('charlotte_exercise_errors')
    .select('user_level, module_index, topic_index, exercise_type, exercise_data')
    .eq('user_id', userId)
    .eq('user_level', level)
    .eq('module_index', moduleIndex)
    .eq('topic_index', topicIndex)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];

  return (data ?? []).map(r => ({
    userLevel:    r.user_level,
    moduleIndex:  r.module_index,
    topicIndex:   r.topic_index,
    exerciseType: r.exercise_type,
    exerciseData: r.exercise_data,
  }));
}
// OTA trigger Thu Apr 16 17:10:17 -03 2026
