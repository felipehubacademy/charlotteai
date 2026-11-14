// lib/trailVocab.ts — a coleção do Vocabulário se enche sozinha com a trilha: ao concluir uma atividade
// de um tópico, as palavras e expressões daquele tópico (data/curriculum-v2/<nível>/vocab.json, gerado por
// scripts/generate-trail-vocab.mjs) entram em user_vocabulary com source 'learn_trail'. Sem duplicar o que
// o aluno já tem. A 1ª revisão fica para o dia seguinte (revisão espaçada: fixar no outro dia).
import { supabase } from '@/lib/supabase';
import type { TrailLevel } from '@/data/trailTypes';

export interface TrailVocabItem {
  term: string;
  category: 'word' | 'idiom' | 'phrasal_verb' | 'grammar';
  definition: string;
  example: string;
  example_pt?: string;
}

type VocabFile = Record<string, TrailVocabItem[]>;

const FILES: Record<TrailLevel, () => VocabFile> = {
  Novice:   () => require('@/data/curriculum-v2/novice/vocab.json'),
  Inter:    () => require('@/data/curriculum-v2/inter/vocab.json'),
  Advanced: () => require('@/data/curriculum-v2/advanced/vocab.json'),
  Igorfina: () => require('@/data/curriculum-v2/igorfina/vocab.json'),
};

export function unitVocab(level: string, moduleId: string, unitId: string): TrailVocabItem[] {
  try {
    const f = FILES[level as TrailLevel];
    return f ? f()[`${moduleId}/${unitId}`] ?? [] : [];
  } catch { return []; }
}

/** Primeira revisão: amanhã de manhã (8h no horário do aparelho). */
function firstReviewAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

/** Adiciona as palavras do tópico que o aluno ainda não tem. Devolve quantas entraram (0 em erro). */
export async function addTrailVocab(userId: string, level: string, moduleId: string, unitId: string): Promise<number> {
  const items = unitVocab(level, moduleId, unitId);
  if (!userId || !items.length) return 0;
  try {
    // Confere pelo termo exato e pela forma em minúsculas (o aluno pode ter salvo com outra capitalização).
    const variants = Array.from(new Set(items.flatMap(i => [i.term, i.term.toLowerCase()])));
    const { data: have, error } = await supabase
      .from('user_vocabulary').select('term').eq('user_id', userId).in('term', variants);
    if (error) return 0;
    const owned = new Set((have ?? []).map((r: { term: string }) => r.term.toLowerCase()));
    const fresh = items.filter(i => !owned.has(i.term.toLowerCase()));
    if (!fresh.length) return 0;
    // Significado e tradução seguem o nível (conteúdo pedagógico): Novice e Igorfina em português.
    const pt = level === 'Novice' || level === 'Igorfina';
    const next = firstReviewAt();
    const { error: insErr } = await supabase.from('user_vocabulary').insert(fresh.map(i => ({
      user_id: userId,
      term: i.term,
      definition: i.definition,
      example: i.example,
      example_translation: pt ? i.example_pt ?? null : null,
      category: i.category,
      source: 'learn_trail',
      next_review_at: next,
    })));
    return insErr ? 0 : fresh.length;
  } catch { return 0; }
}
