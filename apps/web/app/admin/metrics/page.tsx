'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, TriangleAlert, ChevronUp, ChevronDown, Minus } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────
interface MetricsResponse {
  range: { from: string; to: string; days: number };
  revenue: {
    mrr: number; arr: number; activeSubs: number; monthlySubs: number; yearlySubs: number;
    onTrial: number; trialConversionPct: number | null; churnPct: number | null;
    renewals7d: number; inactivePaying: number; newUsers: number; totalUsers: number;
    totalNonInstitutional: number;
  };
  retention: { d1: number | null; d7: number | null; d30: number | null };
  openai: {
    tableMissing: boolean; totalCost: number; callCount: number; costPerActiveSub: number;
    byEndpoint: Array<{ endpoint: string; cost: number; calls: number; tokens: number }>;
    byModel: Array<{ model: string; cost: number; calls: number; tokens: number }>;
    topUsers: Array<{ userId: string; email: string | null; name: string | null; cost: number }>;
    systemCosts: Array<{ label: string; cost: number }>;
    timeseries: Array<{ date: string; cost: number }>;
  };
  mrrHealth: {
    newMrr: number; churnedMrr: number; quickRatio: number;
    newInRange: { monthly: number; yearly: number; count: number };
    churnedInRange: { monthly: number; yearly: number; count: number };
    mrrTrend: Array<{ week: string; amount: number }>;
  };
  engagement: {
    dau: number; wau: number; mau: number; stickinessPct: number | null;
    dauTimeseries: Array<{ date: string; dau: number }>;
  };
  activationFunnel: Array<{ stage: string; label: string; count: number; eligibleDenominator?: number }>;
  streakDistribution: Array<{ bucket: string; count: number }>;
  notifications: {
    tableMissing: boolean; activeTokens: number; totalUsers: number;
    sent: number; failed: number; deliveryRatePct: number | null;
    byType: Array<{ type: string; sent: number; uniqueUsers: number }>;
    byCategory: { core: number; prevention: number; revenue: number; winback: number };
    timeseries: Array<{ date: string; count: number }>;
  };
  retentionCohorts: Array<{
    cohort: string; size: number;
    survival: { w1: number | null; w2: number | null; w3: number | null; w4: number | null; w6: number | null; w8: number | null };
  }>;
  timeToFirstValue: {
    sampleSize: number; medianHours: number | null; p90Hours: number | null;
    distribution: Array<{ bucket: string; count: number }>;
  };
  practiceHeatmap: number[][];
  previousPeriod: { range: { from: string; to: string }; newUsers: number; dau: number; mau: number; notificationsSent: number; totalCost: number };
  alerts: Array<{ severity: 'warn' | 'critical'; message: string }>;
  filters: { level: string | null; plan: string | null };
}

