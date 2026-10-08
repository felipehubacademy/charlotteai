'use client';
// Equipe — quem acessa a gestão e com qual papel. Só o papel "Dono" vê.

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Copy, Check } from 'lucide-react';
import { useAdminMe } from '@/lib/admin-context';

type Role = 'owner' | 'partner' | 'finance' | 'support' | 'viewer';
interface Member { id: string; user_id: string; email: string; name: string | null; role: Role; active: boolean; created_at: string }

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'owner',   label: 'Dono',       desc: 'Tudo, incluindo gerenciar a equipe.' },
  { id: 'partner', label: 'Sócio',      desc: 'Tudo, menos gerenciar a equipe.' },
  { id: 'finance', label: 'Financeiro', desc: 'Financeiro e métricas.' },
  { id: 'support', label: 'Suporte',    desc: 'Usuários e fila de suporte.' },
  { id: 'viewer',  label: 'Leitura',    desc: 'Vê usuários, métricas e financeiro, sem editar.' },
];
const roleLabel = (r: Role) => ROLES.find(x => x.id === r)?.label ?? r;

export default function TeamPage() {
  const me = useAdminMe();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'partner' as Role });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const r = await fetch('/api/admin/team');
    if (!r.ok) { setError(r.status === 403 ? 'Só quem tem papel de Dono gerencia a equipe.' : `HTTP ${r.status}`); setLoading(false); return; }
    setMembers((await r.json()).members ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setSaving(true); setError('');
    const r = await fetch('/api/admin/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setError(j.error ?? 'Não foi possível adicionar.'); return; }
    setAdding(false);
    if (j.tempPassword) setCreated({ email: form.email, tempPassword: j.tempPassword });
    setForm({ email: '', name: '', role: 'partner' });
    load();
  };

  const update = async (m: Member, patch: Partial<Pick<Member, 'role' | 'active'>>) => {
    setError('');
    const r = await fetch('/api/admin/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, ...patch }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error ?? 'Não foi possível salvar.'); }
    load();
  };

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div className="adm-topbar-title">Equipe <span className="adm-topbar-sub">· quem acessa a gestão</span></div>
        <button className="adm-btn-sm primary" onClick={() => setAdding(true)}><Plus size={13} /> Adicionar pessoa</button>
      </div>
      <div className="adm-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}

        {created && (
          <div className="adm-panel" style={{ marginBottom: 16, borderColor: 'var(--accent-border)' }}>
            <div className="adm-panel-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Conta criada para {created.email}</div>
                <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5 }}>
                  Envie a senha temporária por um canal privado. Ela aparece só agora. A pessoa entra em /admin com o e-mail e essa senha,
                  e pode trocá-la pelo app em &ldquo;Esqueci minha senha&rdquo;.
                </div>
              </div>
              <code className="num" style={{ background: 'var(--s2)', padding: '8px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700 }}>{created.tempPassword}</code>
              <button className="adm-btn-sm ghost" onClick={() => { navigator.clipboard.writeText(created.tempPassword); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiada' : 'Copiar'}
              </button>
              <button className="adm-btn-sm ghost" onClick={() => setCreated(null)}><X size={13} /></button>
            </div>
          </div>
        )}

        <div className="adm-grid">
          <div className="adm-panel col-8">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Membros</div><div className="adm-panel-sub">{members.filter(m => m.active).length} ativos</div></div>
            <table className="adm-table">
              <thead><tr><th>Pessoa</th><th>Papel</th><th>Situação</th><th>Desde</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={4}>Carregando…</td></tr>}
                {members.map(m => {
                  const isMe = m.email === me?.email;
                  return (
                    <tr key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
                      <td>
                        <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{m.name ?? m.email}{isMe ? ' (você)' : ''}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{m.email}</div>
                      </td>
                      <td>
                        <select className="adm-select-ghost" value={m.role} onChange={e => update(m, { role: e.target.value as Role })}>
                          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className={`adm-btn-sm ${m.active ? 'ghost' : 'primary'}`} onClick={() => update(m, { active: !m.active })}>
                          {m.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </td>
                      <td>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="adm-panel col-4">
            <div className="adm-panel-hdr"><div className="adm-panel-title">O que cada papel acessa</div></div>
            <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ROLES.map(r => (
                <div key={r.id}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{r.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {adding && (
        <div className="adm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setAdding(false); }}>
          <div className="adm-modal" style={{ background: 'var(--s1)' }}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">Adicionar pessoa</div>
              <button className="adm-btn-sm ghost" onClick={() => setAdding(false)}><X size={14} /></button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field"><label>E-mail</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="igor@exemplo.com" autoFocus /></div>
              <div className="adm-field"><label>Nome</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Igor Fina" /></div>
              <div className="adm-field">
                <label>Papel</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5 }}>
                Se a pessoa já usa o app, ela entra com a mesma conta. Se não, criamos uma conta com senha temporária para você repassar.
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-sm ghost" onClick={() => setAdding(false)}>Cancelar</button>
              <button className="adm-btn-sm primary" disabled={saving || !form.email.includes('@')} onClick={add}>{saving ? 'Adicionando…' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
