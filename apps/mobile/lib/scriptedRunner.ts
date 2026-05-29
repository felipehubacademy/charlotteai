// scriptedRunner — runtime do modo scripted (role-play e guided chat).
// Recebe transcript do usuario + estado atual + ScriptedFlow → decide o
// proximo NPC line e quais objectives sao marcados.
//
// Logica de classify: substring case-insensitive contra patterns_any (>=1)
// e patterns_required_one_of (>=1). Ambos sao opcionais; se ambos presentes,
// ambos precisam passar.
//
// Logica de flow: percorre transitions em ordem e usa o primeiro `when` que
// casa com o estado pos-classify. Se nenhum casar, retorna `stuck`.

import type { ScriptedFlow, ScriptedClassifyRule, ScriptedTransition } from './curriculum-v2/types';

export interface RunnerInput {
  flow:           ScriptedFlow;
  transcript:     string;             // texto do user (do whisper STT)
  objectivesMet:  Set<number>;        // estado atual
  stuckTurns:     number;             // turnos consecutivos sem progresso
}

export interface RunnerOutput {
  /** id do npc_line pra tocar a seguir (ou null se nenhum match e fallback ainda nao bateu) */
  next_line_id:        string | null;
  /** objectives que acabaram de bater nesse turno */
  newly_met:           number[];
  /** se true, encerra a sessao apos tocar o npc_line */
  session_complete:    boolean;
  /** se true, chamou um line "hint" (resposta parcial reconhecida mas obj NAO marcado) */
  is_hint:             boolean;
  /** se true, exceeded stuck threshold e deveria cair pro LLM mode */
  should_fallback_llm: boolean;
}

function matchesRule(transcript: string, rule: ScriptedClassifyRule): boolean {
  const t = transcript.toLowerCase();
  if (rule.patterns_any && rule.patterns_any.length > 0) {
    const any = rule.patterns_any.some(p => t.includes(p.toLowerCase()));
    if (!any) return false;
  }
  if (rule.patterns_required_one_of && rule.patterns_required_one_of.length > 0) {
    const oneOf = rule.patterns_required_one_of.some(p => t.includes(p.toLowerCase()));
    if (!oneOf) return false;
  }
  return true;
}

function objIdFromKey(key: string): number | null {
  // "obj_1" → 1
  const m = key.match(/^obj_(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function classify(transcript: string, flow: ScriptedFlow): number[] {
  const newly: number[] = [];
  for (const [key, rule] of Object.entries(flow.classify)) {
    const id = objIdFromKey(key);
    if (id === null) continue;
    if (matchesRule(transcript, rule)) newly.push(id);
  }
  return newly;
}

function pickTransition(
  transitions: ScriptedTransition[],
  transcript: string,
  objectivesMetAfter: Set<number>,
  justMet: number[],
  flow: ScriptedFlow,
): ScriptedTransition | null {
  const t = transcript.toLowerCase();
  const hasAny = (arr?: string[]) => !arr || arr.length === 0 || arr.some(p => t.includes(p.toLowerCase()));
  const missingRequired = (arr?: string[]) => !!arr && arr.length > 0 && !arr.some(p => t.includes(p.toLowerCase()));

  for (const tr of transitions) {
    const w = tr.when ?? {};

    if (typeof w.objective_just_met === 'number') {
      if (!justMet.includes(w.objective_just_met)) continue;
    }

    if (typeof w.partial === 'string') {
      // "partial: obj_1" → o user nao bateu obj_1 ainda, mas tem patterns_any do obj_1
      const id = objIdFromKey(w.partial);
      if (id === null) continue;
      if (objectivesMetAfter.has(id)) continue;       // ja bateu, nao eh partial
      const rule = flow.classify[w.partial];
      const hasAnyOfPartial = rule?.patterns_any
        ? rule.patterns_any.some(p => t.includes(p.toLowerCase()))
        : false;
      if (!hasAnyOfPartial) continue;
    }

    if (w.has_any && !hasAny(w.has_any)) continue;
    if (w.missing_required_one_of && !missingRequired(w.missing_required_one_of)) continue;

    return tr;
  }
  return null;
}

export function runScriptedTurn(input: RunnerInput): RunnerOutput {
  const { flow, transcript, objectivesMet, stuckTurns } = input;

  // 1) Classifica novos objectives batidos
  const allMatched = classify(transcript, flow);
  const newly = allMatched.filter(id => !objectivesMet.has(id));

  // 2) Atualiza set hipotetico pos-classify
  const after = new Set(objectivesMet);
  for (const id of newly) after.add(id);

  // 3) Procura transition que case com o estado pos-classify
  const tr = pickTransition(flow.flow.transitions, transcript, after, newly, flow);

  // 4) Hint detection: transition cujo `when.partial` esta presente OU
  //    o nome do play comeca com "hint_"
  const isHint = !!tr && (!!tr.when?.partial || tr.play.startsWith('hint_'));

  // 5) Fallback decision: se nenhuma transition casou E stuckTurns + 1 atingiu
  //    o threshold, sinaliza fallback. Cliente decide o que fazer (pular pra LLM).
  const willBeStuck = stuckTurns + (tr ? 0 : 1);
  const fallbackThreshold = flow.fallback?.llm_after_stuck ?? 999;
  const should_fallback_llm = !tr && willBeStuck >= fallbackThreshold;

  // Log de debug — facilita auditoria via logcat/Console
  if (__DEV__) {
    console.log('[scriptedRunner]', {
      transcript:   transcript.slice(0, 80),
      allMatched, newly,
      next_line_id: tr?.play ?? null,
      is_hint:      isHint,
      should_fallback_llm,
    });
  }

  return {
    next_line_id:        tr?.play ?? null,
    newly_met:           isHint ? [] : newly,        // hint NAO marca o objective (incentiva tentar de novo)
    session_complete:    !!tr?.session_complete,
    is_hint:             isHint,
    should_fallback_llm,
  };
}
