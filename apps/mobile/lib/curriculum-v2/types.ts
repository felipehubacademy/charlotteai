/**
 * Curriculum v2 — TypeScript types
 *
 * v2 introduces 4 activities per unit: Grammar, Listening/Speaking, Role-play, Guided Chat.
 * Source of truth: docs/curriculum/v2/<level>/M<NN>-<slug>.md
 * Build: CURRICULUM V2 + FASE B COMPLETA — 71 modulos / 361 units / 1444 atividades / 1749 audios CDN (2026-05-31)
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
  // Pre-generated CDN audio URL stamped by compile script from audio-manifest.json.
  // Mobile prefers this; falls back to /api/tts if absent.
  audio_url?: string;
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

// ── Scripted flow (POC v1) ────────────────────────────────────────
// Quando role-play ou guided chat declara `scripted: true`, o cliente usa
// audio pre-gerado em CDN e classificador local de intent, sem chamar LLM.
// Fallback: se nenhum padrao matchar apos N tentativas, cai pro modo LLM.
export interface ScriptedNPCLine {
  text:  string;            // texto exato falado/exibido
  audio?: string;           // URL completa do MP3 no CDN (presente em role-play; ausente em chat text-only)
  // Scaffolding pra base-da-base: mostra ao aluno EXATAMENTE o que ele deve falar.
  // Persistente na tela abaixo da bolha do NPC. So aparece em npc_lines onde o
  // aluno PRECISA responder (open, transicoes principais). Em close lines,
  // ausente.
  expected_student_response?: {
    en:       string;       // a frase target em ingles (o que aluno fala)
    pt_hint?: string;       // dica em portugues (intencao da frase)
  };
}

export interface ScriptedClassifyRule {
  patterns_any?:               string[]; // pelo menos um precisa aparecer
  patterns_required_one_of?:   string[]; // pelo menos um dos required
}

export type ScriptedClassify = Record<string, ScriptedClassifyRule>; // "obj_1", "obj_2", ...

export interface ScriptedTransition {
  when: {
    objective_just_met?:        number;
    partial?:                   string;     // "obj_1"
    has_any?:                   string[];
    missing_required_one_of?:   string[];
    // Combinacoes: { objective_just_met: 3, has_any: ["yes","sure"] }
  };
  play:               string;                // npc_line id
  session_complete?:  boolean;
}

export interface ScriptedFlow {
  scripted:    true;
  /** Modo de execução. simple_speak = 1 turno único judged via LLM. */
  mode?:       'simple_speak' | 'conversation';
  // Para `simple_speak`:
  voice?:      VoicedBy;
  question?: {
    text:  string;
    audio: string;                           // URL completa do MP3 CDN
  };
  expected_response?: {
    en:       string;
    pt_hint?: string;
  };
  hidden_prompt?: string;                    // input do LLM judge
  // Para `conversation` (legado, multi-turn):
  npc_lines?:   Record<string, ScriptedNPCLine>;
  classify?:    ScriptedClassify;
  flow?: {
    start:        string;
    transitions:  ScriptedTransition[];
  };
  fallback?: {
    llm_after_stuck?: number;
  };
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
  scripted?:       ScriptedFlow;   // se presente, cliente usa fluxo determinístico (POC v1)
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
  scripted?:       ScriptedFlow;   // se presente, cliente usa fluxo determinístico (POC v1)
}

// ── Unit & Module ─────────────────────────────────────────────────
export interface Unit {
  id:                string;       // "N01", "I07", "A23"
  title:             string;
  sub_cefr:          Block;
  grammar_focus:     string;
  tense?:            string;       // ex: "PAST · to be" — display label
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
