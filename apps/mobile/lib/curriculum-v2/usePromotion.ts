// Promocao organica de nivel.
//
// Regra: quando aluno completou TODAS as units de TODOS os modulos
// compilados de um nivel E o nivel esta "fechado" (22 modulos no
// manifest), promove pro proximo nivel.
//
// Disparado apos cada refetch de progress (foco da home, save de
// activity). Detecta uma vez por sessao — flag in-memory evita loop
// caso refreshProfile demore. Em produca:
//   Novice -> Inter (precisa 22 modulos compilados em Novice)
//   Inter  -> Advanced (precisa 22 modulos compilados em Inter)
//   Advanced = terminal (nao promove)

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { listModules } from './loader';
import type { Level } from './types';

const NEXT_LEVEL: Record<Level, Level | null> = {
  Novice:   'Inter',
  Inter:    'Advanced',
  Advanced: null,
};

const FULL_LEVEL_MODULE_COUNT = 22;
const ACTIVITIES = ['grammar', 'speaking', 'roleplay', 'chat'] as const;

export interface PromotionEvent {
  fromLevel: Level;
  toLevel:   Level;
}

/**
 * Hook que checa se o aluno deve ser promovido e faz a mutacao.
 * Retorna o evento de promocao recem-disparado (pra mostrar modal),
 * e um `ack()` que limpa o estado depois que UI mostrou.
 */
export function usePromotion() {
  const { profile, refreshProfile } = useAuth();
  const [event,   setEvent]   = useState<PromotionEvent | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checking              = useRef(false);
  const checkedForCurrent     = useRef<string | null>(null);

  const currentLevel = (profile?.charlotte_level as Level) ?? 'Novice';
  const userId       = profile?.id;
  const nextLevel    = NEXT_LEVEL[currentLevel];

  async function checkAndPromote() {
    if (!userId || !nextLevel || checking.current) return;
    // Evita re-checar para o mesmo (user, level) ate o perfil mudar
    const key = `${userId}:${currentLevel}`;
    if (checkedForCurrent.current === key) return;
    checking.current = true;
    setIsChecking(true);
    try {
      // 1. Nivel precisa estar fechado (22 modulos compilados)
      const modules = listModules(currentLevel);
      if (modules.length < FULL_LEVEL_MODULE_COUNT) return;

      // 2. Calcular total esperado de (unit, activity) completos
      const expectedCompletions: Array<{ module_id: string; unit_id: string }> = [];
      for (const m of modules) {
        for (const u of m.units) expectedCompletions.push({ module_id: m.id, unit_id: u.id });
      }
      const expectedTotal = expectedCompletions.length * ACTIVITIES.length;

      // 3. Contar quantos estao completed em learn_history_v2
      const { count, error } = await supabase
        .from('learn_history_v2')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('level',   currentLevel)
        .eq('completed', true);

      if (error || count == null) return;
      if (count < expectedTotal) return;

      // 4. Promover: bump charlotte_level
      const { error: updErr } = await supabase
        .from('charlotte_users')
        .update({ charlotte_level: nextLevel })
        .eq('id', userId);
      if (updErr) {
        console.warn('[promotion] update error:', updErr);
        return;
      }

      checkedForCurrent.current = key;
      setEvent({ fromLevel: currentLevel, toLevel: nextLevel });
      // Atualiza profile no contexto pra UI refletir
      await refreshProfile();
    } finally {
      checking.current = false;
      setIsChecking(false);
    }
  }

  // Reset memoizacao se perfil mudou (ex: admin trocou level manualmente)
  useEffect(() => {
    checkedForCurrent.current = null;
  }, [currentLevel, userId]);

  function ack() { setEvent(null); }

  return { event, isChecking, ack, checkAndPromote };
}
