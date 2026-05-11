import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRICULUM, TrailLevel } from '@/data/curriculum';
import { useAchievementsContext } from '@/components/achievements/AchievementsProvider';
import { trackExerciseError, scheduleReviews } from '@/lib/spacedRepetition';

export interface CompletedKey { m: number; t: number }

export interface LearnProgressData {
  moduleIndex:      number;
  topicIndex:       number;
  completed:        CompletedKey[];
  introsDone:       number[];
}

interface UseLearnProgressReturn {
  progress:         LearnProgressData | null;
  loading:          boolean;
  refetch:          () => void;
  saveTopicComplete: (level: TrailLevel, moduleIndex: number, topicIndex: number) => Promise<void>;
  saveExercise:     (params: SaveExerciseParams) => Promise<void>;
  saveIntroDone:    (level: TrailLevel, moduleIndex: number) => Promise<void>;
  isTopicComplete:  (moduleIndex: number, topicIndex: number) => boolean;
  isIntroDone:      (moduleIndex: number) => boolean;
  isCurrent:        (moduleIndex: number, topicIndex: number) => boolean;
  isLocked:         (moduleIndex: number, topicIndex: number) => boolean;
}

interface SaveExerciseParams {
  level:         TrailLevel;
  moduleIndex:   number;
  topicIndex:    number;
  exerciseType:  string;
  isCorrect:     boolean;
  xpEarned:      number;
  // Conteúdo do exercício — persistido em exercise_errors quando isCorrect=false
  exerciseData?: {
    question?:      string;  // enunciado / frase da questão
    correctAnswer?: string;  // resposta esperada
    userAnswer?:    string;  // o que o usuário digitou/selecionou
    score?:         number;  // para pronuncia: score 0-100
  };
}

