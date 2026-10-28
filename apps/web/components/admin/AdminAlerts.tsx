'use client';
// Sino da gestão: caixa com os alertas que chegam por push (custos de IA, checkout, chamados...).
// Guarda o texto completo de cada alerta, com lido/não lido, abrir a tela certa e excluir.
// Ao tocar num push, a tela abre com ?alerta=id: o sino abre com esse alerta destacado e já lido.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Check, Trash2, ArrowRight, BellOff } from 'lucide-react';

export interface AdminAlert { id: string; title: string; body: string; url: string | null; category: string | null; created_at: string; read_at: string | null }

const CATEGORY_LABEL: Record<string, string> = {
  checkout: 'Checkout', ticket_new: 'Suporte', ticket_sla: 'Suporte', capacity: 'Banco',
  ai_costs: 'Custos de IA', instagram: 'Instagram',
};
const PAGE_LABEL: [string, string][] = [
  ['/admin/finance', 'Abrir o Financeiro'], ['/admin/support', 'Abrir o Suporte'], ['/admin/commercial', 'Abrir o Comercial'],
  ['/admin/instagram', 'Abrir o Instagram'], ['/admin/metrics', 'Abrir as Métricas'],
];
const pageLabel = (url: string) => PAGE_LABEL.find(([p]) => url.startsWith(p))?.[1] ?? 'Abrir a tela';

