'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, BarChart2, ChevronLeft, ChevronRight, Shield, Bell, LogOut } from 'lucide-react';

// ── Design tokens ───────────────────────────────────────────────────────────
const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.admin-root {
  --bg:  #F6F6FA;
  --s1:  #FFFFFF;
  --s2:  #F0F0F6;
  --s3:  #E8E8F0;
  --s4:  #DDDDE8;

  --accent:       #6366F1;
  --accent-dim:   rgba(99,102,241,0.12);
  --accent-ring:  rgba(99,102,241,0.30);
  --accent-border:rgba(99,102,241,0.35);

  --brand:        #3D7200;
  --brand-dim:    rgba(61,114,0,0.08);
  --brand-border: rgba(61,114,0,0.20);

  --ok:       #0E9B6A;  --ok-dim:   rgba(14,155,106,0.10);
  --warn:     #F59E0B;  --warn-dim: rgba(245,158,11,0.12);
  --err:      #EF4444;  --err-dim:  rgba(239,68,68,0.12);
  --neutral:  #6B7280;

  --t1: rgba(0,0,0,0.85);
  --t2: rgba(0,0,0,0.50);
  --t3: rgba(0,0,0,0.32);

  --b1: rgba(0,0,0,0.06);
  --b2: rgba(0,0,0,0.10);
  --b3: rgba(0,0,0,0.18);

  --r1: 6px; --r2: 10px; --r3: 16px; --r4: 24px;

  --sh1: 0 1px 3px rgba(0,0,0,0.08);
  --sh2: 0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
  --sh3: 0 24px 64px rgba(0,0,0,0.14);

  --font-sans: 'Inter', -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'Inter', -apple-system, 'Segoe UI', sans-serif;

  font-family: var(--font-sans);
  color: var(--t1);
  background: var(--bg);
}

/* scrollbar */
.admin-root *::-webkit-scrollbar { width:5px; height:5px; }
.admin-root *::-webkit-scrollbar-track { background:transparent; }
.admin-root *::-webkit-scrollbar-thumb { background:var(--b2); border-radius:3px; }
.admin-root *::-webkit-scrollbar-thumb:hover { background:var(--b3); }

/* --- Sidebar --- */
.adm-sidebar {
  position: fixed; inset: 0 auto 0 0;
  width: 240px;
  background: var(--s1);
  border-right: 1px solid var(--b1);
  display: flex; flex-direction: column;
  z-index: 200;
  transition: width 280ms cubic-bezier(.4,0,.2,1);
  overflow: hidden;
}
.adm-sidebar.collapsed { width: 64px; }

.adm-logo {
  display: flex; align-items: center; gap: 10px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--b1);
  min-height: 64px;
  overflow: hidden;
}
.adm-logo-icon {
  width: 32px; height: 32px; flex-shrink: 0;
  background: var(--brand-dim);
  border: 1px solid var(--brand-border);
  border-radius: var(--r1);
  display: flex; align-items: center; justify-content: center;
}
.adm-logo-text { overflow: hidden; }
.adm-logo-name {
  font-size: 14px; font-weight: 700; color: var(--t1);
  white-space: nowrap; letter-spacing: -0.02em;
}
.adm-logo-tag {
  font-size: 10px; color: var(--t3); font-weight: 500;
  letter-spacing: 0.04em; white-space: nowrap;
  font-family: var(--font-mono);
}

.adm-nav { flex: 1; padding: 10px 8px; overflow-y: auto; }

.adm-section-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--t3); padding: 12px 12px 4px;
  white-space: nowrap; overflow: hidden;
}

.adm-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; margin: 1px 0;
  border-radius: var(--r1);
  text-decoration: none;
  font-size: 13.5px; font-weight: 500;
  color: var(--t2);
  transition: background 120ms, color 120ms;
  white-space: nowrap; overflow: hidden;
  position: relative; cursor: pointer;
}
.adm-nav-item:hover { background: var(--b1); color: var(--t1); }
.adm-nav-item.active {
  background: var(--accent-dim);
  color: var(--accent);
}
.adm-nav-item.active::before {
  content: '';
  position: absolute; left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 18px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}
