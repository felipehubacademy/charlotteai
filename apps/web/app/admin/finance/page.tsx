'use client';
// Financeiro — entradas e saídas do Queizy.
// Regime de caixa: o que conta no resultado é o que foi pago/recebido
// (paid_at). O que está "a pagar" aparece em Vencimentos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Download, FileText, Check, Edit2, Trash2, X, Search, RefreshCw, Repeat, Send } from 'lucide-react';
import { useAdminMe, canArea } from '@/lib/admin-context';

// ── Tipos e catálogos ────────────────────────────────────────────────────────
type Kind = 'expense' | 'income';
type Status = 'pending' | 'paid' | 'canceled';
type Recurrence = 'none' | 'monthly' | 'yearly';
interface Entry {
  id: string; kind: Kind; description: string; category: string; vendor: string | null;
  amount: number; currency: string; fx_rate: number; amount_brl: number;
  due_date: string; paid_at: string | null; status: Status; recurrence: Recurrence;
  recurrence_of: string | null; notes: string | null; created_at: string;
}

const EXPENSE_CATEGORIES = [
  'Inteligência artificial', 'Infraestrutura e hospedagem', 'Lojas e pagamentos', 'Domínios e e-mail',
  'Ferramentas e software', 'Marketing e mídia', 'Equipe e prestadores', 'Jurídico e contábil', 'Impostos', 'Reembolsos e estornos', 'Outros',
];
const INCOME_CATEGORIES = ['Assinaturas App Store', 'Assinaturas Google Play', 'B2B e institucional', 'Aporte de sócios', 'Outros'];
const VENDORS = ['OpenAI', 'Anthropic', 'ElevenLabs', 'Microsoft Azure', 'Vercel', 'Supabase', 'Expo (EAS)', 'RevenueCat', 'Apple', 'Google', 'Cloudflare', 'registro.br', 'Microsoft 365', 'Sentry', 'HubSpot'];
const CURRENCIES = ['BRL', 'USD', 'EUR'];

