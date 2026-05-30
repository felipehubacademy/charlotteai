// Carrega placement_skips do usuario logado e expoe helpers de unlock.
//
// Regras:
//  - Niveis ≤ current_level sao SEMPRE acessiveis.
//  - Niveis pulados via placement (registrados em placement_skips) tem
//    cascade desativado: todas units liberadas, mas nada marcado como done.
//  - Niveis > current_level sao bloqueados (cadeado).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Level } from './types';

export type CascadeMode = 'linear' | 'unlocked';

const LEVEL_ORDER: Record<Level, number> = { Novice: 0, Inter: 1, Advanced: 2 };

export function usePlacementSkips() {
  const { profile } = useAuth();
  const [skipped, setSkipped] = useState<Set<Level>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profile?.id) { setSkipped(new Set()); setLoading(false); return; }
      const { data, error } = await supabase
        .from('placement_skips')
        .select('level')
        .eq('user_id', profile.id);
      if (cancelled) return;
      if (error) { console.warn('[placement_skips] load error:', error); setSkipped(new Set()); }
      else { setSkipped(new Set((data ?? []).map(r => r.level as Level))); }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const currentLevel: Level = (profile?.charlotte_level as Level) ?? 'Novice';

  function isAccessible(level: Level): boolean {
    return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
  }

  function cascadeMode(level: Level): CascadeMode {
    // Nivel pulado pelo placement → tudo destravado de cara.
    // (Mas accessibility ainda precisa ser true; caller filtra antes.)
    return skipped.has(level) ? 'unlocked' : 'linear';
  }

  return { currentLevel, skipped, isAccessible, cascadeMode, loading };
}