.adm-nav-icon { width: 16px; height: 16px; flex-shrink: 0; }
.adm-nav-label { flex: 1; overflow: hidden; }

.adm-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--b1);
}
.adm-footer-user {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: var(--r1);
  overflow: hidden;
}
.adm-avatar {
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--accent);
}
.adm-user-name {
  font-size: 12.5px; font-weight: 600; color: var(--t1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.adm-user-role {
  font-size: 10.5px; color: var(--t3);
  white-space: nowrap; overflow: hidden;
}

.adm-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: var(--r1);
  background: var(--b1); border: 1px solid var(--b1);
  cursor: pointer; color: var(--t2);
  transition: background 120ms, color 120ms;
  margin-left: auto;
}
.adm-collapse-btn:hover { background: var(--b2); color: var(--t1); }

/* --- Login screen --- */
.adm-login-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 100dvh;
  background: var(--bg);
}
.adm-login-card {
  width: 380px; max-width: calc(100vw - 32px);
  background: var(--s1);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
  padding: 36px 32px;
  box-shadow: var(--sh3);
}
.adm-login-logo {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 28px;
}
.adm-login-icon {
  width: 40px; height: 40px;
  background: var(--brand-dim); border: 1px solid var(--brand-border);
  border-radius: var(--r2);
  display: flex; align-items: center; justify-content: center;
}
.adm-login-title {
  font-size: 22px; font-weight: 700; letter-spacing: -0.03em;
  color: var(--t1);
}
.adm-login-sub { font-size: 13px; color: var(--t3); margin-top: 1px; }
.adm-field-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--t3); margin-bottom: 6px;
}
.adm-input {
  width: 100%; padding: 9px 12px;
  background: var(--s2); border: 1px solid var(--b2);
  border-radius: var(--r1); color: var(--t1);
  font-size: 14px; font-family: var(--font-sans);
  outline: none; transition: border-color 150ms, box-shadow 150ms;
  box-sizing: border-box;
}
.adm-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.adm-input::placeholder { color: var(--t3); }
.adm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 16px; border-radius: var(--r1);
  font-size: 13.5px; font-weight: 600; font-family: var(--font-sans);
  cursor: pointer; border: none;
  transition: opacity 150ms, transform 100ms;
}
.adm-btn:active { transform: scale(0.97); }
.adm-btn-primary { background: var(--accent); color: #fff; width: 100%; }
.adm-btn-primary:hover { opacity: 0.88; }
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-login-err {
  margin-top: 10px;
  background: var(--err-dim); border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--r1); padding: 8px 12px;
  font-size: 12.5px; color: var(--err);
}

/* --- Global admin component primitives --- */
.adm-page { padding: 0; min-height: 100dvh; }

.adm-topbar {
  position: sticky; top: 0; z-index: 50;
  background: rgba(246,246,250,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--b1);
  padding: 0 28px;
  height: 58px;
  display: flex; align-items: center; gap: 16px;
}
.adm-topbar-title {
  font-size: 16px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--t1); flex: 1;
}
.adm-topbar-sub { font-size: 12px; color: var(--t3); font-weight: 400; }

.adm-body { padding: 24px 28px; }

.adm-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-6  { grid-column: span 6; }
.col-8  { grid-column: span 8; }
.col-12 { grid-column: span 12; }

/* KPI Card */
.kpi-card {
  background: var(--s1); border: 1px solid var(--b1);
  border-radius: var(--r2); padding: 20px;
  transition: border-color 200ms, box-shadow 200ms, transform 150ms;
}
.kpi-card:hover {
  border-color: var(--b2); box-shadow: var(--sh2);
  transform: translateY(-1px);
}
.kpi-label {
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--t3); margin-bottom: 10px;
}
.kpi-value {
  font-size: 2rem; font-weight: 700; line-height: 1;
  font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  color: var(--t1); margin-bottom: 8px;
  letter-spacing: -0.03em;
}
.kpi-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kpi-context { font-size: 11px; color: var(--t3); }

