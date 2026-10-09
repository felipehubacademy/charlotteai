'use client';
// Ficha pedagógica do aluno: trilha, acertos, pronúncia, gramática e anotações.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { useAdminMe, canArea } from '@/lib/admin-context';
import { exLabel, practiceLabel, accColor, ago } from '../labels';

interface Sheet {
  days: number;
  student: { id: string; name: string | null; username: string | null; level: string | null; placementDone: boolean; since: string };
  progress: { total_xp: number; streak_days: number; last_practice_date: string | null } | null;
  trail: { level: string; module: string; topic: string; moduleNumber: number; updatedAt: string }[];
  trailUnits: { done: number; total: number } | null;
  trailAccuracy: number | null; trailAnswers: number;
  byExercise: { type: string; answers: number; accuracy: number | null }[];
  topics: { level: string; module: string; topic: string; answers: number; accuracy: number }[];
  activity: { byDay: Record<string, number>; byType: Record<string, number>; total: number };
  pronunciation: { avg: number | null; attempts: number; recent: { phrase: string; score: number; words: string[]; at: string }[]; topWords: { word: string; count: number }[] };
  grammar: { analyzed: number; errorFree: number | null; corrections: { wrong: string; right: string; at: string }[] };
  vocabulary: { saved: number; dueReviews: number };
  sessions: { id: string; title: string | null; summary: string | null; started_at: string; message_count: number | null }[];
  notes: { id: string; body: string; author_name: string | null; created_at: string }[];
}

const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

function Heatmap({ byDay, days }: { byDay: Record<string, number>; days: number }) {
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { d, n: byDay[d] ?? 0 };
  });
  const max = Math.max(1, ...cells.map(c => c.n));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {cells.map(c => (
        <div key={c.d} title={`${fmtDate(c.d)}: ${c.n}`}
          style={{ width: 12, height: 12, borderRadius: 3, background: c.n ? `rgba(8,128,74,${0.25 + 0.75 * (c.n / max)})` : 'var(--b1)' }} />
      ))}
    </div>
  );
}

