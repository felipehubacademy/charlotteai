/**
 * Curriculum v2 — Runtime loader
 *
 * Modules are bundled as JSON via static requires (so Metro picks them up).
 * Source markdown lives in docs/curriculum/v2/; JSON is compiled by
 * apps/mobile/scripts/compile-curriculum-v2.mjs at build/dev time.
 *
 * Usage:
 *   import { getModule, listModules } from '@/lib/curriculum-v2/loader';
 *   const m = getModule('Novice', 'M01');
 *   const list = listModules('Novice');
 */

import type { Level, Module } from './types';

// ── Static requires (Metro requires literal paths) ────────────────
// Add a new line here for every module that gets compiled.
const MODULES: Record<Level, Record<string, () => Module>> = {
  Novice: {
    M01: () => require('@/data/curriculum-v2/novice/M01.json') as Module,
  },
  Inter:    {},
  Advanced: {},
};

// ── Public API ────────────────────────────────────────────────────

export function getModule(level: Level, moduleId: string): Module | null {
  const fn = MODULES[level]?.[moduleId];
  return fn ? fn() : null;
}

export function listModules(level: Level): Module[] {
  const bucket = MODULES[level];
  if (!bucket) return [];
  return Object.keys(bucket).sort().map(id => bucket[id]());
}

export function hasModule(level: Level, moduleId: string): boolean {
  return !!MODULES[level]?.[moduleId];
}

/**
 * Returns lightweight summary objects (without the full payload).
 * Useful for the trail screen index.
 */
export function listModuleSummaries(level: Level): Array<{
  id: string;
  title: string;
  theme: string;
  units_range: string;
  unit_count: number;
}> {
  return listModules(level).map(m => ({
    id: m.id,
    title: m.title,
    theme: m.theme,
    units_range: m.units_range,
    unit_count: m.units.length,
  }));
}