/* Delta badge */
.delta {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px;
  font-family: var(--font-mono);
}
.delta-up   { background: var(--ok-dim);   color: var(--ok);  }
.delta-down { background: var(--err-dim);  color: var(--err); }
.delta-flat { background: var(--b1);       color: var(--t3);  }

/* Panel */
.adm-panel {
  background: var(--s1); border: 1px solid var(--b1);
  border-radius: var(--r2); overflow: hidden;
}
.adm-panel-hdr {
  padding: 14px 18px; border-bottom: 1px solid var(--b1);
  display: flex; align-items: center; justify-content: space-between;
}
.adm-panel-title { font-size: 13px; font-weight: 600; color: var(--t1); }
.adm-panel-sub   { font-size: 12px; color: var(--t3); }
.adm-panel-body  { padding: 18px; }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
}
.badge-ok     { background: var(--ok-dim);     color: var(--ok);     }
.badge-warn   { background: var(--warn-dim);   color: var(--warn);   }
.badge-err    { background: var(--err-dim);    color: var(--err);    }
.badge-accent { background: var(--accent-dim); color: var(--accent); }
.badge-brand  { background: var(--brand-dim);  color: var(--brand);  }
.badge-muted  { background: var(--b1);         color: var(--t3);     }
.badge-inst   { background: rgba(14,165,233,0.10); color: #0369A1;    }
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; display: inline-block;
}

/* Table */
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.adm-table th {
  text-align: left; padding: 10px 14px;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--t3); border-bottom: 1px solid var(--b1);
  white-space: nowrap; cursor: pointer; user-select: none;
}
.adm-table th:hover { color: var(--t2); }
.adm-table td {
  padding: 11px 14px; border-bottom: 1px solid var(--b1);
  color: var(--t2); vertical-align: middle;
}
.adm-table tr:last-child td { border-bottom: none; }
.adm-table tr:hover td { background: rgba(99,102,241,0.04); color: var(--t1); }

/* Num */
.num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* Input */
.adm-input-sm {
  padding: 7px 10px; background: var(--s2);
  border: 1px solid var(--b2); border-radius: var(--r1);
  color: var(--t1); font-size: 13px; font-family: var(--font-sans);
  outline: none; transition: border-color 150ms, box-shadow 150ms;
}
.adm-input-sm:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-ring); }
.adm-input-sm::placeholder { color: var(--t3); }

.adm-btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: var(--r1);
  font-size: 12.5px; font-weight: 600; font-family: var(--font-sans);
  cursor: pointer; border: none;
  transition: opacity 150ms, transform 100ms;
}
.adm-btn-sm:active { transform: scale(0.97); }
.adm-btn-sm.primary { background: var(--accent); color: #fff; }
.adm-btn-sm.primary:hover { opacity: 0.88; }
.adm-btn-sm.ghost { background: var(--b1); color: var(--t2); border: 1px solid var(--b1); }
.adm-btn-sm.ghost:hover { background: var(--b2); color: var(--t1); }
.adm-btn-sm.danger { background: var(--err-dim); color: var(--err); border: 1px solid rgba(239,68,68,0.2); }
.adm-btn-sm.danger:hover { background: rgba(239,68,68,0.2); }

/* Tabs */
.adm-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--b1);
  padding: 0 28px; overflow-x: auto;
}
.adm-tab {
  padding: 12px 16px; font-size: 13px; font-weight: 500;
  color: var(--t3); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 150ms, border-color 150ms;
  white-space: nowrap; user-select: none;
}
.adm-tab:hover { color: var(--t2); }
.adm-tab.active { color: var(--t1); border-bottom-color: var(--accent); }

/* Skeleton */
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--s3) 25%, var(--s4) 50%, var(--s3) 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.6s infinite linear;
  border-radius: var(--r1);
}

/* Entrance */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 380ms ease both; }

