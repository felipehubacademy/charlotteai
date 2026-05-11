'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw, ExternalLink, ChevronUp, ChevronDown, X, TriangleAlert, Check, Eye, EyeOff } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Engagement { totalXP: number; lastActive: string | null; sessionDays: number; lessonCount: number; messageCount: number; }
interface TrailProgress { novice: number; inter: number; advanced: number; }
interface User {
  id: string; email: string; name: string | null;
  charlotte_level: 'Novice' | 'Inter' | 'Advanced' | null;
  placement_test_done: boolean; is_institutional: boolean; is_active: boolean;
  subscription_status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string | null; must_change_password: boolean; created_at: string;
  engagement: Engagement | null; trailProgress: TrailProgress | null;
  streak: number; longestStreak: number; beta_features: string[];
  is_admin: boolean;
}
interface Stats {
  total: number; institutional: number; subscribers: number; onTrial: number;
  trialExpired: number; last30: number; growthPct: number | null; activeToday: number; activeWeek: number;
}
interface Form {
  email: string; password: string; name: string; charlotte_level: string;
  is_institutional: boolean; is_active: boolean; subscription_status: string;
  must_change_password: boolean; placement_test_done: boolean;
  beta_karaoke: boolean; beta_new_layout: boolean; beta_openai_tts: boolean;
  is_admin: boolean;
}

type SortKey = 'name' | 'level' | 'created_at' | 'xp' | 'lastActive' | 'topics' | 'streak';
type FilterKey = 'all' | 'institutional' | 'subscriber' | 'trial' | 'expired' | 'none';
type ModalMode = 'create' | 'edit' | 'delete' | null;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
};
const fmtXP = (n: number) => n.toLocaleString('pt-BR');
const timeAgo = (s: string | null) => {
  if (!s) return '—';
  const now  = new Date();
  const past = new Date(s);
  // diferença em dias de calendário (local), sem ambiguidade de horário
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const calDays = Math.round((startOf(now) - startOf(past)) / 86400000);
  if (calDays === 0) return 'hoje';
  if (calDays === 1) return 'ontem';
  if (calDays < 7)  return `${calDays}d`;
  const weeks  = Math.floor(calDays / 7);
  if (calDays < 30) return `${weeks}${weeks === 1 ? 'sem' : 'sem'}`;
  const months = Math.floor(calDays / 30);
  return `${months}${months === 1 ? 'mês' : 'meses'}`;
};

// ── DateTip — mostra data completa ao hover ───────────────────────────────────
function DateTip({ iso, children }: { iso: string | null; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const label = iso ? new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null;
  if (!label) return <>{children}</>;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '5px 9px', fontSize: 11, lineHeight: 1.4,
          color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', zIndex: 100,
          pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>{label}</span>
      )}
    </span>
  );
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  institutional: { label: 'Institucional', cls: 'badge-inst'   },
  active:    { label: 'Ativo',      cls: 'badge-ok'     },
  trial:     { label: 'Trial',      cls: 'badge-accent'  },
  cancelled: { label: 'Cancelado',  cls: 'badge-warn'    },
  expired:   { label: 'Expirado',   cls: 'badge-err'     },
  none:      { label: 'Sem plano',  cls: 'badge-muted'   },
};
const LEVEL_META: Record<string, { label: string; cls: string }> = {
  Novice:   { label: 'Novice',   cls: 'badge-brand'   },
  Inter:    { label: 'Inter',    cls: 'badge-accent'  },
  Advanced: { label: 'Advanced', cls: 'badge-ok'      },
};