function when(iso: string): string {
  const d = new Date(iso), mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  if (mins < 24 * 60) return `há ${Math.round(mins / 60)} h`;
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const send = (method: 'PATCH' | 'DELETE', body: object) =>
  fetch('/api/admin/alerts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Alertas de quem está logado, atualizados a cada minuto e ao voltar para a aba. */
export function useAdminAlerts(enabled: boolean) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/alerts').catch(() => null);
    if (!r?.ok) return;
    const j = await r.json();
    setAlerts(j.alerts ?? []); setUnread(j.unread ?? 0);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(load, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [enabled, load]);

  const setRead = async (id: string, read: boolean) => {
    setAlerts(a => a.map(x => x.id === id ? { ...x, read_at: read ? new Date().toISOString() : null } : x));
    setUnread(n => Math.max(0, n + (read ? -1 : 1)));
    await send('PATCH', { id, read }); load();
  };
  const readAll = async () => {
    setAlerts(a => a.map(x => x.read_at ? x : { ...x, read_at: new Date().toISOString() })); setUnread(0);
    await send('PATCH', { all: true }); load();
  };
  const remove = async (id: string) => {
    setAlerts(a => a.filter(x => x.id !== id));
    await send('DELETE', { id }); load();
  };
  const removeRead = async () => {
    setAlerts(a => a.filter(x => !x.read_at));
    await send('DELETE', { read: true }); load();
  };
  return { alerts, unread, load, setRead, readAll, remove, removeRead };
}

export const ALERTS_CSS = `
.adm-badge {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--err); color: #fff; font-size: 10.5px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; line-height: 1;
}
.adm-nav-item .adm-badge { margin-left: auto; }
.adm-sidebar.collapsed .adm-nav-item .adm-badge { position: absolute; top: 3px; left: 30px; margin: 0; min-width: 16px; height: 16px; font-size: 9.5px; }
.adm-mobilebar-btn { position: relative; }
.adm-mobilebar-btn .adm-badge { position: absolute; top: -5px; right: -5px; }
.adm-alerts-backdrop { position: fixed; inset: 0; background: rgba(22,19,31,0.35); z-index: 400; }
.adm-alerts {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw); z-index: 401;
  background: var(--bg); box-shadow: var(--sh3); display: flex; flex-direction: column;
}
.adm-alerts-hdr { display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: var(--s1); border-bottom: 1px solid var(--b1); }
.adm-alerts-title { font-size: 15px; font-weight: 700; color: var(--t1); flex: 1; }
.adm-alerts-bar { display: flex; align-items: center; gap: 6px; padding: 10px 16px; flex-wrap: wrap; }
.adm-alerts-list { flex: 1; overflow-y: auto; padding: 0 12px 16px; }
.adm-alert-item {
  background: var(--s1); border: 1px solid var(--b1); border-radius: var(--r2);
  padding: 12px 14px; margin-bottom: 8px; cursor: pointer;
}
.adm-alert-item.unread { border-left: 3px solid var(--err); }
.adm-alert-item.focus { box-shadow: 0 0 0 2px var(--accent-ring); }
.adm-alert-meta { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--t3); margin-bottom: 4px; }
.adm-alert-item-title { font-size: 13.5px; font-weight: 700; color: var(--t1); }
.adm-alert-item.read .adm-alert-item-title { font-weight: 600; color: var(--t2); }
.adm-alert-body { font-size: 13px; color: var(--t2); line-height: 1.5; margin-top: 4px; white-space: pre-wrap; }
.adm-alert-body.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.adm-alert-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.adm-alerts-empty { text-align: center; color: var(--t3); font-size: 13px; padding: 48px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
`;

export function AlertsDrawer({ open, onClose, focusId, state }: {
  open: boolean; onClose: () => void; focusId: string | null; state: ReturnType<typeof useAdminAlerts>;
}) {
  const { alerts, unread, setRead, readAll, remove, removeRead } = state;
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => { if (open && focusId) { setExpanded(focusId); setOnlyUnread(false); } }, [open, focusId]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const list = onlyUnread ? alerts.filter(a => !a.read_at) : alerts;
  const hasRead = alerts.some(a => a.read_at);
  const toggle = (a: AdminAlert) => {
    const next = expanded === a.id ? null : a.id;
    setExpanded(next);
    if (next && !a.read_at) setRead(a.id, true);
  };

  return (
    <>
      <div className="adm-alerts-backdrop" onClick={onClose} />
      <aside className="adm-alerts" role="dialog" aria-label="Alertas">
        <div className="adm-alerts-hdr">
          <div className="adm-alerts-title">Alertas{unread ? ` (${unread} não ${unread === 1 ? 'lido' : 'lidos'})` : ''}</div>
          <button className="adm-btn-sm ghost" onClick={onClose} aria-label="Fechar"><X size={14} /></button>
        </div>
        <div className="adm-alerts-bar">
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`adm-btn-sm ${!onlyUnread ? 'primary' : 'ghost'}`} onClick={() => setOnlyUnread(false)}>Todos</button>
            <button className={`adm-btn-sm ${onlyUnread ? 'primary' : 'ghost'}`} onClick={() => setOnlyUnread(true)}>Não lidos</button>
          </div>
          <div style={{ flex: 1 }} />
          {unread > 0 && <button className="adm-btn-sm ghost" onClick={readAll}><Check size={13} /> Marcar todos como lidos</button>}
          {hasRead && <button className="adm-btn-sm ghost" onClick={() => { if (window.confirm('Excluir todos os alertas já lidos?')) removeRead(); }}><Trash2 size={13} /> Excluir lidos</button>}
        </div>
        <div className="adm-alerts-list">
          {list.length === 0 && (
            <div className="adm-alerts-empty">
              <BellOff size={22} />
              {onlyUnread ? 'Nenhum alerta não lido.' : 'Nenhum alerta por enquanto. Os avisos que chegam por push ficam guardados aqui.'}
            </div>
          )}
          {list.map(a => {
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={`adm-alert-item ${a.read_at ? 'read' : 'unread'}${focusId === a.id ? ' focus' : ''}`} onClick={() => toggle(a)}>
                <div className="adm-alert-meta">
                  {a.category && CATEGORY_LABEL[a.category] && <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{CATEGORY_LABEL[a.category]}</span>}
                  <span>{when(a.created_at)}</span>
                  {!a.read_at && <span style={{ marginLeft: 'auto', color: 'var(--err)', fontWeight: 700 }}>Não lido</span>}
                </div>
                <div className="adm-alert-item-title">{a.title}</div>
                {a.body && <div className={`adm-alert-body${isOpen ? '' : ' clamp'}`}>{a.body}</div>}
                {isOpen && (
                  <div className="adm-alert-actions" onClick={e => e.stopPropagation()}>
                    {a.url && a.url !== '/admin' && (
                      <Link href={a.url} className="adm-btn-sm primary" onClick={onClose}>{pageLabel(a.url)} <ArrowRight size={13} /></Link>
                    )}
                    <button className="adm-btn-sm ghost" onClick={() => setRead(a.id, !a.read_at)}>{a.read_at ? 'Marcar como não lido' : 'Marcar como lido'}</button>
                    <button className="adm-btn-sm ghost" onClick={() => remove(a.id)}><Trash2 size={13} /> Excluir</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
