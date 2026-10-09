'use client';
// Ficha do aluno — CRM e CS: quem é, como está usando, risco de cancelar,
// conversas, suporte, pagamentos, anotações da equipe e etiquetas.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag, X, Send, GraduationCap } from 'lucide-react';
import { useAdminMe, canArea } from '@/lib/admin-context';

interface Crm {
  user: Record<string, any>;
  progress: { total_xp: number; streak_days: number; last_practice_date: string | null } | null;
  risk: { score: number; label: 'Baixo' | 'Médio' | 'Alto' | 'Perdido'; reasons: string[] };
  activity: { byDay: Record<string, number>; byType: Record<string, number>; total60d: number; practices7d: number; xp60d: number };
  sessions: { id: string; title: string | null; summary: string | null; started_at: string; message_count: number }[];
  support: { id: string; channel: string; subject: string | null; status: string; created_at: string }[];
  payments: { event_type: string; product_id: string | null; store: string | null; net_brl: number; purchased_at: string }[];
  notes: { id: string; body: string; author_name: string | null; created_at: string }[];
  tags: string[];
}

const TYPE_LABEL: Record<string, string> = {
  text_message: 'Mensagens', audio_message: 'Áudios', grammar_message: 'Gramática', learn_session: 'Trilha',
  live_voice: 'Live Voice', pronunciation: 'Pronúncia', vocab_review: 'Revisão de vocabulário',
};
const STATUS_LABEL: Record<string, string> = { active: 'Assinante', trial: 'Teste grátis', cancelled: 'Cancelou renovação', expired: 'Expirado', none: 'Sem plano' };
const SUGGESTED_TAGS = ['vip', 'b2b', 'reclamou', 'promotor', 'precisa contato', 'parceiro igor'];

const fmt = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const riskClass = (l: string) => (l === 'Alto' || l === 'Perdido' ? 'badge-err' : l === 'Médio' ? 'badge-warn' : 'badge-ok');

