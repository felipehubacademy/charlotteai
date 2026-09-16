'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Check, X, Pencil, Headphones } from 'lucide-react';

interface Agent { id: string; name: string; email: string | null; whatsapp: string | null; is_active: boolean; }
interface Conversation {
  id: string; channel: string; contact: string; subject: string | null; status: string;
  agentName: string | null; lastMessageAt: string; last: { body: string; direction: string; intent: string | null } | null;
}

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-muted', escalated: 'badge-warn', auto_resolved: 'badge-ok', closed: 'badge-muted',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta', escalated: 'Escalada', auto_resolved: 'Auto-resolvida', closed: 'Fechada',
};

const fmt = (s: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function SupportAdmin() {
  const [secret, setSecret] = useState('');
  const [tab, setTab] = useState<'agents' | 'queue'>('queue');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; agent?: Agent } | null>(null);

  useEffect(() => { setSecret(sessionStorage.getItem('adminSecret') ?? ''); }, []);

  const headers = useCallback(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret]);

  const loadAgents = useCallback(async () => {
    const r = await fetch('/api/admin/support/agents', { headers: headers() });
    if (r.ok) setAgents((await r.json()).agents ?? []);
  }, [headers]);

  const loadQueue = useCallback(async () => {
    const r = await fetch(`/api/admin/support/conversations${statusFilter ? `?status=${statusFilter}` : ''}`, { headers: headers() });
    if (r.ok) { const j = await r.json(); setConvs(j.conversations ?? []); setCounts(j.counts ?? {}); }
  }, [headers, statusFilter]);

  useEffect(() => { if (secret) { setLoading(true); Promise.all([loadAgents(), loadQueue()]).finally(() => setLoading(false)); } }, [secret, loadAgents, loadQueue]);

  const saveAgent = async (a: { id?: string; name: string; email: string; whatsapp: string; is_active: boolean }) => {
    const method = a.id ? 'PATCH' : 'POST';
    await fetch('/api/admin/support/agents', { method, headers: headers(), body: JSON.stringify(a) });
    setModal(null); loadAgents();
  };
  const toggleActive = async (a: Agent) => {
    await fetch('/api/admin/support/agents', { method: 'PATCH', headers: headers(), body: JSON.stringify({ id: a.id, is_active: !a.is_active }) });
    loadAgents();
  };

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <Headphones size={18} color="var(--accent)" />
        <div className="adm-topbar-title">Suporte <span className="adm-topbar-sub">· atendimento automatizado</span></div>
        <button className="adm-btn-sm ghost" onClick={() => { loadAgents(); loadQueue(); }}><RefreshCw size={13} /> Atualizar</button>
      </div>

      <div className="adm-tabs">
        <div className={`adm-tab${tab === 'queue' ? ' active' : ''}`} onClick={() => setTab('queue')}>Fila</div>
        <div className={`adm-tab${tab === 'agents' ? ' active' : ''}`} onClick={() => setTab('agents')}>Atendentes ({agents.length})</div>
      </div>

      <div className="adm-body">
        {tab === 'queue' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['', 'escalated', 'open', 'auto_resolved'].map(s => (
                <div key={s} className={`adm-chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === '' ? 'Todas' : STATUS_LABEL[s]}{s && counts[s] != null ? ` (${counts[s]})` : ''}
                </div>
              ))}
            </div>
            <div className="adm-panel">
              {convs.length === 0 ? (
                <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhuma conversa'}</div><div className="adm-empty-sub">As conversas de suporte aparecem aqui.</div></div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Contato</th><th>Canal</th><th>Assunto / última</th><th>Status</th><th>Atendente</th><th>Quando</th></tr></thead>
                  <tbody>
                    {convs.map(c => (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--t1)', fontWeight: 500 }}>{c.contact}</td>
                        <td>{c.channel}</td>
                        <td style={{ maxWidth: 340 }}>
                          <div style={{ color: 'var(--t1)' }}>{c.subject || '—'}</div>
                          {c.last && <div style={{ fontSize: 11.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }}>{c.last.intent ? `[${c.last.intent}] ` : ''}{c.last.body}</div>}
                        </td>
                        <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                        <td>{c.agentName ?? <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                        <td className="num" style={{ fontSize: 12 }}>{fmt(c.lastMessageAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'agents' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="adm-btn-sm primary" onClick={() => setModal({ mode: 'create' })}><Plus size={13} /> Adicionar atendente</button>
            </div>
            <div className="adm-panel">
              {agents.length === 0 ? (
                <div className="adm-empty"><div className="adm-empty-title">Nenhum atendente</div><div className="adm-empty-sub">Cadastre atendentes para receber os casos escalados.</div></div>
              ) : (
                <table className="adm-table">
                  <thead><tr><th>Nome</th><th>Email</th><th>WhatsApp</th><th>Ativo</th><th></th></tr></thead>
                  <tbody>
                    {agents.map(a => (
                      <tr key={a.id}>
                        <td style={{ color: 'var(--t1)', fontWeight: 500 }}>{a.name}</td>
                        <td>{a.email ?? '—'}</td>
                        <td>{a.whatsapp ?? '—'}</td>
                        <td>
                          <button className={`badge ${a.is_active ? 'badge-ok' : 'badge-muted'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggleActive(a)}>
                            {a.is_active ? <><Check size={11} /> Ativo</> : <><X size={11} /> Inativo</>}
                          </button>
                        </td>
                        <td><button className="adm-btn-sm ghost" onClick={() => setModal({ mode: 'edit', agent: a })}><Pencil size={12} /> Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {modal && <AgentModal mode={modal.mode} agent={modal.agent} onClose={() => setModal(null)} onSave={saveAgent} />}
    </div>
  );
}

function AgentModal({ mode, agent, onClose, onSave }: {
  mode: 'create' | 'edit'; agent?: Agent;
  onClose: () => void; onSave: (a: { id?: string; name: string; email: string; whatsapp: string; is_active: boolean }) => void;
}) {
  const [name, setName] = useState(agent?.name ?? '');
  const [email, setEmail] = useState(agent?.email ?? '');
  const [whatsapp, setWhatsapp] = useState(agent?.whatsapp ?? '');
  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-hdr"><div className="adm-modal-title">{mode === 'create' ? 'Novo atendente' : 'Editar atendente'}</div><button className="adm-btn-sm ghost" onClick={onClose}><X size={13} /></button></div>
        <div className="adm-modal-body">
          <div className="adm-field"><label>Nome</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do atendente" /></div>
          <div className="adm-field"><label>Email (recebe os casos)</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="atendente@hubacademybr.com" /></div>
          <div className="adm-field"><label>WhatsApp (só dígitos, com país)</label><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5511999999999" /></div>
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-sm ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-sm primary" disabled={!name.trim()} onClick={() => onSave({ id: agent?.id, name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), is_active: agent?.is_active ?? true })}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