/* Modal */
.adm-modal-backdrop {
  position: fixed; inset: 0; z-index: 400;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.adm-modal {
  background: var(--s2); border: 1px solid var(--b2);
  border-radius: var(--r3); box-shadow: var(--sh3);
  width: 100%; max-width: 480px;
  max-height: calc(100dvh - 32px); overflow-y: auto;
}
.adm-modal-hdr {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--b1);
  display: flex; align-items: center; justify-content: space-between;
}
.adm-modal-title { font-size: 15px; font-weight: 700; color: var(--t1); }
.adm-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.adm-modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--b1);
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
}
.adm-field { display: flex; flex-direction: column; gap: 5px; }
.adm-field label {
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--t3);
}
.adm-field input, .adm-field select {
  padding: 8px 10px;
  background: var(--s1); border: 1px solid var(--b2);
  border-radius: var(--r1); color: var(--t1);
  font-size: 13.5px; font-family: var(--font-sans);
  outline: none; transition: border-color 150ms, box-shadow 150ms;
}
.adm-field input:focus, .adm-field select:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-ring);
}
.adm-field select { cursor: pointer; }
.adm-field select option { background: var(--s2); }

/* Chip/pill filter */
.adm-chip {
  padding: 5px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--b2); background: transparent; color: var(--t2);
  transition: all 120ms;
}
.adm-chip:hover { background: var(--b1); color: var(--t1); }
.adm-chip.active {
  background: var(--accent-dim); border-color: var(--accent-border);
  color: var(--accent);
}

/* Range picker pill */
.range-pill {
  padding: 5px 11px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 600;
  font-family: var(--font-mono);
  border: 1px solid var(--b1); background: transparent; color: var(--t2);
  transition: all 120ms;
}
.range-pill:hover { background: var(--b1); color: var(--t1); }
.range-pill.active {
  background: var(--s3); border-color: var(--b3); color: var(--t1);
}

/* Tooltip (portaled) */
.adm-tooltip {
  position: fixed; z-index: 900; pointer-events: none;
  background: var(--s3); border: 1px solid var(--b2);
  border-radius: var(--r1); padding: 9px 13px;
  box-shadow: var(--sh2); font-size: 12px;
  max-width: 200px;
}

/* Heatmap cell */
.hm-cell {
  border-radius: 3px;
  transition: opacity 150ms;
  cursor: default;
}
.hm-cell:hover { opacity: 0.7; }

/* Alert banner */
.adm-alert {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px; border-radius: var(--r1);
  font-size: 12.5px;
}
.adm-alert.warn  { background: var(--warn-dim); border: 1px solid rgba(245,158,11,0.25); color: var(--warn); }
.adm-alert.crit  { background: var(--err-dim);  border: 1px solid rgba(239,68,68,0.25);  color: var(--err);  }

/* Select ghost */
.adm-select-ghost {
  background: var(--b1); border: 1px solid var(--b1);
  border-radius: var(--r1); color: var(--t2);
  font-size: 12.5px; font-family: var(--font-sans);
  padding: 5px 8px; cursor: pointer; outline: none;
}
.adm-select-ghost:focus { border-color: var(--accent); }

/* Empty state */
.adm-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 48px 24px; text-align: center; gap: 8px;
}
.adm-empty-title { font-size: 14px; font-weight: 600; color: var(--t2); }
.adm-empty-sub   { font-size: 12.5px; color: var(--t3); }

