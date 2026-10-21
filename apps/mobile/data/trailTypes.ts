// data/trailTypes.ts — tipos dos exercícios da trilha (Gramática e Listening & Speaking).
// O conteúdo vem da trilha nova (lib/curriculum-v2); o adapter monta os tópicos nestes formatos.
// Antes viviam em data/curriculum.ts, junto com a trilha antiga (v1), removida em 2026-10-21.

export type GrammarExType = 'multiple_choice' | 'word_bank' | 'fill_gap' | 'fix_error' | 'read_answer' | 'word_order' | 'short_write';
export type PronExType    = 'repeat' | 'listen_write' | 'minimal_pairs' | 'sentence_stress';

export interface GrammarEx {
  type:        GrammarExType;
  /** Variantes adicionais aceitas alem do `answer`. Use para acolher
   *  formas naturais ("Thanks" / "Thank you" / "Thanks so much"). */
  accepts?:    string[];
  sentence?:   string;
  passage?:    string;
  question?:   string;
  answer:      string;
  options?:    string[];   // multiple_choice: [correct, wrong1, wrong2]
  choices?:    string[];   // word_bank: [correct, d1, d2, d3]
  hint?:       string;
  explanation: string;
  // word_order
  context_pt?:    string;   // Portuguese context shown to student
  words?:         string[]; // the correct words (component will shuffle them)
  // short_write
  prompt?:        string;   // the writing prompt/instruction
  example_answer?: string;  // model answer shown after submission
}

export interface PronStep {
  type:  PronExType;
  text?: string;
  focus: string;
  // minimal_pairs
  word1?:   string;
  word2?:   string;
  target?:  'word1' | 'word2';  // which word Charlotte plays
  // sentence_stress
  stressed_word?: string;       // the correctly stressed word
  // curriculum v2: pre-generated CDN audio (skips /api/tts on demand)
  audio_url?: string;
}

export interface Topic {
  title:         string;
  grammar:       GrammarEx[];
  pronunciation: PronStep[];
}

export interface Module {
  title:  string;
  topics: Topic[];
}

export type TrailLevel = 'Novice' | 'Inter' | 'Advanced' | 'Igorfina';
