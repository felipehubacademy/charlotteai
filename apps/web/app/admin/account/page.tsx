'use client';
// /admin/account — Minha conta: perfil e acesso, alertas no celular, e-mails da gestão e tela inicial.
// Cada pessoa só vê e mexe nas próprias configurações (/api/admin/me/prefs).
import { useCallback, useEffect, useState } from 'react';
import { Check, LogOut, Smartphone, Trash2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import AdminPushToggle from '@/components/admin/AdminPushToggle';
import AdminLoading from '@/components/admin/AdminLoading';
import { AREAS } from '@/lib/admin-roles';

type Flags = Record<string, boolean>;
interface Prefs {
  push_alerts: Flags; quiet_start: number | null; quiet_end: number | null; quiet_allow_critical: boolean;
  email_reports: Flags; home_path: string | null;
}
interface Device { id: string; user_agent: string | null; created_at: string; last_ok_at: string | null }
interface Data {
  profile: { name: string | null; email: string | null; roleLabel: string; areas: string[] };
  prefs: Prefs; devices: Device[];
  catalog: { push: { key: string; label: string; critical: boolean }[]; email: { key: string; label: string }[] };
}

const HOME_OPTIONS = [
  { href: '/admin', label: 'Usuários', area: 'users' },
  { href: '/admin/learning', label: 'Pedagógico', area: 'learning' },
  { href: '/admin/support', label: 'Suporte', area: 'support' },
  { href: '/admin/finance', label: 'Financeiro', area: 'finance' },
  { href: '/admin/metrics', label: 'Métricas', area: 'metrics' },
  { href: '/admin/commercial', label: 'Comercial', area: 'finance' },
  { href: '/admin/instagram', label: 'Instagram', area: 'notifications' },
  { href: '/admin/notifications', label: 'Notificações', area: 'notifications' },
];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** "iPhone · Safari" a partir do navegador que ativou os alertas. */
function deviceName(ua: string | null): string {
  if (!ua) return 'Aparelho';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Aparelho';
  const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '';
  return br ? `${os} · ${br}` : os;
}
const date = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';

export default function AdminAccountPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [pass, setPass] = useState({ a: '', b: '' });

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/me/prefs');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? 'Não foi possível carregar.'); return; }
    setData(j); setPrefs(j.prefs); setName(j.profile.name ?? '');
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2500); };

  const save = async (next: Prefs, extra: Record<string, unknown> = {}) => {
    setPrefs(next); setSaving(true); setError('');
    const r = await fetch('/api/admin/me/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, ...extra }) });
    setSaving(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? 'Não foi possível salvar.'); return; }
    flash('Salvo');
  };

  const removeDevice = async (id: string) => {
    await fetch('/api/admin/me/prefs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: id }) });
    load();
  };

  const changePassword = async () => {
    setError('');
    if (pass.a.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (pass.a !== pass.b) { setError('As duas senhas não são iguais.'); return; }
    const { error: e } = (await getSupabase()?.auth.updateUser({ password: pass.a })) ?? { error: null };
    if (e) { setError('Não foi possível trocar a senha. Tente de novo.'); return; }
    setPass({ a: '', b: '' }); flash('Senha trocada');
  };

  const signOutAll = async () => {
    if (!window.confirm('Sair do painel em todos os aparelhos, inclusive neste?')) return;
    const r = await fetch('/api/admin/me/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signout_all' }) });
    if (!r.ok) { setError('Não foi possível sair de todos os aparelhos.'); return; }
    await getSupabase()?.auth.signOut();
    window.location.href = '/admin';
  };

  if (error && !data) return <div className="adm-page"><div className="adm-body"><div className="adm-alert crit">{error}</div></div></div>;
  if (!data || !prefs) return <AdminLoading label="Carregando sua conta…" />;

  const homeOptions = HOME_OPTIONS.filter(o => data.profile.areas.includes(o.area));
  const areaLabels = AREAS.filter(a => data.profile.areas.includes(a.id)).map(a => a.label);
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--b1)' };

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <div className="adm-topbar-title">Minha conta</div>
        {saving ? <span style={{ fontSize: 12, color: 'var(--t3)' }}>Salvando…</span>
          : notice ? <span style={{ fontSize: 12, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {notice}</span> : null}
      </div>
      <div className="adm-body">
        {error && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="adm-grid">

          {/* 1. Alertas no celular */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Alertas no celular</div></div>
            <div className="adm-panel-body">
              <AdminPushToggle />
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '16px 0 4px' }}>Quais alertas receber</div>
              {data.catalog.push.map(c => (
                <label key={c.key} style={row}>
                  <input type="checkbox" checked={prefs.push_alerts[c.key] !== false}
                    onChange={e => save({ ...prefs, push_alerts: { ...prefs.push_alerts, [c.key]: e.target.checked } })} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{c.label}</span>
                  {c.critical && <span style={{ fontSize: 11, color: 'var(--err)' }}>crítico</span>}
                </label>
              ))}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '16px 0 6px' }}>Horário de silêncio</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13.5 }}>
                <span>Não avisar das</span>
                <select className="adm-select-ghost" value={prefs.quiet_start ?? ''} onChange={e => save({ ...prefs, quiet_start: e.target.value === '' ? null : Number(e.target.value) })}>
                  <option value="">—</option>{HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <span>às</span>
                <select className="adm-select-ghost" value={prefs.quiet_end ?? ''} onChange={e => save({ ...prefs, quiet_end: e.target.value === '' ? null : Number(e.target.value) })}>
                  <option value="">—</option>{HOURS.map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
              <label style={{ ...row, borderBottom: 'none' }}>
                <input type="checkbox" checked={prefs.quiet_allow_critical}
                  onChange={e => save({ ...prefs, quiet_allow_critical: e.target.checked })} />
                <span style={{ fontSize: 13.5 }}>Alertas críticos chegam mesmo no silêncio</span>
              </label>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '12px 0 4px' }}>Aparelhos com alertas</div>
              {data.devices.length === 0 && <div style={{ fontSize: 13, color: 'var(--t3)', padding: '6px 0' }}>Nenhum aparelho ativado ainda.</div>}
              {data.devices.map(d => (
                <div key={d.id} style={row}>
                  <Smartphone size={15} style={{ color: 'var(--t2)' }} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{deviceName(d.user_agent)}
                    <span style={{ color: 'var(--t3)', fontSize: 12 }}> · desde {date(d.created_at)}{d.last_ok_at ? ` · último alerta ${date(d.last_ok_at)}` : ''}</span>
                  </span>
                  <button className="adm-btn-sm ghost" onClick={() => removeDevice(d.id)} title="Remover"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. E-mails da gestão */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">E-mails da gestão</div></div>
            <div className="adm-panel-body">
              {data.catalog.email.map(c => (
                <label key={c.key} style={row}>
                  <input type="checkbox" checked={prefs.email_reports[c.key] !== false}
                    onChange={e => save({ ...prefs, email_reports: { ...prefs.email_reports, [c.key]: e.target.checked } })} />
                  <span style={{ fontSize: 13.5 }}>{c.label}</span>
                </label>
              ))}
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 10, lineHeight: 1.5 }}>Hoje esses e-mails vão só para quem é Administrador.</div>
            </div>
          </div>

          {/* 3. Perfil e acesso */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Perfil e acesso</div></div>
            <div className="adm-panel-body">
              <label style={{ fontSize: 12, color: 'var(--t2)' }}>Nome no painel e nas respostas do suporte</label>
              <div style={{ display: 'flex', gap: 8, margin: '6px 0 14px' }}>
                <input className="adm-input" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
                <button className="adm-btn-sm primary" disabled={!name.trim() || name.trim() === (data.profile.name ?? '')}
                  onClick={() => save(prefs, { name: name.trim() }).then(load)}>Salvar</button>
              </div>
              <div style={{ fontSize: 13.5, marginBottom: 4 }}><b>E-mail:</b> {data.profile.email}</div>
              <div style={{ fontSize: 13.5, marginBottom: 4 }}><b>Nível de acesso:</b> {data.profile.roleLabel}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5, marginBottom: 16 }}>Pode: {areaLabels.join(', ')}.</div>

              <label style={{ fontSize: 12, color: 'var(--t2)' }}>Trocar senha</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 14px' }}>
                <input className="adm-input" type="password" placeholder="Nova senha" value={pass.a} onChange={e => setPass({ ...pass, a: e.target.value })} autoComplete="new-password" style={{ flex: 1, minWidth: 140 }} />
                <input className="adm-input" type="password" placeholder="Repita a senha" value={pass.b} onChange={e => setPass({ ...pass, b: e.target.value })} autoComplete="new-password" style={{ flex: 1, minWidth: 140 }} />
                <button className="adm-btn-sm primary" disabled={!pass.a || !pass.b} onClick={changePassword}>Trocar</button>
              </div>

              <button className="adm-btn-sm ghost" onClick={signOutAll}><LogOut size={13} /> Sair de todos os aparelhos</button>
            </div>
          </div>

          {/* 4. Preferências do painel */}
          <div className="adm-panel col-6">
            <div className="adm-panel-hdr"><div className="adm-panel-title">Preferências do painel</div></div>
            <div className="adm-panel-body">
              <label style={{ fontSize: 12, color: 'var(--t2)' }}>Tela inicial ao abrir o painel</label>
              <div style={{ marginTop: 6 }}>
                <select className="adm-select-ghost" value={prefs.home_path ?? ''} onChange={e => save({ ...prefs, home_path: e.target.value || null })}>
                  <option value="">Padrão</option>
                  {homeOptions.map(o => <option key={o.href} value={o.href}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
