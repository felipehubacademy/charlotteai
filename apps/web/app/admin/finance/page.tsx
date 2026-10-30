'use client';
// Financeiro — entradas e saídas do Queizy.
// Regime de caixa: o que conta no resultado é o que foi pago/recebido
// (paid_at). O que está "a pagar" aparece em Vencimentos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Download, FileText, Check, Edit2, Trash2, X, Search, RefreshCw, Repeat, Send } from 'lucide-react';
import { useAdminMe, canArea } from '@/lib/admin-context';
import { unitCostByCategory } from '@/lib/unit-cost';

// ── Tipos e catálogos ────────────────────────────────────────────────────────
type Kind = 'expense' | 'income';
type Status = 'pending' | 'paid' | 'canceled' | 'refunded';
type Recurrence = 'none' | 'monthly' | 'yearly';
interface Entry {
  id: string; kind: Kind; description: string; category: string; vendor: string | null;
  amount: number; currency: string; fx_rate: number; amount_brl: number;
  due_date: string; paid_at: string | null; status: Status; recurrence: Recurrence;
  recurrence_of: string | null; notes: string | null; unit_cost: boolean | null; created_at: string;
}

const EXPENSE_CATEGORIES = [
  'Inteligência artificial', 'Infraestrutura e hospedagem', 'Lojas e pagamentos', 'Domínios e e-mail',
  'Ferramentas e software', 'Marketing e mídia', 'Equipe e prestadores', 'Jurídico e contábil', 'Impostos', 'Reembolsos e estornos', 'Outros',
];
const INCOME_CATEGORIES = ['Assinaturas App Store', 'Assinaturas Google Play', 'Assinaturas pelo site (Asaas)', 'B2B e institucional', 'Aporte de capital', 'Outros'];
const VENDORS = ['OpenAI', 'Anthropic', 'ElevenLabs', 'Microsoft Azure', 'Vercel', 'Supabase', 'Expo (EAS)', 'RevenueCat', 'Apple', 'Google', 'Cloudflare', 'registro.br', 'Microsoft 365', 'Sentry', 'HubSpot'];
const CURRENCIES = ['BRL', 'USD', 'EUR'];

const STATUS_LABEL: Record<Status, string> = { pending: 'A pagar', paid: 'Pago', canceled: 'Cancelado', refunded: 'Estornado' };
const REC_LABEL: Record<Recurrence, string> = { none: 'Única', monthly: 'Mensal', yearly: 'Anual' };

