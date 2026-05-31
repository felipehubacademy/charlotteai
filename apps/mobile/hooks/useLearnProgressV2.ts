/**
 * useLearnProgressV2 — Curriculum v2 progress hook
 *
 * One row per (user × level × module × unit × activity) in `learn_history_v2`.
 * Upserts on retry: `score` reflects the LATEST attempt; `completed` latches
 * to true once threshold is met (never reverts).
 *
 * Thresholds (see memory: curriculum_v2_progress_schema.md):
 *   Grammar  ≥ 70%
 *   Speaking ≥ 60%
 *   Role-play / Chat = 100% (all sub-objectives)
 *
 * Lock cascade: within a unit, activities unlock left→right by completion.
 * Between units: N02 unlocks only when all 4 of N01 are completed.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type V2Activity = 'grammar' | 'speaking' | 'roleplay' | 'chat';
export type V2Level    = 'Novice' | 'Inter' | 'Advanced';

interface V2Row {
  module_id:     string;
  unit_id:       string;
  activity_type: V2Activity;
  score:         number | null;
  completed:     boolean;
  attempts:      number;
}

const THRESHOLD: Record<V2Activity, number> = {
  grammar:  70,
  speaking: 60,
  roleplay: 100,
  chat:     100,
};

const ACTIVITY_ORDER: V2Activity[] = ['grammar', 'speaking', 'roleplay', 'chat'];

export function meetsThreshold(activity: V2Activity, score: number): boolean {
  return score >= THRESHOLD[activity];
}

export type CascadeMode = 'linear' | 'unlocked';

export function useLearnProgressV2(
  userId: string | undefined,
  level: V2Level,
  cascadeMode: CascadeMode = 'linear',
) {
  const [rows,    setRows]    = useState<V2Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) { setRows([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('learn_history_v2')
      .select('module_id, unit_id, activity_type, score, completed, attempts')
      .eq('user_id', userId)
      .eq('level',   level);
    if (!error && data) setRows(data as V2Row[]);
    setLoading(false);
  }, [userId, level]);

  useEffect(() => { refetch(); }, [refetch]);

  const get = useCallback((moduleId: string, unitId: string, activity: V2Activity): V2Row | null => {
    return rows.find(r =>
      r.module_id === moduleId && r.unit_id === unitId && r.activity_type === activity
    ) ?? null;
  }, [rows]);

  const isActivityComplete = useCallback((moduleId: string, unitId: string, activity: V2Activity): boolean => {
    return !!get(moduleId, unitId, activity)?.completed;
  }, [get]);

  const isUnitComplete = useCallback((moduleId: string, unitId: string): boolean => {
    return ACTIVITY_ORDER.every(a => isActivityComplete(moduleId, unitId, a));
  }, [isActivityComplete]);

  /**
   * Activity unlock rule within a unit: each activity destrava só depois que
   * a anterior na ordem (grammar → speaking → roleplay → chat) for completed.
   * Unit unlock: a unit só destrava quando a anterior (mesma module) tá 100%
   * ou quando é a primeira unit do módulo + módulo destrancado.
   *
   * `prevUnitId` = id da unit imediatamente anterior dentro do mesmo módulo
   * (undefined se for a primeira unit).
   */
  const isActivityUnlocked = useCallback((
    moduleId: string, unitId: string, activity: V2Activity,
    prevUnitId?: string,
    prevModuleId?: string,   // novo: pra cascade cross-module (M02 N01 depende de M01 N05)
  ): boolean => {
    // Placement-skip: nivel inteiro liberado sem cascade.
    if (cascadeMode === 'unlocked') return true;
    // Unit gate: anterior precisa estar 100% (se houver)
    if (prevUnitId) {
      const gateModuleId = prevModuleId ?? moduleId;
      if (!isUnitComplete(gateModuleId, prevUnitId)) return false;
    }
    // Activity gate: anteriores da própria unit precisam estar completas
    const idx = ACTIVITY_ORDER.indexOf(activity);
    for (let i = 0; i < idx; i++) {
      if (!isActivityComplete(moduleId, unitId, ACTIVITY_ORDER[i])) return false;
    }
    return true;
  }, [isActivityComplete, isUnitComplete, cascadeMode]);

  /**
   * Save attempt. Upserts the row, increments attempts, updates score (latest),
   * latches `completed` to true if the new score crosses the threshold.
   * Returns the resulting row (so caller can show "now unlocked" feedback).
   */
  const saveAttempt = useCallback(async (
    moduleId: string, unitId: string, activity: V2Activity, score: number,
  ): Promise<V2Row | null> => {
    if (!userId) return null;

    const existing      = get(moduleId, unitId, activity);
    const previousScore = existing?.score ?? 0;
    // Sempre guardar a MAIOR nota. Retry com score menor não sobrescreve.
    const bestScore     = Math.max(previousScore, score);
    const newCompleted  = (existing?.completed ?? false) || meetsThreshold(activity, bestScore);
    const newAttempts   = (existing?.attempts ?? 0) + 1;

    const payload = {
      user_id:       userId,
      level,
      module_id:     moduleId,
      unit_id:       unitId,
      activity_type: activity,
      score:         bestScore,
      completed:     newCompleted,
      attempts:      newAttempts,
      updated_at:    new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('learn_history_v2')
      .upsert(payload, { onConflict: 'user_id,level,module_id,unit_id,activity_type' })
      .select('module_id, unit_id, activity_type, score, completed, attempts')
      .single();

    if (error || !data) return null;
    const next = data as V2Row;

    // Update local cache so trail re-renders without waiting for refetch
    setRows(prev => {
      const i = prev.findIndex(r =>
        r.module_id === moduleId && r.unit_id === unitId && r.activity_type === activity
      );
      if (i >= 0) {
        const copy = prev.slice();
        copy[i] = next;
        return copy;
      }
      return [...prev, next];
    });

    return next;
  }, [userId, level, get]);

  return {
    loading,
    rows,
    refetch,
    get,
    isActivityComplete,
    isUnitComplete,
    isActivityUnlocked,
    saveAttempt,
  };
}
