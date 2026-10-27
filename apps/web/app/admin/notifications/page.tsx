'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Moon, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface TokenStats { total: number; withToken: number; withoutToken: number; }
interface PeriodStats { sent: number; failed: number; deliveryRate?: number; }
interface ByType     { type: string; sent: number; failed: number; uniqueUsers: number; }
interface Ts         { date: string; count: number; }
interface Log {
  id: string; user_id: string; notification_type: string; status: string;
  message_title: string | null; message_body: string | null;
  error_message: string | null; created_at: string;
  userName: string | null; userEmail: string | null;
}
interface Data {
  tokenStats: TokenStats; stats24h: PeriodStats; stats7d: PeriodStats;
  byType: ByType[]; timeseries: Ts[];
  logs: Log[]; page: number; total: number; perPage: number;
}

// ── Catálogo: o que cada aviso é e quando sai (horário local do aluno) ─────────
// Fonte: lib/expo-notification-service.ts (TARGET_HOUR_* e ENGAGEMENT_TARGET_HOUR) e lib/rally-jobs.ts.
type Group = 'Degustação' | 'Rotina' | 'Para não esfriar' | 'Assinatura' | 'Reativação';
const GROUP_COLOR: Record<Group, string> = {
  'Degustação': 'var(--brand)', 'Rotina': 'var(--accent)', 'Para não esfriar': 'var(--ok)', 'Assinatura': 'var(--brand)', 'Reativação': 'var(--warn)',
};
const CATALOG: Record<string, { label: string; when: string; group: Group }> = {
  taste_daily:            { label: 'Tópico do dia liberado',      when: 'Dias 2 a 5 do cadastro, na hora do lembrete (no 5º, "último tópico grátis")', group: 'Degustação' },
  taste_nudge:            { label: 'Tópico grátis esperando',     when: 'Dias 2 a 4, no lugar do anterior, para quem não estudou na véspera', group: 'Degustação' },
  taste_ended:            { label: 'Degustação terminou',         when: 'Dia 6, com o convite para os 7 dias grátis', group: 'Degustação' },
  taste_offer:            { label: 'Teste grátis ainda disponível', when: 'Dia 9, última lembrança', group: 'Degustação' },
  daily_reminder:         { label: 'Lembrete diário',             when: 'No horário escolhido pelo aluno (padrão 11h)', group: 'Rotina' },
  charlotte_message:      { label: 'Elogio da Charlotte',         when: '18h, para quem estudou no dia', group: 'Rotina' },
  streak_reminder:        { label: 'Aviso de sequência',          when: '18h, para quem ainda não estudou', group: 'Rotina' },
  goal_reminder:          { label: 'Meta da semana',              when: '16h', group: 'Rotina' },
  weekly_challenge:       { label: 'Desafio da semana',           when: 'Segunda, 9h', group: 'Rotina' },
  xp_milestone:           { label: 'Marco de XP',                 when: 'Quando o aluno atinge o marco', group: 'Rotina' },
  buddy_rivalry:          { label: 'Estudar junto',               when: '19h, entre amigos', group: 'Rotina' },
  rally_reminder:         { label: 'Desafio entre amigos',        when: 'Durante o desafio', group: 'Rotina' },
  rally_update:           { label: 'Desafio entre amigos (placar)', when: 'Durante o desafio', group: 'Rotina' },
  rally_result:           { label: 'Desafio entre amigos (resultado)', when: 'No fim do desafio', group: 'Rotina' },
  micro_checkin:          { label: '"Oi" da Charlotte',           when: '2h depois do horário em que costuma estudar (não vai para quem fixou horário)', group: 'Para não esfriar' },
  charlotte_checkin:      { label: 'Conversa da Charlotte',       when: 'Terça e quinta, 15h, quem estudou nos últimos 4 dias', group: 'Para não esfriar' },
  cadence_drop:           { label: 'Queda de ritmo',              when: '12h, semana abaixo da média', group: 'Para não esfriar' },
  streak_saver:           { label: 'Salvar a sequência',          when: '20h, sequência de 3+ dias em risco', group: 'Para não esfriar' },
  streak_milestone_ahead: { label: 'Marco de sequência amanhã',   when: '20h', group: 'Para não esfriar' },
  level_imminent:         { label: 'Perto de subir de nível',     when: '17h', group: 'Para não esfriar' },
  weekly_recap:           { label: 'Resumo da semana',            when: 'Domingo, 19h', group: 'Para não esfriar' },
  trial_ending_72h:       { label: 'Teste acaba em 3 dias',       when: '10h', group: 'Assinatura' },
  trial_ending_24h:       { label: 'Teste acaba amanhã',          when: '10h', group: 'Assinatura' },
  sub_expired_1d:         { label: 'Assinatura venceu',           when: '11h, no dia seguinte', group: 'Assinatura' },
  streak_broken:          { label: 'Sequência perdida',           when: '12h', group: 'Reativação' },
  reengagement_3d:        { label: 'Sentimos sua falta (3 dias)',  when: '12h', group: 'Reativação' },
  reengagement_7d:        { label: 'Sentimos sua falta (7 dias)',  when: '12h', group: 'Reativação' },
  reengagement_14d:       { label: 'Sentimos sua falta (14 dias)', when: '12h', group: 'Reativação' },
  reengagement_30d:       { label: 'Sentimos sua falta (30 dias)', when: '12h, último aviso', group: 'Reativação' },
};
const typeLabel = (t: string) => CATALOG[t]?.label ?? t.replace(/_/g, ' ');
const typeColor = (t: string) => CATALOG[t] ? GROUP_COLOR[CATALOG[t].group] : 'var(--t3)';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const cls = status === 'sent' ? 'badge-ok' : status === 'failed' ? 'badge-err' : 'badge-muted';
  return <span className={`badge ${cls}`}>{status === 'sent' ? 'Enviado' : status === 'failed' ? 'Falhou' : status}</span>;
}

