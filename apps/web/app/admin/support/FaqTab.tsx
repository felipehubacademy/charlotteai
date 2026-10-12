'use client';

// Aba FAQ do /admin/suporte: a base que a IA do suporte consulta. Mudanças valem em até 1 min.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, X, Trash2, Download } from 'lucide-react';

interface Entry {
  id: string; section: string; question: string; answer: string; sort: number;
  is_active: boolean; source: string; updated_by: string | null; updated_at: string;
}
const SOURCE: Record<string, string> = { seed: 'Padrão', manual: 'Manual', suggestion: 'Sugestão da IA' };
const post = (body: Record<string, unknown>) =>
  fetch('/api/admin/support/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function FaqTab() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Partial<Entry> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/support/faq');
    if (r.ok) setEntries((await r.json()).entries ?? []); else setErr('Não foi possível carregar a FAQ.');
  }, []);
  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const m = new Map<string, Entry[]>();
    const term = q.trim().toLowerCase();
    for (const e of entries ?? []) {
      if (term && !`${e.question} ${e.answer}`.toLowerCase().includes(term)) continue;
      if (!m.has(e.section)) m.set(e.section, []);
      m.get(e.section)!.push(e);
    }
    return [...m.entries()];
  }, [entries, q]);

  const seed = async () => {
    setErr(null);
    const r = await post({ action: 'seed' });
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? 'Não foi possível carregar.');
    load();
  };
  const toggle = async (e: Entry) => { await post({ action: 'save', ...e, is_active: !e.is_active }); load(); };
  const remove = async (e: Entry) => {
    if (!confirm(`Apagar a pergunta "${e.question}"? A IA deixa de usar esta resposta.`)) return;
    await post({ action: 'delete', id: e.id }); load();
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="adm-input" style={{ maxWidth: 320 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar na FAQ" />
        <div style={{ flex: 1 }} />
        <button className="adm-btn-sm primary" onClick={() => setEdit({ section: 'Guia do app', is_active: true })}><Plus size={13} /> Nova pergunta</button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>
        É isto que a IA do suporte usa para responder (e-mail e WhatsApp). Ela não responde nada que não esteja aqui. Mudanças valem em até 1 minuto.
      </div>
      {err && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{err}</div>}

      {entries && entries.length === 0 && (
        <div className="adm-panel"><div className="adm-empty">
          <div className="adm-empty-title">A FAQ ainda está vazia</div>
          <div className="adm-empty-sub">Enquanto isso, a IA usa a FAQ padrão do código. Carregue-a aqui para poder editar.</div>
          <button className="adm-btn-sm primary" style={{ marginTop: 12 }} onClick={seed}><Download size={13} /> Carregar FAQ padrão</button>
        </div></div>
      )}

      {sections.map(([section, list]) => (
        <div key={section} className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-hdr"><div className="adm-panel-title">{section}</div><div className="adm-panel-sub">{list.length} pergunta(s)</div></div>
          <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map(e => (
              <div key={e.id} style={{ borderBottom: '1px solid var(--b1)', paddingBottom: 12, opacity: e.is_active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>{e.question}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--t2)', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginTop: 4 }}>{e.answer}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
                      {SOURCE[e.source] ?? e.source}{e.updated_by ? ` · ${e.updated_by}` : ''} · {new Date(e.updated_at).toLocaleDateString('pt-BR')}{!e.is_active ? ' · desligada' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className={`badge ${e.is_active ? 'badge-ok' : 'badge-muted'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(e)}>{e.is_active ? 'Ativa' : 'Desligada'}</button>
                    <button className="adm-btn-sm ghost" onClick={() => setEdit(e)}><Pencil size={12} /></button>
                    <button className="adm-btn-sm ghost" onClick={() => remove(e)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {edit && <EditModal entry={edit} sections={[...new Set((entries ?? []).map(e => e.section))]} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

function EditModal({ entry, sections, onClose, onSaved }: { entry: Partial<Entry>; sections: string[]; onClose: () => void; onSaved: () => void }) {
  const [section, setSection] = useState(entry.section ?? 'Guia do app');
  const [question, setQuestion] = useState(entry.question ?? '');
  const [answer, setAnswer] = useState(entry.answer ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await post({ action: 'save', id: entry.id, section, question, answer, sort: entry.sort, is_active: entry.is_active !== false });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? 'Não foi possível salvar.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };
  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" style={{ width: 'min(640px, 94vw)' }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-hdr"><div className="adm-modal-title">{entry.id ? 'Editar pergunta' : 'Nova pergunta'}</div><button className="adm-btn-sm ghost" onClick={onClose}><X size={13} /></button></div>
        <div className="adm-modal-body">
          <div className="adm-field"><label>Seção</label>
            <input list="faq-sections" value={section} onChange={e => setSection(e.target.value)} placeholder="Ex.: Guia do app" />
            <datalist id="faq-sections">{sections.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="adm-field"><label>Pergunta (como o aluno perguntaria)</label><input value={question} onChange={e => setQuestion(e.target.value)} /></div>
          <div className="adm-field"><label>Resposta (use os nomes exatos das telas e botões do app)</label>
            <textarea className="adm-input" rows={8} value={answer} onChange={e => setAnswer(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          {err && <div className="adm-alert crit">{err}</div>}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-sm ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-sm primary" disabled={busy || !question.trim() || !answer.trim()} onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
