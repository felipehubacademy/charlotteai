'use client';
// /admin/instagram — calendário do @queizyapp: prévia, aprovação e comentários tratados pela IA.
// Só é publicado o que estiver aprovado; o cron (/api/cron/instagram) publica na hora marcada.
// As DMs do Instagram entram no Suporte, junto com WhatsApp e e-mail.

import { useState, useEffect, useCallback } from 'react';
import { Instagram, RefreshCw, Check, X, Undo2, ExternalLink, RotateCcw, Pencil } from 'lucide-react';

type Media = { url: string; type: 'image' | 'video' };
type Post = {
  id: string; source_key: string | null; scheduled_at: string; linha: string | null; kind: 'image' | 'carousel' | 'reels';
  caption: string; media: Media[]; cover_url: string | null; status: string; approved_by: string | null;
  permalink: string | null; error: string | null; attempts: number; published_at: string | null;
};
type Comment = {
  id: string; username: string | null; text: string; commented_at: string | null; action: string; category: string | null;
  reply_text: string | null; replied_by: string | null; note: string | null;
  instagram_posts: { source_key: string | null; linha: string | null; permalink: string | null } | null;
};
type Status = { configured: boolean; auth: { username: string | null; expires_at: string | null; refreshed_at: string } | null; counts: Record<string, number>; escalados: number };