const STATUS_LABEL: Record<Status, string> = { pending: 'A pagar', paid: 'Pago', canceled: 'Cancelado' };
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
}
const emptyForm = (kind: Kind = 'expense'): FormState => ({
  kind, description: '', category: kind === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0], vendor: '',
  amount: '', currency: 'BRL', fx_rate: '1', due_date: todayISO(), status: 'paid', paid_at: todayISO(), recurrence: 'none', notes: '',
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
            <input value={f.description} onChange={e => set('description', e.target.value)} placeholder={f.kind === 'expense' ? 'Ex.: Domínio queizy.com (1 ano)' : 'Ex.: Repasse App Store setembro'} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label>Categoria</label>
              {newCat ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={f.category} onChange={e => set('category', e.target.value)} placeholder="Nome da nova categoria" autoFocus style={{ flex: 1, minWidth: 0 }} />
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
              <input list="vendors" value={f.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Escolha ou digite um novo" />
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
              </select>
            </div>
            <div className="adm-field">
              <label>Recorrência</label>
              <select value={f.recurrence} onChange={e => set('recurrence', e.target.value as Recurrence)}>
                <option value="none">Única</option><option value="monthly">Mensal</option><option value="yearly">Anual</option>
              </select>
            </div>
          </div>
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
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>{title} · gerado em {fmtDate(todayISO())} · regime de caixa</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '20px 0' }}>
            {[['Entradas', income], ['Saídas', expense], ['Resultado', result], ['50% por sócio', result / 2]].map(([l, v]) => (
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
  month: string; fx: number; hasOpenAIAdminKey: boolean; hasAzureCost: boolean; posted: string[];
  azure: { currency: string; total: number; lines: { name: string; amount: number }[]; error?: string } | null;
  openai: { source: 'real' | 'estimate'; usd: number; lines: { name: string; usd: number }[]; error?: string };
  elevenlabs: { plan: string; used: number; limit: number; resetAt: string | null; nextInvoiceUsd: number | null } | null;
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
    setMsg({ provider, text: 'Lançado no financeiro como "a pagar" no último dia do mês.' });
  };
  const postButton = (provider: string) => canWrite && data && (
    <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="adm-btn-sm primary" disabled={busy || data.posted.includes(provider)} onClick={() => post(provider)}>
        {data.posted.includes(provider) ? 'Já lançado' : busy ? 'Lançando…' : 'Lançar no financeiro'}
      </button>
      {msg?.provider === provider && <span style={{ fontSize: 12, color: 'var(--t2)' }}>{msg.text}</span>}
    </div>
  );
  const money2 = (n: number, cur: string) => n.toLocaleString(cur === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency: cur });

  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  const usdFmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Custos de IA</div>
        <select className="adm-select-ghost" value={month} onChange={e => setMonth(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)} {m.slice(0, 4)}</option>)}
        </select>
      </div>
      <div className="adm-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {!data ? <div className="adm-empty-sub">Carregando…</div> : (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>OpenAI</b>
                <span className={`badge ${data.openai.source === 'real' ? 'badge-ok' : 'badge-warn'}`}>{data.openai.source === 'real' ? 'valor real' : 'estimativa'}</span>
              </div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{usdFmt(data.openai.usd)}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>≈ {brl(data.openai.usd * (data.fx || 0))} na cotação de hoje</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.openai.lines.slice(0, 5).map(l => (
                  <div key={l.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--t2)' }}>
                    <span>{l.name}</span><span className="num">{usdFmt(l.usd)}</span>
                  </div>
                ))}
              </div>
              {!data.hasOpenAIAdminKey && (
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 10, lineHeight: 1.5 }}>
                  Para o valor real, crie uma chave de administrador na OpenAI (Settings &rsaquo; Admin keys) e salve como OPENAI_ADMIN_KEY na Vercel.
                </div>
              )}
              {postButton('OpenAI')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>Microsoft Azure</b>
                {data.azure && !data.azure.error && <span className="badge badge-ok">valor real</span>}
              </div>
              {!data.hasAzureCost ? (
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                  Para ler o custo real (Speech e demais serviços), dê ao app do Azure o papel &ldquo;Cost Management Reader&rdquo; na assinatura e salve o ID dela como AZURE_COST_SUBSCRIPTION_ID na Vercel.
                </div>
              ) : data.azure?.error ? (
                <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                  Não foi possível ler o custo do Azure ({data.azure.error}). Confira se o app tem o papel &ldquo;Cost Management Reader&rdquo; na assinatura.
                </div>
              ) : data.azure && (
                <>
                  <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{money2(data.azure.total, data.azure.currency)}</div>
                  {data.azure.currency === 'USD' && <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>≈ {brl(data.azure.total * (data.fx || 0))} na cotação de hoje</div>}
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.azure.lines.filter(l => l.amount > 0).slice(0, 5).map(l => (
                      <div key={l.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--t2)' }}>
                        <span>{l.name}</span><span className="num">{money2(l.amount, data.azure!.currency)}</span>
                      </div>
                    ))}
                  </div>
                  {postButton('Microsoft Azure')}
                </>
              )}
            </div>
            <div>
              <b style={{ fontSize: 14 }}>ElevenLabs</b>
              {data.elevenlabs ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--t2)', margin: '6px 0 8px' }}>Plano {data.elevenlabs.plan} · uso real do ciclo atual</div>
                  <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>
                    {data.elevenlabs.used.toLocaleString('pt-BR')} <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>de {data.elevenlabs.limit.toLocaleString('pt-BR')} caracteres</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--b1)', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
                    <div style={{ width: `${Math.min(100, (data.elevenlabs.used / Math.max(1, data.elevenlabs.limit)) * 100)}%`, height: '100%', background: '#16131F' }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>
                    {data.elevenlabs.resetAt ? `Renova em ${fmtDate(data.elevenlabs.resetAt.slice(0, 10))}` : ''}
                    {data.elevenlabs.nextInvoiceUsd != null ? ` · próxima fatura ${usdFmt(data.elevenlabs.nextInvoiceUsd)}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 8 }}>A ElevenLabs entra pela fatura do cartão.</div>
                </>
              ) : <div className="adm-empty-sub" style={{ marginTop: 6 }}>Não foi possível ler o uso agora.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Relatório mensal dos sócios (prévia e envio) ───────────────────────────
function PartnerReportModal({ canWrite, onClose }: { canWrite: boolean; onClose: () => void }) {
  const prev = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const [period, setPeriod] = useState(prev);
  const [data, setData] = useState<{ html: string; recipients: string[]; sent: { sent_at: string; sent_to: string[] } | null } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const periods = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });

  useEffect(() => {
    setData(null); setMsg('');
    fetch(`/api/admin/reports?period=${period}`).then(r => r.json()).then(setData).catch(() => setMsg('Não foi possível gerar a prévia.'));
  }, [period]);

  const send = async (onlyMe: boolean) => {
    if (!onlyMe && !confirm(`Enviar o relatório de ${period} para: ${data?.recipients.join(', ')}?`)) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, onlyMe }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? `Enviado para ${j.sentTo?.join(', ') || 'ninguém'}${j.failed?.length ? `; falhou: ${j.failed.join(', ')}` : ''}.` : (j.error ?? 'Falha no envio.'));
  };

  return (
    <div className="adm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal" style={{ maxWidth: 680, background: 'var(--s1)' }}>
        <div className="adm-modal-hdr">
          <div className="adm-modal-title">Relatório mensal dos sócios</div>
          <button className="adm-btn-sm ghost" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="adm-modal-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="adm-select-ghost" value={period} onChange={e => setPeriod(e.target.value)}>
              {periods.map(p => <option key={p} value={p}>{monthLabel(p)} {p.slice(0, 4)}</option>)}
            </select>
            <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>
              Vai sozinho no dia 1 de cada mês para: {data?.recipients.join(', ') || '…'}
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
            <button className="adm-btn-sm ghost" disabled={busy || !data} onClick={() => send(true)}>Enviar só para mim</button>
            <button className="adm-btn-sm primary" disabled={busy || !data} onClick={() => send(false)}>Enviar para os sócios</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────
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
    status: e.status, paid_at: e.paid_at ?? todayISO(), recurrence: e.recurrence, notes: e.notes ?? '',
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
        <div className="adm-topbar-title">Financeiro <span className="adm-topbar-sub">· entradas e saídas, regime de caixa</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(RANGE_LABEL) as Range[]).map(r => (
            <button key={r} className={`range-pill${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>{RANGE_LABEL[r]}</button>
          ))}
        </div>
        <button className="adm-btn-sm ghost" onClick={load} title="Atualizar"><RefreshCw size={13} /></button>
        <button className="adm-btn-sm ghost" onClick={() => setReport(true)}><FileText size={13} /> Relatório</button>
        <button className="adm-btn-sm ghost" onClick={() => setPartnerReport(true)}><Send size={13} /> Sócios</button>
        <button className="adm-btn-sm ghost" onClick={exportCsv}><Download size={13} /> CSV</button>
        {canWrite && <button className="adm-btn-sm primary" onClick={() => setModal(emptyForm())}><Plus size={13} /> Lançamento</button>}
      </div>

      <div className="adm-body fin-page-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="adm-grid">
          {[
            { label: 'Entradas', value: income, ctx: RANGE_LABEL[range], color: 'var(--ok)' },
            { label: 'Saídas', value: expense, ctx: RANGE_LABEL[range], color: 'var(--t1)' },
            { label: 'Resultado', value: result, ctx: `50% por sócio: ${brl(result / 2)}`, color: result < 0 ? 'var(--err)' : 'var(--t1)' },
            { label: 'A pagar em 30 dias', value: toPay30, ctx: overdue ? `${overdue} vencido${overdue > 1 ? 's' : ''}` : `${upcoming.length} vencimento${upcoming.length === 1 ? '' : 's'}`, color: overdue ? 'var(--err)' : 'var(--t1)' },
          ].map(k => (
            <div key={k.label} className="kpi-card col-3">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: '1.6rem', color: k.color }}>{loading ? '—' : brl(k.value)}</div>
              <div className="kpi-footer"><span className="kpi-context">{k.ctx}</span></div>
            </div>
          ))}

          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Entradas e saídas por mês</div><div className="adm-panel-sub">últimos 12 meses, valores pagos</div></div>
            <div className="adm-panel-body"><MonthlyChart months={months} /></div>
          </div>

          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Vencimentos</div><div className="adm-panel-sub">próximos 30 dias</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {upcoming.length === 0 && <div className="adm-empty-sub">Nada vencendo. Lance as contas recorrentes para ver aqui.</div>}
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
                  <option value="all">Qualquer situação</option><option value="paid">Pagos</option><option value="pending">A pagar</option><option value="canceled">Cancelados</option>
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
                  {!loading && <div className="adm-empty-sub">Use "Lançamento" para registrar um custo ou uma receita.</div>}
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
                            {e.status === 'paid' ? (e.kind === 'income' ? 'Recebido' : 'Pago') : e.status === 'pending' ? (e.kind === 'income' ? 'A receber' : 'A pagar') : 'Cancelado'}
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
