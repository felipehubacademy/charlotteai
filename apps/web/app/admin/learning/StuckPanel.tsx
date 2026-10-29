'use client';
// "Onde os alunos travam" — tentativas da trilha (learn_attempts): frases de fala e respostas de
// gramática que mais reprovam (com o que o app entendeu / o que o aluno escreveu), saídas no meio
// da atividade e falhas de microfone e de reconhecimento de voz. Mesmo cálculo do alerta diário.
import { useEffect, useState } from 'react';
import type { StuckReport, StuckItem } from '@/lib/learn-stuck';
import { accColor } from './labels';

const where = (i: { level: string; module: string | null; unit: string | null }) => `${i.level} · ${i.module ?? '—'}${i.unit ? ` / ${i.unit}` : ''}`;

function ItemsTable({ items, empty, answerLabel }: { items: StuckItem[]; empty: string; answerLabel: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="adm-table">
        <thead><tr>
          <th>Esperado</th><th style={{ textAlign: 'right' }}>Alunos</th><th style={{ textAlign: 'right' }}>Travados</th>
          <th style={{ textAlign: 'right' }}>Reprovação</th><th style={{ textAlign: 'right' }}>Pulos</th><th>{answerLabel}</th>
        </tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--t3)' }}>{empty}</td></tr>}
          {items.slice(0, 15).map(i => (
            <tr key={`${i.level}${i.module}${i.unit}${i.expected}`}>
              <td>
                <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{i.expected}</div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{where(i)}</div>
              </td>
              <td className="num" style={{ textAlign: 'right' }}>{i.students}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{i.stuckStudents}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: accColor(100 - i.failRate) }}>{i.failRate}%</td>
              <td className="num" style={{ textAlign: 'right' }}>{i.skips}</td>
              <td style={{ fontSize: 12, color: 'var(--t2)' }}>{i.samples.map(s => `"${s}"`).join(' · ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StuckPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<StuckReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null); setError('');
    fetch(`/api/admin/learning/stuck?days=${days}`)
      .then(async r => { if (!r.ok) throw new Error(`Erro ${r.status}`); setData(await r.json()); })
      .catch(e => setError(e instanceof Error ? e.message : 'Erro'));
  }, [days]);
  const t = data?.totals;

  return (
    <div className="adm-panel col-12">
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Onde os alunos travam <span className="adm-panel-sub">· tentativa por tentativa</span></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 7, 30].map(d => (
            <button key={d} className={`adm-chip${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>{d === 1 ? '24h' : `${d} dias`}</button>
          ))}
        </div>
      </div>
      <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {error && <div className="adm-alert crit">{error}</div>}
        {!data && !error && <div style={{ color: 'var(--t3)', fontSize: 13 }}>Carregando…</div>}
        {t && (
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>
            {t.attempts.toLocaleString('pt-BR')} tentativas de {t.students} aluno(s) · {t.fails} reprovações · {t.skips} pulos · {t.exits} saídas no meio · {t.asrErrors} falhas do reconhecimento · {t.micBlocked} microfone bloqueado
          </div>
        )}
        {data && data.alerts.length > 0 && (
          <div className="adm-alert warn">
            <b>Pede atenção</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {data.alerts.slice(0, 12).map(a => <li key={a} style={{ marginBottom: 4 }}>{a}</li>)}
            </ul>
          </div>
        )}
        {data && (
          <>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Fala (Listening &amp; Speaking)</div>
              <ItemsTable items={data.speaking} empty="Nenhuma reprovação no período." answerLabel="O app entendeu" />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Gramática</div>
              <ItemsTable items={data.grammar} empty="Nenhum erro no período." answerLabel="O aluno respondeu" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Saídas no meio da atividade</div>
                <table className="adm-table">
                  <thead><tr><th>Onde</th><th>Passo</th><th style={{ textAlign: 'right' }}>Alunos</th></tr></thead>
                  <tbody>
                    {data.exits.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--t3)' }}>Nenhuma saída no período.</td></tr>}
                    {data.exits.slice(0, 10).map(e => (
                      <tr key={`${e.level}${e.module}${e.unit}${e.activity}${e.step}`}>
                        <td>{where(e)} <span style={{ color: 'var(--t3)' }}>({e.activity === 'speaking' ? 'fala' : 'gramática'})</span></td>
                        <td className="num">{(e.step ?? 0) + 1}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{e.students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Microfone e reconhecimento de voz</div>
                <table className="adm-table">
                  <thead><tr><th>Problema</th><th>Aparelho</th><th style={{ textAlign: 'right' }}>Alunos</th></tr></thead>
                  <tbody>
                    {data.failures.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--t3)' }}>Nenhuma falha no período.</td></tr>}
                    {data.failures.slice(0, 10).map(f => (
                      <tr key={`${f.kind}${f.code}${f.platform}${f.version}`}>
                        <td>{f.kind === 'mic_blocked' ? 'Microfone bloqueado' : `Reconhecimento falhou (${f.code})`}</td>
                        <td>{f.platform} {f.version}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{f.students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
