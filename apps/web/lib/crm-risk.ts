// lib/crm-risk.ts
// Risco de cancelamento do aluno (0 a 99, ou Perdido), usado na ficha e na
// lista do CRM.

const DAY = 86400000;

export interface Risk { score: number; label: 'Baixo' | 'Médio' | 'Alto' | 'Perdido'; reasons: string[] }

/** Risco de cancelamento a partir de sinais simples de engajamento e assinatura. */
export function computeRisk(input: {
  status: string; institutional: boolean; trialEndsAt: string | null; expiresAt: string | null;
  lastActive: string | null; streak: number; practices7d: number; openTickets: number;
}): Risk {
  const reasons: string[] = [];
  if (input.status === 'expired' && !input.institutional) return { score: 100, label: 'Perdido', reasons: ['Assinatura expirada'] };
  let score = 0;
  const now = Date.now();
  const idle = input.lastActive ? Math.floor((now - new Date(input.lastActive).getTime()) / DAY) : 999;
  if (idle >= 14) { score += 40; reasons.push(idle >= 999 ? 'Nunca praticou' : `Sem praticar há ${idle} dias`); }
  else if (idle >= 7) { score += 25; reasons.push(`Sem praticar há ${idle} dias`); }
  else if (idle >= 3) { score += 10; reasons.push(`Sem praticar há ${idle} dias`); }
  if (input.status === 'cancelled') { score += 30; reasons.push('Desligou a renovação automática'); }
  if (input.status === 'trial' && input.trialEndsAt) {
    const left = Math.ceil((new Date(input.trialEndsAt).getTime() - now) / DAY);
    if (left <= 2) { score += 25; reasons.push(left <= 0 ? 'Teste grátis acabou' : `Teste grátis acaba em ${left} dia${left === 1 ? '' : 's'}`); }
  }
  if (input.practices7d < 3) { score += 15; reasons.push(`Só ${input.practices7d} prática${input.practices7d === 1 ? '' : 's'} nos últimos 7 dias`); }
  if (input.streak === 0) { score += 5; reasons.push('Sequência zerada'); }
  if (input.openTickets > 0) { score += 10; reasons.push('Chamado de suporte em aberto'); }
  score = Math.min(99, score);
  return { score, label: score >= 60 ? 'Alto' : score >= 30 ? 'Médio' : 'Baixo', reasons };
}

