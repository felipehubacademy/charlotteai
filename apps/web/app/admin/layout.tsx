'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, BarChart2, ChevronLeft, ChevronRight, Shield, Bell, LogOut, Headphones, Wallet, UserCog, KeyRound, GraduationCap } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { AdminMe, AdminMeContext } from '@/lib/admin-context';

// ── Design tokens ───────────────────────────────────────────────────────────
const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.admin-root {
  --bg:  #FAF7F0;
  --s1:  #FFFFFF;
  --s2:  #F0F0F6;
  --s3:  #E8E8F0;
  --s4:  #DDDDE8;

  /* Paleta Queizy: Tinta como ação principal, Volt como destaque */
  --accent:       #16131F;
  --accent-dim:   rgba(220,255,74,0.55);
  --accent-ring:  rgba(220,255,74,0.65);
  --accent-border:rgba(22,19,31,0.25);
  --volt:         #DCFF4A;

  --brand:        #08804A;
  --brand-dim:    rgba(8,128,74,0.08);
  --brand-border: rgba(8,128,74,0.20);

  --ok:       #08804A;  --ok-dim:   rgba(8,128,74,0.10);
  --warn:     #6B4BFF;  --warn-dim: rgba(107,75,255,0.12);
  --err:      #D12A64;  --err-dim:  rgba(255,79,139,0.12);
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
  background: rgba(250,247,240,0.88);
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
.adm-table tr:hover td { background: rgba(220,255,74,0.12); color: var(--t1); }

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

// ── Login ───────────────────────────────────────────────────────────────────
// Cada pessoa entra com a própria conta do app (mesmo e-mail e senha). A
// senha mestra antiga continua disponível como alternativa.
function LoginScreen({ onSignedIn, onLegacy, notice }: {
  onSignedIn: () => void; onLegacy: (secret: string) => void; notice?: string;
}) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(notice ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      if (legacy) {
        const res = await fetch('/api/admin/me', { headers: { 'x-admin-secret': pw.trim() } });
        if (!res.ok) { setErr('Senha mestra incorreta.'); return; }
        onLegacy(pw.trim());
        return;
      }
      const supabase = getSupabase();
      if (!supabase) { setErr('Configuração indisponível.'); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) { setErr('E-mail ou senha incorretos.'); return; }
      onSignedIn();
    } catch {
      setErr('Erro de conexão. Verifique sua internet.');
    } finally { setLoading(false); }
  };

  return (
    <div className="adm-login-wrap">
      <form className="adm-login-card" onSubmit={handleSubmit}>
        <div className="adm-login-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <img src="/images/queizy-logo.png" alt="Queizy" style={{ height: 30, width: 'auto' }} />
          <div>
            <div className="adm-login-title">Gestão</div>
            <div className="adm-login-sub">Acesso da equipe Queizy</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!legacy && (
            <div className="adm-field">
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus className="adm-input" />
            </div>
          )}
          <div className="adm-field">
            <label>{legacy ? 'Senha mestra' : 'Senha'}</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" className="adm-input" />
          </div>
          {err && <div className="adm-login-err">{err}</div>}
          <button type="submit" className="adm-btn adm-btn-primary" disabled={loading || !pw.trim() || (!legacy && !email.trim())}>
            <Shield size={14} />
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>
            {legacy
              ? ''
              : 'Mesmo e-mail e senha do app.'}
          </span>
          <button type="button" onClick={() => { setLegacy(l => !l); setErr(''); setPw(''); }}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <KeyRound size={12} /> {legacy ? 'Entrar com minha conta' : 'Usar senha mestra'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
type NavItem = { section: string } | { href: string; icon: typeof Users; label: string; area: string };
const NAV: NavItem[] = [
  { section: 'CLIENTES' },
  { href: '/admin',               icon: Users,      label: 'Usuários',     area: 'users' },
  { href: '/admin/learning',      icon: GraduationCap, label: 'Pedagógico', area: 'learning' },
  { href: '/admin/support',       icon: Headphones, label: 'Suporte',      area: 'support' },
  { section: 'NEGÓCIO' },
  { href: '/admin/finance',       icon: Wallet,     label: 'Financeiro',   area: 'finance' },
  { href: '/admin/metrics',       icon: BarChart2,  label: 'Métricas',     area: 'metrics' },
  { section: 'SISTEMA' },
  { href: '/admin/notifications', icon: Bell,       label: 'Notificações', area: 'notifications' },
  { href: '/admin/team',          icon: UserCog,    label: 'Equipe',       area: 'team' },
];

type NavLink = { href: string; area: string };
const NAV_LINKS = NAV.filter((x): x is NavLink & NavItem => 'href' in x) as NavLink[];

/** Área da página atual pelo prefixo mais longo do menu (/admin/users/... é a ficha de Usuários). */
function areaFor(pathname: string | null): string | null {
  const p = (pathname ?? '').replace(/\/$/, '') || '/admin';
  if (p.startsWith('/admin/users')) return 'users';
  const hit = NAV_LINKS.filter(l => l.href !== '/admin' && p.startsWith(l.href)).sort((a, b) => b.href.length - a.href.length)[0];
  if (hit) return hit.area;
  return p === '/admin' ? 'users' : null;
}
function areaAllowed(me: AdminMe, pathname: string | null): boolean {
  const area = areaFor(pathname);
  return !area || me.areas.includes(area);
}
function firstAllowedHref(me: AdminMe): string {
  return NAV_LINKS.find(l => me.areas.includes(l.area))?.href ?? '/admin';
}

function Sidebar({ collapsed, onToggle, pathname, onLogout, me }: {
  collapsed: boolean; onToggle: () => void; pathname: string | null; onLogout: () => void; me: AdminMe;
}) {
  // Esconde seções sem nenhum item liberado para o papel.
  const visible = NAV.filter((item, i) => {
    if ('section' in item) {
      const rest = NAV.slice(i + 1);
      const end = rest.findIndex(x => 'section' in x);
      const items = (end === -1 ? rest : rest.slice(0, end)) as { area: string }[];
      return items.some(x => me.areas.includes(x.area));
    }
    return me.areas.includes(item.area);
  });
  const initial = (me.name ?? me.email ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <nav className={`adm-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="adm-logo">
        <img src="/images/queizy-icon.png" alt="Queizy" style={{ width: 32, height: 32, borderRadius: 'var(--r1)', objectFit: 'cover', flexShrink: 0 }} />
        <div className="adm-logo-text">
          <div className="adm-logo-name">Queizy</div>
          <div className="adm-logo-tag">GESTÃO</div>
        </div>
        <button className="adm-collapse-btn" onClick={onToggle} title="[ para recolher">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="adm-nav">
        {visible.map((item, i) => {
          if ('section' in item) return <div key={i} className="adm-section-label">{item.section}</div>;
          const isActive = item.href === '/admin' ? pathname === '/admin' : (pathname ?? '').startsWith(item.href);
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
          <div className="adm-avatar">{initial}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="adm-user-name">{me.name ?? me.email ?? 'Admin'}</div>
            <div className="adm-user-role">{me.roleLabel}{me.legacy ? ' · senha mestra' : ''}</div>
          </div>
        </div>
        <button onClick={onLogout} className="adm-nav-item"
          style={{ width: '100%', marginTop: 4, background: 'none', border: 'none', textAlign: 'left' }}>
          <LogOut size={14} className="adm-nav-icon" />
          <span className="adm-nav-label" style={{ fontSize: 12, color: 'var(--t3)' }}>Sair</span>
        </button>
      </div>
    </nav>
  );
}

// Toda chamada a /api/admin leva o token de quem está logado.
let fetchPatched = false;
function installAdminFetch() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (url.startsWith('/api/admin') || url.includes('/api/admin/')) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
      const token = data?.session?.access_token;
      if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
      const secret = sessionStorage.getItem('adminSecret');
      if (secret && !headers.get('x-admin-secret')) headers.set('x-admin-secret', secret);
      return original(input, { ...init, headers });
    }
    return original(input, init);
  };
}

// ── Layout ──────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [state, setState] = useState<'loading' | 'login' | 'ready'>('loading');
  const [notice, setNotice] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const loadMe = async () => {
    installAdminFetch();
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) { setMe(await res.json()); setState('ready'); return; }
      const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
      setNotice(data?.session ? 'Sua conta não tem acesso à gestão. Peça para um Administrador te adicionar em Equipe.' : undefined);
      if (data?.session) await getSupabase()?.auth.signOut();
    } catch { /* cai no login */ }
    sessionStorage.removeItem('adminSecret');
    setState('login');
  };

  useEffect(() => { loadMe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '[' && !target.closest('input, textarea, select')) setCollapsed(c => !c);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem('adminSecret');
    await getSupabase()?.auth.signOut();
    setMe(null); setNotice(undefined); setState('login');
  };

  // Página sem acesso para o nível de quem entrou: vai para a primeira área liberada.
  const allowedHere = !me || areaAllowed(me, pathname);
  useEffect(() => {
    if (state === 'ready' && me && !allowedHere) router.replace(firstAllowedHref(me));
  }, [state, me, allowedHere, router]);

  if (state !== 'ready' || !me) {
    return (
      <>
        <style>{ADMIN_CSS}</style>
        <div className="admin-root" style={{ minHeight: '100dvh' }}>
          {state === 'login' && (
            <LoginScreen
              notice={notice}
              onSignedIn={() => { setState('loading'); loadMe(); }}
              onLegacy={(secret) => { sessionStorage.setItem('adminSecret', secret); setState('loading'); loadMe(); }}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <AdminMeContext.Provider value={me}>
      <style>{ADMIN_CSS}</style>
      <div className="admin-root" style={{ display: 'flex', minHeight: '100dvh' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} pathname={pathname} onLogout={handleLogout} me={me} />
        <main style={{ marginLeft: collapsed ? 64 : 240, flex: 1, minWidth: 0, transition: 'margin-left 280ms cubic-bezier(.4,0,.2,1)' }}>
          {allowedHere ? children : null}
        </main>
      </div>
    </AdminMeContext.Provider>
  );
}
