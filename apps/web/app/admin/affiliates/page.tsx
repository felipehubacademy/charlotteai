'use client';

// /admin/affiliates — afiliados (influenciadores): link único, condição de cada um,
// funil (cliques → cadastros → assinantes) e comissão (a liberar, disponível, paga).
import { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, Plus, X, Copy, Check, UserPlus } from 'lucide-react';

interface Balance { pending: number; available: number; paid: number }
interface Aff {
  id: string; code: string; name: string; email: string | null; status: 'active' | 'paused';
  user_discount_pct: number; commission_type: 'percent' | 'fixed'; commission_pct: number;
  fixed_monthly_brl: number; fixed_annual_brl: number; months_limit: number; hold_days: number;
  min_payout_brl: number; owner_user_id: string | null; notes: string | null; created_at: string;
  link: string; clicks: number; clicks30: number; signups: number; trials: number; subscribers: number;
  payingUsers: number; revenueNet: number; balance: Balance;
}
interface Detail {
  affiliate: Aff; link: string; balance: Balance;
  attributions: { user_id: string; source: string; attributed_at: string }[];
  commissions: { id: string; user_id: string; kind: string; plan: string | null; net_brl: number; amount_brl: number; status: string; available_at: string; created_at: string; is_test?: boolean }[];
  users: { id: string; name: string | null; email: string | null; subscription_status: string | null; created_at: string }[];
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
const SOURCE: Record<string, string> = { install: 'instalação', link: 'link', manual: 'código digitado', admin: 'manual (admin)' };
const SUB: Record<string, string> = { active: 'assinante', cancelled: 'assinante (cancelou)', trial: 'teste grátis', expired: 'expirou' };

function condition(a: Pick<Aff, 'commission_type' | 'commission_pct' | 'fixed_monthly_brl' | 'fixed_annual_brl' | 'months_limit' | 'user_discount_pct'>) {
  const c = a.commission_type === 'fixed'
    ? `${brl(Number(a.fixed_monthly_brl))} mensal · ${brl(Number(a.fixed_annual_brl))} anual`
    : `${Number(a.commission_pct)}% do líquido`;
  return `${c} · ${a.months_limit} meses${a.user_discount_pct ? ` · aluno ${a.user_discount_pct}% off` : ''}`;
}

const EMPTY = {
  id: '', code: '', name: '', email: '', ownerEmail: '', status: 'active', user_discount_pct: 0,
  commission_type: 'percent', commission_pct: 10, fixed_monthly_brl: 1, fixed_annual_brl: 20,
  months_limit: 12, hold_days: 30, min_payout_brl: 50, notes: '',
};
type Form = typeof EMPTY;

export default function AffiliatesAdmin() {
  const [list, setList] = useState<Aff[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [attrEmail, setAttrEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/affiliates');
      if (r.ok) setList((await r.json()).affiliates ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const r = await fetch(`/api/admin/affiliates?id=${id}`);
    if (r.ok) setDetail(await r.json());
  };

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error ?? 'Não foi possível salvar.'); return false; }
      return true;
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!form) return;
    if (await post({ action: 'save', affiliate: form })) { setForm(null); await load(); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 1500); } catch { /* sem área de transferência */ }
  };

  const edit = (a: Aff) => setForm({
    id: a.id, code: a.code, name: a.name, email: a.email ?? '', ownerEmail: '', status: a.status,
    user_discount_pct: a.user_discount_pct, commission_type: a.commission_type, commission_pct: Number(a.commission_pct),
    fixed_monthly_brl: Number(a.fixed_monthly_brl), fixed_annual_brl: Number(a.fixed_annual_brl),
    months_limit: a.months_limit, hold_days: a.hold_days, min_payout_brl: Number(a.min_payout_brl), notes: a.notes ?? '',
  });

  const totals = list.reduce((t, a) => ({
    signups: t.signups + a.signups, subscribers: t.subscribers + a.subscribers, revenue: t.revenue + a.revenueNet,
    owed: t.owed + a.balance.pending + a.balance.available,
  }), { signups: 0, subscribers: 0, revenue: 0, owed: 0 });

  const set = (k: keyof Form, v: string | number) => setForm(f => (f ? { ...f, [k]: v } : f));
  const userName = (id: string) => detail?.users.find(u => u.id === id);

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <Megaphone size={18} color="var(--accent)" />
        <div className="adm-topbar-title">Afiliados</div>
        <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>
        <button className="adm-btn-sm primary" onClick={() => setForm({ ...EMPTY })}><Plus size={13} /> Novo afiliado</button>
      </div>

      <div className="adm-body">
        <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5 }}>
          Cada afiliado tem um link <b>queizy.com/a/CÓDIGO</b>. Contas novas (até 30 dias) que chegam pelo link, pela instalação
          ou digitando o código em "Recebeu um convite?" ficam marcadas com ele; o primeiro link vale. Cada pagamento de assinatura
          gera a comissão, que fica "a liberar" durante a carência e depois "disponível". Reembolso estorna.
        </div>

        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            ['Cadastros por afiliados', String(totals.signups)],
            ['Assinantes', String(totals.subscribers)],
            ['Receita líquida gerada', brl(totals.revenue)],
            ['Comissão a pagar', brl(totals.owed)],
          ].map(([l, v]) => (
            <div key={l} className="adm-panel" style={{ padding: 14 }}>
              <div className="kpi-label">{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="adm-panel">
          {list.length === 0 ? (
            <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhum afiliado ainda'}</div></div>
          ) : (
            <table className="adm-table">
              <thead><tr><th>Afiliado</th><th>Condição</th><th className="num">Cliques (30d)</th><th className="num">Cadastros</th><th className="num">Assinantes</th><th className="num">Receita líquida</th><th className="num">A liberar</th><th className="num">Disponível</th><th className="num">Pago</th><th></th></tr></thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ color: 'var(--t1)', fontWeight: 700, cursor: 'pointer' }} onClick={() => openDetail(a.id)}>{a.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--t3)' }}>
                        {a.link.replace('https://', '')}
                        <button className="adm-btn-sm ghost" style={{ padding: '2px 6px' }} onClick={() => copy(a.link)} title="Copiar link">
                          {copied === a.link ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                        {a.status === 'paused' && <span className="badge badge-warn">pausado</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 240 }}>{condition(a)}</td>
                    <td className="num">{a.clicks} <span style={{ color: 'var(--t3)' }}>({a.clicks30})</span></td>
                    <td className="num">{a.signups}</td>
                    <td className="num">{a.subscribers}{a.trials ? <span style={{ color: 'var(--t3)' }}> +{a.trials} teste</span> : null}</td>
                    <td className="num">{brl(a.revenueNet)}</td>
                    <td className="num">{brl(a.balance.pending)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{brl(a.balance.available)}</td>
                    <td className="num">{brl(a.balance.paid)}</td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button className="adm-btn-sm ghost" onClick={() => openDetail(a.id)}>Ver</button>
                      <button className="adm-btn-sm ghost" onClick={() => edit(a)}>Editar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <div className="adm-modal-backdrop" onClick={() => setForm(null)}>
          <div className="adm-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{form.id ? `Editar ${form.name}` : 'Novo afiliado'}</div>
              <button className="adm-btn-sm ghost" onClick={() => setForm(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="adm-field"><label>Nome</label><input className="adm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Igor Guedes" /></div>
              <div className="adm-field"><label>Código do link</label><input className="adm-input" value={form.code} onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="IGOR" /></div>
              <div className="adm-field"><label>E-mail do afiliado</label><input className="adm-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="para o portal e avisos" /></div>
              <div className="adm-field"><label>Conta dele no app (e-mail)</label><input className="adm-input" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="bloqueia a autoindicação" /></div>
              <div className="adm-field"><label>Comissão</label>
                <select className="adm-input" value={form.commission_type} onChange={e => set('commission_type', e.target.value)}>
                  <option value="percent">% sobre o líquido</option>
                  <option value="fixed">Valor fixo por plano</option>
                </select>
              </div>
              {form.commission_type === 'percent' ? (
                <div className="adm-field"><label>% do líquido</label><input className="adm-input" type="number" min={0} max={100} value={form.commission_pct} onChange={e => set('commission_pct', Number(e.target.value))} /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="adm-field"><label>Mensal (R$)</label><input className="adm-input" type="number" min={0} step="0.5" value={form.fixed_monthly_brl} onChange={e => set('fixed_monthly_brl', Number(e.target.value))} /></div>
                  <div className="adm-field"><label>Anual (R$)</label><input className="adm-input" type="number" min={0} step="0.5" value={form.fixed_annual_brl} onChange={e => set('fixed_annual_brl', Number(e.target.value))} /></div>
                </div>
              )}
              <div className="adm-field"><label>Meses com comissão</label><input className="adm-input" type="number" min={1} value={form.months_limit} onChange={e => set('months_limit', Number(e.target.value))} /></div>
              <div className="adm-field"><label>Carência (dias)</label><input className="adm-input" type="number" min={0} value={form.hold_days} onChange={e => set('hold_days', Number(e.target.value))} /></div>
              <div className="adm-field"><label>Saque mínimo (R$)</label><input className="adm-input" type="number" min={0} value={form.min_payout_brl} onChange={e => set('min_payout_brl', Number(e.target.value))} /></div>
              <div className="adm-field"><label>Desconto ao aluno</label>
                <select className="adm-input" value={form.user_discount_pct} onChange={e => set('user_discount_pct', Number(e.target.value))}>
                  <option value={0}>Sem desconto</option>
                  <option value={10}>10% (quando os produtos com desconto existirem nas lojas)</option>
                </select>
              </div>
              <div className="adm-field"><label>Situação</label>
                <select className="adm-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado (o link para de marcar contas novas)</option>
                </select>
              </div>
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}><label>Anotações</label><textarea className="adm-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-sm ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="adm-btn-sm primary" disabled={busy} onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="adm-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="adm-modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{detail.affiliate.name} · {detail.link.replace('https://', '')}</div>
              <button className="adm-btn-sm ghost" onClick={() => setDetail(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--t2)' }}>
                {condition(detail.affiliate)} · carência {detail.affiliate.hold_days} dias · saque mínimo {brl(Number(detail.affiliate.min_payout_brl))}
                <br />A liberar <b>{brl(detail.balance.pending)}</b> · Disponível <b>{brl(detail.balance.available)}</b> · Pago <b>{brl(detail.balance.paid)}</b>
              </div>

              <div>
                <div className="adm-field-label" style={{ marginBottom: 6 }}>Alunos marcados ({detail.attributions.length})</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="adm-input" style={{ flex: 1 }} value={attrEmail} onChange={e => setAttrEmail(e.target.value)} placeholder="Marcar aluno pelo e-mail (quando o link não pegou)" />
                  <button className="adm-btn-sm ghost" disabled={busy || !attrEmail.trim()} onClick={async () => {
                    if (await post({ action: 'attribute', id: detail.affiliate.id, email: attrEmail })) { setAttrEmail(''); await openDetail(detail.affiliate.id); await load(); }
                  }}><UserPlus size={12} /> Marcar</button>
                </div>
                {detail.attributions.length > 0 && (
                  <table className="adm-table">
                    <thead><tr><th>Aluno</th><th>Como chegou</th><th>Desde</th><th>Situação</th></tr></thead>
                    <tbody>
                      {detail.attributions.map(a => {
                        const u = userName(a.user_id);
                        return (
                          <tr key={a.user_id}>
                            <td><a href={`/admin/users/${a.user_id}`} style={{ color: 'var(--t1)' }}>{u?.name || 'Sem nome'}</a><div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{u?.email ?? '—'}</div></td>
                            <td>{SOURCE[a.source] ?? a.source}</td>
                            <td className="num">{day(a.attributed_at)}</td>
                            <td>{SUB[u?.subscription_status ?? ''] ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <div className="adm-field-label" style={{ marginBottom: 6 }}>Extrato de comissões ({detail.commissions.length})</div>
                {detail.commissions.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Nenhum pagamento ainda.</div>
                ) : (
                  <table className="adm-table">
                    <thead><tr><th>Data</th><th>Aluno</th><th>Plano</th><th className="num">Líquido</th><th className="num">Comissão</th><th>Situação</th></tr></thead>
                    <tbody>
                      {detail.commissions.map(c => {
                        const avail = new Date(c.available_at).getTime() <= Date.now();
                        const st = c.is_test ? 'teste (fora do saldo)' : c.status === 'reversed' ? 'estornada' : c.status === 'paid' ? 'paga' : avail ? 'disponível' : `a liberar em ${day(c.available_at)}`;
                        return (
                          <tr key={c.id}>
                            <td className="num">{day(c.created_at)}</td>
                            <td>{userName(c.user_id)?.name || '—'}</td>
                            <td>{c.kind === 'reversal' ? 'estorno' : c.plan === 'annual' ? 'anual' : 'mensal'}</td>
                            <td className="num">{brl(Number(c.net_brl))}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{brl(Number(c.amount_brl))}</td>
                            <td>{st}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
