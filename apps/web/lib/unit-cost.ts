// Custo por usuário (visão geral do /admin): quais despesas do Financeiro entram na conta.
// Cada lançamento tem o campo unit_cost; vazio (lançamentos antigos ou automáticos) segue a categoria.
export const UNIT_COST_CATEGORIES = ['Inteligência artificial', 'Infraestrutura e hospedagem', 'Lojas e pagamentos', 'Domínios e e-mail'];

export const unitCostByCategory = (category: string) => UNIT_COST_CATEGORIES.includes(category);

export const countsInUnitCost = (e: { category: string; unit_cost?: boolean | null }) =>
  e.unit_cost ?? unitCostByCategory(e.category);

// LTV na Visão geral: vida média do pagante = 1 ÷ cancelamento mensal, limitada a este teto
// (sem cancelamento recente, a conta não teria fim).
export const LTV_MAX_MONTHS = 24;
// Mínimo de pagantes no início da janela de 30 dias para medir o cancelamento e calcular o LTV.
export const LTV_MIN_BASE = 20;