export function useLearnProgress(userId: string | undefined, level: TrailLevel): UseLearnProgressReturn {
  const [progress, setProgress]   = useState<LearnProgressData | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [fetchTick, setFetchTick] = useState(0);
  const { checkForNewAchievements } = useAchievementsContext();

  /** Trigger a fresh fetch from DB (e.g. when screen gets focus after navigation) */
  const refetch = useCallback(() => setFetchTick(t => t + 1), []);

  // ── Fetch or initialise progress ────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('learn_progress')
        .select('module_index, topic_index, completed, intros_done')
        .eq('user_id', userId)
        .eq('level', level)
        .maybeSingle();

      if (error) {
        console.error('[useLearnProgress] fetch error', error);
        setProgress({ moduleIndex: 0, topicIndex: 0, completed: [], introsDone: [] });
      } else if (!data) {
        // First time on this level — create row
        await supabase.from('learn_progress').insert({
          user_id:      userId,
          level,
          module_index: 0,
          topic_index:  0,
          completed:    [],
          intros_done:  [],
        });
        setProgress({ moduleIndex: 0, topicIndex: 0, completed: [], introsDone: [] });
      } else {
        setProgress({
          moduleIndex: data.module_index,
          topicIndex:  data.topic_index,
          completed:   (data.completed   as CompletedKey[]) ?? [],
          introsDone:  (data.intros_done as number[])       ?? [],
        });
      }
      setLoading(false);
    };

    fetch();
  }, [userId, level, fetchTick]);

  // ── Mark topic complete & advance pointer ────────────────────────────────
  const saveTopicComplete = useCallback(async (
    lvl: TrailLevel, moduleIndex: number, topicIndex: number,
  ) => {
    if (!userId) return;

    // Always read fresh state from DB — never trust potentially stale in-memory progress.
    // This prevents alreadyDone false-positive and silent no-op updates.
    const { data: fresh, error: fetchErr } = await supabase
      .from('learn_progress')
      .select('module_index, topic_index, completed')
      .eq('user_id', userId)
      .eq('level', lvl)
      .maybeSingle();

    if (fetchErr) console.error('[useLearnProgress] fresh fetch error', fetchErr);

    const existing: CompletedKey[] = (fresh?.completed as CompletedKey[]) ?? [];
    const alreadyDone = existing.some(k => k.m === moduleIndex && k.t === topicIndex);
    const newCompleted = alreadyDone ? existing : [...existing, { m: moduleIndex, t: topicIndex }];

    // Advance pointer only on first-time completion; redos keep current pointer
    const modules = CURRICULUM[lvl];
    let nextModule: number;
    let nextTopic: number;

    if (alreadyDone) {
      // Redo — keep the frontier wherever it already is
      nextModule = fresh?.module_index ?? moduleIndex;
      nextTopic  = fresh?.topic_index  ?? topicIndex;
    } else {
      nextModule = moduleIndex;
      nextTopic  = topicIndex + 1;
      if (nextTopic >= (modules?.[moduleIndex]?.topics?.length ?? 0)) {
        nextModule = moduleIndex + 1;
        nextTopic  = 0;
      }
      if (!modules?.[nextModule]) {
        // Trail complete — stay at last position
        nextModule = moduleIndex;
        nextTopic  = topicIndex;
      }
    }

    // public.learn_progress is a VIEW — ON CONFLICT is not supported on views.
    // Use explicit UPDATE when row already exists, INSERT only on first access.
    const now = new Date().toISOString();
    let error: unknown;
    if (fresh) {
      // Row exists → UPDATE via the INSTEAD OF UPDATE trigger (matches by user_id + level)
      const { error: updErr } = await supabase
        .from('learn_progress')
        .update({
          module_index: nextModule,
          topic_index:  nextTopic,
          completed:    newCompleted,
          updated_at:   now,
        })
        .eq('user_id', userId)
        .eq('level',   lvl);
      error = updErr;
    } else {
      // No row yet → INSERT
      const { error: insErr } = await supabase
        .from('learn_progress')
        .insert({
          user_id:      userId,
          level:        lvl,
          module_index: nextModule,
          topic_index:  nextTopic,
          completed:    newCompleted,
          updated_at:   now,
        });
      error = insErr;
    }

    if (error) {
      console.error('[useLearnProgress] save error', error);
    } else {
      setProgress(p => ({
        moduleIndex: nextModule,
        topicIndex:  nextTopic,
        completed:   newCompleted,
        introsDone:  p?.introsDone ?? [],
      }));
      // Schedule SR reviews on first-time completion only
      if (!alreadyDone) {
        const modules = CURRICULUM[lvl];
        const topicTitle = modules?.[moduleIndex]?.topics?.[topicIndex]?.title ?? '';
        scheduleReviews(userId, lvl, moduleIndex, topicIndex, topicTitle).catch(
          e => console.warn('[useLearnProgress] scheduleReviews error', e),
        );
      }
    }
  }, [userId]);

  // ── Save single exercise result ──────────────────────────────────────────
  const saveExercise = useCallback(async (params: SaveExerciseParams) => {
    if (!userId) return;
    // Save to learn_history (trail progress detail)
    const { error } = await supabase.from('learn_history').insert({
      user_id:       userId,
      level:         params.level,
      module_index:  params.moduleIndex,
      topic_index:   params.topicIndex,
      exercise_type: params.exerciseType,
      is_correct:    params.isCorrect,
      xp_earned:     params.xpEarned,
      score:         params.exerciseData?.score ?? null,
    });
    if (error) console.error('[useLearnProgress] history insert error', error);

    // Registrar erro se exercício foi incorreto (para revisão espaçada e analytics)
    if (!params.isCorrect) {
      trackExerciseError(userId, {
        userLevel:    params.level,
        moduleIndex:  params.moduleIndex,
        topicIndex:   params.topicIndex,
        exerciseType: params.exerciseType,
        exerciseData: params.exerciseData ?? {},
      }).catch(console.warn);
    }

    // Save to charlotte_practices so XP flows to charlotte_progress & charlotte_leaderboard_cache via trigger
    const { error: practiceError } = await supabase.from('charlotte_practices').insert({
      user_id:       userId,
      practice_type: 'learn_exercise',
      xp_earned:     params.xpEarned,
    });
    if (practiceError) console.error('[useLearnProgress] rn_practice insert error', practiceError);

    // Check for new achievements 1500ms after XP is saved (gives trigger time to run)
    setTimeout(() => { checkForNewAchievements(); }, 1500);
  }, [userId, checkForNewAchievements]);

  // ── Mark module intro (mini-lesson) as completed ─────────────────────────
  const saveIntroDone = useCallback(async (lvl: TrailLevel, moduleIndex: number) => {
    if (!userId) return;

    // Read fresh state from DB so we don't overwrite intros done on other devices.
    const { data: fresh } = await supabase
      .from('learn_progress')
      .select('intros_done')
      .eq('user_id', userId)
      .eq('level', lvl)
      .maybeSingle();

    const existing: number[] = (fresh?.intros_done as number[]) ?? [];
    if (existing.includes(moduleIndex)) return; // idempotente

    const newIntros = [...existing, moduleIndex].sort((a, b) => a - b);
    const { error } = await supabase
      .from('learn_progress')
      .update({ intros_done: newIntros, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('level',   lvl);

    if (error) {
      console.error('[useLearnProgress] saveIntroDone error', error);
      return;
    }
    setProgress(p => p ? { ...p, introsDone: newIntros } : p);
  }, [userId]);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const isTopicComplete = useCallback((moduleIndex: number, topicIndex: number) => {
    return (progress?.completed ?? []).some(k => k.m === moduleIndex && k.t === topicIndex);
  }, [progress]);

  const isIntroDone = useCallback((moduleIndex: number) => {
    return (progress?.introsDone ?? []).includes(moduleIndex);
  }, [progress]);

  const isCurrent = useCallback((moduleIndex: number, topicIndex: number) => {
    return progress?.moduleIndex === moduleIndex && progress?.topicIndex === topicIndex;
  }, [progress]);

  const isLocked = useCallback((moduleIndex: number, topicIndex: number) => {
    if (isTopicComplete(moduleIndex, topicIndex)) return false;
    if (isCurrent(moduleIndex, topicIndex))       return false;
    return true;
  }, [isTopicComplete, isCurrent]);

  return { progress, loading, refetch, saveTopicComplete, saveExercise, saveIntroDone, isTopicComplete, isIntroDone, isCurrent, isLocked };
}
