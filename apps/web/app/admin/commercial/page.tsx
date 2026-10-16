'use client';
// /admin/commercial — área Comercial: cupons do site (Asaas), afiliados e vendas pelo site.
// Cupom: desconto em %, planos, início e fim (campanhas sazonais agendadas), limite de usos e
// duração do desconto (só a 1ª cobrança, N cobranças ou para sempre). Valem só no site.

import { useState, useEffect, useCallback } from 'react';
import { BadgePercent, RefreshCw, Plus, X, Pause, Play } from 'lucide-react';
import AffiliatesAdmin from '../affiliates/page';

type Coupon = {
  code: string; discount_pct: number; plans: string[] | null; active: boolean;
  starts_at: string | null; expires_at: string | null; max_uses: number | null;
  duration_cycles: number | null; note: string | null; created_at: string;
  uses: number; revenue: number; state: 'live' | 'paused' | 'scheduled' | 'expired' | 'used_up';
};
type Checkout = {
  id: string; plan: string; method: string | null; value_brl: number; state: 'paid' | 'open' | 'abandoned' | 'superseded' | 'refunded';
  coupon_code: string | null; affiliate_code: string | null; discount_pct: number | null; trial_days: number;
  created_at: string; paid_at: string | null; price_restored_at: string | null; coupon_cycles: number | null; recovery_stage: number;
  user_id: string; name: string | null; email: string | null;
};
type Summary = { started30: number; paid30: number; abandoned30: number; recovered30: number; revenue30: number };

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');
const dayTime = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const toLocalInput = (s: string | null) => {
  if (!s) return '';
  const d = new Date(s); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const COUPON_STATE: Record<Coupon['state'], { label: string; color: string }> = {
  live:      { label: 'Valendo',   color: 'var(--green, #08804A)' },
  scheduled: { label: 'Agendado',  color: 'var(--accent)' },
  paused:    { label: 'Pausado',   color: 'var(--t3)' },
  expired:   { label: 'Encerrado', color: 'var(--t3)' },
  used_up:   { label: 'Esgotado',  color: 'var(--t3)' },
};
const CHECKOUT_STATE: Record<Checkout['state'], string> = {
  paid: 'Pago', open: 'Em aberto', abandoned: 'Abandonado', superseded: 'Assinou depois', refunded: 'Reembolsado',
};
const METHOD: Record<string, string> = { monthly: 'Mensal (cartão)', annual: 'Anual (cartão)', annual_pix: 'Anual (Pix)', annual_12x: 'Anual 12x' };

function durationLabel(c: { duration_cycles: number | null }) {
  if (!c.duration_cycles) return 'Para sempre';
  return c.duration_cycles === 1 ? 'Só a 1ª cobrança' : `${c.duration_cycles} cobranças`;
}

const EMPTY = { code: '', discount_pct: 20, monthly: true, annual: true, starts_at: '', expires_at: '', max_uses: '', duration: 'first' as 'first' | 'cycles' | 'forever', cycles: 3, note: '', editing: false };
type Form = typeof EMPTY;

export default function CommercialAdmin() {
  const [tab, setTab] = useState<'coupons' | 'affiliates' | 'sales'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [saleFilter, setSaleFilter] = useState<'all' | Checkout['state']>('all');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([fetch('/api/admin/commercial?view=coupons'), fetch('/api/admin/commercial?view=checkouts')]);
      if (c.ok) setCoupons((await c.json()).coupons ?? []);
      if (s.ok) { const j = await s.json(); setCheckouts(j.checkouts ?? []); setSummary(j.summary ?? null); }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/commercial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error ?? 'Não foi possível salvar.'); return false; }
      return true;
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!form) return;
    const coupon = {
      code: form.code, discount_pct: Number(form.discount_pct),
      plans: [form.monthly && 'monthly', form.annual && 'annual'].filter(Boolean),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      duration_cycles: form.duration === 'forever' ? null : form.duration === 'first' ? 1 : Number(form.cycles),
      note: form.note,
    };
    if (await post({ action: 'save_coupon', coupon, editing: form.editing })) { setForm(null); await load(); }
  };

  const edit = (c: Coupon) => setForm({
    code: c.code, discount_pct: c.discount_pct, monthly: (c.plans ?? ['monthly', 'annual']).includes('monthly'),
    annual: (c.plans ?? ['monthly', 'annual']).includes('annual'), starts_at: toLocalInput(c.starts_at), expires_at: toLocalInput(c.expires_at),
    max_uses: c.max_uses == null ? '' : String(c.max_uses),
    duration: !c.duration_cycles ? 'forever' : c.duration_cycles === 1 ? 'first' : 'cycles', cycles: c.duration_cycles && c.duration_cycles > 1 ? c.duration_cycles : 3,
    note: c.note ?? '', editing: true,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => (f ? { ...f, [k]: v } : f));

  const sales = saleFilter === 'all' ? checkouts : checkouts.filter(c => c.state === saleFilter);

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <BadgePercent size={18} color="var(--accent)" />
        <div className="adm-topbar-title">Comercial</div>
        {tab !== 'affiliates' && <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>}
        {tab === 'coupons' && <button className="adm-btn-sm primary" onClick={() => setForm({ ...EMPTY })}><Plus size={13} /> Novo cupom</button>}
      </div>

      <div className="adm-tabs">
        <div className={`adm-tab${tab === 'coupons' ? ' active' : ''}`} onClick={() => setTab('coupons')}>Cupons ({coupons.length})</div>
        <div className={`adm-tab${tab === 'affiliates' ? ' active' : ''}`} onClick={() => setTab('affiliates')}>Afiliados</div>
        <div className={`adm-tab${tab === 'sales' ? ' active' : ''}`} onClick={() => setTab('sales')}>Vendas pelo site</div>
      </div>

      {tab === 'affiliates' && <AffiliatesAdmin />}

      {tab === 'coupons' && (
        <div className="adm-body">
          <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5 }}>
            Cupons valem só na assinatura pelo site (<b>queizy.com/assinar</b>), no campo de cupom. Não acumulam com o desconto de
            afiliado: vale o maior. A <b>duração</b> diz quantas cobranças levam o desconto; depois, a assinatura volta sozinha ao preço
            cheio. Com <b>início</b> e <b>fim</b>, dá para deixar Black Friday, Natal e Dia do Consumidor agendados.
          </div>
          <div className="adm-panel">
            {coupons.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhum cupom ainda'}</div></div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Código</th><th>Situação</th><th className="num">Desconto</th><th>Planos</th><th>Duração</th><th>Período</th><th className="num">Usos</th><th className="num">Receita</th><th></th></tr></thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.code}>
                      <td><div style={{ color: 'var(--t1)', fontWeight: 800, cursor: 'pointer' }} onClick={() => edit(c)}>{c.code}</div>{c.note && <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{c.note}</div>}</td>
                      <td style={{ color: COUPON_STATE[c.state].color, fontWeight: 700 }}>{COUPON_STATE[c.state].label}</td>
                      <td className="num">{c.discount_pct}%</td>
                      <td>{(c.plans ?? ['monthly', 'annual']).map(p => (p === 'monthly' ? 'Mensal' : 'Anual')).join(' e ')}</td>
                      <td>{durationLabel(c)}</td>
                      <td style={{ fontSize: 12 }}>{c.starts_at || c.expires_at ? `${day(c.starts_at)} a ${day(c.expires_at)}` : 'Sem prazo'}</td>
                      <td className="num">{c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ''}</td>
                      <td className="num">{brl(c.revenue)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="adm-btn-sm ghost" disabled={busy} onClick={async () => { if (await post({ action: 'toggle_coupon', code: c.code, active: !c.active })) await load(); }}>
                          {c.active ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Reativar</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div className="adm-body">
          {summary && (
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
              {[
                ['Checkouts (30 dias)', String(summary.started30)],
                ['Pagos', String(summary.paid30)],
                ['Abandonados', String(summary.abandoned30)],
                ['Recuperados por lembrete', String(summary.recovered30 ?? 0)],
                ['Receita (30 dias)', brl(summary.revenue30)],
              ].map(([l, v]) => (
                <div key={l} className="adm-panel" style={{ padding: 14 }}>
                  <div className="kpi-label">{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {(['all', 'paid', 'abandoned', 'open', 'superseded', 'refunded'] as const).map(s => (
              <div key={s} className={`adm-chip${saleFilter === s ? ' active' : ''}`} onClick={() => setSaleFilter(s)}>
                {s === 'all' ? 'Todos' : CHECKOUT_STATE[s]}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
            Abandonado: abriu o checkout do Asaas, o link venceu (2 horas) e a pessoa não assinou depois. Ela recebe até 3 lembretes por e-mail (3h, 24h e 72h); o último leva o cupom VOLTA, se ele existir e estiver valendo na aba Cupons.
          </div>
          <div className="adm-panel">
            {sales.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nada por aqui'}</div></div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Quando</th><th>Aluno</th><th>Forma</th><th className="num">Valor</th><th>Desconto</th><th>Situação</th></tr></thead>
                <tbody>
                  {sales.map(c => (
                    <tr key={c.id}>
                      <td className="num">{dayTime(c.created_at)}</td>
                      <td><a href={`/admin/users/${c.user_id}`} style={{ color: 'var(--t1)' }}>{c.name || 'Sem nome'}</a><div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{c.email ?? '—'}</div></td>
                      <td>{METHOD[c.method ?? c.plan] ?? c.plan}{c.trial_days > 0 ? ` · ${c.trial_days} dias grátis` : ''}</td>
                      <td className="num">{brl(Number(c.value_brl))}</td>
                      <td style={{ fontSize: 12 }}>
                        {c.coupon_code ? `Cupom ${c.coupon_code} (${c.discount_pct}%${c.coupon_cycles ? `, ${c.coupon_cycles === 1 ? '1ª cobrança' : `${c.coupon_cycles} cobranças`}` : ''})`
                          : c.affiliate_code ? `Afiliado ${c.affiliate_code}${c.discount_pct ? ` (${c.discount_pct}%)` : ''}` : '—'}
                        {c.price_restored_at && <div style={{ color: 'var(--t3)' }}>preço cheio desde {day(c.price_restored_at)}</div>}
                      </td>
                      <td style={{ fontWeight: 700, color: c.state === 'paid' ? 'var(--green, #08804A)' : c.state === 'abandoned' ? 'var(--accent)' : 'var(--t2)' }}>
                        {CHECKOUT_STATE[c.state]}
                        {c.recovery_stage > 0 && <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--t3)' }}>{c.recovery_stage} de 3 lembretes</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {form && (
        <div className="adm-modal-backdrop" onClick={() => setForm(null)}>
          <div className="adm-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{form.editing ? `Editar ${form.code}` : 'Novo cupom'}</div>
              <button className="adm-btn-sm ghost" onClick={() => setForm(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="adm-field"><label>Código</label>
                <input className="adm-input" value={form.code} disabled={form.editing} onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="BLACKFRIDAY" />
              </div>
              <div className="adm-field"><label>Desconto (%)</label>
                <input className="adm-input" type="number" min={1} max={50} value={form.discount_pct} onChange={e => set('discount_pct', Number(e.target.value))} />
              </div>
              <div className="adm-field"><label>Planos</label>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', height: 34, fontSize: 13 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.monthly} onChange={e => set('monthly', e.target.checked)} /> Mensal</label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.annual} onChange={e => set('annual', e.target.checked)} /> Anual</label>
                </div>
              </div>
              <div className="adm-field"><label>Duração do desconto</label>
                <select className="adm-input" value={form.duration} onChange={e => set('duration', e.target.value as Form['duration'])}>
                  <option value="first">Só a 1ª cobrança</option>
                  <option value="cycles">Algumas cobranças</option>
                  <option value="forever">Para sempre</option>
                </select>
              </div>
              {form.duration === 'cycles' && (
                <div className="adm-field"><label>Quantas cobranças</label>
                  <input className="adm-input" type="number" min={2} max={24} value={form.cycles} onChange={e => set('cycles', Number(e.target.value))} />
                </div>
              )}
              <div className="adm-field"><label>Limite de usos</label>
                <input className="adm-input" type="number" min={1} value={form.max_uses} onChange={e => set('max_uses', e.target.value)} placeholder="sem limite" />
              </div>
              <div className="adm-field"><label>Começa em</label>
                <input className="adm-input" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
              </div>
              <div className="adm-field"><label>Termina em</label>
                <input className="adm-input" type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} />
              </div>
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}><label>Anotação (campanha)</label>
                <input className="adm-input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Black Friday 2026" />
              </div>
              <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
                No Pix anual (pagamento único) o desconto vale no pagamento todo. A duração conta só nas assinaturas no cartão.
                Sem início, vale a partir de agora; sem fim, até pausar.
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-sm ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="adm-btn-sm primary" disabled={busy} onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
