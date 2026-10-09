'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Flag, RefreshCw, Check, X, Ban, RotateCcw } from 'lucide-react';

interface Person { id: string; name: string | null; username: string | null; email: string | null; avatarUrl: string | null }
interface Report {
  id: number; reason: string; context: string | null; createdAt: string;
  handled: boolean; resolvedAt: string | null; resolvedBy: string | null; resolution: string | null;
  reporter: Person;
  reported: Person & { reports: number; blockedBy: number; suspended: boolean };
}
interface Suspension extends Person { reason: string | null; by: string | null; at: string }

const REASON: Record<string, string> = {
  offensive_profile: 'Nome, @ ou foto ofensivos',
  harassment: 'Assédio ou spam',
  other: 'Outro motivo',
};
const fmt = (s: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const HOURS = 3600000;

function Who({ p }: { p: Person }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {p.avatarUrl
        ? <img src={p.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: 15, objectFit: 'cover' }} />
        : <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{(p.name ?? '?').charAt(0).toUpperCase()}</div>}
      <div style={{ minWidth: 0 }}>
        <Link href={`/admin/users/${p.id}`} style={{ color: 'var(--t1)', fontWeight: 600, textDecoration: 'none' }}>{p.name || 'Sem nome'}</Link>
        <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{p.username ? `@${p.username}` : 'sem @'} · {p.email ?? '—'}</div>
      </div>
    </div>
  );
}