// ── KPI card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, delay }: {
  label: string; value: number | string; sub?: string; accent?: string; delay?: number;
}) {
  return (
    <div className="kpi-card fade-up" style={{ animationDelay: `${delay ?? 0}ms` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div className="kpi-context" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── SortTh ────────────────────────────────────────────────────────────────────
function SortTh({ label, sk, sortKey, sortDir, onSort }: {
  label: string; sk: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === sk;
  return (
    <th onClick={() => onSort(sk)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={10} style={{ color: 'var(--accent)' }} /> : <ChevronDown size={10} style={{ color: 'var(--accent)' }} />)
          : <ChevronDown size={10} style={{ opacity: 0.25 }} />}
      </div>
    </th>
  );
}

// ── FORM DEFAULTS ─────────────────────────────────────────────────────────────
const EMPTY_FORM: Form = {
  email: '', password: '', name: '', charlotte_level: '',
  is_institutional: false, is_active: true,
  subscription_status: 'none', must_change_password: false,
  placement_test_done: false, beta_karaoke: false, beta_new_layout: false, beta_openai_tts: false, is_admin: false,
};

// ════════════════════════════════════════════════════════════════════════════
export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [sortKey, setSortKey]   = useState<SortKey>('created_at');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [modal, setModal]       = useState<ModalMode>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm]         = useState<Form>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [page, setPage]         = useState(1);
  const PER_PAGE = 25;

  const getSecret = () => sessionStorage.getItem('adminSecret') ?? '';

  const fetchData = useCallback(async () => {
    const secret = getSecret(); if (!secret) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/users', { headers: { 'x-admin-secret': secret } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setUsers(json.users ?? []);
      setStats(json.stats ?? null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sort
  const onSort = (k: SortKey) => {
    if (sortKey === k) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(k); setSortDir('desc'); }
  };

  // Filtered + sorted
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = users.filter(u => {
      const matchQ = !q || u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q);
      const matchF =
        filter === 'all' ? true :
        filter === 'institutional' ? u.is_institutional :
        filter === 'subscriber' ? u.subscription_status === 'active' :
        filter === 'trial' ? u.subscription_status === 'trial' && !u.is_institutional :
        filter === 'expired' ? !u.is_institutional && (
          u.subscription_status === 'expired' ||
          (u.subscription_status === 'trial' && !!u.trial_ends_at && new Date(u.trial_ends_at) < new Date())
        ) :
        filter === 'none' ? u.subscription_status === 'none' && !u.is_institutional : true;
      return matchQ && matchF;
    });
    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'name': av = (a.name ?? '').toLowerCase(); bv = (b.name ?? '').toLowerCase(); break;
        case 'level': av = a.charlotte_level ?? ''; bv = b.charlotte_level ?? ''; break;
        case 'created_at': av = a.created_at; bv = b.created_at; break;
        case 'xp': av = a.engagement?.totalXP ?? -1; bv = b.engagement?.totalXP ?? -1; break;
        case 'lastActive': av = a.engagement?.lastActive ?? ''; bv = b.engagement?.lastActive ?? ''; break;
        case 'topics': {
          const sum = (p: TrailProgress | null) => p ? p.novice + p.inter + p.advanced : -1;
          av = sum(a.trailProgress); bv = sum(b.trailProgress); break;
        }
        case 'streak': av = a.streak ?? -1; bv = b.streak ?? -1; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filter, sortKey, sortDir]);

  const expiredCount = useMemo(() => users.filter(u => {
    if (u.is_institutional) return false;
    if (u.subscription_status === 'expired') return true;
    if (u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < new Date()) return true;
    return false;
  }).length, [users]);

  const totalPages = Math.ceil(displayed.length / PER_PAGE);
  const pageUsers  = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, filter]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_FORM); setFormErr(''); setSelected(null); setModal('create'); };
  const openEdit = (u: User) => {
    setSelected(u);
    setForm({
      email: u.email, password: '', name: u.name ?? '', charlotte_level: u.charlotte_level ?? '',
      is_institutional: u.is_institutional, is_active: u.is_active,
      subscription_status: u.subscription_status,
      must_change_password: u.must_change_password,
      placement_test_done: u.placement_test_done,
      beta_karaoke: (u.beta_features ?? []).includes('karaoke'),
      beta_new_layout: (u.beta_features ?? []).includes('new_layout'),
      beta_openai_tts: (u.beta_features ?? []).includes('openai_tts'),
      is_admin: u.is_admin ?? false,
    });
    setFormErr(''); setModal('edit');
  };
  const openDelete = (u: User) => { setSelected(u); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setFormErr(''); setShowPwd(false); };

  const patchForm = (k: keyof Form, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── API actions ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.email || !form.password) { setFormErr('Email e senha são obrigatórios.'); return; }
    setSaving(true); setFormErr('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'x-admin-secret': getSecret(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email, password: form.password, name: form.name || null,
          charlotte_level: form.charlotte_level || null,
          is_institutional: form.is_institutional, is_active: form.is_active,
          subscription_status: form.is_institutional ? 'none' : form.subscription_status,
          must_change_password: form.must_change_password,
          placement_test_done: form.placement_test_done,
          is_admin: form.is_admin,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? `HTTP ${res.status}`); }
      closeModal(); await fetchData();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!selected) return;
    setSaving(true); setFormErr('');
    try {
      const betaFeatures = [
        ...(form.beta_karaoke ? ['karaoke'] : []),
        ...(form.beta_new_layout ? ['new_layout'] : []),
        ...(form.beta_openai_tts ? ['openai_tts'] : []),
      ];
      const body: any = {
        id: selected.id, name: form.name || null,
        charlotte_level: form.charlotte_level || null,
        is_institutional: form.is_institutional, is_active: form.is_active,
        subscription_status: form.is_institutional ? 'none' : form.subscription_status,
        must_change_password: form.must_change_password,
        placement_test_done: form.placement_test_done,
        beta_features: betaFeatures,
        is_admin: form.is_admin,
      };
      if (form.email !== selected.email) body.email = form.email;
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'x-admin-secret': getSecret(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? `HTTP ${res.status}`); }
      closeModal(); await fetchData();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'x-admin-secret': getSecret(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      closeModal(); await fetchData();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="adm-page">
      {/* Top bar */}
      <div className="adm-topbar">
        <div className="adm-topbar-title" style={{ flex: 1 }}>Usuários</div>
        <button onClick={fetchData} disabled={loading} className="adm-btn-sm ghost">
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Carregando' : 'Atualizar'}
        </button>
        <button onClick={openCreate} className="adm-btn-sm primary">
          <Plus size={14} /> Novo usuário
        </button>
      </div>

      {error && (
        <div className="adm-alert crit" style={{ margin: '12px 28px 0' }}>
          <TriangleAlert size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ padding: '16px 28px 0' }}>
          <div className="adm-grid">
            <div className="col-3"><StatCard label="Total" value={stats.total} delay={0} /></div>
            <div className="col-3"><StatCard label="Assinantes" value={stats.subscribers} accent="var(--ok)" delay={60} /></div>
            <div className="col-3"><StatCard label="Em Trial" value={stats.onTrial} accent="var(--accent)" delay={120} /></div>
            <div className="col-3"><StatCard label="Institucionais" value={stats.institutional} delay={180} /></div>
            <div className="col-3">
              <StatCard label="Novos (30d)" value={stats.last30}
                sub={stats.growthPct != null ? `${stats.growthPct > 0 ? '+' : ''}${stats.growthPct.toFixed(1)}% vs anterior` : undefined}
                delay={240} accent="var(--brand)" />
            </div>
            <div className="col-3"><StatCard label="Ativos Hoje" value={stats.activeToday} accent="var(--ok)" delay={300} /></div>
            <div className="col-3"><StatCard label="Ativos (7d)" value={stats.activeWeek} delay={360} /></div>
            <div className="col-3"><StatCard label="Trial Expirado" value={stats.trialExpired} accent={stats.trialExpired > 0 ? 'var(--warn)' : undefined} delay={420} /></div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ padding: '16px 28px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="adm-input-sm"
            style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            { id: 'all',           label: `Todos (${users.length})` },
            { id: 'subscriber',    label: 'Assinantes' },
            { id: 'trial',         label: 'Trial' },
            { id: 'expired',       label: `Expirado${expiredCount > 0 ? ` (${expiredCount})` : ''}` },
            { id: 'institutional', label: 'Institucional' },
            { id: 'none',          label: 'Sem plano' },
          ] as { id: FilterKey; label: string }[]).map(f => (
            <button
              key={f.id}
              className={`adm-chip${filter === f.id ? ' active' : ''}`}
              style={f.id === 'expired' && expiredCount > 0 && filter !== 'expired' ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)', flexShrink: 0 }}>
          {displayed.length} resultado{displayed.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '14px 28px 28px' }}>
        <div className="adm-panel">
          {loading && !users.length ? (
            <div style={{ padding: '40px 0' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--b1)' }}>
                  <div className="skeleton" style={{ height: 10, width: 160 }} />
                  <div className="skeleton" style={{ height: 10, width: 100 }} />
                  <div className="skeleton" style={{ height: 10, width: 60 }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <SortTh label="Nome / Email" sk="name"       sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Nível"         sk="level"      sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <th>Status</th>
                    <SortTh label="XP"            sk="xp"         sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Streak"        sk="streak"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Ativo"         sk="lastActive" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Tópicos"       sk="topics"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Criado"        sk="created_at" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="adm-empty">
                          <div className="adm-empty-title">Nenhum usuário encontrado</div>
                          <div className="adm-empty-sub">Tente ajustar os filtros ou a busca.</div>
                        </div>
                      </td>
                    </tr>
                  ) : pageUsers.map(u => {
                    const sm = u.is_institutional ? STATUS_META.institutional : STATUS_META[u.subscription_status];
                    const lm = u.charlotte_level ? LEVEL_META[u.charlotte_level] : null;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>
                              {u.name ?? <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>sem nome</span>}
                              {!u.is_active && <span className="badge badge-err" style={{ marginLeft: 6, verticalAlign: 'middle' }}>Inativo</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                          </div>
                        </td>
                        <td>{lm ? <span className={`badge ${lm.cls}`}><span className="badge-dot" />  {lm.label}</span> : <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                        <td><span className={`badge ${sm.cls}`}>{sm.label}</span></td>
                        <td><span className="num" style={{ color: (u.engagement?.totalXP ?? 0) > 500 ? 'var(--ok)' : 'var(--t2)' }}>{fmtXP(u.engagement?.totalXP ?? 0)}</span></td>
                        <td>
                          <span className="num">{u.streak > 0 ? u.streak : '—'}</span>
                        </td>
                        <td>
                          <DateTip iso={u.engagement?.lastActive ?? null}>
                            <span style={{ fontSize: 12, color: 'var(--t2)' }}>
                              {timeAgo(u.engagement?.lastActive ?? null)}
                            </span>
                          </DateTip>
                        </td>
                        <td>
                          {u.trailProgress ? (
                            <span className="num" style={{ fontSize: 11.5, letterSpacing: 0 }}>
                              <span style={{ color: 'var(--brand)',  opacity: u.trailProgress.novice   > 0 ? 1 : 0.35 }}>N {u.trailProgress.novice}</span>
                              <span style={{ color: 'var(--t3)',     margin: '0 3px' }}>/</span>
                              <span style={{ color: 'var(--accent)', opacity: u.trailProgress.inter    > 0 ? 1 : 0.35 }}>I {u.trailProgress.inter}</span>
                              <span style={{ color: 'var(--t3)',     margin: '0 3px' }}>/</span>
                              <span style={{ color: 'var(--ok)',     opacity: u.trailProgress.advanced > 0 ? 1 : 0.35 }}>A {u.trailProgress.advanced}</span>
                            </span>
                          ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                        </td>
                        <td><span style={{ fontSize: 11.5, color: 'var(--t3)' }}>{fmtDate(u.created_at)}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => openEdit(u)} className="adm-btn-sm ghost" style={{ padding: '5px 8px' }} title="Editar">
                              <Edit2 size={13} />
                            </button>
                            <a href={`https://app.revenuecat.com/customers?app_user_id=${encodeURIComponent(u.id)}`}
                              target="_blank" rel="noreferrer" className="adm-btn-sm ghost" style={{ padding: '5px 8px' }} title="RevenueCat">
                              <ExternalLink size={13} />
                            </a>
                            <button onClick={() => openDelete(u)} className="adm-btn-sm danger" style={{ padding: '5px 8px' }} title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                Mostrando {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, displayed.length)} de {displayed.length}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="adm-btn-sm ghost">‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`adm-btn-sm${page === p ? ' primary' : ' ghost'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="adm-btn-sm ghost">›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="adm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="adm-modal">
            {/* Header */}
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">
                {modal === 'create' ? 'Novo Usuário' : modal === 'edit' ? 'Editar Usuário' : 'Excluir Usuário'}
              </div>
              <button onClick={closeModal} className="adm-btn-sm ghost" style={{ padding: '4px 6px' }}>
                <X size={15} />
              </button>
            </div>

            {/* Delete confirmation */}
            {modal === 'delete' && (
              <>
                <div className="adm-modal-body">
                  <div className="adm-alert crit">
                    <TriangleAlert size={14} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Ação irreversível</div>
                      <div>Tem certeza que deseja excluir <strong>{selected?.name ?? selected?.email}</strong>? Todos os dados serão perdidos.</div>
                    </div>
                  </div>
                </div>
                <div className="adm-modal-footer">
                  <button onClick={closeModal} className="adm-btn-sm ghost">Cancelar</button>
                  <button onClick={handleDelete} disabled={saving} className="adm-btn-sm danger">
                    {saving ? 'Excluindo...' : 'Excluir definitivamente'}
                  </button>
                </div>
              </>
            )}

            {/* Create / Edit form */}
            {(modal === 'create' || modal === 'edit') && (
              <>
                <div className="adm-modal-body">
                  <div className="adm-field">
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={e => patchForm('email', e.target.value)} placeholder="aluno@email.com" />
                  </div>
                  <div className="adm-field">
                    <label>{modal === 'create' ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => patchForm('password', e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: 36 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="adm-field">
                    <label>Nome completo</label>
                    <input type="text" value={form.name} onChange={e => patchForm('name', e.target.value)} placeholder="Nome do aluno" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="adm-field">
                      <label>Nível</label>
                      <select value={form.charlotte_level} onChange={e => patchForm('charlotte_level', e.target.value)}>
                        <option value="">— Sem nível —</option>
                        <option value="Novice">Novice</option>
                        <option value="Inter">Inter</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="adm-field">
                      <label>Status da assinatura</label>
                      <select
                        value={form.is_institutional ? 'none' : form.subscription_status}
                        onChange={e => patchForm('subscription_status', e.target.value)}
                        disabled={form.is_institutional}
                        style={form.is_institutional ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                      >
                        {form.is_institutional
                          ? <option value="none">Institucional (gerenciado)</option>
                          : <>
                              <option value="none">Sem plano</option>
                              <option value="trial">Trial</option>
                              <option value="active">Ativo</option>
                              <option value="cancelled">Cancelado</option>
                              <option value="expired">Expirado</option>
                            </>
                        }
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { key: 'is_active',           label: 'Conta ativa' },
                      { key: 'is_institutional',    label: 'Usuário institucional' },
                      { key: 'placement_test_done', label: 'Placement test concluído' },
                      { key: 'must_change_password', label: 'Forçar troca de senha no próximo login' },
                      { key: 'beta_karaoke',        label: 'Beta: Karaoke (Read Aloud)' },
                      { key: 'beta_new_layout',     label: 'Beta: New Layout (Tab Nav)' },
                      { key: 'beta_openai_tts',     label: 'Beta: OpenAI TTS (coral, gpt-4o-mini-tts)' },
                      { key: 'is_admin',            label: 'Admin (OTA + welcome reset)' },
                    ] as { key: keyof Form; label: string }[]).map(({ key, label }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5, color: 'var(--t2)' }}>
                        <div
                          onClick={() => patchForm(key, !form[key])}
                          style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            background: form[key] ? 'var(--accent)' : 'var(--s2)',
                            border: `1px solid ${form[key] ? 'var(--accent)' : 'var(--b2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background 150ms',
                          }}
                        >
                          {form[key] && <Check size={11} color="white" strokeWidth={3} />}
                        </div>
                        {label}
                      </label>
                    ))}
                  </div>
                  {formErr && (
                    <div className="adm-alert crit">
                      <TriangleAlert size={14} /> {formErr}
                    </div>
                  )}
                </div>
                <div className="adm-modal-footer">
                  <button onClick={closeModal} className="adm-btn-sm ghost">Cancelar</button>
                  <button
                    onClick={modal === 'create' ? handleCreate : handleEdit}
                    disabled={saving}
                    className="adm-btn-sm primary"
                  >
                    {saving ? 'Salvando...' : modal === 'create' ? 'Criar usuário' : 'Salvar alterações'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