// ── Helpers ─────────────────────────────────────────────────────────────────
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (n: number, cur: string) => n.toLocaleString('pt-BR', { style: 'currency', currency: cur });
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string | null) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const monthKey = (s: string) => s.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + (m === 1 ? ` ${String(y).slice(2)}` : '');
};
const daysUntil = (s: string) => Math.round((new Date(s + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime()) / 86400000);

type Range = 'month' | '3m' | '12m' | 'year' | 'all';
const RANGE_LABEL: Record<Range, string> = { month: 'Este mês', '3m': '3 meses', '12m': '12 meses', year: 'Este ano', all: 'Tudo' };
function rangeStart(r: Range): string | null {
  const d = new Date();
  if (r === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  if (r === 'year') return `${d.getFullYear()}-01-01`;
  if (r === '3m' || r === '12m') {
    const back = r === '3m' ? 2 : 11;
    const s = new Date(d.getFullYear(), d.getMonth() - back, 1);
    return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return null;
}

// ── Gráfico de barras: entradas x saídas por mês ────────────────────────────
function MonthlyChart({ months }: { months: { key: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...months.flatMap(m => [m.income, m.expense]));
  const H = 180;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: H, padding: '0 4px' }}>
        {months.map(m => (
          <div key={m.key} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}
            title={`${monthLabel(m.key)}: entradas ${brl(m.income)} · saídas ${brl(m.expense)} · resultado ${brl(m.income - m.expense)}`}>
            <div style={{ width: '42%', maxWidth: 18, height: `${(m.income / max) * 100}%`, minHeight: m.income ? 3 : 0, background: '#2BD97C', borderRadius: '4px 4px 0 0' }} />
            <div style={{ width: '42%', maxWidth: 18, height: `${(m.expense / max) * 100}%`, minHeight: m.expense ? 3 : 0, background: '#FF4F8B', borderRadius: '4px 4px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '8px 4px 0', borderTop: '1px solid var(--b1)' }}>
        {months.map(m => (
          <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: 'var(--t3)', fontWeight: 600 }}>{monthLabel(m.key)}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--t2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: '#2BD97C', display: 'inline-block' }} />Entradas</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: '#FF4F8B', display: 'inline-block' }} />Saídas</span>
      </div>
    </div>
  );
}

function CategoryBars({ rows, total }: { rows: [string, number][]; total: number }) {
  if (!rows.length) return <div className="adm-empty"><div className="adm-empty-sub">Sem saídas pagas no período.</div></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(([cat, v]) => (
        <div key={cat}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{cat}</span>
            <span className="num" style={{ color: 'var(--t2)' }}>{brl(v)} · {Math.round((v / total) * 100)}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(v / total) * 100}%`, height: '100%', background: '#16131F', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Modal de lançamento ─────────────────────────────────────────────────────
interface FormState {
  id?: string; kind: Kind; description: string; category: string; vendor: string;
  amount: string; currency: string; fx_rate: string; due_date: string; status: Status;
  paid_at: string; recurrence: Recurrence; notes: string;
  unit_cost: boolean | null; // null = segue a categoria até alguém escolher
}
const emptyForm = (kind: Kind = 'expense'): FormState => ({
  kind, description: '', category: kind === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0], vendor: '',
  amount: '', currency: 'BRL', fx_rate: '1', due_date: todayISO(), status: 'paid', paid_at: todayISO(), recurrence: 'none', notes: '', unit_cost: null,
});

const NEW_CATEGORY = '__new__';

function EntryModal({ initial, vendors, customCats, onClose, onSaved }: {
  initial: FormState; vendors: string[]; customCats: Record<Kind, string[]>; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [newCat, setNewCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fxLoading, setFxLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(prev => ({ ...prev, [k]: v }));

  const fetchFx = useCallback(async (cur: string) => {
    if (cur === 'BRL') { set('fx_rate', '1'); return; }
    setFxLoading(true);
    try {
      const r = await fetch(`/api/admin/finance?fx=${cur}`);
      const j = await r.json();
      if (j.rate) set('fx_rate', String(j.rate));
    } finally { setFxLoading(false); }
  }, []);

  const amountNum = Number(f.amount.replace(/\./g, '').replace(',', '.')) || 0;
  const fxNum = Number(f.fx_rate.replace(',', '.')) || 0;
  const baseCats = f.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  // Categorias criadas em lançamentos anteriores entram na lista, antes de "Outros".
  const extra = customCats[f.kind].filter(c => !baseCats.includes(c));
  const cats = [...baseCats.filter(c => c !== 'Outros'), ...extra, 'Outros'];
  const unitCost = f.unit_cost ?? unitCostByCategory(f.category.trim());

  const save = async () => {
    setErr('');
    if (!f.description.trim()) return setErr('Descreva o lançamento.');
    if (!f.category.trim()) return setErr('Informe a categoria.');
    if (!amountNum) return setErr('Informe o valor.');
    setSaving(true);
    const body = {
      id: f.id, kind: f.kind, description: f.description, category: f.category.trim(), vendor: f.vendor.trim() || null,
      amount: amountNum, currency: f.currency, fx_rate: f.currency === 'BRL' ? 1 : fxNum,
      due_date: f.due_date, status: f.status, paid_at: f.status === 'paid' ? (f.paid_at || f.due_date) : null,
      recurrence: f.recurrence, notes: f.notes || null,
      unit_cost: f.kind === 'expense' ? unitCost : null,
    };
    const res = await fetch('/api/admin/finance', {
      method: f.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); return setErr(j.error ?? 'Não foi possível salvar.'); }
    onSaved();
  };

  return (
    <div className="adm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal" style={{ maxWidth: 560, background: 'var(--s1)' }}>
        <div className="adm-modal-hdr">
          <div className="adm-modal-title">{f.id ? 'Editar lançamento' : 'Novo lançamento'}</div>
          <button className="adm-btn-sm ghost" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="adm-modal-body">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['expense', 'income'] as Kind[]).map(k => (
              <button key={k} type="button" className={`adm-chip${f.kind === k ? ' active' : ''}`} style={{ flex: 1, padding: '9px 12px' }}
                onClick={() => { setNewCat(false); setF(prev => ({ ...prev, kind: k, category: k === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] })); }}>
                {k === 'expense' ? 'Saída (custo)' : 'Entrada (receita)'}
              </button>
            ))}
          </div>
          <div className="adm-field">
            <label>Descrição</label>
            <input value={f.description} onChange={e => set('description', e.target.value)}  autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label>Categoria</label>
              {newCat ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={f.category} onChange={e => set('category', e.target.value)} placeholder="Nova categoria" autoFocus style={{ flex: 1, minWidth: 0 }} />
                  <button type="button" className="adm-btn-sm ghost" title="Voltar para a lista"
                    onClick={() => { setNewCat(false); set('category', baseCats[0]); }}><X size={14} /></button>
                </div>
              ) : (
                <select value={cats.includes(f.category) ? f.category : (f.category ? f.category : cats[0])}
                  onChange={e => {
                    if (e.target.value === NEW_CATEGORY) { setNewCat(true); set('category', ''); }
                    else set('category', e.target.value);
                  }}>
                  {!cats.includes(f.category) && f.category && <option>{f.category}</option>}
                  {cats.map(c => <option key={c}>{c}</option>)}
                  <option value={NEW_CATEGORY}>+ Nova categoria…</option>
                </select>
              )}
            </div>
            <div className="adm-field">
              <label>{f.kind === 'expense' ? 'Fornecedor' : 'Origem'}</label>
              <input list="vendors" value={f.vendor} onChange={e => set('vendor', e.target.value)}  />
              <datalist id="vendors">{vendors.map(v => <option key={v} value={v} />)}</datalist>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label>Valor</label>
              <input inputMode="decimal" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="0,00" />
            </div>
            <div className="adm-field">
              <label>Moeda</label>
              <select value={f.currency} onChange={e => { set('currency', e.target.value); fetchFx(e.target.value); }}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label>Cotação (R$)</label>
              <input inputMode="decimal" value={f.currency === 'BRL' ? '1' : f.fx_rate} disabled={f.currency === 'BRL'} onChange={e => set('fx_rate', e.target.value)} />
            </div>
          </div>
          {f.currency !== 'BRL' && (
            <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: -6 }}>
              {fxLoading ? 'Buscando cotação…' : <>Em reais: <b className="num">{brl(amountNum * fxNum)}</b> · ajuste a cotação para bater com a fatura do cartão.</>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label>Vencimento</label>
              <input type="date" value={f.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div className="adm-field">
              <label>Situação</label>
              <select value={f.status} onChange={e => set('status', e.target.value as Status)}>
                <option value="paid">{f.kind === 'expense' ? 'Pago' : 'Recebido'}</option>
                <option value="pending">{f.kind === 'expense' ? 'A pagar' : 'A receber'}</option>
                <option value="canceled">Cancelado</option>
                <option value="refunded">Estornado</option>
              </select>
            </div>
            <div className="adm-field">
              <label>Recorrência</label>
              <select value={f.recurrence} onChange={e => set('recurrence', e.target.value as Recurrence)}>
                <option value="none">Única</option><option value="monthly">Mensal</option><option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          {f.kind === 'expense' && (
            <div className="adm-field">
              <label>Custo por usuário</label>
              <select value={unitCost ? 'in' : 'out'} onChange={e => set('unit_cost', e.target.value === 'in')}>
                <option value="in">Entra: custo de operação (atender e construir o app)</option>
                <option value="out">Fica de fora (marketing, equipe, impostos, reembolsos…)</option>
              </select>
            </div>
          )}
          {f.status === 'paid' && (
            <div className="adm-field" style={{ maxWidth: 200 }}>
              <label>{f.kind === 'expense' ? 'Pago em' : 'Recebido em'}</label>
              <input type="date" value={f.paid_at} onChange={e => set('paid_at', e.target.value)} />
            </div>
          )}
          {f.recurrence !== 'none' && (
            <div style={{ fontSize: 12.5, color: 'var(--t2)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Repeat size={13} /> Ao marcar como pago, o próximo vencimento é lançado sozinho.
            </div>
          )}
          <div className="adm-field">
            <label>Observações</label>
            <input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional" />
          </div>
          {err && <div className="adm-login-err" style={{ marginTop: 0 }}>{err}</div>}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-sm ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-sm primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Relatório imprimível ────────────────────────────────────────────────────
function ReportModal({ title, income, expense, byCategory, entries, onClose }: {
  title: string; income: number; expense: number; byCategory: [string, number][]; entries: Entry[]; onClose: () => void;
}) {
  const result = income - expense;
  return (
    <div className="adm-modal-backdrop fin-report-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal fin-report" style={{ maxWidth: 760, background: '#fff' }}>
        <div className="adm-modal-hdr no-print">
          <div className="adm-modal-title">Relatório financeiro</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="adm-btn-sm primary" onClick={() => window.print()}><FileText size={13} /> Imprimir ou salvar PDF</button>
            <button className="adm-btn-sm ghost" onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div style={{ padding: 28 }}>
          <img src="/images/queizy-logo.png" alt="Queizy" style={{ height: 26 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '16px 0 2px' }}>Relatório financeiro</h2>
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>{title} · gerado em {fmtDate(todayISO())}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '20px 0' }}>
            {[['Entradas', income], ['Saídas', expense], ['Resultado', result]].map(([l, v]) => (
              <div key={l as string} style={{ border: '1px solid var(--b2)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                <div className="num" style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: (v as number) < 0 ? 'var(--err)' : 'var(--t1)' }}>{brl(v as number)}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 800, margin: '8px 0' }}>Saídas por categoria</h3>
          <table className="adm-table"><tbody>
            {byCategory.map(([c, v]) => <tr key={c}><td>{c}</td><td className="num" style={{ textAlign: 'right' }}>{brl(v)}</td></tr>)}
          </tbody></table>

          <h3 style={{ fontSize: 14, fontWeight: 800, margin: '20px 0 8px' }}>Lançamentos pagos e recebidos</h3>
          <table className="adm-table">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{fmtDate(e.paid_at)}</td>
                  <td>{e.description}{e.vendor ? ` · ${e.vendor}` : ''}</td>
                  <td>{e.category}</td>
                  <td className="num" style={{ textAlign: 'right', color: e.kind === 'income' ? 'var(--ok)' : 'var(--t1)' }}>
                    {e.kind === 'income' ? '+' : '−'} {brl(e.amount_brl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Custos de IA do mês ─────────────────────────────────────────────────────
interface AiCosts {
  month: string; prevMonth: string; fx: number; hasOpenAIAdminKey: boolean; hasAzureCost: boolean; posted: string[];
  azure: { currency: string; total: number; lines: { name: string; amount: number }[]; error?: string } | null;
  openai: { source: 'real' | 'estimate'; usd: number; lines: { name: string; usd: number }[]; error?: string };
  elevenlabs: { plan: string; used: number; limit: number; resetAt: string | null; nextInvoiceUsd: number | null } | null;
  elevenBilledBrl?: number;
  prev: { openai: { usd: number; lines: { name: string; usd: number }[] }; azure: { total: number; currency: string } | null };
  voice: { byProduct: { name: string; credits: number }[]; byCharacter: { id: string; name: string; credits: number }[]; error?: string } | null;
  liveCalls: { id: string; name: string; calls: number; students: number; minutes: number }[];
}

// Ligações ao vivo por personagem: uso (ligações, alunos, minutos) e custo do mês.
// Charlotte: linhas realtime da OpenAI. Família: créditos de ligação do fornecedor de voz,
// repartidos pelos minutos de cada personagem; em R$ quando o plano é legível (preço/créditos).
function LiveCallsByCharacter({ data, toBrl }: { data: AiCosts; toBrl: (n: number, cur: string) => number }) {
  const v = data.voice;
  const callCredits = v?.byProduct.find(p => p.name.startsWith('Ligações'))?.credits ?? 0;
  const otherCredits = v?.byProduct.find(p => p.name.startsWith('Falas'))?.credits ?? 0;
  const totalCredits = callCredits + otherCredits;
  // US$ por crédito: fatura lançada no Financeiro no mês ÷ créditos do plano.
  const billedUsd = data.elevenBilledBrl && data.fx ? data.elevenBilledBrl / data.fx : null;
  const rate = data.elevenlabs && billedUsd && data.elevenlabs.limit > 0 ? billedUsd / data.elevenlabs.limit : null;
  const charlotteUsd = data.openai.lines.filter(l => isLiveVoice(l.name)).reduce((s, l) => s + l.usd, 0);
  const familyMinutes = data.liveCalls.filter(c => c.id !== 'charlotte').reduce((s, c) => s + c.minutes, 0);
  const rows = data.liveCalls.map(c => {
    let usd: number | null = null;
    if (c.id === 'charlotte') usd = charlotteUsd;
    else if (rate != null && familyMinutes > 0) usd = callCredits * rate * (c.minutes / familyMinutes);
    const credits = c.id === 'charlotte' ? null : (familyMinutes > 0 ? callCredits * (c.minutes / familyMinutes) : 0);
    return { ...c, usd, credits };
  });
  const pct = (n: number) => (totalCredits > 0 ? `${Math.round((n / totalCredits) * 100)}%` : '—');
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--t3)', padding: '6px 8px' };
  const td: React.CSSProperties = { fontSize: 13, padding: '8px', borderTop: '1px solid var(--line, rgba(0,0,0,0.08))' };
  return (
    <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>Ligações ao vivo por personagem</div>
      {rows.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>Nenhuma ligação salva neste mês.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Personagem</th><th style={th}>Ligações</th><th style={th}>Alunos</th><th style={th}>Minutos</th>
              <th style={th}>Min/ligação</th><th style={th}>Custo</th><th style={th}>Custo/min</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.name}</td>
                  <td style={td} className="num">{r.calls}</td>
                  <td style={td} className="num">{r.students}</td>
                  <td style={td} className="num">{r.minutes.toLocaleString('pt-BR')}</td>
                  <td style={td} className="num">{r.calls ? (r.minutes / r.calls).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}</td>
                  <td style={td} className="num">{r.usd != null ? brl(toBrl(r.usd, 'USD')) : r.credits != null ? `${Math.round(r.credits).toLocaleString('pt-BR')} créditos` : '—'}</td>
                  <td style={td} className="num">{r.usd != null && r.minutes > 0 ? brl(toBrl(r.usd / r.minutes, 'USD')) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {v && !v.error && totalCredits > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>Fornecedor de voz no mês: {Math.round(totalCredits).toLocaleString('pt-BR')} créditos</div>
          <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'rgba(0,0,0,0.06)' }}>
            <div style={{ width: pct(callCredits), background: AI_ACCENT.eleven }} />
            <div style={{ width: pct(otherCredits), background: AI_ACCENT.azure }} />
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span><b style={{ color: AI_ACCENT.eleven }}>●</b> Ligações (Família): {pct(callCredits)}{rate != null ? ` · ${brl(toBrl(callCredits * rate, 'USD'))}` : ''}</span>
            <span><b style={{ color: AI_ACCENT.azure }}>●</b> Falas e vocabulário: {pct(otherCredits)}{rate != null ? ` · ${brl(toBrl(otherCredits * rate, 'USD'))}` : ''}</span>
          </div>
          {v.byCharacter.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>
              Por voz: {v.byCharacter.map(c => `${c.name} ${pct(c.credits)}`).join(' · ')}
            </div>
          )}
        </div>
      )}
      {v?.error && <div style={{ fontSize: 12, color: 'var(--t2)' }}>Não foi possível ler a divisão do fornecedor de voz ({v.error}).</div>}
      {rate == null && <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Valores em R$ das ligações da Família aparecem quando a chave do fornecedor de voz tiver a permissão de leitura do plano (user_read).</div>}
    </div>
  );
}

// Cards dos três custos principais de IA: fundo Tinta, cada provedor com sua cor.
const AI_CARD = { bg: '#16131F', text: '#FFFFFF', mid: 'rgba(255,255,255,0.72)', low: 'rgba(255,255,255,0.5)', line: 'rgba(255,255,255,0.1)' };
const AI_ACCENT = { openai: '#DCFF4A', azure: '#B9A8FF', eleven: '#FF8FB4' };
const isLiveVoice = (name: string) => /realtime/i.test(name);

function CostDelta({ cur, prev, prevLabel, partial, fmt }: { cur: number; prev: number | null; prevLabel: string; partial: boolean; fmt: (n: number) => string }) {
  if (prev == null) return null;
  // Mês em andamento: comparar com o mês anterior fechado engana; mostra o valor dele.
  if (partial) return <span style={{ fontSize: 11.5, color: AI_CARD.low }}>{prevLabel}: {fmt(prev)}</span>;
  if (!prev) return <span style={{ fontSize: 11.5, color: AI_CARD.low }}>sem custo em {prevLabel}</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct > 0;
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
      background: up ? 'rgba(255,79,139,0.18)' : 'rgba(43,217,124,0.18)', color: up ? '#FF8FB4' : '#5BE79A',
    }}>
      {up ? '+' : ''}{pct}% vs {prevLabel}
    </span>
  );
}

function AiCard({ name, accent, badge, children }: { name: string; accent: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: AI_CARD.bg, color: AI_CARD.text, borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', minHeight: 240 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 4, background: accent }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
        <b style={{ fontSize: 14, letterSpacing: 0.2 }}>{name}</b>
        {badge && <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: accent }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function AiLines({ lines, fmt }: { lines: { name: string; value: number }[]; fmt: (n: number) => string }) {
  if (!lines.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: `1px solid ${AI_CARD.line}`, paddingTop: 10 }}>
      {lines.map(l => (
        <div key={l.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: AI_CARD.mid }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
          <span className="num">{fmt(l.value)}</span>
        </div>
      ))}
    </div>
  );
}

function AiCostsPanel({ canWrite, onPosted }: { canWrite: boolean; onPosted: () => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<AiCosts | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ provider: string; text: string } | null>(null);
  const load = useCallback(async () => {
    setData(null); setMsg(null);
    const r = await fetch(`/api/admin/ai-costs?month=${month}`);
    if (r.ok) setData(await r.json());
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const post = async (provider: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/ai-costs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month, provider }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ provider, text: j.error ?? 'Não foi possível lançar.' }); return; }
    onPosted(); await load();
    setMsg({ provider, text: 'Lançado como "a pagar" no último dia do mês.' });
  };
  const postButton = (provider: string, accent: string, disabled = false) => canWrite && data && (
    <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" disabled={busy || disabled || data.posted.includes(provider)} onClick={() => post(provider)}
        style={{ border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: accent, color: '#16131F', opacity: busy || disabled || data.posted.includes(provider) ? 0.45 : 1 }}>
        {data.posted.includes(provider) ? 'Já lançado' : busy ? 'Lançando…' : 'Lançar no financeiro'}
      </button>
      {msg?.provider === provider && <span style={{ fontSize: 11.5, color: AI_CARD.mid }}>{msg.text}</span>}
    </div>
  );

  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  const usdFmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const curFmt = (n: number, cur: string) => n.toLocaleString(cur === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency: cur });
  const toBrl = (n: number, cur: string) => (cur === 'BRL' ? n : n * (data?.fx || 0));
  const prevLabel = data ? monthLabel(data.prevMonth).toLowerCase() : '';
  const partial = month === new Date().toISOString().slice(0, 7);

  // OpenAI: Live Voice (modelos realtime) separado do resto.
  const live = data ? data.openai.lines.filter(l => isLiveVoice(l.name)).reduce((s, l) => s + l.usd, 0) : 0;
  const rest = data ? data.openai.usd - live : 0;
  const azureBrl = data?.azure && !data.azure.error ? toBrl(data.azure.total, data.azure.currency) : 0;
  const totalBrl = data ? toBrl(data.openai.usd, 'USD') + azureBrl : 0;

  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Custos de IA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data && <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>Total do mês (OpenAI + Azure): <b className="num" style={{ color: 'var(--t1)' }}>{brl(totalBrl)}</b></span>}
          <select className="adm-select-ghost" value={month} onChange={e => setMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)} {m.slice(0, 4)}</option>)}
          </select>
        </div>
      </div>
      <div className="adm-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {!data ? <div className="adm-empty-sub">Carregando…</div> : (
          <>
            <AiCard name="OpenAI" accent={AI_ACCENT.openai} badge={data.openai.source === 'real' ? 'valor real' : 'estimativa'}>
              <div>
                <div className="num" style={{ fontSize: 30, fontWeight: 800, color: AI_ACCENT.openai, lineHeight: 1.1 }}>{brl(toBrl(data.openai.usd, 'USD'))}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="num" style={{ fontSize: 12.5, color: AI_CARD.mid }}>{usdFmt(data.openai.usd)}</span>
                  <CostDelta cur={data.openai.usd} prev={data.prev.openai.usd} prevLabel={prevLabel} partial={partial} fmt={usdFmt} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ label: 'Live Voice', v: live }, { label: 'Chat, voz e o resto', v: rest }].map(b => (
                  <div key={b.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '9px 11px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: AI_CARD.low }}>{b.label}</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{usdFmt(b.v)}</div>
                  </div>
                ))}
              </div>
              <AiLines lines={data.openai.lines.slice(0, 4).map(l => ({ name: l.name, value: l.usd }))} fmt={usdFmt} />
              {!data.hasOpenAIAdminKey && <div style={{ fontSize: 11.5, color: AI_CARD.low, lineHeight: 1.5 }}>Estimativa: falta OPENAI_ADMIN_KEY.</div>}
              {postButton('OpenAI', AI_ACCENT.openai)}
            </AiCard>

            <AiCard name="Azure Speech" accent={AI_ACCENT.azure} badge={data.azure && !data.azure.error ? 'valor real' : undefined}>
              {!data.hasAzureCost ? (
                <div style={{ fontSize: 12, color: AI_CARD.mid, lineHeight: 1.5 }}>Não configurado.</div>
              ) : data.azure?.error ? (
                <div style={{ fontSize: 12, color: AI_CARD.mid, lineHeight: 1.5 }}>Não foi possível ler o custo do Azure ({data.azure.error}).</div>
              ) : data.azure && (
                <>
                  <div>
                    <div className="num" style={{ fontSize: 30, fontWeight: 800, color: AI_ACCENT.azure, lineHeight: 1.1 }}>{brl(azureBrl)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {data.azure.currency !== 'BRL' && <span className="num" style={{ fontSize: 12.5, color: AI_CARD.mid }}>{curFmt(data.azure.total, data.azure.currency)}</span>}
                      <CostDelta cur={data.azure.total} prev={data.prev.azure?.total ?? null} prevLabel={prevLabel} partial={partial} fmt={n => curFmt(n, data.azure!.currency)} />
                    </div>
                  </div>
                  <AiLines lines={data.azure.lines.filter(l => l.amount > 0).slice(0, 4).map(l => ({ name: l.name, value: l.amount }))} fmt={n => curFmt(n, data.azure!.currency)} />
                  {postButton('Microsoft Azure', AI_ACCENT.azure, data.azure.total < 0.01)}
                </>
              )}
            </AiCard>

            <AiCard name="ElevenLabs" accent={AI_ACCENT.eleven} badge={data.elevenlabs ? `plano ${data.elevenlabs.plan}` : undefined}>
              {data.elevenlabs ? (
                <>
                  <div>
                    <div className="num" style={{ fontSize: 30, fontWeight: 800, color: AI_ACCENT.eleven, lineHeight: 1.1 }}>
                      {data.elevenBilledBrl ? brl(data.elevenBilledBrl) : '—'}
                    </div>
                    <div style={{ fontSize: 12.5, color: AI_CARD.mid, marginTop: 6 }}>
                      {data.elevenBilledBrl ? 'lançado no Financeiro no mês' : 'nada lançado no mês: lance a fatura (plano + excedente)'}
                      {data.elevenlabs.resetAt ? ` · próximo ciclo ${fmtDate(data.elevenlabs.resetAt.slice(0, 10))}` : ''}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: AI_CARD.mid, marginBottom: 6 }}>
                      <span>Caracteres no ciclo</span>
                      <span className="num">{data.elevenlabs.used.toLocaleString('pt-BR')} de {data.elevenlabs.limit.toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (data.elevenlabs.used / Math.max(1, data.elevenlabs.limit)) * 100)}%`, height: '100%', background: AI_ACCENT.eleven, borderRadius: 999 }} />
                    </div>
                  </div>
                </>
              ) : <div style={{ fontSize: 12, color: AI_CARD.mid }}>Não foi possível ler o uso agora.</div>}
            </AiCard>
          </>
        )}
      </div>
      {data && <LiveCallsByCharacter data={data} toBrl={toBrl} />}
    </div>
  );
}