function ActivityStrip({ byDay }: { byDay: Record<string, number> }) {
  const days = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(Date.now() - (59 - i) * 86400000).toISOString().slice(0, 10);
    return { d, n: byDay[d] ?? 0 };
  });
  const max = Math.max(1, ...days.map(x => x.n));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
        {days.map(x => (
          <div key={x.d} title={`${fmt(x.d)}: ${x.n} prática${x.n === 1 ? '' : 's'}`}
            style={{ flex: 1, height: `${Math.max(x.n ? 8 : 3, (x.n / max) * 100)}%`, background: x.n ? '#16131F' : 'var(--b1)', borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
        <span>há 60 dias</span><span>hoje</span>
      </div>
    </div>
  );
}

export default function UserCrmPage() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const me = useAdminMe();
  const canWrite = canArea(me, 'users:write');
  const canLearning = canArea(me, 'learning');
  const [data, setData] = useState<Crm | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/crm?userId=${id}`);
    if (!r.ok) { setError(r.status === 403 ? 'Seu papel não acessa usuários.' : `HTTP ${r.status}`); return; }
    setData(await r.json());
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await fetch('/api/admin/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, action: 'note', body: note }) });
    setNote(''); setSaving(false); load();
  };
  const saveTags = async (tags: string[]) => {
    setData(d => (d ? { ...d, tags } : d));
    await fetch('/api/admin/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, action: 'tags', tags }) });
  };

  if (error) return <div className="adm-body"><div className="adm-alert crit">{error}</div></div>;
  if (!data) return <div className="adm-body"><div className="adm-empty"><div className="adm-empty-sub">Carregando ficha…</div></div></div>;

  const u = data.user;
  const lastActive = Object.keys(data.activity.byDay).sort().pop() ?? u.last_practice_at;

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <Link href="/admin" className="adm-btn-sm ghost"><ArrowLeft size={13} /> Usuários</Link>
        <div className="adm-topbar-title">{u.name ?? u.email} </div>
        <span className={`badge ${riskClass(data.risk.label)}`}>Risco {data.risk.label.toLowerCase()}{data.risk.label !== 'Perdido' ? ` · ${data.risk.score}` : ''}</span>
        {canLearning && <Link href={`/admin/learning/${id}`} className="adm-btn-sm ghost" style={{ marginLeft: 'auto' }}><GraduationCap size={13} /> Pedagógico</Link>}
      </div>

      <div className="adm-body">
        <div className="adm-grid">
          {/* Resumo */}
          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Quem é</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {[
                ['E-mail', u.email],
                ['@ no app', u.username ? `@${u.username}` : '—'],
                ['Nível', u.charlotte_level ?? '—'],
                ['Plano', u.is_institutional ? 'Institucional' : (STATUS_LABEL[u.subscription_status] ?? u.subscription_status)],
                ['Produto', u.subscription_product ?? '—'],
                [u.subscription_status === 'trial' ? 'Teste até' : 'Acesso até', fmt(u.subscription_status === 'trial' ? u.trial_ends_at : u.subscription_expires_at)],
                ['Cadastro', fmt(u.created_at)],
                ['Última prática', fmt(lastActive)],
                ['App', [u.app_platform, u.app_version].filter(Boolean).join(' · ') || '—'],
                ['E-mails de marketing', u.marketing_opt_out ? 'Não aceita' : 'Aceita'],
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--t3)' }}>{k}</span><span style={{ color: 'var(--t1)', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risco e engajamento */}
          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Engajamento e risco</div><div className="adm-panel-sub">últimos 60 dias</div></div>
            <div className="adm-panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  ['XP total', (data.progress?.total_xp ?? 0).toLocaleString('pt-BR')],
                  ['Sequência', `${data.progress?.streak_days ?? 0} ${(data.progress?.streak_days ?? 0) === 1 ? 'dia' : 'dias'}`],
                  ['Práticas em 7 dias', String(data.activity.practices7d)],
                  ['XP em 60 dias', data.activity.xp60d.toLocaleString('pt-BR')],
                ].map(([k, v]) => (
                  <div key={k}><div className="kpi-label" style={{ marginBottom: 4 }}>{k}</div><div className="num" style={{ fontSize: 20, fontWeight: 800 }}>{v}</div></div>
                ))}
              </div>
              <ActivityStrip byDay={data.activity.byDay} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {Object.entries(data.activity.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <span key={t} className="badge badge-muted">{TYPE_LABEL[t] ?? t} · {n}</span>
                ))}
              </div>
              {data.risk.reasons.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--s2)', borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Por que esse risco</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
                    {data.risk.reasons.map(r => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Etiquetas */}
          <div className="adm-panel col-12">
            <div className="adm-panel-hdr"><div className="adm-panel-title"><Tag size={13} style={{ verticalAlign: -2 }} /> Etiquetas</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {data.tags.map(t => (
                <span key={t} className="badge badge-accent" style={{ fontSize: 12 }}>
                  {t} {canWrite && <button onClick={() => saveTags(data.tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} /></button>}
                </span>
              ))}
              {canWrite && (
                <>
                  <input className="adm-input-sm" style={{ width: 170 }} placeholder="Nova etiqueta + Enter" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { saveTags([...data.tags, tagInput.trim().toLowerCase()]); setTagInput(''); } }} />
                  {SUGGESTED_TAGS.filter(t => !data.tags.includes(t)).map(t => (
                    <button key={t} className="adm-chip" onClick={() => saveTags([...data.tags, t])}>+ {t}</button>
                  ))}
                </>
              )}
              {!canWrite && data.tags.length === 0 && <div className="adm-empty-sub">Sem etiquetas.</div>}
            </div>
          </div>

          {/* Anotações */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Anotações da equipe</div><div className="adm-panel-sub">{data.notes.length}</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {canWrite && <div style={{ display: 'flex', gap: 8 }}>
                <textarea className="adm-input-sm" style={{ flex: 1, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Nova anotação" value={note} onChange={e => setNote(e.target.value)} />
                <button className="adm-btn-sm primary" disabled={saving || !note.trim()} onClick={addNote} style={{ alignSelf: 'flex-end' }}><Send size={13} /> Salvar</button>
              </div>}
              {data.notes.length === 0 && <div className="adm-empty-sub">Nenhuma anotação ainda.</div>}
              {data.notes.map(n => (
                <div key={n.id} style={{ borderTop: '1px solid var(--b1)', paddingTop: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>{n.author_name ?? 'Equipe'} · {new Date(n.created_at).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Linha do tempo: conversas, suporte, pagamentos */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Histórico</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Pagamentos</div>
                {data.payments.length === 0 ? <div className="adm-empty-sub">Nenhum pagamento.</div> : data.payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--t2)', padding: '3px 0' }}>
                    <span>{fmt(p.purchased_at)} · {p.event_type === 'REFUND' ? 'Reembolso' : p.event_type === 'RENEWAL' ? 'Renovação' : 'Compra'} · {p.store === 'PLAY_STORE' ? 'Google Play' : 'App Store'}</span>
                    <span className="num" style={{ color: p.event_type === 'REFUND' ? 'var(--err)' : 'var(--ok)', fontWeight: 700 }}>{brl(p.net_brl)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Suporte</div>
                {data.support.length === 0 ? <div className="adm-empty-sub">Nenhum chamado.</div> : data.support.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--t2)', padding: '3px 0', gap: 8 }}>
                    <span>{fmt(s.created_at)} · {s.subject ?? s.channel}</span><span className="badge badge-muted">{s.status}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Conversas no Free Chat</div>
                {data.sessions.length === 0 ? <div className="adm-empty-sub">Nenhuma conversa.</div> : data.sessions.map(s => (
                  <div key={s.id} style={{ color: 'var(--t2)', padding: '3px 0' }}>
                    {fmt(s.started_at)} · <b style={{ color: 'var(--t1)' }}>{s.title ?? 'Conversa'}</b> · {s.message_count} msg
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
