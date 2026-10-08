'use client';
// Pedagógico — desempenho e estudo dos alunos. Sem dados financeiros.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { exLabel, practiceLabel, accColor, ago } from './labels';

interface Overview {
  days: number;
  summary: {
    students: number; active: number; practices: number;
    trailAccuracy: number | null; trailAnswers: number;
    pronunciationAvg: number | null; pronunciationAttempts: number;
    grammarAnalyzed: number; grammarErrorFree: number | null;
  };
  byLevel: Record<string, number>;
  byType: Record<string, number>;
  byExercise: { type: string; answers: number; accuracy: number | null }[];
  hardestTopics: { level: string; module: string; topic: string; answers: number; students: number; accuracy: number }[];
  mispronounced: { word: string; count: number }[];
  idle: { id: string; name: string | null; level: string | null; days: number }[];
  students: {
    id: string; name: string | null; level: string | null; xp: number; streak: number; lastPractice: string | null;
    practices: number; trailAccuracy: number | null; trailAnswers: number; pronunciation: number | null;
  }[];
}

const PERIODS = [7, 30, 90];
const LEVELS = ['Novice', 'Inter', 'Advanced'];
const nameOf = (n: string | null) => n?.trim() || 'Sem nome';

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'var(--b1)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  );
}

export default function LearningPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');

  const load = useCallback(async () => {
    setData(null); setError('');
    const r = await fetch(`/api/admin/learning?days=${days}`);
    if (!r.ok) { setError(r.status === 403 ? 'Sem acesso ao pedagógico.' : `Erro ${r.status}`); return; }
    setData(await r.json());
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const students = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.students.filter(s => (!level || s.level === level) && (!t || nameOf(s.name).toLowerCase().includes(t)));
  }, [data, q, level]);

  const s = data?.summary;
  const typeTotal = data ? Object.values(data.byType).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div className="adm-topbar-title">Pedagógico</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p} className={`adm-chip${days === p ? ' active' : ''}`} onClick={() => setDays(p)}>{p} dias</button>
          ))}
        </div>
      </div>

      <div className="adm-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="adm-grid">
          {[
            { label: 'Alunos ativos', value: s ? `${s.active}` : '—', ctx: s ? `de ${s.students} cadastrados` : '' },
            { label: 'Acerto na trilha', value: s?.trailAccuracy != null ? `${s.trailAccuracy}%` : '—', ctx: s ? `${s.trailAnswers.toLocaleString('pt-BR')} respostas` : '', color: accColor(s?.trailAccuracy ?? null) },
            { label: 'Média de pronúncia', value: s?.pronunciationAvg != null ? `${s.pronunciationAvg}` : '—', ctx: s ? `${s.pronunciationAttempts} frases` : '', color: accColor(s?.pronunciationAvg ?? null) },
            { label: 'Gramática sem erro', value: s?.grammarErrorFree != null ? `${s.grammarErrorFree}%` : '—', ctx: s ? `${s.grammarAnalyzed} frases analisadas` : '', color: accColor(s?.grammarErrorFree ?? null) },
          ].map(k => (
            <div key={k.label} className="kpi-card col-3">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: '1.6rem', color: k.color ?? 'var(--t1)' }}>{k.value}</div>
              <div className="kpi-footer"><span className="kpi-context">{k.ctx}</span></div>
            </div>
          ))}

          {/* Onde os alunos travam */}
          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Tópicos com menor acerto</div></div>
            <table className="adm-table">
              <thead><tr><th>Tópico</th><th>Nível</th><th style={{ textAlign: 'right' }}>Alunos</th><th style={{ textAlign: 'right' }}>Acerto</th></tr></thead>
              <tbody>
                {!data && <tr><td colSpan={4}>Carregando…</td></tr>}
                {data && data.hardestTopics.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--t3)' }}>Poucas respostas no período.</td></tr>}
                {data?.hardestTopics.map(t => (
                  <tr key={`${t.level}${t.module}${t.topic}`}>
                    <td>
                      <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{t.topic}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{t.module}</div>
                    </td>
                    <td>{t.level}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{t.students}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(t.accuracy) }}>{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alunos por nível */}
          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Alunos por nível</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data && Object.entries(data.byLevel).sort((a, b) => LEVELS.indexOf(a[0]) - LEVELS.indexOf(b[0])).map(([l, n]) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{l}</span>
                    <span className="num" style={{ color: 'var(--t2)' }}>{n}</span>
                  </div>
                  <Bar value={(n / Math.max(1, data.summary.students)) * 100} color="#6B4BFF" />
                </div>
              ))}
            </div>
          </div>

          {/* Acerto por tipo de exercício */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Acerto por tipo de exercício</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {data?.byExercise.filter(e => e.answers >= 5).map(e => (
                <div key={e.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--t1)' }}>{exLabel(e.type)}</span>
                    <span className="num"><b style={{ color: accColor(e.accuracy) }}>{e.accuracy ?? 0}%</b> <span style={{ color: 'var(--t3)' }}>· {e.answers}</span></span>
                  </div>
                  <Bar value={e.accuracy ?? 0} color={accColor(e.accuracy)} />
                </div>
              ))}
            </div>
          </div>

          {/* Prática por tipo */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Prática por tipo</div><div className="adm-panel-sub">{s?.practices.toLocaleString('pt-BR')}</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {data && Object.entries(data.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <div key={t}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--t1)' }}>{practiceLabel(t)}</span>
                    <span className="num" style={{ color: 'var(--t2)' }}>{n.toLocaleString('pt-BR')}</span>
                  </div>
                  <Bar value={(n / Math.max(1, typeTotal)) * 100} color="#16131F" />
                </div>
              ))}
            </div>
          </div>

          {/* Palavras mais difíceis de pronunciar */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Palavras com mais erro de pronúncia</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data && data.mispronounced.length === 0 && <div className="adm-empty-sub">Sem dados no período.</div>}
              {data?.mispronounced.map(w => (
                <span key={w.word} className="badge badge-err" style={{ fontSize: 12.5 }}>{w.word} <span className="num" style={{ opacity: 0.7 }}>{w.count}</span></span>
              ))}
            </div>
          </div>

          {/* Parados há mais de 7 dias */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Sem praticar há mais de 7 dias</div><div className="adm-panel-sub">{data?.idle.length ?? ''}</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data && data.idle.length === 0 && <div className="adm-empty-sub">Ninguém parado.</div>}
              {data?.idle.map(i => (
                <Link key={i.id} href={`/admin/learning/${i.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, textDecoration: 'none', color: 'var(--t1)' }}>
                  <span>{nameOf(i.name)} <span style={{ color: 'var(--t3)' }}>· {i.level ?? '—'}</span></span>
                  <span className="num" style={{ color: 'var(--warn)' }}>{i.days} dias</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Alunos */}
          <div className="adm-panel col-12">
            <div className="adm-panel-hdr">
              <div className="adm-panel-title">Alunos <span className="adm-panel-sub">· {students.length}</span></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
                  <input className="adm-input-sm" style={{ paddingLeft: 30, width: 200 }} placeholder="Buscar" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <select className="adm-select-ghost" value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="">Todos os níveis</option>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Aluno</th><th>Nível</th><th>Última prática</th>
                    <th style={{ textAlign: 'right' }}>Práticas</th><th style={{ textAlign: 'right' }}>Sequência</th>
                    <th style={{ textAlign: 'right' }}>Acerto na trilha</th><th style={{ textAlign: 'right' }}>Pronúncia</th><th style={{ textAlign: 'right' }}>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {!data && <tr><td colSpan={8}>Carregando…</td></tr>}
                  {students.slice(0, 300).map(st => (
                    <tr key={st.id}>
                      <td><Link href={`/admin/learning/${st.id}`} style={{ color: 'var(--t1)', fontWeight: 600, textDecoration: 'none' }}>{nameOf(st.name)}</Link></td>
                      <td>{st.level ?? '—'}</td>
                      <td style={{ color: 'var(--t2)' }}>{ago(st.lastPractice)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{st.practices}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{st.streak}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(st.trailAccuracy) }}>{st.trailAccuracy != null ? `${st.trailAccuracy}%` : '—'}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(st.pronunciation) }}>{st.pronunciation ?? '—'}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{st.xp.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
