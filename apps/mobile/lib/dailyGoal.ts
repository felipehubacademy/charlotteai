// lib/dailyGoal.ts
// Meta diária de XP — fonte única (Home e Goals). A meta sobe em degraus
// conforme o aluno passa de cada marco no dia.

const DAILY_XP_MILESTONES = [100, 200, 350, 500, 750, 1000];

export function getDailyGoal(xp: number): number {
  for (const m of DAILY_XP_MILESTONES) { if (xp < m) return m; }
  return Math.ceil((xp + 1) / 500) * 500;
}
