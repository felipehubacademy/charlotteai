/**
 * Curriculum v2 → v1 shape adapter
 *
 * Bridges v2 modules to the existing learn-session screen, which expects:
 *   - GrammarEx[] (same shape as v2 GrammarExercise — direct copy)
 *   - PronStep[]  (v2 LSPhrase maps to PronStep with type='repeat')
 *
 * Lets us validate the v2 pipeline using the screen we already have,
 * before building the new trail UI in Phase 5.
 */

import type { GrammarEx, PronStep, Topic, TrailLevel } from '@/data/curriculum';
import { getModule } from './loader';
import type { LSPhrase, Level } from './types';

const LEVEL_TO_TRAIL: Record<Level, TrailLevel> = {
  Novice:   'Novice',
  Inter:    'Inter',
  Advanced: 'Advanced',
};

/**
 * Returns a Topic-shaped object the existing learn-session screen can consume.
 * `activity` controls which slice is included:
 *   - 'grammar'    -> grammar only, empty pronunciation
 *   - 'ls'         -> empty grammar, listening/speaking phrases
 *   - 'both'       -> grammar + LS (mixed session)
 */
export function getV2TopicForUnit(
  level: Level,
  moduleId: string,
  unitId: string,
  activity: 'grammar' | 'ls' | 'both' = 'both'
): (Topic & { v2Title: string; v2UnitId: string }) | null {
  const mod = getModule(level, moduleId);
  if (!mod) return null;
  const unit = mod.units.find(u => u.id === unitId);
  if (!unit) return null;

  const grammar: GrammarEx[] = activity === 'ls'
    ? []
    : unit.grammar.map(g => ({ ...g })) as GrammarEx[];

  const pronunciation: PronStep[] = activity === 'grammar'
    ? []
    : unit.listening_speaking.map(lsPhraseToPronStep);

  return {
    title: unit.title,
    grammar,
    pronunciation,
    v2Title:  unit.title,
    v2UnitId: unit.id,
  };
}

/**
 * Each v2 LS phrase becomes a 'repeat' step in v1 — Charlotte speaks the line,
 * student repeats, Azure scores. This is the simplest mapping; if later we
 * want listen_write / minimal_pairs variants per unit, we can extend the
 * v2 schema accordingly.
 */
function lsPhraseToPronStep(p: LSPhrase): PronStep {
  return {
    type:      'repeat',
    text:      p.text,
    focus:     p.context,
    audio_url: p.audio_url,
  };
}

export function getV2TrailLevel(level: Level): TrailLevel {
  return LEVEL_TO_TRAIL[level];
}