type Preset = '7d' | '30d' | '90d';
type Tab = 'overview' | 'engagement' | 'retention' | 'costs';

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
function FunnelBars({ data }: { data: Array<{ label: string; count: number }> }) {
  if (!data.length) return <div className="adm-empty"><div className="adm-empty-title">Sem dados</div></div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const drop = i > 0 && data[i - 1].count ? (1 - d.count / data[i - 1].count) * 100 : null;
        const opacity = 0.3 + (1 - i / Math.max(data.length - 1, 1)) * 0.6;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 150, fontSize: 11.5, color: 'var(--t2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
            <div style={{ flex: 1, height: 20, background: 'var(--s3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `rgba(99,102,241,${opacity})`, borderRadius: 4, transition: 'width 600ms ease' }} />
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t1)', width: 52, textAlign: 'right', flexShrink: 0 }}>{fmtN(d.count)}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--err)', width: 44, textAlign: 'right', flexShrink: 0 }}>
              {drop != null ? `-${drop.toFixed(0)}%` : ''}
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
                  <div key={ci} title={`${DAYS_PT[ri]} ${ci}h: ${v} sessões`}
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
  const wks: (keyof MetricsResponse['retentionCohorts'][0]['survival'])[] = ['w1', 'w2', 'w3', 'w4', 'w6', 'w8'];
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
            <th>Coorte</th><th>Usuários</th>
            {['W1','W2','W3','W4','W6','W8'].map(w => <th key={w} style={{ textAlign: 'center' }}>{w}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map(r => (
            <tr key={r.cohort}>
              <td><span className="num">{r.cohort}</span></td>
              <td><span className="num">{fmtN(r.size)}</span></td>
              {wks.map((k, j) => {
                const c = cell(r.survival[k]);
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
  '/api/tts':                       'TTS voz (ElevenLabs)',
  '/api/tts-cached':                'TTS cache (ElevenLabs)',
  '/api/pronunciation':             'Pronúncia (Azure)',
  '/api/pronunciation-semantic':    'Pronúncia semântica',
  '/api/transcribe':                'Transcrição (Whisper)',
  '/api/greeting':                  'Saudação inicial',
  '/api/enrich-term':               'Enriquecimento de termo',
  '/api/notifications/scheduler':   'Scheduler de notificações',
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
                Por Feature
              </div>
              {costData.breakdown.length === 0 ? (
                <div style={{ color: 'var(--t3)', fontSize: 12, padding: '8px 0' }}>Nenhum custo no período.</div>
              ) : (
                <table className="adm-table" style={{ marginBottom: 20 }}>
                  <thead>
                    <tr>
                      <th>Feature</th>
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
                    Por Modelo
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
  { id: 'overview',   label: 'Visão Geral' },
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
    if (!secret) return;
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
        <div className="col-3"><KpiCard label="MRR" display={g ? fmtBRL(g.revenue.mrr) : '—'} ctx="receita mensal recorrente" accent="var(--brand)" delay={0} tip="Monthly Recurring Revenue — soma das assinaturas ativas convertidas para valor mensal." /></div>
        <div className="col-3"><KpiCard label="ARR" display={g ? fmtBRL(g.revenue.arr) : '—'} ctx="projeção anual" delay={60} tip="Annual Recurring Revenue — projeção do MRR atual multiplicada por 12." /></div>
        <div className="col-3"><KpiCard label="Assinantes Ativos" value={g?.revenue.activeSubs} ctx={g ? `${g.revenue.monthlySubs} mensais · ${g.revenue.yearlySubs} anuais` : undefined} delay={120} tip="Usuários com subscription_status = 'active' — pagando no momento." /></div>
        <div className="col-3"><KpiCard label="Em Trial" value={g?.revenue.onTrial} ctx={g?.revenue.trialConversionPct != null ? `${g.revenue.trialConversionPct.toFixed(1)}% conversão` : undefined} delay={180} tip="Usuários em período de teste gratuito. Inclui trials ainda válidos." /></div>
        <div className="col-3">
          <KpiCard label="Churn Rate" display={fmtPct(g?.revenue.churnPct ?? null)} ctx="mensal estimado" delay={240}
            accent={g?.revenue.churnPct != null && g.revenue.churnPct > 5 ? 'var(--err)' : undefined}
            tip="% de assinantes que cancelaram no período. Saudável: < 5%. Alerta: > 10%." />
        </div>
        <div className="col-3">
          <KpiCard label="Conversão Trial" display={fmtPct(g?.revenue.trialConversionPct ?? null)} ctx="trial → pago" delay={300}
            accent={g?.revenue.trialConversionPct != null && g.revenue.trialConversionPct > 15 ? 'var(--ok)' : undefined}
            tip="% de usuários que completaram o trial e viraram assinantes pagos." />
        </div>
        <div className="col-3">
          <KpiCard label="Total Usuários" value={g?.revenue.totalUsers}
            dlt={prev && g ? pctDelta(g.revenue.newUsers, prev.newUsers) : undefined}
            ctx="todos os planos" delay={360}
            tip="Total de contas cadastradas, independente de plano ou status." />
        </div>
        <div className="col-3"><KpiCard label="Renovações 7d" value={g?.revenue.renewals7d} ctx="próximas renovações" delay={420} tip="Assinaturas que renovam (e cobram) nos próximos 7 dias." /></div>
      </div>

      {g?.mrrHealth && (
        <>
          <Sec>Saúde MRR</Sec>
          <div className="adm-grid" style={{ marginBottom: 20 }}>
            <div className="col-4">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Quick Ratio <HelpTip text="Novo MRR ÷ MRR Perdido. ≥ 4 = crescimento saudável. < 1 = receita encolhendo." /></span>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: g.mrrHealth.quickRatio >= 4 ? 'var(--ok)' : g.mrrHealth.quickRatio >= 1 ? 'var(--warn)' : 'var(--err)' }}>
                    {g.mrrHealth.quickRatio.toFixed(2)}
                  </span>
                </div>
                <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Novo MRR</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ok)', fontWeight: 700 }}>+{fmtBRL(g.mrrHealth.newMrr)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>MRR Perdido</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--err)', fontWeight: 700 }}>-{fmtBRL(g.mrrHealth.churnedMrr)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--b1)' }} />
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Quick Ratio ≥ 4 = crescimento saudável</div>
                </div>
              </div>
            </div>
            <div className="col-8">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Tendência MRR <HelpTip text="Evolução semanal da receita recorrente mensal. Tendência de alta = crescimento saudável." /></span>
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

  // ── Engagement ──────────────────────────────────────────────────────────────
  const tabEngagement = () => (
    <>
      <Sec>Atividade</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-3">
          <KpiCard label="DAU" value={g?.engagement.dau}
            dlt={prev && g ? pctDelta(g.engagement.dau, prev.dau) : undefined}
            spark={g?.engagement.dauTimeseries.map(d => d.dau)} sparkColor="var(--accent)"
            ctx="usuários ativos hoje" accent="var(--accent)" delay={0}
            tip="Daily Active Users — usuários com pelo menos uma prática hoje." />
        </div>
        <div className="col-3"><KpiCard label="WAU" value={g?.engagement.wau} ctx="últimos 7 dias" delay={60} tip="Weekly Active Users — usuários com prática nos últimos 7 dias." /></div>
        <div className="col-3">
          <KpiCard label="MAU" value={g?.engagement.mau}
            dlt={prev && g ? pctDelta(g.engagement.mau, prev.mau) : undefined}
            ctx="últimos 30 dias" delay={120}
            tip="Monthly Active Users — usuários com prática nos últimos 30 dias." />
        </div>
        <div className="col-3">
          <KpiCard label="Stickiness" display={fmtPct(g?.engagement.stickinessPct ?? null)} ctx="DAU ÷ MAU" delay={180}
            accent={g?.engagement.stickinessPct != null && g.engagement.stickinessPct > 20 ? 'var(--ok)' : undefined}
            tip="DAU ÷ MAU. Mede o hábito diário. Apps de educação saudáveis ficam acima de 20%." />
        </div>
      </div>

      {g && (
        <>
          <div className="adm-panel" style={{ marginBottom: 16 }}>
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>DAU — Série temporal <HelpTip text="Usuários ativos por dia no período. Tendência crescente indica retenção saudável." /></span>
              <span className="adm-panel-sub">{g.range.days}d</span>
            </div>
            <div className="adm-panel-body">
              <AreaChart data={g.engagement.dauTimeseries} xKey="date" yKey="dau" h={130} fmt={v => fmtN(Math.round(v))} />
            </div>
          </div>

          <div className="adm-grid" style={{ marginBottom: 16 }}>
            <div className="col-6">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Funil de Ativação <HelpTip text="Passos do onboarding — quantos usuários completaram cada etapa. Quedas grandes indicam fricção." /></span>
                </div>
                <div className="adm-panel-body">
                  <FunnelBars data={g.activationFunnel.map(f => ({ label: f.label, count: f.count }))} />
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="adm-panel">
                <div className="adm-panel-hdr">
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Tempo até 1ª Prática (TTFV) <HelpTip text="Time to First Value — quanto tempo após o cadastro o usuário fez a 1ª prática. Mediana ideal: abaixo de 1h." /></span>
                  <span className="adm-panel-sub">{fmtN(g.timeToFirstValue.sampleSize)} usuários</span>
                </div>
                <div className="adm-panel-body">
                  <div style={{ display: 'flex', gap: 28, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Mediana</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ok)' }}>{fmtHrs(g.timeToFirstValue.medianHours)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>P90</div>
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
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Heatmap de Prática <HelpTip text="Práticas por dia da semana × hora do dia (horário local do usuário). Cores mais intensas = mais práticas. Útil para definir horário de push notifications." /></span>
              <span className="adm-panel-sub">dia × hora local</span>
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
  const tabRetention = () => (
    <>
      <Sec>Retenção por Período</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-4">
          <KpiCard label="Retenção D1" display={fmtPct(g?.retention.d1 ?? null)} ctx="volta no dia 1" delay={0}
            accent={g?.retention.d1 != null ? (g.retention.d1 > 40 ? 'var(--ok)' : g.retention.d1 > 20 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="% dos novos usuários que voltaram e fizeram uma prática no dia seguinte ao cadastro. Benchmark apps de educação: > 40% excelente." />
        </div>
        <div className="col-4">
          <KpiCard label="Retenção D7" display={fmtPct(g?.retention.d7 ?? null)} ctx="volta na semana 1" delay={60}
            accent={g?.retention.d7 != null ? (g.retention.d7 > 25 ? 'var(--ok)' : g.retention.d7 > 10 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="% dos novos usuários que voltaram 7 dias após o cadastro. Benchmark: > 25% bom, > 10% aceitável." />
        </div>
        <div className="col-4">
          <KpiCard label="Retenção D30" display={fmtPct(g?.retention.d30 ?? null)} ctx="volta no mês 1" delay={120}
            accent={g?.retention.d30 != null ? (g.retention.d30 > 15 ? 'var(--ok)' : g.retention.d30 > 5 ? 'var(--warn)' : 'var(--err)') : undefined}
            tip="% dos novos usuários que voltaram 30 dias após o cadastro. Benchmark: > 15% bom, > 5% aceitável." />
        </div>
      </div>

      {g && (
        <>
          <div className="adm-panel" style={{ marginBottom: 16 }}>
            <div className="adm-panel-hdr">
              <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Análise de Coorte <HelpTip text="Retenção por semana de cadastro. Cada linha = uma coorte (semana). Colunas = semanas subsequentes. Cores mais fortes = mais usuários retendo." /></span>
              <span className="adm-panel-sub">{g.retentionCohorts.length} coortes</span>
            </div>
            <div className="adm-panel-body">
              <CohortTable rows={g.retentionCohorts} />
            </div>
          </div>
          <div className="adm-panel">
            <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Distribuição de Streak <HelpTip text="Quantos usuários têm cada faixa de streak de dias consecutivos. Concentração em faixas altas indica hábito formado." /></span></div>
            <div className="adm-panel-body">
              <BarChart data={g.streakDistribution} labelKey="bucket" valueKey="count" color="var(--brand)" />
            </div>
          </div>
        </>
      )}
    </>
  );

  // ── Costs ───────────────────────────────────────────────────────────────────
  const tabCosts = () => (
    <>
      {g?.openai.tableMissing && (
        <div className="adm-alert warn" style={{ marginBottom: 14 }}><TriangleAlert size={14} /> Tabela de custos não encontrada (openai_usage).</div>
      )}
      <Sec>APIs Externas — Resumo</Sec>
      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-4">
          <KpiCard label="Custo Total APIs" display={g ? fmtUSD(g.openai.totalCost) : '—'}
            dlt={prev && g ? pctDelta(g.openai.totalCost, prev.totalCost) : undefined}
            ctx="OpenAI + ElevenLabs + Azure" accent="var(--warn)" delay={0}
            tip="Soma dos custos de OpenAI (GPT, Whisper), ElevenLabs (TTS) e Azure Speech no período selecionado." />
        </div>
        <div className="col-4"><KpiCard label="Custo/Assinante" display={g ? fmtUSD(g.openai.costPerActiveSub) : '—'} ctx="custo total / assinante ativo" delay={60} tip="Custo total de APIs ÷ assinantes ativos. Indica a margem de custo por usuário pagante." /></div>
        <div className="col-4"><KpiCard label="Requisições" value={g?.openai.callCount} ctx="chamadas a APIs externas no período" delay={120} tip="Total de chamadas a APIs externas pagas (OpenAI, ElevenLabs, Azure) no período." /></div>
      </div>

      {g && (
        <div className="adm-grid" style={{ gap: 16 }}>
          <div className="col-12">
            <div className="adm-panel" style={{ marginBottom: 0 }}>
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Custo Diário <HelpTip text="Custo diário total em APIs externas. Passe o mouse sobre o gráfico para ver o valor exato de cada dia." /></span></div>
              <div className="adm-panel-body">
                <AreaChart data={g.openai.timeseries} xKey="date" yKey="cost" color="var(--warn)" h={150} />
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Por Endpoint <HelpTip text="Custo e volume de chamadas por rota da API. Identifica quais funcionalidades geram mais custo." /></span></div>
              <table className="adm-table">
                <thead><tr><th>Endpoint</th><th>Provider</th><th style={{ textAlign: 'right' }}>Custo</th><th style={{ textAlign: 'right' }}>Chamadas</th></tr></thead>
                <tbody>
                  {g.openai.byEndpoint.map(e => {
                    const prov = e.endpoint.startsWith('/api/tts') ? 'ElevenLabs'
                      : e.endpoint === '/api/pronunciation' ? 'Azure'
                      : e.endpoint === '/api/realtime-token' ? 'Realtime'
                      : 'OpenAI';
                    const provColor = prov === 'ElevenLabs' ? 'var(--accent)'
                      : prov === 'Azure' ? 'var(--ok)'
                      : prov === 'Realtime' ? 'var(--brand)'
                      : 'var(--t3)';
                    return (
                      <tr key={e.endpoint}>
                        <td style={{ maxWidth: 180 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e.endpoint}</span></td>
                        <td><span style={{ fontSize: 11, fontWeight: 600, color: provColor }}>{prov}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="num" style={{ color: 'var(--warn)' }}>{fmtUSD(e.cost)}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="num">{fmtN(e.calls)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-6">
            <div className="adm-panel">
              <div className="adm-panel-hdr"><span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Por Modelo <HelpTip text="Custo e tokens consumidos por modelo de IA. Tokens = unidade de cobrança de texto processado." /></span></div>
              <table className="adm-table">
                <thead><tr><th>Modelo</th><th style={{ textAlign: 'right' }}>Custo</th><th style={{ textAlign: 'right' }}>Tokens</th></tr></thead>
                <tbody>
                  {g.openai.byModel.map(m => (
                    <tr key={m.model}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.model}</span></td>
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
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Top Usuários por Custo <HelpTip text="Usuários que geraram mais custo em APIs externas no período. Útil para identificar uso excessivo ou abuso." /></span>
                  <span className="adm-panel-sub">top {g.openai.topUsers.length}</span>
                </div>
                <table className="adm-table">
                  <thead><tr><th>Nome</th><th>Email</th><th style={{ textAlign: 'right' }}>Custo</th></tr></thead>
                  <tbody>
                    {g.openai.topUsers.map(u => (
                      <tr key={u.userId}
                        onClick={() => setSelectedUser({ userId: u.userId, name: u.name, email: u.email })}
                        style={{ cursor: 'pointer' }}
                        title="Clique para ver breakdown de custo">
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
                  <span className="adm-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Custo do Sistema <HelpTip text="Custos de infraestrutura não atribuíveis a usuários específicos: scheduler de notificações (GPT) e geração de cache de TTS de vocabulário." /></span>
                  <span className="adm-panel-sub">infra, scheduler, cache</span>
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
            <option value="trial">Trial</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="institutional">Institucional</option>
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