export default function LearningSheetPage() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const canNote = canArea(useAdminMe(), 'learning:notes');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Sheet | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const r = await fetch(`/api/admin/learning?userId=${encodeURIComponent(id)}&days=${days}`);
    if (!r.ok) { setError(r.status === 404 ? 'Aluno não encontrado.' : `Erro ${r.status}`); return; }
    setData(await r.json());
  }, [id, days]);
  useEffect(() => { if (id) load(); }, [id, load]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const r = await fetch('/api/admin/learning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, body: note }) });
    setSaving(false);
    if (r.ok) { setNote(''); load(); }
  };

  if (error) return <div className="adm-body"><div className="adm-alert crit">{error}</div></div>;
  if (!data) return <div className="adm-body"><div className="adm-empty"><div className="adm-empty-sub">Carregando…</div></div></div>;

  const st = data.student;
  const current = data.trail.find(t => t.level === st.level) ?? data.trail[0];

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin/learning" className="adm-btn-sm ghost" style={{ padding: '5px 8px' }}><ArrowLeft size={14} /></Link>
          <div className="adm-topbar-title">{st.name?.trim() || 'Sem nome'}</div>
          {st.username && <span style={{ color: 'var(--t2)', fontWeight: 600 }}>@{st.username}</span>}
          {st.level && <span className="badge badge-brand">{st.level}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(p => <button key={p} className={`adm-chip${days === p ? ' active' : ''}`} onClick={() => setDays(p)}>{p} dias</button>)}
        </div>
      </div>

      <div className="adm-body">
        <div className="adm-grid">
          {[
            { label: 'Posição na trilha', value: current ? current.topic : '—', ctx: current ? `${current.level} · Módulo ${current.moduleNumber} · ${current.module}${data.trailUnits ? ` · ${data.trailUnits.done}/${data.trailUnits.total} unidades` : ''}` : '', small: true },
            { label: 'Acerto na trilha', value: data.trailAccuracy != null ? `${data.trailAccuracy}%` : '—', ctx: `${data.trailAnswers} ${data.trailAnswers === 1 ? 'resposta' : 'respostas'}`, color: accColor(data.trailAccuracy) },
            { label: 'Média de pronúncia', value: data.pronunciation.avg ?? '—', ctx: `${data.pronunciation.attempts} ${data.pronunciation.attempts === 1 ? 'frase' : 'frases'}`, color: accColor(data.pronunciation.avg) },
            { label: 'Sequência', value: `${data.progress?.streak_days ?? 0} ${(data.progress?.streak_days ?? 0) === 1 ? 'dia' : 'dias'}`, ctx: `última prática ${ago(data.progress?.last_practice_date ? `${data.progress.last_practice_date}T12:00:00Z` : null)}` },
          ].map(k => (
            <div key={k.label} className="kpi-card col-3">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: k.small ? '1.05rem' : '1.6rem', lineHeight: 1.25, color: k.color ?? 'var(--t1)' }}>{k.value}</div>
              <div className="kpi-footer"><span className="kpi-context">{k.ctx}</span></div>
            </div>
          ))}

          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Frequência</div><div className="adm-panel-sub">{data.activity.total} práticas</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Heatmap byDay={data.activity.byDay} days={data.days} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(data.activity.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <span key={t} className="badge badge-muted" style={{ fontSize: 12 }}>{practiceLabel(t)} <b className="num">{n}</b></span>
                ))}
              </div>
            </div>
          </div>

          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Vocabulário</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', gap: 24 }}>
              <div><div className="kpi-label">Palavras salvas</div><div className="kpi-value num" style={{ fontSize: '1.4rem' }}>{data.vocabulary.saved}</div></div>
              <div><div className="kpi-label">Revisões pendentes</div><div className="kpi-value num" style={{ fontSize: '1.4rem', color: data.vocabulary.dueReviews > 20 ? 'var(--warn)' : 'var(--t1)' }}>{data.vocabulary.dueReviews}</div></div>
            </div>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Acerto por tipo de exercício</div></div>
            <table className="adm-table"><tbody>
              {data.byExercise.length === 0 && <tr><td style={{ color: 'var(--t3)' }}>Sem respostas na trilha no período.</td></tr>}
              {data.byExercise.map(e => (
                <tr key={e.type}>
                  <td>{exLabel(e.type)}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--t3)' }}>{e.answers}</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(e.accuracy) }}>{e.accuracy ?? 0}%</td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Tópicos com menor acerto</div></div>
            <table className="adm-table"><tbody>
              {data.topics.length === 0 && <tr><td style={{ color: 'var(--t3)' }}>Sem respostas na trilha no período.</td></tr>}
              {data.topics.slice(0, 8).map(t => (
                <tr key={`${t.level}${t.module}${t.topic}`}>
                  <td><div style={{ color: 'var(--t1)', fontWeight: 600 }}>{t.topic}</div><div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{t.level} · {t.module}</div></td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(t.accuracy) }}>{t.accuracy}%</td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Pronúncia</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.pronunciation.topWords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {data.pronunciation.topWords.map(w => <span key={w.word} className="badge badge-err">{w.word} <span className="num" style={{ opacity: 0.7 }}>{w.count}</span></span>)}
                </div>
              )}
              {data.pronunciation.recent.length === 0 && <div className="adm-empty-sub">Sem frases no período.</div>}
              {data.pronunciation.recent.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span style={{ color: 'var(--t1)' }}>{p.phrase}</span>
                  <span className="num" style={{ fontWeight: 700, color: accColor(p.score), flexShrink: 0 }}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr">
              <div className="adm-panel-title">Gramática</div>
              <div className="adm-panel-sub">{data.grammar.errorFree != null ? `${data.grammar.errorFree}% sem erro · ${data.grammar.analyzed} ${data.grammar.analyzed === 1 ? 'frase' : 'frases'}` : ''}</div>
            </div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.grammar.corrections.length === 0 && <div className="adm-empty-sub">Sem correções no período.</div>}
              {data.grammar.corrections.map((c, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--err)', textDecoration: 'line-through' }}>{c.wrong}</span>
                  <span style={{ color: 'var(--t3)' }}> → </span>
                  <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{c.right}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Conversas recentes</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.sessions.length === 0 && <div className="adm-empty-sub">Nenhuma conversa.</div>}
              {data.sessions.map(s => (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{s.title ?? 'Conversa'}</span>
                    <span style={{ color: 'var(--t3)', fontSize: 12 }}>{fmtDate(s.started_at)}</span>
                  </div>
                  {s.summary && <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 3, lineHeight: 1.45 }}>{s.summary}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Anotações</div><div className="adm-panel-sub">{data.notes.length}</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {canNote && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea className="adm-input-sm" style={{ flex: 1, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Nova anotação" value={note} onChange={e => setNote(e.target.value)} />
                  <button className="adm-btn-sm primary" disabled={saving || !note.trim()} onClick={addNote} style={{ alignSelf: 'flex-end' }}><Send size={13} /> Salvar</button>
                </div>
              )}
              {data.notes.length === 0 && <div className="adm-empty-sub">Nenhuma anotação.</div>}
              {data.notes.map(n => (
                <div key={n.id} style={{ borderTop: '1px solid var(--b1)', paddingTop: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>{n.author_name ?? '—'} · {fmtDate(n.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
