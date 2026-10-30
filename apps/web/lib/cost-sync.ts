// Sincroniza com o Financeiro o custo real dos provedores cobrados por uso (crédito pré-pago ou fatura
// por consumo): uma linha por provedor e mês ("OpenAI · uso de 2026-10"), atualizada a cada hora pelo
// agendador. Recargas no cartão desses provedores NÃO são lançadas à mão (seria custo em dobro).
// A linha conta no custo por usuário (unit_cost) e fica "a pagar" até o mês fechar; aí vira paga.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fxToBrl } from '@/lib/fx';
import { monthRange, openaiReal, azureReal, vercelReal, cachedCost, openaiDaily } from '@/lib/provider-costs';

type Reading = { amount: number; currency: string; note: string };
type Provider = { vendor: string; label: string; category: string; read: (month: string) => Promise<Reading | null> };

const PROVIDERS: Provider[] = [
  { vendor: 'OpenAI', label: 'OpenAI', category: 'Inteligência artificial', read: async m => {
    const c = await cachedCost(`openai:${m}`, 0, () => openaiReal(m)); if (!c.value && c.error) throw new Error(c.error);
    const r = c.value; return r && { amount: r.usd, currency: 'USD', note: 'Valor real (API de custos da OpenAI).' };
  } },
  { vendor: 'Microsoft Azure', label: 'Azure', category: 'Inteligência artificial', read: async m => {
    const c = await cachedCost(`azure:${m}`, 0, () => azureReal(m)); if (!c.value && c.error) throw new Error(c.error);
    const r = c.value; return r && { amount: r.total, currency: r.currency, note: 'Valor real (Azure Cost Management).' };
  } },
  { vendor: 'Vercel', label: 'Vercel', category: 'Infraestrutura e hospedagem', read: async m => {
    const r = await vercelReal(m); return r && { amount: r.total, currency: r.currency, note: 'Valor real (API de faturamento da Vercel).' };
  } },
];

const monthKeyOf = (t: number) => new Date(t - 3 * 3600_000).toISOString().slice(0, 7); // Brasília

export async function syncProviderCosts(nowMs = Date.now()): Promise<{ month: string; vendor: string; result: string }[]> {
  const supabase = getSupabaseAdmin();
  const current = monthKeyOf(nowMs);
  // Nos 3 primeiros dias do mês ainda fecha o mês anterior (a API dos provedores consolida com atraso).
  const months = [current];
  if (Number(new Date(nowMs - 3 * 3600_000).toISOString().slice(8, 10)) <= 3) months.unshift(monthKeyOf(Date.parse(`${current}-01T12:00:00Z`) - 86400_000));
  const out: { month: string; vendor: string; result: string }[] = [];
  // Custo diário real da OpenAI (faixa do topo da Visão geral) renovado junto.
  await cachedCost('openai-daily', 0, () => openaiDaily(8)).catch(() => null);

  for (const month of months) {
    const { end } = monthRange(month);
    const lastDay = new Date(end.getTime() - 86400_000).toISOString().slice(0, 10);
    const closed = month !== current;
    for (const p of PROVIDERS) {
      let reading: Reading | null;
      // 429 da API de custos: a tarefa do e-mail de custos de IA consulta a mesma API na mesma hora; tenta de novo.
      const readWithRetry = async () => {
        for (let i = 0; ; i++) {
          try { return await p.read(month); } catch (e) {
            if (i >= 2 || !/\b429\b/.test(String((e as Error).message))) throw e;
            await new Promise(r => setTimeout(r, 8000 * (i + 1)));
          }
        }
      };
      try { reading = await readWithRetry(); } catch (e) { out.push({ month, vendor: p.vendor, result: `erro: ${(e as Error).message}` }); continue; }
      if (!reading) { out.push({ month, vendor: p.vendor, result: 'sem chave' }); continue; }
      const amount = Math.round(reading.amount * 100) / 100;
      const fx = reading.currency === 'BRL' ? 1 : ((await fxToBrl(reading.currency)) || 1);
      const tag = `[ai-cost ${month}]`; // mesma marca do botão "lançar" da tela de custos de IA
      const { data: existing } = await supabase.from('finance_entries').select('id, amount, status')
        .eq('kind', 'expense').eq('vendor', p.vendor).like('notes', `%${tag}%`).limit(1).maybeSingle();
      const row = {
        amount, currency: reading.currency, fx_rate: fx, amount_brl: Math.round(amount * fx * 100) / 100,
        notes: `${reading.note} Atualizado sozinho a cada hora. ${tag}`, unit_cost: true,
        ...(closed ? { status: 'paid', paid_at: lastDay } : {}),
      };
      if (existing) {
        const e = existing as { id: string; amount: number; status: string };
        if (Number(e.amount) === amount && (!closed || e.status === 'paid')) { out.push({ month, vendor: p.vendor, result: 'igual' }); continue; }
        await supabase.from('finance_entries').update({ ...row, updated_at: new Date().toISOString() } as never).eq('id', e.id);
        out.push({ month, vendor: p.vendor, result: `atualizado ${amount} ${reading.currency}` });
      } else {
        if (amount < 0.01) { out.push({ month, vendor: p.vendor, result: 'zero' }); continue; }
        await supabase.from('finance_entries').insert({
          kind: 'expense', description: `${p.label} · uso de ${month}`, category: p.category, vendor: p.vendor,
          due_date: lastDay, status: 'pending', recurrence: 'none', ...row,
        } as never);
        out.push({ month, vendor: p.vendor, result: `lançado ${amount} ${reading.currency}` });
      }
    }
  }
  return out;
}
