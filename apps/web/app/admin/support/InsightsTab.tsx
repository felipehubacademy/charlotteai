'use client';

// Aba Insights do /admin/suporte: o que a IA tirou das conversas (assuntos, problemas
// de UX por tela, pedidos de função) e as sugestões de FAQ para aprovar ou descartar.
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, X, Sparkles } from 'lucide-react';

interface Insights {
  days: number;
  totals: { conversations: number; analyzed: number };
  byCategory: { key: string; count: number }[];
  byResolution: { key: string; count: number }[];
  bySentiment: { key: string; count: number }[];
  topics: { topic: string; count: number; category: string | null; lastAt: string; conversationId: string }[];
  uxByScreen: { screen: string; count: number; items: { issue: string; conversationId: string; at: string }[] }[];
  featureRequests: { text: string; conversationId: string; at: string }[];
  faqSuggestions: { conversationId: string; at: string; topic: string | null; question: string | null; answer: string | null; contact: string | null; channel: string | null }[];
}

const CATEGORY: Record<string, string> = {
  conta: 'Conta', assinatura: 'Assinatura', duvida_uso: 'Dúvida de uso', bug: 'Bug', conteudo: 'Conteúdo',
  sugestao: 'Sugestão', elogio: 'Elogio', outro: 'Outro',
};
const RESOLUTION: Record<string, string> = { ia: 'Resolvida pela IA', humano: 'Resolvida por atendente', sem_resposta: 'Sem resposta', em_aberto: 'Em aberto' };
const SCREEN: Record<string, string> = {
  inicio: 'Tela Inicial', trilha: 'Trilha', live_voice: 'Live Voice', practice: 'Practice', vocabulario: 'Vocabulário',
  perfil: 'Perfil', progresso: 'Seu progresso', metas: 'Metas', ranking: 'Ranking', estudar_junto: 'Estudar junto',
  assinatura: 'Assinatura', login: 'Login', notificacoes: 'Notificações', outro: 'Outro',
};
const SECTIONS = ['Guia do app', 'Problemas comuns', 'Planos e assinatura', 'Conta e acesso', 'Sobre o app', 'Contato'];
const fmt = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function InsightsTab({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/support/insights?days=${days}`);
      if (r.ok) setData(await r.json()); else setErr('Não foi possível carregar os insights.');
    } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(null); setLoading(true);
    const r = await fetch('/api/admin/support/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run' }) });
    const j = await r.json().catch(() => ({}));
    setRunning(r.ok ? `${j.analyzed ?? 0} conversa(s) analisada(s)${j.pending ? `, ${j.pending} na fila` : ''}.` : 'Não foi possível analisar agora.');
    await load();
  };

  const total = data?.totals.analyzed ?? 0;
  const resolvedByAI = data?.byResolution.find(r => r.key === 'ia')?.count ?? 0;
  const negative = data?.bySentiment.find(r => r.key === 'negativo')?.count ?? 0;
  const pct = (n: number) => total ? `${Math.round((n / total) * 100)}%` : '—';

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[7, 30, 90].map(d => (
          <div key={d} className={`adm-chip${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>{d} dias</div>
        ))}
        <div style={{ flex: 1 }} />
        {running && <span style={{ fontSize: 12, color: 'var(--t3)' }}>{running}</span>}
        <button className="adm-btn-sm ghost" disabled={loading} onClick={runNow}><Sparkles size={13} /> Analisar agora</button>
        <button className="adm-btn-sm ghost" disabled={loading} onClick={load}><RefreshCw size={13} /> Atualizar</button>
      </div>
      {err && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <Kpi label="Conversas no período" value={String(data?.totals.conversations ?? '—')} ctx={`${total} analisadas`} />
        <Kpi label="Resolvidas pela IA" value={pct(resolvedByAI)} ctx={`${resolvedByAI} de ${total}`} />
        <Kpi label="Sentimento negativo" value={pct(negative)} ctx={`${negative} conversa(s)`} />
        <Kpi label="Sugestões de FAQ" value={String(data?.faqSuggestions.length ?? '—')} ctx="aguardando decisão" />
      </div>

      <FaqSuggestions items={data?.faqSuggestions ?? []} onOpen={onOpenConversation} onChanged={load} />

      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <div className="col-6 adm-panel">
          <div className="adm-panel-hdr"><div className="adm-panel-title">Assuntos mais frequentes</div></div>
          <List empty="Nenhum assunto ainda." rows={(data?.topics ?? []).map(t => ({
            key: t.topic, left: t.topic, sub: t.category ? CATEGORY[t.category] ?? t.category : '', right: String(t.count), onClick: () => onOpenConversation(t.conversationId),
          }))} />
        </div>
        <div className="col-6 adm-panel">
          <div className="adm-panel-hdr"><div className="adm-panel-title">Por categoria e resolução</div></div>
          <List empty="Sem dados." rows={[
            ...(data?.byCategory ?? []).map(c => ({ key: `c-${c.key}`, left: CATEGORY[c.key] ?? c.key, sub: 'categoria', right: String(c.count) })),
            ...(data?.byResolution ?? []).map(c => ({ key: `r-${c.key}`, left: RESOLUTION[c.key] ?? c.key, sub: 'resolução', right: String(c.count) })),
          ]} />
        </div>
      </div>

      <div className="adm-grid">
        <div className="col-6 adm-panel">
          <div className="adm-panel-hdr">
            <div className="adm-panel-title">Problemas de UX por tela</div>
            <div className="adm-panel-sub">O que os alunos não acham ou não entendem</div>
          </div>
          {(data?.uxByScreen ?? []).length === 0 ? <Empty text="Nenhum problema de UX apontado." /> : (
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data!.uxByScreen.map(s => (
                <div key={s.screen}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>{SCREEN[s.screen] ?? s.screen} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>· {s.count}</span></div>
                  {s.items.map((i, n) => (
                    <div key={n} onClick={() => onOpenConversation(i.conversationId)} style={{ fontSize: 12.5, color: 'var(--t2)', padding: '4px 0', cursor: 'pointer', borderBottom: '1px solid var(--b1)' }}>{i.issue}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-6 adm-panel">
          <div className="adm-panel-hdr">
            <div className="adm-panel-title">Pedidos de função</div>
            <div className="adm-panel-sub">Ideias para próximas versões</div>
          </div>
          <List empty="Nenhum pedido de função." rows={(data?.featureRequests ?? []).map((f, n) => ({
            key: String(n), left: f.text, sub: fmt(f.at), right: '', onClick: () => onOpenConversation(f.conversationId),
          }))} />
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, ctx }: { label: string; value: string; ctx: string }) {
  return (
    <div className="col-3 kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer"><span className="kpi-context">{ctx}</span></div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="adm-empty"><div className="adm-empty-title">{text}</div></div>;
}

function List({ rows, empty }: { rows: { key: string; left: string; sub: string; right: string; onClick?: () => void }[]; empty: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <table className="adm-table">
      <tbody>
        {rows.map(r => (
          <tr key={r.key} onClick={r.onClick} style={r.onClick ? { cursor: 'pointer' } : undefined}>
            <td style={{ color: 'var(--t1)' }}>{r.left}{r.sub && <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{r.sub}</div>}</td>
            <td className="num" style={{ textAlign: 'right', width: 60 }}>{r.right}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FaqSuggestions({ items, onOpen, onChanged }: { items: Insights['faqSuggestions']; onOpen: (id: string) => void; onChanged: () => void }) {
  if (!items.length) return null;
  return (
    <div className="adm-panel" style={{ marginBottom: 20 }}>
      <div className="adm-panel-hdr">
        <div className="adm-panel-title">Sugestões de FAQ</div>
        <div className="adm-panel-sub">Dúvidas que a FAQ não cobre. Revise o texto antes de aprovar: entra na FAQ da IA na hora.</div>
      </div>
      <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(s => <Suggestion key={s.conversationId} s={s} onOpen={onOpen} onChanged={onChanged} />)}
      </div>
    </div>
  );
}

function Suggestion({ s, onOpen, onChanged }: { s: Insights['faqSuggestions'][number]; onOpen: (id: string) => void; onChanged: () => void }) {
  const [question, setQuestion] = useState(s.question ?? '');
  const [answer, setAnswer] = useState(s.answer ?? '');
  const [section, setSection] = useState('Guia do app');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (decision: 'approve' | 'dismiss') => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/admin/support/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'faq', conversationId: s.conversationId, decision, question, answer, section }),
      });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? 'Não foi possível salvar.'); return; }
      onChanged();
    } finally { setBusy(false); }
  };
  return (
    <div style={{ border: '1px solid var(--b1)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
        {s.topic ?? 'Sem assunto'} · {s.contact ?? '—'} · {fmt(s.at)} · <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onOpen(s.conversationId)}>ver conversa</span>
      </div>
      <input className="adm-input" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Pergunta" />
      <textarea className="adm-input" rows={3} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="A conversa não trouxe uma resposta confiável. Escreva a resposta antes de aprovar." style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="adm-input" style={{ width: 'auto' }} value={section} onChange={e => setSection(e.target.value)}>
          {SECTIONS.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {err && <span style={{ fontSize: 12, color: 'var(--err)' }}>{err}</span>}
        <button className="adm-btn-sm ghost" disabled={busy} onClick={() => decide('dismiss')}><X size={12} /> Descartar</button>
        <button className="adm-btn-sm primary" disabled={busy || !question.trim() || !answer.trim()} onClick={() => decide('approve')}><Check size={12} /> Aprovar na FAQ</button>
      </div>
    </div>
  );
}