// ── Relatório mensal por e-mail (prévia e envio) ───────────────────────────
function PartnerReportModal({ canWrite, onClose }: { canWrite: boolean; onClose: () => void }) {
  const prev = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const [period, setPeriod] = useState(prev);
  const [data, setData] = useState<{ html: string; recipients: string[]; sent: { sent_at: string; sent_to: string[] } | null } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentOnlyMe, setSentOnlyMe] = useState(false);
  const periods = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });

  useEffect(() => {
    setData(null); setMsg(''); setSentOnlyMe(false);
    fetch(`/api/admin/reports?period=${period}`).then(r => r.json()).then(setData).catch(() => setMsg('Não foi possível gerar a prévia.'));
  }, [period]);

  const send = async (onlyMe: boolean) => {
    if (!onlyMe && !confirm(`Enviar o relatório de ${period} para: ${data?.recipients.join(', ')}?`)) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, onlyMe }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok && onlyMe) setSentOnlyMe(true);
    setMsg(r.ok ? `Enviado para ${j.sentTo?.join(', ') || 'ninguém'}${j.failed?.length ? `; falhou: ${j.failed.join(', ')}` : ''}.` : (j.error ?? 'Falha no envio.'));
  };

  return (
    <div className="adm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal" style={{ maxWidth: 680, background: 'var(--s1)' }}>
        <div className="adm-modal-hdr">
          <div className="adm-modal-title">Relatório mensal por e-mail</div>
          <button className="adm-btn-sm ghost" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="adm-modal-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="adm-select-ghost" value={period} onChange={e => setPeriod(e.target.value)}>
              {periods.map(p => <option key={p} value={p}>{monthLabel(p)} {p.slice(0, 4)}</option>)}
            </select>
            <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>
              Envio manual, pelo botão abaixo, para: {data?.recipients.join(', ') || '…'}
            </span>
          </div>
          {data?.sent && <div style={{ fontSize: 12.5, color: 'var(--ok)' }}>Já enviado em {new Date(data.sent.sent_at).toLocaleString('pt-BR')} para {data.sent.sent_to.join(', ')}.</div>}
          <div style={{ border: '1px solid var(--b2)', borderRadius: 12, overflow: 'hidden', height: 420, background: '#FAF7F0' }}>
            {data ? <iframe title="Prévia" srcDoc={data.html} style={{ width: '100%', height: '100%', border: 0 }} /> : <div className="adm-empty"><div className="adm-empty-sub">Gerando prévia…</div></div>}
          </div>
          {msg && <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>{msg}</div>}
        </div>
        {canWrite && (
          <div className="adm-modal-footer">
            <button className="adm-btn-sm ghost" disabled={busy || !data || sentOnlyMe} onClick={() => send(true)}>{busy ? 'Enviando…' : sentOnlyMe ? 'Enviado para você' : 'Enviar só para mim'}</button>
            <button className="adm-btn-sm primary" disabled={busy || !data} onClick={() => send(false)}>Enviar para a gestão</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Receita por canal + projeção ────────────────────────────────────────────
type RevChannel = { channel: string; label: string; sales: number; refunds: number; gross: number; fees: number; net: number; feePct: number };
type RevMonth = { month: string; gross: number; fees: number; net: number; renewals: number };
type RevSummary = { since: string; channels: RevChannel[]; totals: { gross: number; fees: number; net: number };
  projection: RevMonth[]; projectionTotals: { gross: number; fees: number; net: number }; activeSubscribers: number; inTrial: number };

function RevenuePanel({ range }: { range: Range }) {
  const months = range === 'month' ? 1 : range === '3m' ? 3 : range === 'year' ? new Date().getMonth() + 1 : range === 'all' ? 60 : 12;
  const [d, setD] = useState<RevSummary | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setErr('');
    fetch(`/api/admin/finance?revenue=${months}`).then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setD).catch(() => setErr('Não foi possível carregar a receita.'));
  }, [months]);
  const max = Math.max(1, ...(d?.projection ?? []).map(p => p.gross));
  return (
    <>
      <div className="adm-panel col-12">
        <div className="adm-panel-hdr"><div className="adm-panel-title">Receita por canal</div>
          <div className="adm-panel-sub">{RANGE_LABEL[range]} · bruto {brl(d?.totals.gross ?? 0)} · taxas {brl(d?.totals.fees ?? 0)} · líquido {brl(d?.totals.net ?? 0)}</div></div>
        <div className="adm-panel-body" style={{ overflowX: 'auto' }}>
          {err ? <div className="adm-empty-sub">{err}</div> : !d ? <div className="adm-empty-sub">Carregando…</div> : d.channels.length === 0 ? (
            <div className="adm-empty-sub">Nenhuma venda no período.</div>
          ) : (
            <table className="adm-table">
              <thead><tr><th>Canal</th><th style={{ textAlign: 'right' }}>Vendas</th><th style={{ textAlign: 'right' }}>Bruto</th><th style={{ textAlign: 'right' }}>Taxas</th><th style={{ textAlign: 'right' }}>Líquido</th></tr></thead>
              <tbody>
                {d.channels.map(c => (
                  <tr key={c.channel}>
                    <td>{c.label}</td>
                    <td style={{ textAlign: 'right' }}>{c.sales}{c.refunds ? ` (−${c.refunds} reemb.)` : ''}</td>
                    <td style={{ textAlign: 'right' }}>{brl(c.gross)}</td>
                    <td style={{ textAlign: 'right' }}>{brl(c.fees)} <span style={{ color: 'var(--t3)' }}>({c.feePct.toLocaleString('pt-BR')}%)</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{brl(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="adm-panel col-12">
        <div className="adm-panel-hdr"><div className="adm-panel-title">Projeção de faturamento · 12 meses</div>
          <div className="adm-panel-sub">bruto {brl(d?.projectionTotals.gross ?? 0)} · taxas {brl(d?.projectionTotals.fees ?? 0)} · líquido {brl(d?.projectionTotals.net ?? 0)}</div></div>
        <div className="adm-panel-body">
          {d && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
                {d.projection.map(p => (
                  <div key={p.month} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    title={`${monthLabel(p.month)}: bruto ${brl(p.gross)} · taxas ${brl(p.fees)} · líquido ${brl(p.net)} · ${p.renewals} renovações`}>
                    <div style={{ width: '100%', height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ height: `${(p.fees / max) * 100}%`, background: 'var(--b2)', borderRadius: '4px 4px 0 0' }} />
                      <div style={{ height: `${(p.net / max) * 100}%`, background: 'var(--ok)' }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--t3)' }}>{monthLabel(p.month).slice(0, 3)}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 10, lineHeight: 1.5 }}>
                Verde: líquido · cinza: taxas (loja, imposto ou Asaas, pela taxa real de cada canal). Base: {d.activeSubscribers - d.inTrial} assinantes ativos que já pagaram, pelo vencimento de cada um; quem cancelou a renovação não entra.
                {d.inTrial > 0 && ` Mais ${d.inTrial} em teste grátis, fora da projeção até a primeira cobrança.`} Pix e 12x do site não renovam sozinhos.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── LTV por turma ───────────────────────────────────────────────────────────
// Quanto cada assinante deixa (líquido), no método que o Duolingo descreveu: turmas pelo mês da 1ª cobrança
// e projeção pela renovação de cada plano. Até termos assinantes suficientes passando da data de renovar,
// a renovação usada é a referência publicada pelo Duolingo (marcada como "referência").
type LtvPlan = { plan: 'monthly' | 'annual'; subscribers: number; avgChargeNet: number; renewalRate: number; renewalSource: 'own' | 'reference';
  renewalEligible: number; renewalRenewed: number; expectedCharges: number; projectedLtvNet: number; realizedPerSubNet: number };
type LtvData = { payingSubscribers: number; realizedPerSubNet: number; blendedProjectedLtvNet: number; plans: LtvPlan[];
  cohorts: { month: string; subscribers: number; monthly: number; annual: number; renewed: number; refunded: number; netRealized: number; netPerSub: number }[];
  reference: { monthly12m: number; annual12m: number; minSample: number } };

function LtvPanel() {
  const [d, setD] = useState<LtvData | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('/api/admin/ltv').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setD).catch(() => setErr('Não foi possível calcular o LTV.'));
  }, []);
  const planLabel = (p: 'monthly' | 'annual') => (p === 'monthly' ? 'Mensal' : 'Anual');
  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr"><div className="adm-panel-title">LTV · quanto cada assinante deixa</div>
        <div className="adm-panel-sub">líquido, já sem loja, imposto e Asaas</div></div>
      <div className="adm-panel-body">
        {err ? <div className="adm-empty-sub">{err}</div> : !d ? <div className="adm-empty-sub">Carregando…</div> : d.payingSubscribers === 0 ? (
          <div className="adm-empty-sub">Nenhum assinante pagante ainda.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
              <div className="kpi-card"><div className="kpi-label">LTV projetado (média)</div><div className="kpi-value num">{brl(d.blendedProjectedLtvNet)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>pela mistura de planos de hoje</div></div>
              <div className="kpi-card"><div className="kpi-label">Já recebido por assinante</div><div className="kpi-value num">{brl(d.realizedPerSubNet)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>{d.payingSubscribers} pagantes, menos estornos</div></div>
              {d.plans.filter(p => p.subscribers > 0).map(p => (
                <div key={p.plan} className="kpi-card"><div className="kpi-label">LTV {planLabel(p.plan).toLowerCase()}</div><div className="kpi-value num">{brl(p.projectedLtvNet)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>
                    {brl(p.avgChargeNet)} por cobrança × {p.expectedCharges.toLocaleString('pt-BR')} cobranças
                  </div></div>
              ))}
            </div>

            <table className="adm-table">
              <thead><tr><th>Plano</th><th style={{ textAlign: 'right' }}>Pagantes</th><th style={{ textAlign: 'right' }}>Renovação usada</th><th>Origem da renovação</th></tr></thead>
              <tbody>
                {d.plans.map(p => (
                  <tr key={p.plan}>
                    <td>{planLabel(p.plan)}</td>
                    <td style={{ textAlign: 'right' }}>{p.subscribers}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.renewalRate.toLocaleString('pt-BR')}%{p.plan === 'monthly' ? ' ao mês' : ' ao ano'}</td>
                    <td style={{ color: p.renewalSource === 'own' ? 'var(--ok)' : 'var(--t3)' }}>
                      {p.renewalSource === 'own'
                        ? `dado próprio: ${p.renewalRenewed} de ${p.renewalEligible} renovaram`
                        : `referência do Duolingo (${p.renewalEligible} de ${d.reference.minSample} assinantes para usar o nosso)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: '20px 0 8px' }}>Turmas pelo mês da 1ª cobrança</div>
            <table className="adm-table">
              <thead><tr><th>Turma</th><th style={{ textAlign: 'right' }}>Pagantes</th><th style={{ textAlign: 'right' }}>Mensal / anual</th><th style={{ textAlign: 'right' }}>Renovaram</th><th style={{ textAlign: 'right' }}>Estornos</th><th style={{ textAlign: 'right' }}>Líquido recebido</th><th style={{ textAlign: 'right' }}>Por assinante</th></tr></thead>
              <tbody>
                {d.cohorts.map(c => (
                  <tr key={c.month}>
                    <td>{monthLabel(c.month)}</td>
                    <td style={{ textAlign: 'right' }}>{c.subscribers}</td>
                    <td style={{ textAlign: 'right' }}>{c.monthly} / {c.annual}</td>
                    <td style={{ textAlign: 'right' }}>{c.renewed}</td>
                    <td style={{ textAlign: 'right' }}>{c.refunded}</td>
                    <td style={{ textAlign: 'right' }}>{brl(c.netRealized)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{brl(c.netPerSub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 10, lineHeight: 1.5 }}>
              Projeção = líquido médio por cobrança × cobranças esperadas (1 ÷ (1 − renovação)). Enquanto menos de {d.reference.minSample} assinantes de um plano
              passaram da data de renovar, vale a referência que o Duolingo publicou em 2021: {d.reference.annual12m}% do anual renova depois de 12 meses e
              {' '}{d.reference.monthly12m}% do mensal ainda paga depois de 12 meses. Pix e 12x do site não renovam sozinhos e entram como anual.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────
// ── Resultado (EBITDA) e ponto de equilíbrio ────────────────────────────────
interface PnlMonth { month: string; label: string; gross: number; salesFees: number; refunds: number; taxes: number; netRevenue: number; opex: number; ebitda: number; marginPct: number | null }
interface UnitCost { label: string; total: number; byCategory: { category: string; brl: number }[]; salesFees: number; activeUsers: number; perActive: number | null; payers: number; perPayer: number | null }
interface Breakeven { ticketNet: number | null; payers: number; payersNeeded: number | null; revenueNeeded: number | null; activeUsers: number; conversionPct: number | null; minConversionPct: number | null }

function PnlPanel() {
  const [d, setD] = useState<{ months: PnlMonth[]; breakeven: Breakeven; unitCost: UnitCost } | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('/api/admin/overview?part=pnl', { cache: 'no-store' }).then(r => r.json())
      .then(j => { if (j.error) setErr(j.error); else setD(j); }).catch(e => setErr(String(e)));
  }, []);
  const cur = d?.months[d.months.length - 1];
  const b = d?.breakeven;
  const pct = (n: number | null) => n == null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Resultado e ponto de equilíbrio</div>
        <div className="adm-panel-sub">EBITDA = receita líquida (bruto - taxas de venda - reembolsos - impostos) - custos de operação (todas as saídas, menos impostos e reembolsos). Despesa anual entra como 1/12 por mês.</div>
      </div>
      <div className="adm-panel-body">
        {err && <div className="adm-alert crit">{err}</div>}
        {!d && !err && <div className="adm-empty-sub">Calculando…</div>}
        {cur && b && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 18 }}>
              <div>
                <div className="kpi-label">EBITDA de {cur.label}</div>
                <div className="kpi-value num" style={{ fontSize: '1.5rem', color: cur.ebitda < 0 ? 'var(--err)' : 'var(--ok)' }}>{brl(cur.ebitda)}</div>
                <div className="kpi-context">{cur.marginPct == null ? 'sem receita no mês' : `margem de ${cur.marginPct}%`}</div>
              </div>
              <div>
                <div className="kpi-label">Pagantes para empatar</div>
                <div className="kpi-value num" style={{ fontSize: '1.5rem' }}>{b.payersNeeded ?? '—'}</div>
                <div className="kpi-context">hoje {b.payers} · {b.ticketNet == null ? 'sem assinatura renovando' : `${brl(b.ticketNet)} líquidos por pagante`}</div>
              </div>
              <div>
                <div className="kpi-label">Meta de receita mensal</div>
                <div className="kpi-value num" style={{ fontSize: '1.5rem' }}>{b.revenueNeeded == null ? '—' : brl(b.revenueNeeded)}</div>
                <div className="kpi-context">o que precisa entrar por mês para cobrir o custo de {cur.label} (entrou {brl(cur.gross)})</div>
              </div>
              <div>
                <div className="kpi-label">Conversão para empatar</div>
                <div className="kpi-value num" style={{ fontSize: '1.5rem' }}>{pct(b.minConversionPct)}</div>
                <div className="kpi-context">hoje {pct(b.conversionPct)} · pagantes ÷ {b.activeUsers} ativos no mês</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table" style={{ width: '100%', fontSize: 12.5 }}>
                <thead><tr><th>Mês</th><th className="num">Bruto</th><th className="num">Taxas</th><th className="num">Reembolsos</th><th className="num">Impostos</th><th className="num">Receita líquida</th><th className="num">Custos</th><th className="num">EBITDA</th><th className="num">Margem</th></tr></thead>
                <tbody>
                  {[...d.months].reverse().map(m => (
                    <tr key={m.month}>
                      <td style={{ textTransform: 'capitalize' }}>{m.label}</td>
                      <td className="num">{brl(m.gross)}</td><td className="num">{brl(m.salesFees)}</td><td className="num">{brl(m.refunds)}</td><td className="num">{brl(m.taxes)}</td>
                      <td className="num">{brl(m.netRevenue)}</td><td className="num">{brl(m.opex)}</td>
                      <td className="num" style={{ fontWeight: 700, color: m.ebitda < 0 ? 'var(--err)' : 'var(--ok)' }}>{brl(m.ebitda)}</td>
                      <td className="num">{m.marginPct == null ? '—' : `${m.marginPct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--b1)' }}>
              <div className="kpi-label">Custo por usuário em {d.unitCost.label}</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>
                <strong style={{ color: 'var(--t1)' }}>{d.unitCost.perActive == null ? '—' : brl(d.unitCost.perActive)}</strong> por usuário ativo ({d.unitCost.activeUsers})
                {' · '}<strong style={{ color: 'var(--t1)' }}>{d.unitCost.perPayer == null ? '—' : brl(d.unitCost.perPayer)}</strong> por pagante ({d.unitCost.payers})
              </div>
              <div className="kpi-context" style={{ marginTop: 6 }}>
                Custo do mês {brl(d.unitCost.total)}: {[...d.unitCost.byCategory.filter(c => c.brl > 0).map(c => `${c.category} ${brl(c.brl)}`), `Taxas de venda ${brl(d.unitCost.salesFees)}`].join(' · ')}.
                {' '}Entram as despesas marcadas como custo de operação no lançamento; as taxas de venda entram sozinhas.
              </div>
            </div>
            <div className="kpi-context" style={{ marginTop: 10 }}>
              Pagantes para empatar = custos de operação do mês ÷ receita líquida por pagante. Trial e degustação consomem custo e entram na conta. O mês atual vai mudando conforme as despesas são lançadas.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const me = useAdminMe();
  const canWrite = canArea(me, 'finance:write');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>('12m');
  const [kindFilter, setKindFilter] = useState<'all' | Kind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [catFilter, setCatFilter] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<FormState | null>(null);
  const [report, setReport] = useState(false);
  const [partnerReport, setPartnerReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/finance');
      if (!r.ok) throw new Error(r.status === 403 ? 'Seu papel não tem acesso ao financeiro.' : `HTTP ${r.status}`);
      setEntries((await r.json()).entries ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = rangeStart(range);
  const inRange = (d: string | null) => !!d && (!start || d >= start) && d <= todayISO().slice(0, 7) + '-31';
  const paidInRange = useMemo(() => entries.filter(e => e.status === 'paid' && inRange(e.paid_at)), [entries, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const income = paidInRange.filter(e => e.kind === 'income').reduce((s, e) => s + Number(e.amount_brl), 0);
  const expense = paidInRange.filter(e => e.kind === 'expense').reduce((s, e) => s + Number(e.amount_brl), 0);
  const result = income - expense;

  const pending = entries.filter(e => e.status === 'pending').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const upcoming = pending.filter(e => daysUntil(e.due_date) <= 30);
  const toPay30 = upcoming.filter(e => e.kind === 'expense').reduce((s, e) => s + Number(e.amount_brl), 0);
  const overdue = pending.filter(e => daysUntil(e.due_date) < 0).length;

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    paidInRange.filter(e => e.kind === 'expense').forEach(e => m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount_brl)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [paidInRange]);

  const months = useMemo(() => {
    const now = new Date();
    const out: { key: string; income: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, income: 0, expense: 0 });
    }
    entries.filter(e => e.status === 'paid' && e.paid_at).forEach(e => {
      const row = out.find(o => o.key === monthKey(e.paid_at!));
      if (row) row[e.kind === 'income' ? 'income' : 'expense'] += Number(e.amount_brl);
    });
    return out;
  }, [entries]);

  const vendors = useMemo(() => [...new Set([...VENDORS, ...entries.map(e => e.vendor).filter(Boolean) as string[]])].sort(), [entries]);
  const categories = useMemo(() => [...new Set(entries.map(e => e.category))].sort(), [entries]);
  const customCats = useMemo(() => ({
    expense: [...new Set(entries.filter(e => e.kind === 'expense').map(e => e.category))].sort(),
    income: [...new Set(entries.filter(e => e.kind === 'income').map(e => e.category))].sort(),
  }), [entries]);

  const list = useMemo(() => entries.filter(e => {
    if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (catFilter && e.category !== catFilter) return false;
    if (start && (e.paid_at ?? e.due_date) < start) return false;
    if (q) {
      const t = `${e.description} ${e.vendor ?? ''} ${e.category} ${e.notes ?? ''}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [entries, kindFilter, statusFilter, catFilter, q, start]);

  const markPaid = async (e: Entry) => {
    await fetch('/api/admin/finance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e.id, status: 'paid', paid_at: todayISO() }) });
    load();
  };
  const remove = async (e: Entry) => {
    if (!confirm(`Apagar "${e.description}"? Isso não pode ser desfeito.`)) return;
    await fetch(`/api/admin/finance?id=${e.id}`, { method: 'DELETE' });
    load();
  };
  const edit = (e: Entry) => setModal({
    id: e.id, kind: e.kind, description: e.description, category: e.category, vendor: e.vendor ?? '',
    amount: String(e.amount).replace('.', ','), currency: e.currency, fx_rate: String(e.fx_rate), due_date: e.due_date,
    status: e.status, paid_at: e.paid_at ?? todayISO(), recurrence: e.recurrence, notes: e.notes ?? '', unit_cost: e.unit_cost,
  });

  const exportCsv = () => {
    const head = ['Tipo', 'Descrição', 'Categoria', 'Fornecedor/Origem', 'Valor', 'Moeda', 'Cotação', 'Valor (R$)', 'Vencimento', 'Situação', 'Pago em', 'Recorrência', 'Observações'];
    const rows = list.map(e => [
      e.kind === 'income' ? 'Entrada' : 'Saída', e.description, e.category, e.vendor ?? '', String(e.amount).replace('.', ','), e.currency,
      String(e.fx_rate).replace('.', ','), String(e.amount_brl).replace('.', ','), e.due_date, STATUS_LABEL[e.status], e.paid_at ?? '', REC_LABEL[e.recurrence], e.notes ?? '',
    ]);
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `queizy-financeiro-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="adm-page">
      <style>{`
        @media print {
          .adm-sidebar, .adm-topbar, .no-print, .fin-page-body { display: none !important; }
          main { margin-left: 0 !important; }
          .fin-report-wrap { position: static !important; background: none !important; backdrop-filter: none !important; padding: 0 !important; }
          .fin-report { max-height: none !important; box-shadow: none !important; border: none !important; overflow: visible !important; }
        }
      `}</style>

      <div className="adm-topbar">
        <div className="adm-topbar-title">Financeiro</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(RANGE_LABEL) as Range[]).map(r => (
            <button key={r} className={`range-pill${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>{RANGE_LABEL[r]}</button>
          ))}
        </div>
        <button className="adm-btn-sm ghost" onClick={load} title="Atualizar"><RefreshCw size={13} /></button>
        <button className="adm-btn-sm ghost" onClick={() => setReport(true)}><FileText size={13} /> Relatório</button>
        <button className="adm-btn-sm ghost" onClick={() => setPartnerReport(true)}><Send size={13} /> Relatório mensal</button>
        <button className="adm-btn-sm ghost" onClick={exportCsv}><Download size={13} /> CSV</button>
        {canWrite && <button className="adm-btn-sm primary" onClick={() => setModal(emptyForm())}><Plus size={13} /> Lançamento</button>}
      </div>

      <div className="adm-body fin-page-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="adm-grid">
          {[
            { label: 'Entradas', value: income, ctx: RANGE_LABEL[range], color: 'var(--ok)' },
            { label: 'Saídas', value: expense, ctx: RANGE_LABEL[range], color: 'var(--t1)' },
            { label: 'Resultado de caixa', value: result, ctx: `${income > 0 ? `Margem de ${Math.round((result / income) * 100)}% · ` : ''}só o que já foi pago e recebido; o EBITDA abaixo conta também o que está a pagar`, color: result < 0 ? 'var(--err)' : 'var(--t1)' },
            { label: 'A pagar em 30 dias', value: toPay30, ctx: overdue ? `${overdue} vencido${overdue > 1 ? 's' : ''}` : `${upcoming.length} vencimento${upcoming.length === 1 ? '' : 's'}`, color: overdue ? 'var(--err)' : 'var(--t1)' },
          ].map(k => (
            <div key={k.label} className="kpi-card col-3">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: '1.6rem', color: k.color }}>{loading ? '—' : brl(k.value)}</div>
              <div className="kpi-footer"><span className="kpi-context">{k.ctx}</span></div>
            </div>
          ))}

          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Entradas e saídas por mês</div><div className="adm-panel-sub">últimos 12 meses</div></div>
            <div className="adm-panel-body"><MonthlyChart months={months} /></div>
          </div>

          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Vencimentos</div><div className="adm-panel-sub">próximos 30 dias</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {upcoming.length === 0 && <div className="adm-empty-sub">Nada vencendo.</div>}
              {upcoming.map(e => {
                const d = daysUntil(e.due_date);
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                      <div style={{ fontSize: 11.5, color: d < 0 ? 'var(--err)' : 'var(--t3)' }}>
                        {d < 0 ? `vencido há ${-d} dia${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoje' : `em ${d} dia${d === 1 ? '' : 's'}`} · {fmtDate(e.due_date)}
                      </div>
                    </div>
                    <span className="num" style={{ fontSize: 13, fontWeight: 700, color: e.kind === 'income' ? 'var(--ok)' : 'var(--t1)' }}>{brl(Number(e.amount_brl))}</span>
                    {canWrite && <button className="adm-btn-sm ghost" title={e.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago'} onClick={() => markPaid(e)}><Check size={13} /></button>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="adm-panel col-12">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Saídas por categoria</div><div className="adm-panel-sub">{RANGE_LABEL[range]} · {brl(expense)}</div></div>
            <div className="adm-panel-body"><CategoryBars rows={byCategory} total={expense || 1} /></div>
          </div>

          <PnlPanel />

          <RevenuePanel range={range} />
          <LtvPanel />

          <AiCostsPanel canWrite={canWrite} onPosted={load} />

          <div className="adm-panel col-12">
            <div className="adm-panel-hdr" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div className="adm-panel-title">Lançamentos <span className="adm-panel-sub">· {list.length}</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--t3)' }} />
                  <input className="adm-input-sm" style={{ paddingLeft: 28, width: 190 }} placeholder="Buscar" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <select className="adm-select-ghost" value={kindFilter} onChange={e => setKindFilter(e.target.value as 'all' | Kind)}>
                  <option value="all">Entradas e saídas</option><option value="expense">Só saídas</option><option value="income">Só entradas</option>
                </select>
                <select className="adm-select-ghost" value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | Status)}>
                  <option value="all">Qualquer situação</option><option value="paid">Pagos</option><option value="pending">A pagar</option><option value="canceled">Cancelados</option><option value="refunded">Estornados</option>
                </select>
                <select className="adm-select-ghost" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {list.length === 0 ? (
                <div className="adm-empty">
                  <div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhum lançamento'}</div>
                  
                </div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
                  <tbody>
                    {list.map(e => (
                      <tr key={e.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.paid_at ?? e.due_date)}</td>
                        <td>
                          <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{e.description}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                            {[e.vendor, e.recurrence !== 'none' ? REC_LABEL[e.recurrence] : null, e.currency !== 'BRL' ? `${money(Number(e.amount), e.currency)} × ${e.fx_rate}` : null].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td>{e.category}</td>
                        <td>
                          <span className={`badge ${e.status === 'paid' ? 'badge-ok' : e.status === 'pending' ? (daysUntil(e.due_date) < 0 ? 'badge-err' : 'badge-warn') : 'badge-muted'}`}>
                            {e.status === 'paid' ? (e.kind === 'income' ? 'Recebido' : 'Pago') : e.status === 'pending' ? (e.kind === 'income' ? 'A receber' : 'A pagar') : STATUS_LABEL[e.status]}
                          </span>
                        </td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: e.kind === 'income' ? 'var(--ok)' : 'var(--t1)', whiteSpace: 'nowrap' }}>
                          {e.kind === 'income' ? '+' : '−'} {brl(Number(e.amount_brl))}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {canWrite && (
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              {e.status === 'pending' && <button className="adm-btn-sm ghost" title="Marcar como pago" onClick={() => markPaid(e)}><Check size={13} /></button>}
                              <button className="adm-btn-sm ghost" title="Editar" onClick={() => edit(e)}><Edit2 size={13} /></button>
                              <button className="adm-btn-sm danger" title="Apagar" onClick={() => remove(e)}><Trash2 size={13} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {partnerReport && <PartnerReportModal canWrite={canWrite} onClose={() => setPartnerReport(false)} />}
      {modal && <EntryModal initial={modal} vendors={vendors} customCats={customCats} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {report && (
        <ReportModal
          title={RANGE_LABEL[range]}
          income={income} expense={expense} byCategory={byCategory}
          entries={[...paidInRange].sort((a, b) => (a.paid_at ?? '').localeCompare(b.paid_at ?? ''))}
          onClose={() => setReport(false)}
        />
      )}
    </div>
  );
}
