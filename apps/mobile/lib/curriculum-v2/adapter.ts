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
 * Module-level aggregation: collects all exercises of one activity type
 * across all units of a module into a single Topic-shaped session.
 *
 * The new-layout trail shows one lesson per activity-type per module
 * (Grammar / Speaking / Role-play / Chat). Tapping "Grammar" on M01
 * runs all 50 grammar exercises (N01–N05) back-to-back.
 *
 * `activity`:
 *   - 'grammar' -> all grammar from all units (empty pronunciation)
 *   - 'ls'      -> all L/S phrases from all units (empty grammar)
 *   - 'both'    -> grammar + L/S aggregated (mixed)
 *
 * `unitId` (optional): when present, returns only that unit's slice —
 * used as fallback for single-unit testing flows.
 */
export function getV2Topic(
  level: Level,
  moduleId: string,
  activity: 'grammar' | 'ls' | 'both' = 'both',
  unitId?: string,
): (Topic & { v2Title: string; v2ModuleId: string }) | null {
  const mod = getModule(level, moduleId);
  if (!mod) return null;

  const units = unitId ? mod.units.filter(u => u.id === unitId) : mod.units;
  if (units.length === 0) return null;

  const grammar: GrammarEx[] = activity === 'ls'
    ? []
    : units.flatMap(u => u.grammar.map(g => ({ ...g }))) as GrammarEx[];

  const pronunciation: PronStep[] = activity === 'grammar'
    ? []
    : units.flatMap(u => u.listening_speaking.map(lsPhraseToPronStep));

  return {
    title: unitId ? units[0].title : mod.title,
    grammar,
    pronunciation,
    v2Title:    unitId ? units[0].title : mod.title,
    v2ModuleId: mod.id,
  };
}

/** Back-compat alias for the earlier single-unit signature. */
export function getV2TopicForUnit(
  level: Level,
  moduleId: string,
  unitId: string,
  activity: 'grammar' | 'ls' | 'both' = 'both',
) {
  return getV2Topic(level, moduleId, activity, unitId);
}

/**
 * Each v2 LS phrase becomes a 'repeat' step in v1 — Charlotte speaks the line,
 * student repeats, Azure scores. This is the simplest mapping; if later we
 * want listen_write / minimal_pairs variants per unit, we can extend the
 * v2 schema accordingly.
 */
function lsPhraseToPronStep(p: LSPhrase): PronStep {
  return {
    type:  'repeat',
    text:  p.text,
    focus: p.context,
  };
}

export function getV2TrailLevel(level: Level): TrailLevel {
  return LEVEL_TO_TRAIL[level];
}
