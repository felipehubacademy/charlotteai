// lib/currentTopic.ts — tópico em que o aluno está numa trilha: o primeiro (na ordem do currículo)
// sem as 4 atividades concluídas. Usado como contexto da ligação com a Família (o personagem pode
// puxar o assunto do que o aluno está estudando, sem virar aula).
import { supabase } from './supabase';
import { listModules } from './curriculum-v2/loader';
import type { Level } from './curriculum-v2/types';

export async function currentTopicTitle(userId: string, level: Level): Promise<string | null> {
  try {
    const { data } = await supabase.from('learn_history_v2')
      .select('module_id, unit_id, activity_type')
      .eq('user_id', userId).eq('level', level).eq('completed', true);
    const done = new Map<string, Set<string>>();
    for (const r of (data ?? []) as { module_id: string; unit_id: string; activity_type: string }[]) {
      const k = `${r.module_id}|${r.unit_id}`;
      if (!done.has(k)) done.set(k, new Set());
      done.get(k)!.add(r.activity_type);
    }
    for (const m of listModules(level)) {
      for (const u of m.units) {
        if ((done.get(`${m.id}|${u.id}`)?.size ?? 0) < 4) return u.title;
      }
    }
    return null;
  } catch {
    return null;
  }
}
