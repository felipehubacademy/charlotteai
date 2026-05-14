/**
 * Curriculum v2 — TypeScript types
 *
 * v2 introduces 4 activities per unit: Grammar, Listening/Speaking, Role-play, Guided Chat.
 * Source of truth: docs/curriculum/v2/<level>/M<NN>-<slug>.md
 * Compiled at build time to apps/mobile/data/curriculum-v2/<level>/M<NN>.json
 * See scripts/compile-curriculum-v2.mjs for the compiler.
 *
 * v1 (data/curriculum.ts) stays intact — used by all users on the old layout.
 * v2 is gated by feature flag and only consumed by the new trail layout.
 */

// ── Levels & blocks ───────────────────────────────────────────────
export type Level = 'Novice' | 'Inter' | 'Advanced';
export type Block = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ModuleMarker = 'denso' | 'review' | 'bridge' | 'missing' | 'qform';

// ── Grammar (shared with v1) ──────────────────────────────────────
export type GrammarExType =
  | 'multiple_choice'
  | 'word_bank'
  | 'fill_gap'
  | 'fix_error'
  | 'read_answer'
  | 'word_order'
  | 'short_write';

export interface GrammarExercise {
  type:            GrammarExType;
  sentence?:       string;
  passage?:        string;
  question?:       string;
  answer:          string;
  options?:        string[];   // multiple_choice: [correct, wrong1, wrong2]
  choices?:        string[];   // word_bank: [correct, d1, d2, d3]
  hint?:           string;
  explanation:     string;
  // word_order
  context_pt?:     string;
  words?:          string[];
  // short_write
  prompt?:         string;
  example_answer?: string;
}

// ── Listening/Speaking ────────────────────────────────────────────
export interface LSPhrase {
  text:    string;
  context: string;   // "saudação informal padrão", "ao conhecer alguém novo", etc.
}

// ── Personas (avatars/voices) ─────────────────────────────────────
export type VoicedBy = 'charlotte' | 'charlie';

// ── Role-play & Guided Chat shared types ──────────────────────────
export interface Objective {
  id:             number;          // 1-based
  label_pt:       string;          // visible to student as checklist (Novice/Inter)
  label_en:       string;          // visible to student as checklist (Inter/Advanced)
  hidden_prompt:  string;          // condition the LLM evaluates to emit [OBJECTIVE_MET:id]
  hint_pt?:       string;          // Need a hand? copy (PT, Novice)
  hint_en?:       string;          // Need a hand? copy (EN, Inter)
}

export interface RolePlay {
  scenario:        string;         // narrative setup
  voiced_by:       VoicedBy;
  persona:         string;         // character name in the scene (e.g. "Ana", "Teacher")
  persona_outfit:  string;         // asset slug (e.g. "ana_cafe_morning")
  time_budget_sec: number;         // 180 Novice / 300 Inter / 540 Advanced
  opening_line:    string;
  objectives:      Objective[];
  closing_cue:     string;         // exact phrase NPC says to end naturally
  suggested_flow?: string;         // raw markdown of the reference flow (for debug/authoring)
  evaluation_focus?: string[];     // bullet points
}

export interface GuidedChat {
  scenario:        string;
  voiced_by:       VoicedBy;
  persona:         string;
  persona_outfit:  string;
  intro_pt?:       string;         // setup shown before chat starts (Novice)
  intro_en?:       string;         // setup shown before chat starts (Inter/Advanced)
  opening_message: string;         // first message in character
  objectives:      Objective[];
  closing_cue:     string;
  recap_pt?:       string;         // shown on result card (Novice)
  recap_en?:       string;         // shown on result card (Inter/Advanced)
  suggested_script?: string;       // raw markdown for debug/authoring
}

// ── Unit & Module ─────────────────────────────────────────────────
export interface Unit {
  id:                string;       // "N01", "I07", "A23"
  title:             string;
  sub_cefr:          Block;
  grammar_focus:     string;
  markers:           ModuleMarker[];
  real_life_context: string;
  grammar:           GrammarExercise[];
  listening_speaking: LSPhrase[];
  roleplay:          RolePlay;
  guided_chat:       GuidedChat;
}

export interface Module {
  id:                string;       // "M01", "M22", ...
  level:             Level;
  block:             Block;
  title:             string;
  theme:             string;
  goal:              string;
  connects_to?:      string;
  units_range:       string;       // "N01–N05"
  module_chunks:     string[];     // introduced in this module
  units:             Unit[];
  cross_unit_consolidation?: string[];
}