// ── Area chart (lightweight SVG) ──────────────────────────────────────────────
let _uid = 0;
function MiniArea({ data, color = 'var(--accent)', h = 90 }: {
  data: Ts[]; color?: string; h?: number;
}) {
  const id   = useRef(`na${++_uid}`).current;
  const W    = 600;
  const pd   = { t: 8, b: 20, l: 2, r: 2 };
  if (!data.length) return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 12 }}>
      Sem dados no período
    </div>
  );
  const vals = data.map(d => d.count);
  const max  = Math.max(...vals, 1);
  const pw   = W - pd.l - pd.r;
  const ph   = h - pd.t - pd.b;
  const pts  = data.map((d, i) => ({
    x:   pd.l + (i / Math.max(data.length - 1, 1)) * pw,
    y:   pd.t + (1 - d.count / max) * ph,
    lbl: d.date.slice(5),
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = `${line} L ${pts.at(-1)!.x.toFixed(1)},${(pd.t + ph).toFixed(1)} L ${pd.l},${(pd.t + ph).toFixed(1)} Z`;
  const ticks = [0, Math.floor(pts.length / 2), pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map(f => (
        <line key={f}
          x1={pd.l} x2={W - pd.r}
          y1={pd.t + (1 - f) * ph} y2={pd.t + (1 - f) * ph}
          stroke="var(--b2)" strokeWidth="1" />
      ))}
      <path d={fill} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {ticks.map(i => pts[i] && (
        <text key={i} x={pts[i].x} y={h - 4} textAnchor="middle"
          fill="var(--t3)" fontSize="9" fontFamily="var(--font-mono)">{pts[i].lbl}</text>
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminNotificationsPage() {
  const [data, setData]         = useState<Data | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [typeFilter, setType]   = useState('');
  const [updatedAt, setUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (p = page) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/admin/notifications?${params}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setData(await res.json());
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { fetchData(1); setPage(1); }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const d          = data;
  const totalPages = d ? Math.ceil(d.total / d.perPage) : 1;
  const tokenPct   = d ? Math.round((d.tokenStats.withToken / Math.max(d.tokenStats.total, 1)) * 100) : 0;
  const reached7d  = d ? Math.max(0, ...d.byType.map(t => t.uniqueUsers)) : 0;

  // Catálogo agrupado, com o volume da semana (tipos sem envio também aparecem).
  const sentByType = new Map((d?.byType ?? []).map(t => [t.type, t]));
  const groups = (Object.keys(GROUP_COLOR) as Group[]).map(g => ({
    group: g,
    rows: Object.entries(CATALOG).filter(([, c]) => c.group === g)
      .map(([type, c]) => ({ type, ...c, sent: sentByType.get(type)?.sent ?? 0, users: sentByType.get(type)?.uniqueUsers ?? 0 }))
      .sort((x, y) => y.sent - x.sent),
  }));
  const unknown = (d?.byType ?? []).filter(t => !CATALOG[t.type]);

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div style={{ flex: 1 }}>
          <div className="adm-topbar-title">Notificações</div>
          {updatedAt && (
            <div className="adm-topbar-sub">
              Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <button className="adm-btn-sm ghost" onClick={() => fetchData(page)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      <div className="adm-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="adm-grid" style={{ marginBottom: 20 }}>
          <div className="col-3">
            <div className="kpi-card fade-up">
              <div className="kpi-label">Enviadas (24h)</div>
              <div className="kpi-value" style={{ color: 'var(--ok)' }}>{d ? d.stats24h.sent.toLocaleString('pt-BR') : '—'}</div>
              {d && d.stats24h.failed > 0 && <div className="kpi-context" style={{ color: 'var(--err)' }}>{d.stats24h.failed} falharam</div>}
            </div>
          </div>
          <div className="col-3">
            <div className="kpi-card fade-up" style={{ animationDelay: '60ms' }}>
              <div className="kpi-label">Enviadas (7 dias)</div>
              <div className="kpi-value">{d ? d.stats7d.sent.toLocaleString('pt-BR') : '—'}</div>
              {d && <div className="kpi-context">média de {Math.round(d.stats7d.sent / 7).toLocaleString('pt-BR')} por dia</div>}
            </div>
          </div>
          <div className="col-3">
            <div className="kpi-card fade-up" style={{ animationDelay: '120ms' }}>
              <div className="kpi-label">Alunos com push ativo</div>
              <div className="kpi-value">{d ? d.tokenStats.withToken.toLocaleString('pt-BR') : '—'}</div>
              {d && <div className="kpi-context">{tokenPct}% das {d.tokenStats.total.toLocaleString('pt-BR')} contas (o resto negou a permissão ou não abriu o app)</div>}
            </div>
          </div>
          <div className="col-3">
            <div className="kpi-card fade-up" style={{ animationDelay: '180ms' }}>
              <div className="kpi-label">Aviso que mais alcança (7 dias)</div>
              <div className="kpi-value">{d ? reached7d.toLocaleString('pt-BR') : '—'}</div>
              {d && d.byType[0] && <div className="kpi-context">alunos diferentes · {typeLabel([...d.byType].sort((a, b) => b.uniqueUsers - a.uniqueUsers)[0].type)}</div>}
            </div>
          </div>
        </div>

        <div className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Moon size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--t1)' }}>Horário de silêncio: das 21h às 9h</strong>, no fuso de cada aluno. Nada sai nesse intervalo.
              Os envios são automáticos: o agendador confere de hora em hora quem deve receber cada aviso, no máximo um aviso de engajamento por hora. Quem está na degustação (conta sem plano) recebe só os avisos da degustação, um por dia.
              O aluno escolhe o horário do lembrete em Perfil &gt; Horário do lembrete.
            </div>
          </div>
        </div>

        <div className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-hdr"><span className="adm-panel-title">Envios por dia (30 dias)</span></div>
          <div className="adm-panel-body"><MiniArea data={d?.timeseries ?? []} color="var(--brand)" h={90} /></div>
        </div>

        <div className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-hdr">
            <span className="adm-panel-title">Avisos e quando saem</span>
            <span className="adm-panel-sub">envios dos últimos 7 dias</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Aviso</th>
                  <th>Quando sai</th>
                  <th style={{ textAlign: 'right' }}>Enviados</th>
                  <th style={{ textAlign: 'right' }}>Alunos</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => [
                  <tr key={`g-${g.group}`}>
                    <td colSpan={4} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: GROUP_COLOR[g.group], paddingTop: 14 }}>
                      {g.group}
                    </td>
                  </tr>,
                  ...g.rows.map(r => (
                    <tr key={r.type} style={{ opacity: r.sent ? 1 : 0.55 }}>
                      <td style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 12.5 }}>{r.label}</td>
                      <td style={{ fontSize: 12, color: 'var(--t3)' }}>{r.when}</td>
                      <td style={{ textAlign: 'right' }}><span className="num">{r.sent.toLocaleString('pt-BR')}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="num">{r.users.toLocaleString('pt-BR')}</span></td>
                    </tr>
                  )),
                ])}
                {unknown.map(t => (
                  <tr key={t.type}>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{typeLabel(t.type)}</td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>—</td>
                    <td style={{ textAlign: 'right' }}><span className="num">{t.sent.toLocaleString('pt-BR')}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="num">{t.uniqueUsers.toLocaleString('pt-BR')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-hdr">
            <span className="adm-panel-title">Últimos envios</span>
            <select className="adm-select-ghost" value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }}>
              <option value="">Todos os avisos</option>
              {d?.byType.map(t => <option key={t.type} value={t.type}>{typeLabel(t.type)}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div className="skeleton" style={{ height: 14, width: '60%', margin: '0 auto 10px' }} />
              <div className="skeleton" style={{ height: 14, width: '80%', margin: '0 auto 10px' }} />
              <div className="skeleton" style={{ height: 14, width: '70%', margin: '0 auto' }} />
            </div>
          ) : d && d.logs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Nenhum envio encontrado.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table">
                <thead>
                  <tr><th>Aluno</th><th>Aviso</th><th>Mensagem</th><th>Situação</th><th>Data</th></tr>
                </thead>
                <tbody>
                  {(d?.logs ?? []).map(log => (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--t1)' }}>
                          {log.userName ?? <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>sem nome</span>}
                        </div>
                        {log.userEmail && <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{log.userEmail}</div>}
                      </td>
                      <td><span style={{ fontSize: 12, fontWeight: 600, color: typeColor(log.notification_type) }}>{typeLabel(log.notification_type)}</span></td>
                      <td style={{ maxWidth: 280 }}>
                        {log.message_title && (
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message_title}</div>
                        )}
                        {log.message_body && (
                          <div style={{ fontSize: 11.5, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message_body}</div>
                        )}
                        {log.error_message && <div style={{ fontSize: 11, color: 'var(--err)', marginTop: 2 }}>{log.error_message}</div>}
                      </td>
                      <td><StatusDot status={log.status} /></td>
                      <td style={{ fontSize: 11.5, color: 'var(--t3)', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                {d && `${((page - 1) * d.perPage) + 1}–${Math.min(page * d.perPage, d.total)} de ${d.total.toLocaleString('pt-BR')}`}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="adm-btn-sm ghost"><ChevronLeft size={13} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="adm-btn-sm ghost"><ChevronRight size={13} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
