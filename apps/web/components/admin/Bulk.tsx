'use client';
// Seleção e ações em lote no /admin (mesmo padrão em todas as listas).
//   const bulk = useBulk(rows.map(r => r.id));
//   <BulkCheckbox bulk={bulk} id={r.id} />  na linha;  <BulkCheckbox bulk={bulk} page />  no cabeçalho
//   <BulkBar bulk={bulk} total={rows.length} actions={[{ label: 'Fechar', confirm: 'Fechar {n} atendimentos?', run: ids => ... }]} />
// Toda ação pede confirmação (com a contagem) e mostra o resultado: quantas deram certo e quantas falharam.
import { useCallback, useMemo, useState } from 'react';
import { X, TriangleAlert } from 'lucide-react';

export interface Bulk {
  checked: Set<string>;
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
  pageIds: string[];
  pageAll: boolean;
  togglePage: () => void;
}

export function useBulk(pageIds: string[]): Bulk {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = useCallback((id: string) => setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const setAll = useCallback((ids: string[]) => setChecked(new Set(ids)), []);
  const clear = useCallback(() => setChecked(new Set()), []);
  const pageAll = pageIds.length > 0 && pageIds.every(id => checked.has(id));
  const togglePage = useCallback(() => setChecked(prev => {
    const n = new Set(prev);
    const all = pageIds.length > 0 && pageIds.every(id => n.has(id));
    pageIds.forEach(id => (all ? n.delete(id) : n.add(id)));
    return n;
  }), [pageIds]);
  return useMemo(() => ({ checked, toggle, setAll, clear, pageIds, pageAll, togglePage }), [checked, toggle, setAll, clear, pageIds, pageAll, togglePage]);
}

export function BulkCheckbox({ bulk, id, page, label }: { bulk: Bulk; id?: string; page?: boolean; label?: string }) {
  if (page) {
    return <input type="checkbox" aria-label="Selecionar todos da lista" checked={bulk.pageAll} onChange={bulk.togglePage} onClick={e => e.stopPropagation()} />;
  }
  return (
    <input type="checkbox" aria-label={label ?? 'Selecionar'} checked={!!id && bulk.checked.has(id)}
      onChange={() => id && bulk.toggle(id)} onClick={e => e.stopPropagation()} />
  );
}

export interface BulkAction {
  label: string;
  danger?: boolean;
  /** Texto da confirmação; {n} vira a quantidade selecionada. */
  confirm: string;
  /** Executa para um item; true = deu certo. */
  run: (id: string) => Promise<boolean>;
  /** Depois de rodar tudo (ex.: recarregar a lista). */
  after?: () => void | Promise<void>;
}

/** Roda a ação item por item e devolve quantos deram certo. */
async function runEach(ids: string[], run: (id: string) => Promise<boolean>) {
  let ok = 0; let failed = 0;
  for (const id of ids) {
    try { if (await run(id)) ok++; else failed++; } catch { failed++; }
  }
  return { ok, failed };
}

export function BulkBar({ bulk, total, allIds, actions, noun = ['item', 'itens'] }: {
  bulk: Bulk; total: number; allIds?: string[]; actions: BulkAction[]; noun?: [string, string];
}) {
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const n = bulk.checked.size;
  if (!n && !msg) return null;

  const go = async () => {
    if (!pending) return;
    setBusy(true);
    const ids = [...bulk.checked];
    const { ok, failed } = await runEach(ids, pending.run);
    setBusy(false);
    setMsg(`${pending.label}: ${ok} de ${ids.length}${failed ? ` (${failed} com falha)` : ''}.`);
    setPending(null);
    bulk.clear();
    await pending.after?.();
  };

  return (
    <>
      <div style={{ margin: '0 0 10px', padding: '10px 14px', borderRadius: 12, background: 'var(--s2, #F3F1EC)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        {n > 0 ? (
          <>
            <b style={{ color: 'var(--t1)' }}>{n} {n === 1 ? noun[0] : noun[1]} selecionado{n === 1 ? '' : 's'}</b>
            {allIds && n < allIds.length && (
              <button className="adm-btn-sm ghost" onClick={() => bulk.setAll(allIds)}>Selecionar os {total}</button>
            )}
            <div style={{ flex: 1 }} />
            {actions.map(a => (
              <button key={a.label} className={`adm-btn-sm ${a.danger ? 'danger' : 'ghost'}`} disabled={busy} onClick={() => setPending(a)}>{a.label}</button>
            ))}
            <button className="adm-btn-sm ghost" onClick={bulk.clear}>Limpar</button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--t2)' }}>{msg}</span>
            <div style={{ flex: 1 }} />
            <button className="adm-btn-sm ghost" onClick={() => setMsg(null)} aria-label="Fechar aviso"><X size={12} /></button>
          </>
        )}
      </div>

      {pending && (
        <div className="adm-modal-backdrop" onClick={() => !busy && setPending(null)}>
          <div className="adm-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{pending.label}</div>
              <button className="adm-btn-sm ghost" disabled={busy} onClick={() => setPending(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body">
              <div className={`adm-alert ${pending.danger ? 'crit' : ''}`} style={{ display: 'flex', gap: 8 }}>
                {pending.danger && <TriangleAlert size={14} style={{ flexShrink: 0 }} />}
                <div>{pending.confirm.replace('{n}', String(n))}</div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-sm ghost" disabled={busy} onClick={() => setPending(null)}>Cancelar</button>
              <button className={`adm-btn-sm ${pending.danger ? 'danger' : 'primary'}`} disabled={busy} onClick={go}>
                {busy ? 'Aplicando…' : `${pending.label} (${n})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
