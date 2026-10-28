'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, TriangleAlert, ChevronUp, ChevronDown, Minus } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────
interface MetricsResponse {
  range: { from: string; to: string; days: number };
  revenue: {
    mrr: number; arr: number; activeSubs: number; monthlySubs: number; yearlySubs: number;
    onTrial: number; trialConversionPct: number | null; churnPct: number | null;
    trialConversion: { converted: number; total: number };
    churn: { lost: number; base: number };
    subs: { paidStore: number; paidSite: number; trialStore: number; trialSite: number; trialLegacy: number; cancelledWithAccess: number; cancelledPaid: number; cancelledTrial: number };
    trialMrrPotential: number;
    renewals7d: number; charges7d: { firstCharge: number; renewal: number };
    inactivePaying: number; newUsers: number; totalUsers: number;
    cash: { netBrl: number; charges: number; storeCharges: number; siteCharges: number; refundsBrl: number; refunds: number };
  };
  taste: { total: number; day1: number; lastDay: number; inProgress: number; exhausted: number; tasteDays: number };
  tasteFunnel: {
    signups: { total: number; ios: number; android: number; unknown: number };
    store: Array<{ platform: 'ios' | 'android'; shown: number; tapped: number; started: number; paid: number }>;
    site: Array<{ platform: 'ios' | 'android' | 'web'; checkouts: number; started: number; direct: number; paid: number }>;
    byReason: Array<{ reason: string; label: string; shown: number; started: number; paid: number }>;
    byKind: Array<{ kind: string; label: string; shown: number; started: number }>;
  };
  acquisition: {
    since: string | null; base: number; answered: number; skipped: number; responseRatePct: number | null;
    bySource: Array<{ source: string; label: string; accounts: number; trial: number; paid: number }>;
    site: {
      visits: number | null; clicks: number | null;
      byChannel: Array<{ key: string; label: string; checkouts: number; completed: number; paid: number }>;
      byAffiliate: Array<{ key: string; label: string; checkouts: number; completed: number; paid: number }>;
      byCoupon: Array<{ key: string; label: string; checkouts: number; completed: number; paid: number }>;
    };
  };
  retention: {
    d1: number | null; d7: number | null; d30: number | null;
    n: Record<'d1' | 'd7' | 'd30', { retained: number; eligible: number }>;
  };
  appVersions: {
    latestVersion: string; total: number; opened30d: number; onLatest: number; outdated: number;
    unknown: number; onLatestPct: number; byVersion: { version: string; count: number }[];
    byPlatform: { ios: number; android: number };
  };
  openai: {
    tableMissing: boolean; totalCost: number; studentCost: number; internalCost: number; callCount: number;
    activeInRange: number; costPerActiveSub: number;
    byEndpoint: Array<{ endpoint: string; cost: number; calls: number; tokens: number; providers: string[]; internal: boolean }>;
    byModel: Array<{ model: string; provider: string; cost: number; calls: number; tokens: number }>;
    topUsers: Array<{ userId: string; email: string | null; name: string | null; cost: number }>;
    systemCosts: Array<{ label: string; cost: number }>;
    timeseries: Array<{ date: string; cost: number }>;
  };
  mrrHealth: {
    newMrr: number; churnedMrr: number; quickRatio: number | null;
    newInRange: { monthly: number; yearly: number; count: number };
    churnedInRange: { monthly: number; yearly: number; count: number };
    mrrTrend: Array<{ week: string; amount: number }>;
  };
  engagement: {
    dau: number; wau: number; mau: number; stickinessPct: number | null; avgDau30: number;
    dauTimeseries: Array<{ date: string; dau: number }>;
    liveVoice: { calls: number; minutes: number; users: number; byCharacter: Array<{ character: string; calls: number; minutes: number }> };
  };
  activationFunnel: Array<{ stage: string; label: string; count: number; eligibleDenominator?: number }>;
  placement: { done: number; of: number };
  streakDistribution: Array<{ bucket: string; count: number }>;
  retentionCohorts: Array<{
    cohort: string; size: number;
    survival: { w1: number | null; w2: number | null; w3: number | null; w4: number | null; w6: number | null; w8: number | null };
  }>;
  timeToFirstValue: {
    sampleSize: number; cohortSize: number; medianHours: number | null; p90Hours: number | null;
    distribution: Array<{ bucket: string; count: number }>;
  };
  practiceHeatmap: number[][];
  previousPeriod: { range: { from: string; to: string }; newUsers: number; mau: number; totalCost: number; costPerActive: number };
  alerts: Array<{ severity: 'warn' | 'critical'; message: string }>;
  filters: { level: string | null; plan: string | null };
}

type Preset = '7d' | '30d' | '90d';
type Tab = 'overview' | 'conversion' | 'engagement' | 'retention' | 'costs';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN   = (v: number) => v.toLocaleString('pt-BR');
const fmtUSD = (v: number): string => {
  if (v === 0) return 'US$ 0.00';
  const abs = Math.abs(v);
  if (abs >= 0.10)  return `US$ ${v.toFixed(2)}`;
  if (abs >= 0.001) return `US$ ${v.toFixed(4)}`;
  return `US$ ${v.toFixed(6)}`;
};
const fmtPct = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`;
const fmtHrs = (h: number | null) => h == null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(1)}h`;
const pctDelta = (curr: number, prev: number): number | null => prev ? ((curr - prev) / prev) * 100 : null;
const ofN = (a: number, b: number) => `${fmtN(a)} de ${fmtN(b)}`;
const PLAT_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android', web: 'Sem app' };

// ── Animated counter ─────────────────────────────────────────────────────────
function useCount(target: number | null) {
  const [v, setV] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target == null) { setV(0); return; }
    cancelAnimationFrame(raf.current);
    const dur = 800; const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return v;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
let _uid = 0;
function Sparkline({ data, color = 'var(--accent)', h = 28, w = 80 }: {
  data: number[]; color?: string; h?: number; w?: number;
}) {
  const id = useRef(`sp${++_uid}`).current;
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1); const min = Math.min(...data, 0);
  const range = max - min || 1; const pad = h * 0.08;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fill = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── AreaChart (responsive via viewBox) ───────────────────────────────────────
