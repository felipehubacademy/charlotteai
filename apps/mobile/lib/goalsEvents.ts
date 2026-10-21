// lib/goalsEvents.ts — avisa a comemoração (components/goals/GoalsCelebration) quando o servidor
// credita missões. Quem chama /api/goals (Tela Inicial, Progresso, Metas) emite; o host escuta.
import type { GoalsResponse } from './missions';

type Listener = (g: GoalsResponse) => void;
const listeners = new Set<Listener>();

export function onGoalsGranted(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitGoalsGranted(g: GoalsResponse): void {
  listeners.forEach(fn => { try { fn(g); } catch {} });
}