const STATUS: Record<string, { label: string; color: string }> = {
  rascunho:  { label: 'Aguardando aprovação', color: 'var(--t3)' },
  aprovado:  { label: 'Aprovado',             color: 'var(--accent)' },
  preparado: { label: 'Publicando',           color: 'var(--warn)' },
  publicado: { label: 'Publicado',            color: 'var(--ok)' },
  erro:      { label: 'Erro',                 color: 'var(--err)' },
  cancelado: { label: 'Cancelado',            color: 'var(--t3)' },
};
const ACAO: Record<string, string> = { pendente: 'Na fila', respondido: 'Respondido', escalado: 'Para a equipe', oculto: 'Ocultado', ignorado: 'Sem resposta', erro: 'Erro' };
const KIND: Record<Post['kind'], string> = { image: 'Post', carousel: 'Carrossel', reels: 'Reels' };
const dia = (s: string) => new Date(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const hora = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const toLocalInput = (s: string) => {
  const d = new Date(s); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function InstagramAdmin() {
  const [tab, setTab] = useState<'calendar' | 'comments'>('calendar');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Post | null>(null);
  const [slide, setSlide] = useState(0);
  const [edit, setEdit] = useState<{ caption: string; when: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([fetch('/api/admin/instagram?view=posts'), fetch('/api/admin/instagram?view=comments'), fetch('/api/admin/instagram?view=status')]);
      if (p.ok) setPosts((await p.json()).posts ?? []);
      if (c.ok) setComments((await c.json()).comments ?? []);
      if (s.ok) setStatus(await s.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error ?? 'Não foi possível concluir.'); return false; }
      await load();
      return true;
    } finally { setBusy(false); }
  };

  const pendentes = posts.filter(p => p.status === 'rascunho');
  const porDia = posts.reduce<Record<string, Post[]>>((acc, p) => { (acc[dia(p.scheduled_at)] ??= []).push(p); return acc; }, {});
  const capa = (p: Post) => p.kind === 'reels' ? p.cover_url : p.media[0]?.url;
  const escalados = comments.filter(c => c.action === 'escalado');

  return (
    <div className="adm-page">
      <div className="adm-topbar">
        <Instagram size={18} color="var(--accent)" />
        <div className="adm-topbar-title">Instagram</div>
        <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>
        {tab === 'calendar' && pendentes.length > 0 && (
          <button className="adm-btn-sm primary" disabled={busy} onClick={() => { if (confirm(`Aprovar ${pendentes.length} post(s)? Eles saem sozinhos na hora marcada.`)) act({ action: 'approve', ids: pendentes.map(p => p.id) }); }}>
            <Check size={13} /> Aprovar todos ({pendentes.length})
          </button>
        )}
      </div>

      <div className="adm-tabs">
        <div className={`adm-tab${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>Calendário ({posts.length})</div>
        <div className={`adm-tab${tab === 'comments' ? ' active' : ''}`} onClick={() => setTab('comments')}>Comentários{escalados.length ? ` (${escalados.length} para a equipe)` : ''}</div>
      </div>

      <div className="adm-body">
        {status && !status.configured && (
          <div className="adm-panel" style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--err)' }}>
            <b>Conta não conectada.</b> Falta a chave de acesso do Instagram (<code>INSTAGRAM_ACCESS_TOKEN</code> na Vercel). Até lá, nada é publicado.
          </div>
        )}
        {status?.configured && (
          <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 12 }}>
            Conta @{status.auth?.username ?? '…'} · chave {status.auth?.expires_at ? `válida até ${new Date(status.auth.expires_at).toLocaleDateString('pt-BR')} (renova sozinha)` : 'conectada'} · publica às 12h e 18h30 o que estiver aprovado. As DMs do Instagram aparecem no Suporte.
          </div>
        )}

        {tab === 'calendar' && (
          Object.keys(porDia).length === 0 ? (
            <div className="adm-panel"><div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhum post no calendário'}</div></div></div>
          ) : Object.entries(porDia).map(([d, list]) => (
            <div key={d} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t2)', marginBottom: 8 }}>{d}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {list.map(p => (
                  <div key={p.id} className="adm-panel" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => { setOpen(p); setSlide(0); setEdit(null); }}>
                    <div style={{ aspectRatio: p.kind === 'reels' ? '9 / 12' : '4 / 5', background: '#16131F', overflow: 'hidden' }}>
                      {capa(p) && <img src={capa(p)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
                        <span>{hora(p.scheduled_at)} · {KIND[p.kind]}{p.kind === 'carousel' ? ` (${p.media.length})` : ''}</span>
                        <span style={{ color: STATUS[p.status]?.color }}>{STATUS[p.status]?.label ?? p.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>{p.linha}</div>
                      {p.error && <div style={{ fontSize: 11.5, color: 'var(--err)', marginTop: 4 }}>{p.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {tab === 'comments' && (
          <div className="adm-panel">
            {comments.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-title">{loading ? 'Carregando…' : 'Nenhum comentário ainda'}</div></div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Quando</th><th>Quem</th><th>Comentário</th><th>O que a IA fez</th><th>Resposta</th><th></th></tr></thead>
                <tbody>
                  {comments.map(c => (
                    <tr key={c.id} style={c.action === 'escalado' ? { background: 'var(--err-dim)' } : undefined}>
                      <td style={{ whiteSpace: 'nowrap' }}>{c.commented_at ? quando(c.commented_at) : '—'}</td>
                      <td>@{c.username ?? '—'}<div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.instagram_posts?.linha ?? ''}</div></td>
                      <td style={{ maxWidth: 280 }}>{c.text}</td>
                      <td>{ACAO[c.action] ?? c.action}{c.category ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.category}{c.note ? ` · ${c.note}` : ''}</div> : null}</td>
                      <td style={{ maxWidth: 260, fontSize: 12.5 }}>{c.reply_text ?? '—'}{c.replied_by && c.replied_by !== 'ia' ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>por {c.replied_by}</div> : null}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.instagram_posts?.permalink && <a className="adm-btn-sm ghost" href={c.instagram_posts.permalink} target="_blank" rel="noreferrer"><ExternalLink size={12} /></a>}
                        {c.action !== 'oculto' && <button className="adm-btn-sm ghost" disabled={busy} onClick={() => setReplyTo({ id: c.id, text: '' })}>Responder</button>}
                        {c.action !== 'oculto' && <button className="adm-btn-sm ghost" disabled={busy} onClick={() => { if (confirm('Ocultar este comentário no Instagram?')) act({ action: 'hide_comment', id: c.id }); }}>Ocultar</button>}
                        {c.action === 'escalado' && <button className="adm-btn-sm ghost" disabled={busy} onClick={() => act({ action: 'resolve_comment', id: c.id })}>Resolvido</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="adm-modal-backdrop" onClick={() => setOpen(null)}>
          <div className="adm-modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">{dia(open.scheduled_at)}, {hora(open.scheduled_at)} · {KIND[open.kind]} · {open.linha}</div>
              <button className="adm-btn-sm ghost" onClick={() => setOpen(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: 18 }}>
              <div>
                {open.kind === 'reels' ? (
                  <video src={open.media.find(m => m.type === 'video')?.url} poster={open.cover_url ?? undefined} controls style={{ width: '100%', borderRadius: 10, background: '#000' }} />
                ) : (
                  <>
                    <img src={open.media[slide]?.url} alt="" style={{ width: '100%', borderRadius: 10 }} />
                    {open.media.length > 1 && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                        {open.media.map((_, i) => <button key={i} className={`adm-btn-sm ${i === slide ? 'primary' : 'ghost'}`} onClick={() => setSlide(i)}>{i + 1}</button>)}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12.5, color: STATUS[open.status]?.color, fontWeight: 700 }}>
                  {STATUS[open.status]?.label}{open.approved_by && open.status !== 'rascunho' ? ` · aprovado por ${open.approved_by}` : ''}
                </div>
                {edit ? (
                  <>
                    <div className="adm-field"><label>Data e hora</label><input className="adm-input" type="datetime-local" value={edit.when} onChange={e => setEdit({ ...edit, when: e.target.value })} /></div>
                    <div className="adm-field"><label>Legenda</label><textarea className="adm-input" rows={12} value={edit.caption} onChange={e => setEdit({ ...edit, caption: e.target.value })} style={{ resize: 'vertical' }} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn-sm primary" disabled={busy} onClick={async () => { if (await act({ action: 'update', id: open.id, caption: edit.caption, scheduled_at: new Date(edit.when).toISOString() })) setOpen(null); }}>Salvar</button>
                      <button className="adm-btn-sm ghost" onClick={() => setEdit(null)}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.5, background: 'var(--s2)', borderRadius: 10, padding: 12, maxHeight: 340, overflow: 'auto' }}>{open.caption}</div>
                    {open.error && <div style={{ fontSize: 12.5, color: 'var(--err)' }}>{open.error}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {open.status === 'rascunho' && <button className="adm-btn-sm primary" disabled={busy} onClick={async () => { if (await act({ action: 'approve', ids: [open.id] })) setOpen(null); }}><Check size={13} /> Aprovar</button>}
                      {open.status === 'aprovado' && <button className="adm-btn-sm ghost" disabled={busy} onClick={async () => { if (await act({ action: 'unapprove', id: open.id })) setOpen(null); }}><Undo2 size={13} /> Tirar aprovação</button>}
                      {open.status === 'erro' && <button className="adm-btn-sm primary" disabled={busy} onClick={async () => { if (await act({ action: 'retry', id: open.id })) setOpen(null); }}><RotateCcw size={13} /> Tentar de novo</button>}
                      {['rascunho', 'aprovado', 'erro'].includes(open.status) && <button className="adm-btn-sm ghost" onClick={() => setEdit({ caption: open.caption, when: toLocalInput(open.scheduled_at) })}><Pencil size={13} /> Editar</button>}
                      {['rascunho', 'aprovado', 'erro'].includes(open.status) && <button className="adm-btn-sm ghost" disabled={busy} onClick={async () => { if (confirm('Cancelar este post?') && await act({ action: 'cancel', id: open.id })) setOpen(null); }}><X size={13} /> Cancelar post</button>}
                      {open.permalink && <a className="adm-btn-sm ghost" href={open.permalink} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver no Instagram</a>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {replyTo && (
        <div className="adm-modal-backdrop" onClick={() => setReplyTo(null)}>
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <div className="adm-modal-title">Responder comentário</div>
              <button className="adm-btn-sm ghost" onClick={() => setReplyTo(null)}><X size={13} /></button>
            </div>
            <div className="adm-modal-body">
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>{comments.find(c => c.id === replyTo.id)?.text}</div>
              <textarea className="adm-input" rows={4} value={replyTo.text} onChange={e => setReplyTo({ ...replyTo, text: e.target.value })} placeholder="A resposta sai pública, no comentário da pessoa." style={{ width: '100%', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="adm-btn-sm primary" disabled={busy || !replyTo.text.trim()} onClick={async () => { if (await act({ action: 'reply_comment', id: replyTo.id, text: replyTo.text })) setReplyTo(null); }}>Responder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
