'use client';
// "Reportados pelos alunos" — bandeira dos exercícios do app (lib/exercise-reports). Agrupa por exercício
// (o mais reportado no topo), mostra o motivo, o que o aluno respondeu ou o que o app entendeu da fala,
// e deixa marcar como resolvido ou descartar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExerciseReport } from '@/lib/exercise-reports-shared';
import { REASON_PT, SCREEN_PT, exerciseText } from '@/lib/exercise-reports-shared';

const where = (r: ExerciseReport) => [SCREEN_PT[r.screen] ?? r.screen, r.level, r.module_id, r.unit_id].filter(Boolean).join(' · ');
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function ReportsPanel() {
  const [status, setStatus] = useState<'open' | 'fixed' | 'dismissed'>('open');
  const [rows, setRows] = useState<ExerciseReport[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setRows(null); setErr('');
    const r = await fetch(`/api/admin/learning/reports?days=90&status=${status}`);
    if (!r.ok) { setErr(`Erro ${r.status}`); return; }
    setRows((await r.json()).reports ?? []);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, ExerciseReport[]>();
    for (const r of rows ?? []) {
      const k = `${r.screen}|${r.level}|${r.module_id}|${r.unit_id}|${exerciseText(r)}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.values()].sort((a, b) => b.length - a.length);
  }, [rows]);

  const mark = async (ids: string[], s: 'open' | 'fixed' | 'dismissed') => {
    for (const id of ids) await fetch('/api/admin/learning/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: s }) });
    load();
  };

  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Reportados pelos alunos <span className="adm-panel-sub">· bandeira dos exercícios, últimos 90 dias</span></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['open', 'fixed', 'dismissed'] as const).map(s => (
            <button key={s} className={`adm-chip${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>
              {s === 'open' ? 'Abertos' : s === 'fixed' ? 'Resolvidos' : 'Descartados'}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-panel-body">
      {err && <div className="adm-alert crit">{err}</div>}
      {!rows && !err && <div style={{ color: 'var(--t3)', fontSize: 13 }}>Carregando…</div>}
      {rows && groups.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 13 }}>Nenhum reporte {status === 'open' ? 'aberto' : status === 'fixed' ? 'resolvido' : 'descartado'}.</div>}
      {groups.map(g => {
        const r0 = g[0];
        return (
          <div key={r0.id} style={{ borderTop: '1px solid var(--b1)', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{exerciseText(r0) || '(sem texto)'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{where(r0)}{r0.exercise && typeof (r0.exercise as Record<string, unknown>).answer === 'string' ? ` · gabarito: "${(r0.exercise as Record<string, unknown>).answer}"` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{g.length} reporte{g.length > 1 ? 's' : ''}</span>
                {status === 'open'
                  ? <>
                      <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => mark(g.map(x => x.id), 'fixed')}>Resolvido</button>
                      <button className="adm-btn adm-btn-sm" onClick={() => mark(g.map(x => x.id), 'dismissed')}>Descartar</button>
                    </>
                  : <button className="adm-btn adm-btn-sm" onClick={() => mark(g.map(x => x.id), 'open')}>Reabrir</button>}
              </div>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--t2)', lineHeight: 1.55 }}>
              {g.slice(0, 8).map(r => (
                <li key={r.id}>
                  <b>{REASON_PT[r.reason] ?? r.reason}</b>
                  {r.user_answer ? <> · respondeu "{r.user_answer}"</> : null}
                  {r.transcript ? <> · o app entendeu "{r.transcript}"</> : null}
                  {r.comment ? <> · “{r.comment}”</> : null}
                  <span style={{ color: 'var(--t3)' }}> — {r.name || r.email || 'aluno'} · {when(r.created_at)} · {r.platform ?? ''} {r.app_version ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      </div>
    </div>
  );
}