@media (max-width: 900px) {
  .adm-sidebar { width: 64px !important; }
  .adm-logo-text, .adm-nav-label, .adm-section-label,
  .adm-user-name, .adm-user-role { display: none; }
  .adm-collapse-btn { display: none; }
  .adm-body { padding: 16px; }
  .adm-topbar { padding: 0 16px; }
  .adm-tabs { padding: 0 16px; }
  .col-3, .col-4 { grid-column: span 6; }
}
@media (max-width: 600px) {
  .col-3, .col-4, .col-6 { grid-column: span 12; }
}
`;

// ── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: (secret: string) => void }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-secret': pw.trim() },
      });
      if (res.status === 401) { setErr('Senha incorreta. Tente novamente.'); }
      else { onAuth(pw.trim()); }
    } catch {
      setErr('Erro de conexão. Verifique sua internet.');
    } finally { setLoading(false); }
  };

  return (
    <div className="adm-login-wrap">
      <form className="adm-login-card" onSubmit={handleSubmit}>
        <div className="adm-login-logo">
          <img src="/charlotte-avatar.png" alt="Charlotte" style={{ width: 40, height: 40, borderRadius: 'var(--r2)', objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div className="adm-login-title">Charlotte Admin</div>
            <div className="adm-login-sub">Acesso restrito</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="adm-field">
            <label>Senha de acesso</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              className="adm-input"
            />
          </div>
          {err && <div className="adm-login-err">{err}</div>}
          <button type="submit" className="adm-btn adm-btn-primary" disabled={loading || !pw.trim()}>
            <Shield size={14} />
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={12} color="var(--t3)" />
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>Sessão ativa por 24h. Não compartilhe esta URL.</span>
        </div>
      </form>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { section: 'MAIN' },
  { href: '/admin',         icon: Users,    label: 'Usuários' },
  { section: 'ANALYTICS' },
  { href: '/admin/metrics', icon: BarChart2, label: 'Métricas' },
  { section: 'SISTEMA' },
  { href: '/admin/notifications', icon: Bell, label: 'Notificações' },
];

function Sidebar({
  collapsed, onToggle, pathname,
  onLogout,
}: {
  collapsed: boolean; onToggle: () => void; pathname: string | null; onLogout: () => void;
}) {
  return (
    <nav className={`adm-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="adm-logo">
        <img src="/charlotte-avatar.png" alt="Charlotte" style={{ width: 32, height: 32, borderRadius: 'var(--r1)', objectFit: 'cover', flexShrink: 0 }} />
        <div className="adm-logo-text">
          <div className="adm-logo-name">Charlotte</div>
          <div className="adm-logo-tag">ADMIN v2</div>
        </div>
        <button className="adm-collapse-btn" onClick={onToggle} title="[ to toggle">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="adm-nav">
        {NAV.map((item, i) => {
          if ('section' in item) {
            return (
              <div key={i} className="adm-section-label">{item.section}</div>
            );
          }
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : (pathname ?? '').startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={i} href={item.href} className={`adm-nav-item${isActive ? ' active' : ''}`}>
              <Icon size={16} className="adm-nav-icon" />
              <span className="adm-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="adm-footer">
        <div className="adm-footer-user">
          <div className="adm-avatar">A</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="adm-user-name">Admin</div>
            <div className="adm-user-role">Superuser</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="adm-nav-item"
          style={{ width: '100%', marginTop: 4, background: 'none', border: 'none', textAlign: 'left' }}
        >
          <LogOut size={14} className="adm-nav-icon" />
          <span className="adm-nav-label" style={{ fontSize: 12, color: 'var(--t3)' }}>Sair</span>
        </button>
      </div>
    </nav>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const s = sessionStorage.getItem('adminSecret') ?? '';
    setAuthed(!!s);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '[' && !target.closest('input, textarea, select')) {
        setCollapsed(c => !c);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAuth = (s: string) => {
    sessionStorage.setItem('adminSecret', s);
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminSecret');
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <>
        <style>{ADMIN_CSS}</style>
        <div className="admin-root" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      </>
    );
  }

  if (!authed) {
    return (
      <>
        <style>{ADMIN_CSS}</style>
        <div className="admin-root"><LoginScreen onAuth={handleAuth} /></div>
      </>
    );
  }

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="admin-root" style={{ display: 'flex', minHeight: '100dvh' }}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          pathname={pathname}
          onLogout={handleLogout}
        />
        <main
          style={{
            marginLeft: collapsed ? 64 : 240,
            flex: 1,
            minWidth: 0,
            transition: 'margin-left 280ms cubic-bezier(.4,0,.2,1)',
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
