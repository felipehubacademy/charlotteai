'use client';

// Visão geral (tela inicial do /admin): o retrato do negócio agora, com dados ao vivo de /api/admin/overview.
// Mesmas regras de Usuários, Métricas, Financeiro e Suporte; equipe fora. Sem números pedagógicos.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, TriangleAlert, CircleCheck, ArrowRight } from 'lucide-react';
import { useAdminMe, canArea } from '@/lib/admin-context';
import AdminLoading from '@/components/admin/AdminLoading';
import type { Overview, TodayMetric, DayPoint } from '@/lib/admin-overview';

// Usuários (consulta leve) a cada 5 s; o resto da tela (lê as atividades de 30 dias) a cada 60 s.
const USERS_REFRESH_MS = 5_000;
const AUTO_REFRESH_MS = 60_000;

// ── Formatação ───────────────────────────────────────────────────────────────
const int = (n: number) => n.toLocaleString('pt-BR');
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctFmt = (n: number | null) => (n == null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()];
const minutesFmt = (m: number) => (m < 1 ? `${Math.max(1, Math.round(m * 60))} s` : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`);

// ── Peças ────────────────────────────────────────────────────────────────────
/** Linha dos últimos 7 dias (hoje pela metade), com o valor de cada dia no passar do mouse. */
function Sparkline({ series, money }: { series: DayPoint[]; money?: boolean }) {
  const W = 120, H = 32, P = 3;
  const max = Math.max(1, ...series.map(p => p.value));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, series.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const pts = series.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Últimos 7 dias" style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={x(series.length - 1)} cy={y(last.value)} r={3} fill="var(--accent)" stroke="var(--s1)" strokeWidth={2} />}
      {series.map((p, i) => (
        <rect key={p.date} x={x(i) - (W / series.length) / 2} y={0} width={W / series.length} height={H} fill="transparent">
          <title>{`${weekday(p.date)} ${ddmm(p.date)}: ${money ? brl(p.value) : int(p.value)}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Barras verticais simples (uma ou duas séries empilhadas). */
function Bars({ days, height = 84, label }: { days: { date: string; a: number; b?: number }[]; height?: number; label: (d: { date: string; a: number; b?: number }) => string }) {
  const max = Math.max(1, ...days.map(d => d.a + (d.b ?? 0)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: height + 34 }}>
      {days.map(d => {
        const total = d.a + (d.b ?? 0);
        const hA = (d.a / max) * height, hB = ((d.b ?? 0) / max) * height;
        return (
          <div key={d.date} title={label(d)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{total || ''}</div>
            <div style={{ width: '100%', maxWidth: 34, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height, gap: hA && hB ? 2 : 0 }}>
              {hB > 0 && <div style={{ height: hB, background: 'var(--brand)', borderRadius: '4px 4px 0 0' }} />}
              {hA > 0 && <div style={{ height: hA, background: 'var(--accent)', borderRadius: hB > 0 ? 0 : '4px 4px 0 0' }} />}
              {total === 0 && <div style={{ height: 2, background: 'var(--b2)', borderRadius: 1 }} />}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--t3)', whiteSpace: 'nowrap' }}>{weekday(d.date)} {ddmm(d.date)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Panel({ title, sub, href, linkLabel, children, className = 'col-6' }: {
  title: string; sub?: string; href?: string | null; linkLabel?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`adm-panel ${className}`}>
      <div className="adm-panel-hdr" style={{ gap: 12 }}>
        <div>
          <div className="adm-panel-title">{title}</div>
          {sub && <div className="adm-panel-sub">{sub}</div>}
        </div>
        {href && (
          <Link href={href} className="adm-btn-sm ghost" style={{ flexShrink: 0 }}>
            {linkLabel ?? 'Abrir'} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="adm-panel-body">{children}</div>
    </div>
  );
}

function Delta({ m }: { m: TodayMetric }) {
  const fmt = (n: number) => (m.money ? brl(n) : int(n));
  return <span className="kpi-context">ontem {fmt(m.yesterday)}</span>;
}

// ════════════════════════════════════════════════════════════════════════════
// Contador até a próxima atualização dos usuários (5, 4, 3, 2, 1): só o número, na linha do título.
function RefreshCountdown({ tick }: { tick: number }) {
  const [left, setLeft] = useState(USERS_REFRESH_MS / 1000);
  const since = useRef(Date.now());
  useEffect(() => { since.current = Date.now(); setLeft(USERS_REFRESH_MS / 1000); }, [tick]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.max(1, Math.ceil((USERS_REFRESH_MS - (Date.now() - since.current)) / 1000));
      setLeft(s);
    }, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <span title="Próxima atualização" style={{
      fontSize: 10.5, fontWeight: 700, lineHeight: 1, color: 'var(--volt)',
      fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
    }}>{left}</span>
  );
}

// Total de usuários ao vivo: pulsa em verde-limão a cada atualização; se entrou gente, sobe contando e fica aceso por mais tempo.
function LiveTotal({ value, tick }: { value: number; tick: number }) {
  const [shown, setShown] = useState(value);
  const [glow, setGlow] = useState<'none' | 'pulse' | 'up'>('none');
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (to === from) {
      setGlow('pulse');
      const t = setTimeout(() => setGlow('none'), 380);
      return () => clearTimeout(t);
    }
    setGlow('up');
    const start = performance.now(), dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const t = setTimeout(() => setGlow('none'), 2200);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [value, tick]);
  const lit = glow !== 'none';
  return (
    <div className="kpi-value" style={{
      fontSize: '2.6rem', display: 'inline-block', transformOrigin: 'left center',
      color: lit ? 'var(--volt)' : '#fff',
      transform: glow === 'up' ? 'scale(1.1)' : glow === 'pulse' ? 'scale(1.06)' : 'scale(1)',
      textShadow: lit ? '0 0 22px rgba(220,255,74,0.6)' : '0 0 0 rgba(220,255,74,0)',
      transition: lit
        ? 'color 0.15s ease, transform 0.2s cubic-bezier(.2,.9,.3,1.4), text-shadow 0.15s ease'
        : 'color 0.7s ease, transform 0.5s ease, text-shadow 0.7s ease',
    }}>{int(shown)}</div>
  );
}

export default function AdminOverviewPage() {
  const me = useAdminMe();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // silent: atualização automática (sem o carregando no botão e sem apagar a tela se falhar uma vez).
  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as Overview);
      setError('');
    } catch (e) { if (!silent) setError((e as Error).message); }
    finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Atualiza sozinha com a aba aberta: usuários a cada 5 s, o resto a cada 60 s; tudo na hora em que a aba volta.
  const [usersTick, setUsersTick] = useState(0); // conta as atualizações rápidas (contador e efeito no total)
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview?part=users', { cache: 'no-store' });
      if (!res.ok) return;
      const j = await res.json() as { generatedAt: string; users: Overview['users'] };
      setData(d => (d ? { ...d, users: j.users, generatedAt: j.generatedAt } : d));
      setUsersTick(t => t + 1);
    } catch { /* tenta de novo no próximo ciclo */ }
  }, []);
  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    const fast = setInterval(() => { if (visible()) loadUsers(); }, USERS_REFRESH_MS);
    const slow = setInterval(() => { if (visible()) load(true); }, AUTO_REFRESH_MS);
    const onVisible = () => { if (visible()) load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(fast); clearInterval(slow); document.removeEventListener('visibilitychange', onVisible); };
  }, [load, loadUsers]);

  if (loading && !data && !error) return <AdminLoading label="Carregando a visão geral…" />;

  const link = (area: Parameters<typeof canArea>[1], href: string) => (canArea(me, area) ? href : null);
  const u = data?.users;
  const problems = data?.alerts.items.filter(i => !i.ok) ?? [];
  const okItems = data?.alerts.items.filter(i => i.ok) ?? [];

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="adm-topbar-title">Visão geral</div>
        </div>
        <button onClick={() => load()} disabled={loading} className="adm-btn-sm ghost">
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Carregando' : 'Atualizar'}
        </button>
      </div>

      <div className="adm-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}><TriangleAlert size={14} /> {error}</div>}

        {data && u && (
          <div className="adm-grid">
            {/* a. Alertas */}
            <div className="col-12">
              {data.alerts.allOk ? (
                <div className="adm-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--ok)', fontSize: 13.5 }}>
                    <CircleCheck size={16} /> Tudo certo agora
                  </span>
                  {okItems.map(i => <span key={i.key} className="badge badge-muted" style={{ color: 'var(--t2)' }}>{i.label}</span>)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {problems.map(i => (
                    <div key={i.key} className="adm-alert warn" style={{ alignItems: 'center' }}>
                      <TriangleAlert size={14} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{i.label}</span>
                      {i.href && <Link href={i.href} className="adm-btn-sm ghost" style={{ flexShrink: 0 }}>Ver <ArrowRight size={12} /></Link>}
                    </div>
                  ))}
                  {okItems.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <CircleCheck size={14} style={{ color: 'var(--ok)' }} />
                      {okItems.map(i => <span key={i.key} className="badge badge-muted" style={{ color: 'var(--t2)' }}>{i.label}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* b. Total de usuários e os quatro grupos (somam o total) */}
            <div className="col-12">
              <div style={{ background: 'var(--accent)', color: '#fff', borderRadius: 'var(--r3)', padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div className="kpi-label" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 0 }}>Total de usuários</div>
                      <RefreshCountdown tick={usersTick} />
                    </div>
                    <div><LiveTotal value={u.total} tick={usersTick} /></div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: 'var(--volt)', fontWeight: 700 }}>+{int(u.newToday)} hoje</span> · {int(u.new30d)} nos últimos 30 dias
                    </div>
                  </div>
                  {link('users', '/admin/users') && (
                    <Link href="/admin/users" className="adm-btn-sm ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>
                      Usuários <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
                  {[
                    { label: 'Degustação', value: u.taste, sub: 'sem teste nem assinatura' },
                    { label: 'Em teste grátis', value: u.trial, sub: u.trialCancelled ? `${int(u.trialCancelled)} ${u.trialCancelled === 1 ? 'cancelou e usa' : 'cancelaram e usam'} até o fim` : `loja ${u.trialStore} · site ${u.trialSite}` },
                    { label: 'Pagantes', value: u.paying, sub: u.payingCancelled ? `${int(u.payingCancelled)} ${u.payingCancelled === 1 ? 'cancelou e usa' : 'cancelaram e usam'} até o fim` : 'com renovação ativa' },
                    { label: 'Sem acesso', value: u.noAccess, sub: 'teste ou assinatura encerrados' },
                  ].map(g => (
                    <div key={g.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 'var(--r2)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{g.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '4px 0 2px' }}>{int(g.value)}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>{g.sub}</div>
                    </div>
                  ))}
                </div>
                {u.taste + u.trial + u.paying + u.noAccess !== u.total && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--volt)' }}>
                    Os quatro grupos somam {int(u.taste + u.trial + u.paying + u.noAccess)}, diferente do total: confira.
                  </div>
                )}
              </div>
            </div>

            {/* c. Hoje x ontem */}
            <div className="col-12">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', margin: '4px 0 10px' }}>
                Hoje, comparado com ontem <span style={{ fontWeight: 400, color: 'var(--t3)' }}>· horário de Brasília, hoje até agora</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                {data.todayVsYesterday.map(m => (
                  <div key={m.key} className="kpi-card" style={{ padding: 16 }}>
                    <div className="kpi-label">{m.label}</div>
                    <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{m.money ? brl(m.today) : int(m.today)}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                      <Delta m={m} />
                      <Sparkline series={m.series} money={m.money} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* d. Funil */}
            <Panel title="Funil dos últimos 30 dias" sub="Contas criadas nos últimos 30 dias" href={link('metrics', '/admin/metrics')} linkLabel="Métricas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.funnel30d.map(s => (
                  <div key={s.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{int(s.count)}</strong>
                        {s.key !== 'signups' && <span style={{ color: 'var(--t3)' }}> · {pctFmt(s.pctOfSignups)} dos cadastros</span>}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--s2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(s.count ? 1 : 0, s.pctOfSignups ?? 0)}%`, background: 'var(--accent)', borderRadius: 4 }} />
                    </div>
                    {s.stepPct != null && s.key !== 'first' && (
                      <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>{pctFmt(s.stepPct)} {s.stepOf}</div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {/* e. Dinheiro */}
            <Panel title="Dinheiro" sub="Receita em reais, sem as contas da equipe" href={link('finance', '/admin/finance')} linkLabel="Financeiro">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <div className="kpi-label">Receita recorrente (mês)</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{brl(data.money.mrr)}</div>
                  <div className="kpi-context">{int(data.money.renewing)} {data.money.renewing === 1 ? 'assinatura renovando' : 'assinaturas renovando'}</div>
                  <div className="kpi-context" style={{ marginTop: 2 }}>{brl(data.money.mrrIfTrialsConvert)} se os testes virarem assinatura</div>
                </div>
                <div>
                  <div className="kpi-label" style={{ textTransform: 'uppercase' }}>Receita de {data.money.month.label}</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{brl(data.money.month.gross)}</div>
                  <div className="kpi-context">{brl(data.money.month.net)} líquido · {int(data.money.month.charges)} {data.money.month.charges === 1 ? 'cobrança' : 'cobranças'}</div>
                  {data.money.month.refunds > 0 && (
                    <div className="kpi-context" style={{ marginTop: 2 }}>{data.money.month.refunds} {data.money.month.refunds === 1 ? 'reembolso' : 'reembolsos'} ({brl(data.money.month.refundsBrl)})</div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Primeiras cobranças nos próximos 7 dias: {int(data.money.firstCharges7d.total)}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t2)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />Loja</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--brand)' }} />Site</span>
                  </div>
                </div>
                <Bars days={data.money.firstCharges7d.days.map(d => ({ date: d.date, a: d.store, b: d.site }))}
                  height={60} label={d => `${ddmm(d.date)}: ${d.a} na loja, ${d.b ?? 0} no site`} />
              </div>
              {(() => {
                const uc = data.money.unitCost;
                const parts = [...uc.byCategory.filter(c => c.brl > 0).map(c => `${c.category} ${brl(c.brl)}`), `Taxas de venda ${brl(uc.salesFees)}`];
                return (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--b1)' }}>
                    <div className="kpi-label" style={{ textTransform: 'uppercase' }}>Custo por usuário em {uc.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      <div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{uc.perActive == null ? '—' : brl(uc.perActive)}</div>
                        <div className="kpi-context">por usuário ativo no mês ({int(uc.activeUsers)})</div>
                      </div>
                      <div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{uc.perPayer == null ? '—' : brl(uc.perPayer)}</div>
                        <div className="kpi-context">por pagante ({int(uc.payers)})</div>
                      </div>
                    </div>
                    {(() => {
                      const pm = data.money.pnl.months[data.money.pnl.months.length - 1];
                      const be = data.money.pnl.breakeven;
                      return (
                        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--t2)' }}>
                          EBITDA de {pm.label}: <strong style={{ color: pm.ebitda < 0 ? 'var(--err)' : 'var(--ok)' }}>{brl(pm.ebitda)}</strong>
                          {be.payersNeeded != null && <> · empata com <strong style={{ color: 'var(--t1)' }}>{int(be.payersNeeded)} pagantes</strong> (hoje {int(be.payers)})</>}
                        </div>
                      );
                    })()}
                    <div className="kpi-context" style={{ marginTop: 6 }}>
                      Custo do mês {brl(uc.total)}: {parts.join(' · ')}. Vem do que está lançado no Financeiro; as taxas de venda entram sozinhas.
                    </div>
                  </div>
                );
              })()}
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--t2)' }}>
                Cancelaram e ainda têm acesso: <strong style={{ color: 'var(--t1)' }}>{int(data.money.cancelledWithAccess.total)}</strong>
                {' '}({int(data.money.cancelledWithAccess.trial)} no teste, {int(data.money.cancelledWithAccess.paying)} {data.money.cancelledWithAccess.paying === 1 ? 'pagante' : 'pagantes'})
              </div>
            </Panel>

            {/* f. Engajamento */}
            <Panel title="Engajamento" sub="Usuário ativo = fez alguma atividade no dia" href={link('metrics', '/admin/metrics')} linkLabel="Métricas">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <div className="kpi-label">Voltou no dia seguinte</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{data.engagement.d1.pct == null ? '—' : `${data.engagement.d1.pct}%`}</div>
                  <div className="kpi-context">{int(data.engagement.d1.retained)} de {int(data.engagement.d1.eligible)} · cadastros dos últimos 14 dias</div>
                </div>
                <div>
                  <div className="kpi-label">Voltou em 7 dias</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{data.engagement.d7.pct == null ? '—' : `${data.engagement.d7.pct}%`}</div>
                  <div className="kpi-context">{int(data.engagement.d7.retained)} de {int(data.engagement.d7.eligible)} · no 7º dia depois do cadastro</div>
                </div>
                <div>
                  <div className="kpi-label">Sequências ativas</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{int(data.engagement.activeStreaks)}</div>
                  <div className="kpi-context">{int(data.engagement.practicedToday)} já praticaram hoje</div>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Usuários ativos por dia</div>
                <Bars days={data.engagement.dau7.map(d => ({ date: d.date, a: d.value }))} height={70}
                  label={d => `${ddmm(d.date)}: ${d.a} ${d.a === 1 ? 'usuário ativo' : 'usuários ativos'}`} />
              </div>
            </Panel>

            {/* g. Suporte */}
            <Panel title="Suporte" sub="E-mail, WhatsApp, Instagram e chat do app" href={link('support', '/admin/support')} linkLabel="Suporte">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <div className="kpi-label">Chamados abertos</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem', color: data.support.waitingOverSla ? 'var(--warn)' : undefined }}>{int(data.support.openTickets)}</div>
                  <div className="kpi-context">
                    {data.support.waitingOverSla ? `${data.support.waitingOverSla} esperando há mais de 2 h` : 'com atendente'}
                    {data.support.withAi > 0 && ` · ${data.support.withAi} com a IA`}
                  </div>
                </div>
                <div>
                  <div className="kpi-label">Conversas na semana</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{int(data.support.week.total)}</div>
                  <div className="kpi-context">{data.support.week.byChannel.length ? data.support.week.byChannel.map(c => `${c.label} ${c.count}`).join(' · ') : 'nenhuma nos últimos 7 dias'}</div>
                </div>
                <div>
                  <div className="kpi-label">1ª resposta média</div>
                  <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{data.support.firstResponse.avgMinutes == null ? '—' : minutesFmt(data.support.firstResponse.avgMinutes)}</div>
                  <div className="kpi-context">
                    {data.support.firstResponse.samples === 0 ? 'sem conversas na semana'
                      : data.support.firstResponse.allByAi ? 'todas respondidas pela IA'
                      : `${data.support.firstResponse.samples} ${data.support.firstResponse.samples === 1 ? 'conversa' : 'conversas'} da semana`}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
