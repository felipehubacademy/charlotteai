/**
 * useAchievements
 *
 * Loads existing achievements on mount.
 * Exposes `checkForNewAchievements()` — call this after any XP-earning
 * event (practice save, learn exercise) to detect and queue new badges.
 * No Realtime dependency — works with charlotte.user_achievements via
 * the public view.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Achievement } from '@/lib/types/achievement';

export function useAchievements(userId: string | undefined) {
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const knownIdsRef    = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Load existing achievement IDs on mount so we never re-show old ones
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) data.forEach(row => knownIdsRef.current.add(row.id));
        initializedRef.current = true;
      });
  }, [userId]);

  /**
   * Run the full achievement check (via RPC) then poll for newly earned ones.
   * Call this after every practice save / XP-earning event.
   */
  const checkForNewAchievements = useCallback(async () => {
    if (!userId || !initializedRef.current) return;

    // Run server-side achievement evaluation (awards any newly earned achievements)
    await supabase.rpc('rn_award_achievements', { p_user_id: userId });

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(20);

    if (error || !data) return;

    const newOnes = data.filter(row => !knownIdsRef.current.has(row.id));
    if (newOnes.length === 0) return;

    newOnes.forEach(row => knownIdsRef.current.add(row.id));

    const achievements: Achievement[] = newOnes.map(row => ({
      id:          row.id,
      type:        row.achievement_type ?? 'general',
      title:       row.achievement_name ?? row.title ?? 'Achievement Unlocked',
      description: row.achievement_description ?? row.description ?? '',
      xpBonus:     row.xp_bonus ?? 0,
      rarity:      (row.rarity as Achievement['rarity']) ?? 'common',
      icon:        row.badge_icon ?? 'trophy',
      earnedAt:    new Date(row.earned_at),
    }));

    setPendingAchievements(prev => [...prev, ...achievements]);
  }, [userId]);

  const dismissAchievement = useCallback((id: string) => {
    setPendingAchievements(prev => prev.filter(a => a.id !== id));
  }, []);

  return { pendingAchievements, dismissAchievement, checkForNewAchievements };
}