export default function ModerationAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [tab, setTab] = useState<'open' | 'done' | 'suspended'>('open');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ kind: 'resolve'; report: Report } | { kind: 'suspend'; person: Person; reportId?: number } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/moderation');
      if (r.ok) { const j = await r.json(); setReports(j.reports ?? []); setSuspensions(j.suspensions ?? []); }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) alert((await r.json().catch(() => ({}))).error ?? 'Não foi possível salvar.');
    } finally { setBusy(false); }
    await load();
  };

  const confirmModal = async () => {
    if (!modal) return;
    if (modal.kind === 'resolve') await post({ action: 'resolve', id: modal.report.id, resolution: text });
    else {
      await post({ action: 'suspend', userId: modal.person.id, reason: text });
      if (modal.reportId) await post({ action: 'resolve', id: modal.reportId, resolution: `Aluno suspenso do social. ${text}`.trim() });
    }
    setModal(null); setText('');
  };

  const open = reports.filter(r => !r.handled);
  const done = reports.filter(r => r.handled);
  const list = tab === 'open' ? open : done;
  const late = open.filter(r => Date.now() - new Date(r.createdAt).getTime() > 24 * HOURS).length;

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <Flag size={18} color="var(--accent)" />
        <div className="adm-topbar-title">Denúncias</div>
        <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>
      </div>

      <div className="adm-tabs">
        <div className={`adm-tab${tab === 'open' ? ' active' : ''}`} onClick={() => setTab('open')}>Abertas ({open.length})</div>
        <div className={`adm-tab${tab === 'done' ? ' active' : ''}`} onClick={() => setTab('done')}>Resolvidas ({done.length})</div>
        <div className={`adm-tab${tab === 'suspended' ? ' active' : ''}`} onClick={() => setTab('suspended')}>Suspensos ({suspensions.length})</div>
      </div>

      <div className="adm-body">
        <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5 }}>
          Prometemos à Apple analisar cada denúncia em até 24 horas.
          {tab === 'open' && late > 0 && <span style={{ color: 'var(--err)', fontWeight: 700 }}> {late} {late === 1 ? 'está' : 'estão'} acima do prazo.</span>}
          {' '}Suspender tira o aluno do social: ele some da busca e não interage com ninguém (pedidos, amigos, cutucadas, parabéns e competições). O resto do app continua normal.
        </div>

        {tab !== 'suspended' && (
          <div className="adm-panel">
            {list.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : tab === 'open' ? 'Nenhuma denúncia aberta' : 'Nenhuma denúncia resolvida'}</div></div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Denunciado</th><th>Motivo</th><th>Quem denunciou</th><th>Quando</th><th>{tab === 'open' ? '' : 'Resolução'}</th></tr></thead>
                <tbody>
                  {list.map(r => {
                    const overdue = !r.handled && Date.now() - new Date(r.createdAt).getTime() > 24 * HOURS;
                    return (
                      <tr key={r.id}>
                        <td>
                          <Who p={r.reported} />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span className="badge badge-muted">{r.reported.reports} {r.reported.reports === 1 ? 'denúncia' : 'denúncias'}</span>
                            {r.reported.blockedBy > 0 && <span className="badge badge-muted">bloqueado por {r.reported.blockedBy}</span>}
                            {r.reported.suspended && <span className="badge badge-warn">suspenso</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{REASON[r.reason] ?? r.reason}</div>
                          {r.context && <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Onde: {r.context}</div>}
                        </td>
                        <td><Who p={r.reporter} /></td>
                        <td className="num" style={{ fontSize: 12, color: overdue ? 'var(--err)' : undefined, fontWeight: overdue ? 700 : undefined }}>{fmt(r.createdAt)}</td>
                        <td>
                          {r.handled ? (
                            <div style={{ fontSize: 12 }}>
                              <div style={{ color: 'var(--t1)' }}>{r.resolution || 'Sem anotação'}</div>
                              <div style={{ color: 'var(--t3)' }}>{r.resolvedBy ?? '—'} · {fmt(r.resolvedAt)}</div>
                              <button className="adm-btn-sm ghost" style={{ marginTop: 6 }} disabled={busy} onClick={() => post({ action: 'reopen', id: r.id })}><RotateCcw size={12} /> Reabrir</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="adm-btn-sm primary" disabled={busy} onClick={() => { setText(''); setModal({ kind: 'resolve', report: r }); }}><Check size={12} /> Resolver</button>
                              {!r.reported.suspended && <button className="adm-btn-sm ghost" disabled={busy} onClick={() => { setText(''); setModal({ kind: 'suspend', person: r.reported, reportId: r.id }); }}><Ban size={12} /> Suspender</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'suspended' && (
          <div className="adm-panel">
            {suspensions.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Ninguém suspenso'}</div></div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Aluno</th><th>Motivo</th><th>Por</th><th>Desde</th><th></th></tr></thead>
                <tbody>
                  {suspensions.map(s => (
                    <tr key={s.id}>
                      <td><Who p={s} /></td>
                      <td style={{ maxWidth: 320 }}>{s.reason || '—'}</td>
                      <td>{s.by ?? '—'}</td>
                      <td className="num" style={{ fontSize: 12 }}>{fmt(s.at)}</td>
                      <td><button className="adm-btn-sm ghost" disabled={busy} onClick={() => { if (confirm(`Devolver ${s.name ?? 'este aluno'} ao social?`)) post({ action: 'unsuspend', userId: s.id }); }}><RotateCcw size={12} /> Tirar suspensão</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-modal-backdrop" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{modal.kind === 'resolve' ? 'Resolver denúncia' : `Suspender ${modal.person.name ?? 'aluno'}`}</div>
              <button className="adm-btn-sm ghost" onClick={() => setModal(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
                {modal.kind === 'resolve'
                  ? 'Anote o que foi verificado e decidido (fica no histórico).'
                  : 'O aluno some da busca e não interage com ninguém no social. A denúncia fica resolvida junto. Dá para desfazer na aba Suspensos.'}
              </div>
              <textarea className="adm-input" rows={3} value={text} onChange={e => setText(e.target.value)}
                placeholder={modal.kind === 'resolve' ? 'Ex.: perfil verificado, sem ofensa.' : 'Motivo da suspensão'} style={{ resize: 'vertical' }} />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-sm ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="adm-btn-sm primary" disabled={busy} onClick={confirmModal}>{modal.kind === 'resolve' ? 'Resolver' : 'Suspender'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