function AreaChart({ data, xKey, yKey, color = 'var(--accent)', h = 150, fmt }: {
  data: Record<string, any>[]; xKey: string; yKey: string;
  color?: string; h?: number; fmt?: (v: number) => string;
}) {
  const id  = useRef(`ac${++_uid}`).current;
  const [hi, setHi] = useState<number | null>(null);
  if (!data.length) return <div className="adm-empty" style={{ height: h }}><div className="adm-empty-title">Sem dados</div></div>;

  const W = 600;
  const pd = { t: 12, b: 26, l: 52, r: 10 };
  const vals = data.map(d => Number(d[yKey]) || 0);
  const max  = Math.max(...vals, 0.000001);
  const pw   = W - pd.l - pd.r;
  const ph   = h - pd.t - pd.b;
  const fmtY = fmt ?? fmtUSD;

  const pts = vals.map((v, i) => ({
    x:   pd.l + (i / Math.max(vals.length - 1, 1)) * pw,
    y:   pd.t + (1 - v / max) * ph,
    raw: v,
    lbl: String(data[i][xKey]).slice(5), // "MM-DD"
    date: String(data[i][xKey]),
  }));

  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L ${pts.at(-1)!.x.toFixed(1)},${(pd.t + ph).toFixed(1)} L ${pd.l},${(pd.t + ph).toFixed(1)} Z`;

  // X labels — até 8, distribuídos uniformemente, sempre mostra primeiro e último
  const step = Math.max(1, Math.ceil(pts.length / 7));
  const xIdxs = [...new Set([0, ...pts.map((_, i) => i).filter(i => i % step === 0), pts.length - 1])];

  // Y grid — 3 linhas em 0%, 50%, 100%
  const yLines = [1, 0.5, 0].map(f => ({ y: pd.t + (1 - f) * ph, val: max * f }));

  // Tooltip
  const hov = hi !== null ? pts[hi] : null;
  const tipW = 110;
  const tipX = hov ? (hov.x + tipW + 8 > W - pd.r ? hov.x - tipW - 8 : hov.x + 8) : 0;
  const tipY = hov ? Math.max(pd.t, hov.y - 14) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', height: h, display: 'block', cursor: 'crosshair' }}
      onMouseLeave={() => setHi(null)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yLines.map(({ y, val }) => (
        <g key={y}>
          <line x1={pd.l} x2={W - pd.r} y1={y} y2={y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3" />
          <text x={pd.l - 5} y={y + 3.5} textAnchor="end"
            fill="rgba(255,255,255,0.28)" fontSize="9.5" fontFamily="var(--font-mono)">
            {fmtY(val)}
          </text>
        </g>
      ))}

      {/* Y axis baseline */}
      <line x1={pd.l} x2={pd.l} y1={pd.t} y2={pd.t + ph}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Area + line */}
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* X labels */}
      {xIdxs.map(i => (
        <text key={i} x={pts[i].x} y={h - 6} textAnchor="middle"
          fill="rgba(255,255,255,0.32)" fontSize="9.5" fontFamily="var(--font-mono)">
          {pts[i].lbl}
        </text>
      ))}

      {/* Hover crosshair + dot */}
      {hov && (
        <g>
          <line x1={hov.x} x2={hov.x} y1={pd.t} y2={pd.t + ph}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={hov.x} cy={hov.y} r={4} fill={color} stroke="var(--bg-card,#1a1a26)" strokeWidth="2" />
          <rect x={tipX} y={tipY} width={tipW} height={22} rx="5"
            fill="rgba(20,20,30,0.92)" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          <text x={tipX + tipW / 2} y={tipY + 14} textAnchor="middle"
            fill="rgba(255,255,255,0.80)" fontSize="10" fontFamily="var(--font-mono)">
            {hov.lbl}  {fmtY(hov.raw)}
          </text>
        </g>
      )}

      {/* Invisible hit rects */}
      {pts.map((p, i) => {
        const slotW = pw / Math.max(pts.length - 1, 1);
        return (
          <rect key={i} x={p.x - slotW / 2} y={pd.t} width={slotW} height={ph}
            fill="transparent" onMouseEnter={() => setHi(i)} />
        );
      })}
    </svg>
  );
}

// ── BarChart (vertical) ───────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = 'var(--accent)' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string;
}) {
  if (!data.length) return <div className="adm-empty"><div className="adm-empty-title">Sem dados</div></div>;
  const vals = data.map(d => Number(d[valueKey]) || 0);
  const max = Math.max(...vals, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, paddingBottom: 18, position: 'relative' }}>
      {data.map((d, i) => {
        const barH = (vals[i] / max) * 76;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }}>
            {vals[i] > 0 && <div style={{ fontSize: 8.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{fmtN(vals[i])}</div>}
            <div style={{ width: '100%', height: barH, borderRadius: '3px 3px 0 0', background: color, opacity: 0.7 }} />
            <div style={{ fontSize: 8.5, color: 'var(--t3)', position: 'absolute', bottom: 0, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {String(d[labelKey]).slice(0, 6)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── FunnelBars ────────────────────────────────────────────────────────────────
function FunnelBars({ data }: { data: Array<{ label: string; count: number; eligibleDenominator?: number }> }) {
  if (!data.length) return <div className="adm-empty"><div className="adm-empty-title">Sem dados</div></div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        // Queda em relação à etapa anterior (nunca negativa). Na etapa com base própria, mostra "x de y elegíveis".
        const drop = d.eligibleDenominator == null && i > 0 && data[i - 1].count ? Math.max(0, (1 - d.count / data[i - 1].count) * 100) : null;
        const opacity = 0.3 + (1 - i / Math.max(data.length - 1, 1)) * 0.6;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 150, fontSize: 11.5, color: 'var(--t2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
            <div style={{ flex: 1, height: 20, background: 'var(--s3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `rgba(99,102,241,${opacity})`, borderRadius: 4, transition: 'width 600ms ease' }} />
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t1)', width: 52, textAlign: 'right', flexShrink: 0 }}>{fmtN(d.count)}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: d.eligibleDenominator != null ? 'var(--t3)' : 'var(--err)', width: 96, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {d.eligibleDenominator != null ? `${ofN(d.count, d.eligibleDenominator)} elegíveis` : drop != null ? `-${drop.toFixed(0)}%` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── HeatmapGrid ───────────────────────────────────────────────────────────────
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function HeatmapGrid({ data }: { data: number[][] }) {
  if (!data?.length) return <div className="adm-empty" style={{ height: 110 }}><div className="adm-empty-title">Sem dados</div></div>;
  const max = Math.max(...data.flat(), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, minWidth: 560, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 16 }}>
          {DAYS_PT.map(d => (
            <div key={d} style={{ height: 13, fontSize: 9, color: 'var(--t3)', width: 24, textAlign: 'right', lineHeight: '13px', fontFamily: 'var(--font-mono)' }}>{d}</div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ flex: 1, fontSize: 7.5, color: 'var(--t3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h % 6 === 0 ? `${h}h` : ''}</div>
            ))}
          </div>
          {data.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
              {row.map((v, ci) => {
                const intensity = v / max;
                return (
                  <div key={ci} title={`${DAYS_PT[ri]} ${ci}h: ${v} ${v === 1 ? 'atividade' : 'atividades'}`}
                    style={{ flex: 1, height: 13, borderRadius: 2, background: intensity > 0 ? `rgba(163,255,60,${0.08 + intensity * 0.82})` : 'var(--s3)', cursor: 'default' }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9.5, color: 'var(--t3)' }}>Menos</span>
        {[0.05, 0.22, 0.44, 0.66, 0.9].map(o => <div key={o} style={{ width: 11, height: 11, borderRadius: 2, background: `rgba(163,255,60,${o})` }} />)}
        <span style={{ fontSize: 9.5, color: 'var(--t3)' }}>Mais</span>
      </div>
    </div>
  );
}

// ── RetentionCohortTable ──────────────────────────────────────────────────────
function CohortTable({ rows }: { rows: MetricsResponse['retentionCohorts'] }) {
  if (!rows.length) return <div className="adm-empty"><div className="adm-empty-title">Sem dados de coorte</div></div>;
  const ALL_WKS: { k: keyof MetricsResponse['retentionCohorts'][0]['survival']; lbl: string }[] = [
    { k: 'w1', lbl: '1 sem' }, { k: 'w2', lbl: '2 sem' }, { k: 'w3', lbl: '3 sem' },
    { k: 'w4', lbl: '4 sem' }, { k: 'w6', lbl: '6 sem' }, { k: 'w8', lbl: '8 sem' },
  ];
  // Coluna sem nenhum dado (nenhuma turma tem idade para ela ainda) não aparece.
  const wks = ALL_WKS.filter(w => rows.some(r => r.survival[w.k] != null));
  const cell = (v: number | null) => {
    if (v == null) return { lbl: '—', bg: 'transparent', col: 'var(--t3)' };
    const i = v / 100;
    return {
      lbl: `${v.toFixed(0)}%`,
      bg:  v >= 60 ? `rgba(16,185,129,${0.1 + i * 0.4})` : v >= 30 ? `rgba(245,158,11,${0.08 + i * 0.35})` : v > 0 ? `rgba(239,68,68,${0.08 + i * 0.35})` : 'var(--s3)',
      col: v >= 60 ? 'var(--ok)' : v >= 30 ? 'var(--warn)' : v > 0 ? 'var(--err)' : 'var(--t3)',
    };
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="adm-table" style={{ minWidth: 480 }}>
        <thead>
          <tr>
            <th>Semana</th><th>Alunos</th>
            {wks.map(w => <th key={w.k} style={{ textAlign: 'center' }}>{w.lbl}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map(r => (
            <tr key={r.cohort}>
              <td><span className="num">{r.cohort}</span></td>
              <td><span className="num">{fmtN(r.size)}</span></td>
              {wks.map((w, j) => {
                const c = cell(r.survival[w.k]);
                return (
                  <td key={j} style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: c.bg, color: c.col, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{c.lbl}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct > 2; const dn = pct < -2;
  const cls = up ? 'delta-up' : dn ? 'delta-down' : 'delta-flat';
  const Icon = up ? ChevronUp : dn ? ChevronDown : Minus;
  return <span className={`delta ${cls}`}><Icon size={10} strokeWidth={3} />{Math.abs(pct).toFixed(1)}%</span>;
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, display, dlt, ctx, spark, sparkColor, accent, delay = 0, tip }: {
  label: string; value?: number | null; display?: string;
  dlt?: number | null; ctx?: string; spark?: number[]; sparkColor?: string; accent?: string; delay?: number; tip?: string;
}) {
  const counted = useCount(value ?? null);
  const shown = display ?? (value != null ? fmtN(counted) : '—');
  return (
    <div className="kpi-card fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}{tip && <HelpTip text={tip} />}
      </div>
      <div className="kpi-value" style={accent ? { color: accent } : {}}>{shown}</div>
      <div className="kpi-footer">
        {dlt !== undefined && <Delta pct={dlt} />}
        {ctx && <span className="kpi-context">{ctx}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <Sparkline data={spark} color={sparkColor ?? accent ?? 'var(--accent)'} w={110} h={28} />
        </div>
      )}
    </div>
  );
}

// ── HelpTip ───────────────────────────────────────────────────────────────────
function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.32)',
          fontSize: 9, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'help', userSelect: 'none',
        }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 7, padding: '8px 11px', fontSize: 11, lineHeight: 1.55,
          color: 'rgba(255,255,255,0.68)', zIndex: 200, pointerEvents: 'none',
          width: 240, whiteSpace: 'normal', textAlign: 'left',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>{text}</span>
      )}
    </span>
  );
}

// ── CostModal ─────────────────────────────────────────────────────────────────
interface CostBreakdown { endpoint: string; cost: number; calls: number; tokens: number; }
interface UserCostData  { totalCost: number; totalCalls: number; breakdown: CostBreakdown[]; byModel: { model: string; cost: number; calls: number }[] }

const ENDPOINT_LABELS: Record<string, string> = {
  '/api/assistant':                 'Conversa (chat)',
  '/api/tts':                       'Voz da Charlotte e personagens',
  '/api/tts-cached':                'Voz em cache (vocabulário)',
  '/api/pronunciation':             'Pronúncia',
  '/api/pronunciation-semantic':    'Pronúncia semântica',
  '/api/transcribe':                'Transcrição de áudio',
  '/api/roleplay/turn:tts':         'Role-play: voz',
  '/api/roleplay/turn:chat':        'Role-play: resposta',
  '/api/roleplay/turn:whisper':     'Role-play: transcrição',
  '/api/roleplay/turn#judge':       'Role-play: correção',
  '/api/guided-chat/turn':          'Conversa guiada: resposta',
  '/api/guided-chat/turn#judge':    'Conversa guiada: correção',
  '/api/trail/feedback':            'Trilha: feedback',
  '/api/exercise-help':             'Ajuda no exercício',
  'support-agent':                  'Suporte (IA)',
  'instagram-comments':             'Instagram: comentários',
  '/api/greeting':                  'Saudação inicial',
  '/api/enrich-term':               'Enriquecimento de termo',
  '/api/notifications/scheduler':   'Agendador de notificações',
  '/api/chat':                      'Conversa (chat)',
};
const endpointLabel = (e: string) => ENDPOINT_LABELS[e] ?? e;

function CostModal({ userId, userName, userEmail, rangeFrom, rangeTo, days, onClose }: {
  userId: string; userName: string | null; userEmail: string | null;
  rangeFrom: string; rangeTo: string; days: number; onClose: () => void;
}) {
  const [costData, setCostData] = useState<UserCostData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');

  useEffect(() => {
    const secret = sessionStorage.getItem('adminSecret') ?? '';
    // Usa o from/to exato dos dados carregados na página para garantir consistência
    const params = new URLSearchParams({ userId, from: rangeFrom, to: rangeTo });
    fetch(`/api/admin/user-cost?${params}`, {
      headers: { 'x-admin-secret': secret },
    })
      .then(r => r.json())
      .then(d => { setCostData(d); setLoading(false); })
      .catch(e => { setErr(String(e)); setLoading(false); });
  }, [userId, rangeFrom, rangeTo]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 12,
          width: 520, maxWidth: '92vw', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{userName ?? 'Usuário'}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{userEmail}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {costData && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Total ({days}d)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}>{fmtUSD(costData.totalCost)}</div>
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 20, lineHeight: 1, padding: 4 }}>
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 20px 20px' }}>
          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Carregando...</div>
          )}
          {err && (
            <div style={{ padding: 16, color: 'var(--err)', fontSize: 12 }}>{err}</div>
          )}
          {costData && !loading && (
            <>
              {/* Por endpoint */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8, marginTop: 4 }}>
                Por função
              </div>
              {costData.breakdown.length === 0 ? (
                <div style={{ color: 'var(--t3)', fontSize: 12, padding: '8px 0' }}>Nenhum custo no período.</div>
              ) : (
                <table className="adm-table" style={{ marginBottom: 20 }}>
                  <thead>
                    <tr>
                      <th>Função</th>
                      <th style={{ textAlign: 'right' }}>Chamadas</th>
                      <th style={{ textAlign: 'right' }}>Tokens</th>
                      <th style={{ textAlign: 'right' }}>Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData.breakdown.map(b => {
                      const pct = costData.totalCost > 0 ? (b.cost / costData.totalCost) * 100 : 0;
                      return (
                        <tr key={b.endpoint}>
                          <td>
                            <div style={{ fontSize: 12 }}>{endpointLabel(b.endpoint)}</div>
                            <div style={{ height: 3, borderRadius: 2, background: 'var(--b2)', marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--warn)', borderRadius: 2 }} />
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}><span className="num">{b.calls}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="num">{b.tokens > 0 ? fmtN(b.tokens) : '—'}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--warn)' }}>{fmtUSD(b.cost)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Por modelo */}
              {costData.byModel.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
                    Por modelo
                  </div>
                  <table className="adm-table">
                    <thead>
                      <tr><th>Modelo</th><th style={{ textAlign: 'right' }}>Chamadas</th><th style={{ textAlign: 'right' }}>Custo</th></tr>
                    </thead>
                    <tbody>
                      {costData.byModel.map(m => (
                        <tr key={m.model}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.model}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="num">{m.calls}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--t2)' }}>{fmtUSD(m.cost)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
function Skel({ h = 120 }: { h?: number }) {
  return (
    <div className="kpi-card" style={{ height: h }}>
      <div className="skeleton" style={{ height: 10, width: 60, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 30, width: 90, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 8, width: 80 }} />
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
const Sec = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10, marginTop: 6 }}>{children}</div>
);

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',   label: 'Visão geral' },
  { id: 'conversion', label: 'Conversão e origem' },
  { id: 'engagement', label: 'Engajamento' },
  { id: 'retention',  label: 'Retenção' },
  { id: 'costs',      label: 'Custos IA' },
];

// ════════════════════════════════════════════════════════════════════════════
export default function MetricsPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<Preset>('30d');
  const [levelFilter, setLevelFilter] = useState('');
  const [planFilter,  setPlanFilter]  = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string | null; email: string | null } | null>(null);

  const fetch_ = useCallback(async () => {
    const secret = sessionStorage.getItem('adminSecret') ?? '';
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ days: preset === '7d' ? '7' : preset === '30d' ? '30' : '90' });
      if (levelFilter) p.set('level', levelFilter);
      if (planFilter)  p.set('plan',  planFilter);
      const res = await fetch(`/api/admin/metrics?${p}`, { headers: { 'x-admin-secret': secret } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar métricas');
    } finally { setLoading(false); }
  }, [preset, levelFilter, planFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Keyboard tab navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input,select,textarea')) return;
      const i = TABS.findIndex(t => t.id === tab);
      if (e.key === 'ArrowRight') setTab(TABS[Math.min(i + 1, TABS.length - 1)].id);
      if (e.key === 'ArrowLeft')  setTab(TABS[Math.max(i - 1, 0)].id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [tab]);

  // URL hash sync
  useEffect(() => {
    const hash = window.location.hash.slice(1) as Tab;
    if (TABS.some(t => t.id === hash)) setTab(hash);
  }, []);
  useEffect(() => { window.history.replaceState(null, '', `#${tab}`); }, [tab]);

  const g = data; const prev = g?.previousPeriod;

  // ── Overview ────────────────────────────────────────────────────────────────
  const tabOverview = () => (
    <>
      <Sec>Receita</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-3"><KpiCard label="Receita mensal (MRR)" display={g ? fmtBRL(g.revenue.mrr) : '—'} ctx={g?.revenue.trialMrrPotential ? `+${fmtBRL(g.revenue.trialMrrPotential)} se os testes atuais pagarem` : 'receita mensal recorrente'} accent="var(--brand)" delay={0} tip="Receita mensal recorrente em reais: soma do valor mensal de quem já pagou e segue com a renovação ativa (anual ÷ 12; no site, o valor real da compra, com cupom). Quem cancelou (mesmo ainda com acesso) e quem está no teste grátis não entram. O valor extra do rodapé conta só os testes não cancelados." /></div>
        <div className="col-3"><KpiCard label="Receita anual (ARR)" display={g ? fmtBRL(g.revenue.arr) : '—'} ctx="receita mensal × 12" delay={60} tip="Projeção anual: receita mensal atual × 12." /></div>
        <div className="col-3">
          <KpiCard label="Receita no caixa" display={g ? fmtBRL(g.revenue.cash.netBrl) : '—'}
            ctx={g ? `${g.revenue.cash.charges} ${g.revenue.cash.charges === 1 ? 'cobrança' : 'cobranças'} · loja ${g.revenue.cash.storeCharges} · site ${g.revenue.cash.siteCharges}${g.revenue.cash.refunds ? ` · ${g.revenue.cash.refunds} ${g.revenue.cash.refunds === 1 ? 'reembolso' : 'reembolsos'} (${fmtBRL(g.revenue.cash.refundsBrl)})` : ''}` : undefined}
            accent="var(--ok)" delay={120}
            tip="Dinheiro que de fato entrou no período: soma do valor líquido (depois das taxas da loja e do Asaas) de cada cobrança feita no período. Reembolsos não são somados aqui; aparecem no rodapé." />
        </div>
        <div className="col-3"><KpiCard label="Assinantes pagantes" value={g?.revenue.activeSubs} ctx={g ? `${g.revenue.monthlySubs} mensais · ${g.revenue.yearlySubs} anuais · loja ${g.revenue.subs.paidStore} · site ${g.revenue.subs.paidSite}` : undefined} delay={180} tip="Quem já foi cobrado e segue com a renovação ativa. Quem cancelou e ainda tem acesso aparece em Cancelaram, ainda com acesso; quem está nos 7 dias grátis, em Em teste grátis." /></div>
        <div className="col-3"><KpiCard label="Em teste grátis" value={g?.revenue.onTrial} ctx={g ? `loja ${g.revenue.subs.trialStore} · site ${g.revenue.subs.trialSite}${g.revenue.subs.trialLegacy ? ` · teste antigo ${g.revenue.subs.trialLegacy}` : ''}` : undefined} delay={240} tip="Loja e site: 7 dias grátis com cartão (a cobrança vem no fim), sem quem já cancelou. O teste antigo (sem cartão, termina até 02/11/2026) some daqui quando o último vencer." /></div>
        <div className="col-3">
          <KpiCard label="Cancelaram, ainda com acesso" value={g?.revenue.subs.cancelledWithAccess}
            ctx={g ? `${g.revenue.subs.cancelledPaid} já pagaram · ${g.revenue.subs.cancelledTrial} no teste` : undefined} delay={300}
            accent={g && g.revenue.subs.cancelledWithAccess > 0 ? 'var(--warn)' : undefined}
            tip="Cancelaram a renovação, mas o acesso só termina no fim do ciclo pago ou do teste. Não entram na receita mensal nem em Em teste grátis." />
        </div>
        <div className="col-3">
          <KpiCard label="Cancelamentos no período" display={fmtPct(g?.revenue.churnPct ?? null)}
            ctx={g ? (g.revenue.churn.base ? `${ofN(g.revenue.churn.lost, g.revenue.churn.base)} pagantes do início do período` : 'nenhum pagante no início do período') : undefined} delay={360}
            accent={g?.revenue.churnPct != null && g.revenue.churnPct > 5 ? 'var(--err)' : undefined}
            tip="Pagantes que perderam o acesso no período ÷ pagantes que já tinham pago antes do início do período e ainda tinham acesso nele. Cancelar no teste grátis não entra. Saudável: abaixo de 5% ao mês; alerta acima de 10%." />
        </div>
        <div className="col-3">
          <KpiCard label="Conversão do teste" display={fmtPct(g?.revenue.trialConversionPct ?? null)}
            ctx={g ? (g.revenue.trialConversion.total ? `${ofN(g.revenue.trialConversion.converted, g.revenue.trialConversion.total)} testes encerrados` : 'nenhum teste encerrado ainda') : undefined} delay={420}
            accent={g?.revenue.trialConversionPct != null && g.revenue.trialConversionPct > 15 ? 'var(--ok)' : undefined}
            tip="Só o teste com cartão (loja e site): quem teve o teste e depois foi cobrado (mesmo que tenha cancelado depois) ÷ (esses + testes que terminaram sem cobrança). Quem ainda está no teste não entra, nem compra direta no Pix, nem o teste antigo sem cartão." />
        </div>
        <div className="col-3"><KpiCard label="Cobranças em 7 dias" value={g?.revenue.renewals7d} ctx={g ? `1ª cobrança do teste ${g.revenue.charges7d.firstCharge} · renovação ${g.revenue.charges7d.renewal}` : undefined} delay={480} tip="Assinaturas ativas (loja e site, sem as canceladas) com cobrança nos próximos 7 dias: a 1ª cobrança de quem está no teste grátis e a renovação de quem já paga." /></div>
        <div className="col-3">
          <KpiCard label="Pagantes sem estudar há 14 dias" value={g?.revenue.inactivePaying}
            ctx={g ? `de ${fmtN(g.revenue.activeSubs)} pagantes` : undefined} delay={540}
            accent={g && g.revenue.inactivePaying > 0 ? 'var(--warn)' : undefined}
            tip="Pagantes com renovação ativa que não fizeram nenhuma atividade nos últimos 14 dias: risco de cancelar." />
        </div>
        <div className="col-3">
          <KpiCard label="Em degustação" value={g?.taste.total}
            ctx={g ? `1º dia ${g.taste.day1} · ${g.taste.tasteDays}º dia ${g.taste.lastDay} · já esgotaram ${g.taste.exhausted}` : undefined} delay={600}
            tip={`Contas sem assinatura nem teste (fora as da equipe). A degustação libera um pouco por dia durante ${g?.taste.tasteDays ?? 5} dias, contados no calendário de Brasília a partir do dia do cadastro (dia 1). Já esgotaram = passaram do último dia sem começar o teste.`} />
        </div>
        <div className="col-3">
          <KpiCard label="Total de contas" value={g?.revenue.totalUsers}
            ctx={g ? `+${g.revenue.newUsers} no período` : undefined} delay={660}
            tip="Contas cadastradas, sem as da equipe. Os novos no período são os mesmos do Cadastro do funil de ativação." />
        </div>
      </div>

      {g?.appVersions && (
        <>
          <Sec>{`Versão do app (atual: ${g.appVersions.latestVersion || '—'})`}</Sec>
          <div className="adm-grid" style={{ marginBottom: 20 }}>
            <div className="col-4">
              <KpiCard label="Na versão atual" value={g.appVersions.onLatest}
                display={`${g.appVersions.onLatest} · ${g.appVersions.onLatestPct.toFixed(0)}%`}
                ctx={`iOS ${g.appVersions.byPlatform.ios} · Android ${g.appVersions.byPlatform.android}`}
                accent={g.appVersions.onLatestPct >= 50 ? 'var(--ok)' : undefined} delay={0}
                tip="Quem abriu o app nos últimos 30 dias e está na versão atual da loja (a mesma do aviso de atualização). A porcentagem é sobre quem abriu o app em 30 dias." />
            </div>
            <div className="col-4">
              <KpiCard label="A atualizar" value={g.appVersions.outdated}
                ctx={(g.appVersions.byVersion ?? []).filter(v => v.version !== g.appVersions.latestVersion).slice(0, 3).map(v => `${v.version}: ${v.count}`).join(' · ') || 'numa versão anterior'} delay={80}
                accent={g.appVersions.outdated > 0 ? 'var(--warn)' : undefined}
                tip="Abriram o app nos últimos 30 dias numa versão anterior da loja. Recebem o aviso 'Tem versão nova' na tela inicial. O rodapé mostra as versões antigas mais usadas." />
            </div>
            <div className="col-4">
              <KpiCard label="Abriram o app em 30 dias" value={g.appVersions.opened30d}
                ctx={`de ${fmtN(g.appVersions.total)} contas`} delay={160}
                tip="Contas que abriram o app nos últimos 30 dias, mesmo sem fazer atividade (é diferente de Ativos no mês, que exige atividade). É a base das porcentagens desta seção." />
            </div>
          </div>
        </>
      )}

      {g?.mrrHealth && (
        <>
          <Sec>Saúde da receita</Sec>
          <div className="adm-grid" style={{ marginBottom: 20 }}>
            <div className="col-4">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Receita nova ÷ perdida <HelpTip text="Receita mensal dos novos pagantes do período (pela data da 1ª cobrança) ÷ receita mensal de quem já pagou e perdeu o acesso no período. 4 ou mais = crescimento saudável; abaixo de 1 = receita encolhendo." /></span>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: g.mrrHealth.quickRatio == null || g.mrrHealth.quickRatio >= 4 ? 'var(--ok)' : g.mrrHealth.quickRatio >= 1 ? 'var(--warn)' : 'var(--err)' }}>
                    {g.mrrHealth.quickRatio == null ? 'sem perda' : g.mrrHealth.quickRatio.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Receita nova · {g.mrrHealth.newInRange.count} {g.mrrHealth.newInRange.count === 1 ? 'pagante' : 'pagantes'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ok)', fontWeight: 700 }}>+{fmtBRL(g.mrrHealth.newMrr)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Receita perdida · {g.mrrHealth.churnedInRange.count} {g.mrrHealth.churnedInRange.count === 1 ? 'pagante' : 'pagantes'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--err)', fontWeight: 700 }}>-{fmtBRL(g.mrrHealth.churnedMrr)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--b1)' }} />
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>4 ou mais = crescimento saudável</div>
                </div>
              </div>
            </div>
            <div className="col-8">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Receita nova por semana <HelpTip text="Receita mensal dos novos pagantes, pela semana da 1ª cobrança (segunda a domingo, horário de Brasília). Reembolsos não entram." /></span>
                  <span className="adm-panel-sub">{g.mrrHealth.mrrTrend.length} semanas</span>
                </div>
                <div className="adm-panel-body">
                  <AreaChart data={g.mrrHealth.mrrTrend} xKey="week" yKey="amount" color="var(--brand)" h={110} fmt={fmtBRL} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  // ── Conversão e origem ──────────────────────────────────────────────────────
  const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  const NumPct = ({ v, of }: { v: number; of?: number }) => (
    <span className="num">{fmtN(v)}{of != null && of > 0 && <span style={{ color: 'var(--t3)', marginLeft: 6, fontSize: 10.5 }}>{pctOf(v, of)}</span>}</span>
  );
  const SiteGroupTable = ({ title, rows }: { title: string; rows: MetricsResponse['acquisition']['site']['byChannel'] }) => (
    <table className="adm-table" style={{ marginBottom: 12 }}>
      <thead><tr><th>{title}</th><th style={{ textAlign: 'right' }}>Abriram o checkout</th><th style={{ textAlign: 'right' }}>Concluíram</th><th style={{ textAlign: 'right' }}>Pagaram</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.key}>
            <td><span style={{ fontSize: 12 }}>{r.label}</span></td>
            <td style={{ textAlign: 'right' }}><NumPct v={r.checkouts} /></td>
            <td style={{ textAlign: 'right' }}><NumPct v={r.completed} of={r.checkouts} /></td>
            <td style={{ textAlign: 'right' }}><NumPct v={r.paid} of={r.checkouts} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const tabConversion = () => {
    if (!g) return null;
    const tf = g.tasteFunnel; const acq = g.acquisition;
    return (
      <>
        <Sec>Degustação → teste → pago</Sec>
        <div className="adm-grid" style={{ marginBottom: 20 }}>
          <div className="col-12">
            <div className="adm-panel">
              <div className="adm-panel-hdr">
                <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Oferta no app (loja) <HelpTip text="Contas únicas com cada evento no período. Viram a oferta = abriu o paywall; Tocaram em assinar = tocou no botão; Começaram o teste = a loja confirmou a compra (7 dias grátis); Pagaram = desses, quantos já tiveram cobrança. A loja só cobra no fim do teste, então quem começou nos últimos 7 dias ainda não teve chance." /></span>
                <span className="adm-panel-sub">{`cadastros no período: ${fmtN(tf.signups.total)} · iOS ${tf.signups.ios} · Android ${tf.signups.android}${tf.signups.unknown ? ` · sem app ${tf.signups.unknown}` : ''}`}</span>
              </div>
              <table className="adm-table">
                <thead><tr><th>Plataforma</th><th style={{ textAlign: 'right' }}>Viram a oferta</th><th style={{ textAlign: 'right' }}>Tocaram em assinar</th><th style={{ textAlign: 'right' }}>Começaram o teste</th><th style={{ textAlign: 'right' }}>Pagaram</th></tr></thead>
                <tbody>
                  {tf.store.map(r => (
                    <tr key={r.platform}>
                      <td>{PLAT_LABEL[r.platform]}</td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.tapped} of={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.started} of={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.paid} of={r.started} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr">
                <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Compras no site <HelpTip text="Checkouts do site abertos no período (contas únicas), pela plataforma do app em que a conta entrou depois. Começaram o teste = cartão aceito com 7 dias grátis; Compra direta = sem teste (ex.: Pix anual); Pagaram = já houve cobrança." /></span>
              </div>
              <table className="adm-table">
                <thead><tr><th>App</th><th style={{ textAlign: 'right' }}>Checkout</th><th style={{ textAlign: 'right' }}>Teste</th><th style={{ textAlign: 'right' }}>Direta</th><th style={{ textAlign: 'right' }}>Pagaram</th></tr></thead>
                <tbody>
                  {tf.site.map(r => (
                    <tr key={r.platform}>
                      <td>{PLAT_LABEL[r.platform]}</td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.checkouts} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.started} of={r.checkouts} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.direct} of={r.checkouts} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.paid} of={r.checkouts} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr">
                <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Onde a oferta apareceu <HelpTip text="Motivo que abriu o paywall no app (contas únicas no período) e quantas começaram o teste a partir dele." /></span>
              </div>
              <table className="adm-table">
                <thead><tr><th>Motivo</th><th style={{ textAlign: 'right' }}>Viram</th><th style={{ textAlign: 'right' }}>Teste</th><th style={{ textAlign: 'right' }}>Pagaram</th></tr></thead>
                <tbody>
                  {tf.byReason.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--t3)' }}>Sem dados no período</td></tr>}
                  {tf.byReason.map(r => (
                    <tr key={r.reason}>
                      <td><span style={{ fontSize: 12 }}>{r.label}</span></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.started} of={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.paid} of={r.started} /></td>
                    </tr>
                  ))}
                  {tf.byKind.map(r => (
                    <tr key={`k-${r.kind}`}>
                      <td><span style={{ fontSize: 12, color: 'var(--t2)' }}>{r.label}</span></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.shown} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.started} of={r.shown} /></td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Sec>Origem das contas</Sec>
        <div className="adm-grid" style={{ marginBottom: 20 }}>
          <div className="col-4">
            <KpiCard label="Responderam de onde vieram" display={acq.responseRatePct == null ? '—' : `${acq.responseRatePct}%`}
              ctx={acq.since ? `${ofN(acq.answered, acq.base)} contas desde ${new Date(acq.since).toLocaleDateString('pt-BR')} · ${acq.skipped} pularam` : 'pergunta ainda sem respostas'} delay={0}
              tip="Pergunta 'Como você conheceu a Queizy?' do cadastro. Taxa = respostas (sem quem pulou) ÷ contas criadas desde a 1ª resposta. Vale para todas as contas, não só o período." />
          </div>
          <div className="col-4">
            <KpiCard label="Visitas ao site por anúncio" value={acq.site.visits ?? null} ctx="com campanha marcada, no período" delay={60}
              tip="Visitas ao site com utm_campaign no período (lado site do teste A/B de anúncios)." />
          </div>
          <div className="col-4">
            <KpiCard label="Cliques para as lojas" value={acq.site.clicks ?? null} ctx="link /baixar, no período" delay={120}
              tip="Cliques no link /baixar das campanhas, que leva para a App Store ou a Play Store (lado loja do teste A/B de anúncios)." />
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr">
                <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Por resposta no cadastro <HelpTip text="Contas de cada origem (todas, não só o período), quantas já começaram um teste (loja, site ou teste antigo) e quantas já pagaram." /></span>
              </div>
              <table className="adm-table">
                <thead><tr><th>Origem</th><th style={{ textAlign: 'right' }}>Contas</th><th style={{ textAlign: 'right' }}>Teste</th><th style={{ textAlign: 'right' }}>Pagaram</th></tr></thead>
                <tbody>
                  {acq.bySource.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--t3)' }}>Sem respostas ainda</td></tr>}
                  {acq.bySource.map(r => (
                    <tr key={r.source}>
                      <td><span style={{ fontSize: 12, color: r.source === 'skipped' ? 'var(--t3)' : undefined }}>{r.label}</span></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.accounts} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.trial} of={r.accounts} /></td>
                      <td style={{ textAlign: 'right' }}><NumPct v={r.paid} of={r.accounts} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr">
                <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Vendas do site <HelpTip text="Checkouts do site abertos no período (contas únicas), por canal, afiliado e cupom. Concluíram = cartão aceito ou Pix pago; Pagaram = já houve cobrança." /></span>
              </div>
              <div className="adm-panel-body">
                {acq.site.byChannel.length === 0
                  ? <div className="adm-empty"><div className="adm-empty-title">Sem checkouts no período</div></div>
                  : <SiteGroupTable title="Canal" rows={acq.site.byChannel} />}
                {acq.site.byAffiliate.length > 0 && <SiteGroupTable title="Afiliado" rows={acq.site.byAffiliate} />}
                {acq.site.byCoupon.length > 0 && <SiteGroupTable title="Cupom" rows={acq.site.byCoupon} />}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Engagement ──────────────────────────────────────────────────────────────
  const tabEngagement = () => (
    <>
      <Sec>Atividade</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-3">
          <KpiCard label="Ativos hoje" value={g?.engagement.dau}
            spark={g?.engagement.dauTimeseries.map(d => d.dau)} sparkColor="var(--accent)"
            ctx="desde 00h de Brasília" accent="var(--accent)" delay={0}
            tip="Alunos com pelo menos uma atividade (trilha, conversa, vocabulário…) hoje, no calendário de Brasília. Resgate de recompensa não conta." />
        </div>
        <div className="col-3"><KpiCard label="Ativos na semana" value={g?.engagement.wau} ctx="últimos 7 dias, contando hoje" delay={60} tip="Alunos com alguma atividade nos últimos 7 dias do calendário de Brasília, contando hoje." /></div>
        <div className="col-3">
          <KpiCard label="Ativos no mês" value={g?.engagement.mau}
            dlt={prev && g ? pctDelta(g.engagement.mau, prev.mau) : undefined}
            ctx="últimos 30 dias · vs 30 dias antes" delay={120}
            tip="Alunos com alguma atividade nos últimos 30 dias do calendário de Brasília, contando hoje. A variação compara com os 30 dias anteriores a esses." />
        </div>
        <div className="col-3">
          <KpiCard label="Hábito diário" display={fmtPct(g?.engagement.stickinessPct ?? null)} ctx={g ? `média de ${g.engagement.avgDau30.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia ÷ ativos no mês` : 'ativos no dia ÷ ativos no mês'} delay={180}
            accent={g?.engagement.stickinessPct != null && g.engagement.stickinessPct > 20 ? 'var(--ok)' : undefined}
            tip="Média de ativos por dia ÷ ativos no mês, nos últimos 30 dias completos (sem hoje). Apps de educação saudáveis ficam acima de 20%." />
        </div>
      </div>

      {g && (
        <>
          <Sec>Live Voice no período</Sec>
          <div className="adm-grid" style={{ marginBottom: 20 }}>
            <div className="col-4">
              <KpiCard label="Minutos de Live Voice" display={fmtN(Math.round(g.engagement.liveVoice.minutes))}
                ctx={g.engagement.liveVoice.byCharacter.slice(0, 3).map(c => `${c.character}: ${fmtN(Math.round(c.minutes))} min`).join(' · ') || 'nenhuma ligação'} accent="var(--brand)" delay={0}
                tip="Soma da duração das ligações de voz (Charlotte e Família Queizy) começadas no período." />
            </div>
            <div className="col-4"><KpiCard label="Ligações" value={g.engagement.liveVoice.calls} ctx={g.engagement.liveVoice.calls ? `${(g.engagement.liveVoice.minutes / g.engagement.liveVoice.calls).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} min em média` : undefined} delay={60} /></div>
            <div className="col-4"><KpiCard label="Alunos que ligaram" value={g.engagement.liveVoice.users} ctx="contas únicas no período" delay={120} /></div>
          </div>

          <div className="adm-panel" style={{ marginBottom: 16 }}>
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Ativos por dia</span>
              <span className="adm-panel-sub">{`${g.engagement.dauTimeseries.length} dias · período selecionado`}</span>
            </div>
            <div className="adm-panel-body">
              <AreaChart data={g.engagement.dauTimeseries} xKey="date" yKey="dau" h={130} fmt={v => fmtN(Math.round(v))} />
            </div>
          </div>

          <div className="adm-grid" style={{ marginBottom: 16 }}>
            <div className="col-6">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Funil de ativação <HelpTip text="Contas criadas no período. A porcentagem em vermelho é a queda em relação à etapa anterior. Ainda ativos após 30 dias conta só quem já tem 30 dias de conta (os elegíveis)." /></span>
                  <span className="adm-panel-sub">contas criadas no período</span>
                </div>
                <div className="adm-panel-body">
                  <FunnelBars data={g.activationFunnel} />
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 12 }}>
                    {`Fizeram o teste de nível: ${ofN(g.placement.done, g.placement.of)} cadastros${g.placement.of ? ` (${pctOf(g.placement.done, g.placement.of)})` : ''}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Tempo até a 1ª atividade <HelpTip text="Entre as contas criadas no período que já fizeram alguma atividade: quanto tempo depois do cadastro veio a 1ª. Mediana ideal: abaixo de 1 hora." /></span>
                  <span className="adm-panel-sub">{`${ofN(g.timeToFirstValue.sampleSize, g.timeToFirstValue.cohortSize)} contas do período`}</span>
                </div>
                <div className="adm-panel-body">
                  <div style={{ display: 'flex', gap: 28, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Mediana</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ok)' }}>{fmtHrs(g.timeToFirstValue.medianHours)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>9 em cada 10</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--warn)' }}>{fmtHrs(g.timeToFirstValue.p90Hours)}</div>
                    </div>
                  </div>
                  <BarChart data={g.timeToFirstValue.distribution} labelKey="bucket" valueKey="count" color="var(--accent)" />
                </div>
              </div>
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Horários de estudo</span>
              <span className="adm-panel-sub">atividades do período · dia × hora de Brasília</span>
            </div>
            <div className="adm-panel-body">
              <HeatmapGrid data={g.practiceHeatmap} />
            </div>
          </div>
        </>
      )}
    </>
  );

  // ── Retention ───────────────────────────────────────────────────────────────
  const retCtx = (k: 'd1' | 'd7' | 'd30', base: string) => {
    const n = g?.retention.n?.[k];
    return n && n.eligible ? `${ofN(n.retained, n.eligible)} · ${base}` : base;
  };
  const tabRetention = () => (
    <>
      <Sec>Retenção por dia</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-4">
          <KpiCard label="Retenção D1" display={fmtPct(g?.retention.d1 ?? null)} ctx={retCtx('d1', 'voltou no dia seguinte')} delay={0}
            accent={g?.retention.d1 != null ? (g.retention.d1 > 40 ? 'var(--ok)' : g.retention.d1 > 20 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="Entre quem se cadastrou nos últimos 60 dias e já completou o dia seguinte ao cadastro: quantos fizeram alguma atividade no dia seguinte (calendário de Brasília). Apps de educação: acima de 40% é excelente." />
        </div>
        <div className="col-4">
          <KpiCard label="Retenção D7" display={fmtPct(g?.retention.d7 ?? null)} ctx={retCtx('d7', 'ativo no 7º dia')} delay={60}
            accent={g?.retention.d7 != null ? (g.retention.d7 > 25 ? 'var(--ok)' : g.retention.d7 > 10 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="Quantos fizeram alguma atividade exatamente 7 dias depois do dia do cadastro (calendário de Brasília), entre quem já completou esse dia. Acima de 25% é bom; acima de 10%, aceitável." />
        </div>
        <div className="col-4">
          <KpiCard label="Retenção D30" display={fmtPct(g?.retention.d30 ?? null)} ctx={retCtx('d30', 'ativo no 30º dia')} delay={120}
            accent={g?.retention.d30 != null ? (g.retention.d30 > 15 ? 'var(--ok)' : g.retention.d30 > 5 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="Quantos fizeram alguma atividade exatamente 30 dias depois do dia do cadastro (calendário de Brasília), entre quem já completou esse dia. Acima de 15% é bom; acima de 5%, aceitável." />
        </div>
      </div>

      {g && (
        <>
          <div className="adm-panel" style={{ marginBottom: 16 }}>
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Retenção por semana de cadastro <HelpTip text="Cada linha é a turma que se cadastrou naquela semana (segunda a domingo, horário de Brasília). Cada coluna mostra quantos fizeram alguma atividade durante a N-ésima semana depois do cadastro, contando só quem já completou essa semana. Colunas que ainda não têm dado ficam escondidas." /></span>
              <span className="adm-panel-sub">{g.retentionCohorts.length} turmas</span>
            </div>
            <div className="adm-panel-body">
              <CohortTable rows={g.retentionCohorts} />
            </div>
          </div>
          <div className="adm-panel">
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Sequência atual dos alunos <HelpTip text="Dias seguidos de estudo de quem fez alguma atividade nos últimos 30 dias. Sem atividade hoje nem ontem, a sequência atual é 0." /></span>
              <span className="adm-panel-sub">ativos nos últimos 30 dias</span>
            </div>
            <div className="adm-panel-body">
              <BarChart data={g.streakDistribution} labelKey="bucket" valueKey="count" color="var(--brand)" />
            </div>
          </div>
        </>
      )}
    </>
  );

  // ── Costs ───────────────────────────────────────────────────────────────────
  const PROV_COLOR: Record<string, string> = { ElevenLabs: 'var(--accent)', Azure: 'var(--ok)', OpenAI: 'var(--t2)' };
  const tabCosts = () => (
    <>
      {g?.openai.tableMissing && (
        <div className="adm-alert warn" style={{ marginBottom: 14 }}><TriangleAlert size={14} /> Tabela de custos não encontrada (openai_usage).</div>
      )}
      <Sec>Custos de IA — resumo</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-4">
          <KpiCard label="Custo total de IA" display={g ? fmtUSD(g.openai.totalCost) : '—'}
            dlt={prev && g ? pctDelta(g.openai.totalCost, prev.totalCost) : undefined}
            ctx={g ? `uso do app ${fmtUSD(g.openai.studentCost)} · interno ${fmtUSD(g.openai.internalCost)}` : undefined} accent="var(--warn)" delay={0}
            tip="Soma dos custos registrados no período (OpenAI, ElevenLabs, Azure), inclusive o uso interno (suporte, Instagram, admin). Live Voice não entra: o custo real dele está em Financeiro. A variação compara com o período anterior do mesmo tamanho." />
        </div>
        <div className="col-4">
          <KpiCard label="Custo por aluno ativo" display={g ? fmtUSD(g.openai.costPerActiveSub) : '—'}
            dlt={prev && g ? pctDelta(g.openai.costPerActiveSub, prev.costPerActive) : undefined}
            ctx={g ? `uso do app ÷ ${fmtN(g.openai.activeInRange)} alunos com atividade` : undefined} delay={60}
            tip="Custo de IA do uso do app (sem suporte, Instagram e admin) ÷ alunos que fizeram alguma atividade no período. Live Voice não entra (o custo real dele está em Financeiro). Compare com o valor do plano para ver a margem." />
        </div>
        <div className="col-4"><KpiCard label="Requisições" value={g?.openai.callCount} ctx="chamadas pagas no período" delay={120} tip="Total de chamadas pagas a serviços de IA (OpenAI, ElevenLabs, Azure) no período, inclusive as internas." /></div>
      </div>

      {g && (
        <div className="adm-grid" style={{ gap: 16 }}>
          <div className="col-12">
            <div className="adm-panel" style={{ marginBottom: 0 }}>
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Custo por dia</span><span className="adm-panel-sub">horário de Brasília</span></div>
              <div className="adm-panel-body">
                <AreaChart data={g.openai.timeseries} xKey="date" yKey="cost" color="var(--warn)" h={150} />
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Por função do app</span></div>
              <table className="adm-table">
                <thead><tr><th>Função</th><th>Fornecedor</th><th style={{ textAlign: 'right' }}>Custo</th><th style={{ textAlign: 'right' }}>Chamadas</th></tr></thead>
                <tbody>
                  {g.openai.byEndpoint.map(e => (
                    <tr key={e.endpoint}>
                      <td style={{ maxWidth: 200 }}>
                        <div style={{ fontSize: 12 }}>{endpointLabel(e.endpoint)}{e.internal && <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 6 }}>interno</span>}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t3)' }}>{e.endpoint}</div>
                      </td>
                      <td>
                        {e.providers.map((p, i) => (
                          <span key={p} style={{ fontSize: 11, fontWeight: 600, color: PROV_COLOR[p] ?? 'var(--t3)' }}>{i ? ' · ' : ''}{p}</span>
                        ))}
                      </td>
                      <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--warn)' }}>{fmtUSD(e.cost)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="num">{fmtN(e.calls)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Por modelo</span></div>
              <table className="adm-table">
                <thead><tr><th>Modelo</th><th>Fornecedor</th><th style={{ textAlign: 'right' }}>Custo</th><th style={{ textAlign: 'right' }}>Tokens</th></tr></thead>
                <tbody>
                  {g.openai.byModel.map(m => (
                    <tr key={m.model}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.model}</span></td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, color: PROV_COLOR[m.provider] ?? 'var(--t3)' }}>{m.provider}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--warn)' }}>{fmtUSD(m.cost)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="num">{fmtN(m.tokens)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {g.openai.topUsers.length > 0 && (
            <div className="col-12">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Alunos que mais gastam</span>
                  <span className="adm-panel-sub">top {g.openai.topUsers.length}</span>
                </div>
                <table className="adm-table">
                  <thead><tr><th>Nome</th><th>Email</th><th style={{ textAlign: 'right' }}>Custo</th></tr></thead>
                  <tbody>
                    {g.openai.topUsers.map(u => (
                      <tr key={u.userId}
                        onClick={() => setSelectedUser({ userId: u.userId, name: u.name, email: u.email })}
                        style={{ cursor: 'pointer' }}
                        title="Clique para ver o custo por função">
                        <td>{u.name ?? <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{u.email ?? '—'}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--warn)' }}>{fmtUSD(u.cost)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(g.openai.systemCosts ?? []).length > 0 && (
            <div className="col-12">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Custo do sistema <HelpTip text="Custos que não são de um aluno específico: textos das notificações, áudios do vocabulário gerados com antecedência e uso sem aluno identificado (suporte, Instagram)." /></span>
                  
                </div>
                <table className="adm-table">
                  <thead><tr><th>Componente</th><th style={{ textAlign: 'right' }}>Custo</th></tr></thead>
                  <tbody>
                    {(g.openai.systemCosts ?? []).map(s => (
                      <tr key={s.label}>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.label}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--t3)' }}>{fmtUSD(s.cost)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="adm-page">
      {/* Top bar */}
      <div className="adm-topbar">
        <div style={{ flex: 1 }}>
          <div className="adm-topbar-title">Métricas</div>
          {updatedAt && <div className="adm-topbar-sub">Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['7d', '30d', '90d'] as Preset[]).map(p => (
            <button key={p} className={`range-pill${preset === p ? ' active' : ''}`} onClick={() => setPreset(p)}>{p}</button>
          ))}
          <select className="adm-select-ghost" value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">Todos os níveis</option>
            <option value="Novice">Novice</option>
            <option value="Inter">Inter</option>
            <option value="Advanced">Advanced</option>
          </select>
          <select className="adm-select-ghost" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
            <option value="">Todos os planos</option>
            <option value="taste">Degustação</option>
            <option value="trial">Teste</option>
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
            <option value="paid">Pagante</option>
          </select>
          <button onClick={fetch_} disabled={loading} className="adm-btn-sm ghost" style={{ marginLeft: 4 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Carregando' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(g?.alerts?.length ?? 0) > 0 && (
        <div style={{ padding: '12px 28px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {g!.alerts.map((a, i) => (
            <div key={i} className={`adm-alert ${a.severity === 'critical' ? 'crit' : 'warn'}`}>
              <TriangleAlert size={14} style={{ flexShrink: 0 }} /> {a.message}
            </div>
          ))}
        </div>
      )}
      {error && <div className="adm-alert crit" style={{ margin: '12px 28px 0' }}><TriangleAlert size={14} /> {error}</div>}

      {/* Tabs */}
      <div className="adm-tabs" style={{ marginTop: 8 }}>
        {TABS.map(t => (
          <button key={t.id} className={`adm-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="adm-body">
        {loading && !data ? (
          <div className="adm-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="col-3"><Skel /></div>)}
            <div className="col-12"><Skel h={200} /></div>
          </div>
        ) : (
          <>
            {tab === 'overview'   && tabOverview()}
            {tab === 'conversion' && tabConversion()}
            {tab === 'engagement' && tabEngagement()}
            {tab === 'retention'  && tabRetention()}
            {tab === 'costs'      && tabCosts()}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selectedUser && data && (
        <CostModal
          userId={selectedUser.userId}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          rangeFrom={data.range.from}
          rangeTo={data.range.to}
          days={data.range.days}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
