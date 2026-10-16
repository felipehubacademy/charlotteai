'use client';
// Tela de sucesso do site: "Mandamos o acesso para fulano@gmial.com. Não é esse? Corrigir".
// Só oferece a correção enquanto a conta, criada pela compra, nunca foi usada no app.
import { useEffect, useState } from 'react';
import { suggestEmailCorrection } from '@/lib/email-validation';

const INK = '#14121A';
const MID = '#5C5668';

export default function CheckoutEmailCheck() {
  const [email, setEmail] = useState<string | null>(null);
  const [canFix, setCanFix] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/checkout/asaas/email').then(r => r.json()).then(j => {
      setEmail(j.email ?? null); setCanFix(!!j.canFix);
      // Erro de digitação provável: já abre a correção com a sugestão.
      const s = j.email ? suggestEmailCorrection(j.email) : null;
      if (s && j.canFix) { setEditing(true); setValue(s); }
    }).catch(() => {});
  }, []);

  if (!email) return null;

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/checkout/asaas/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, text: j.error ?? 'Não foi possível corrigir agora.' }); return; }
      setEmail(j.email); setEditing(false);
      setMsg({ ok: true, text: 'Pronto! Corrigimos o e-mail e mandamos o link para criar a senha.' });
    } finally { setBusy(false); }
  }

  const suggestion = suggestEmailCorrection(email);
  return (
    <div style={{ background: '#fff', border: '1px solid #E6E2EC', borderRadius: 16, padding: '14px 16px', marginBottom: 22, textAlign: 'left', fontSize: 14.5, color: MID, lineHeight: 1.5 }}>
      Mandamos o acesso para <b style={{ color: INK }}>{email}</b>.
      {canFix && !editing && (
        <> {suggestion ? <>Você quis dizer <b style={{ color: INK }}>{suggestion}</b>? </> : 'Não é esse? '}
          <button type="button" onClick={() => { setEditing(true); setValue(suggestion ?? email); }}
            style={{ background: 'none', border: 0, padding: 0, color: '#6B4BFF', fontWeight: 700, cursor: 'pointer', fontSize: 14.5 }}>Corrigir</button>
        </>
      )}
      {editing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input type="email" value={value} onChange={e => setValue(e.target.value)} autoComplete="email" inputMode="email"
            style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 10, border: '1px solid #D9D4E2', fontSize: 15 }} />
          <button type="button" disabled={busy} onClick={save}
            style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: INK, color: '#DDFF4A', fontWeight: 800, cursor: 'pointer' }}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
      {msg && <div style={{ marginTop: 8, color: msg.ok ? '#08804A' : '#C0264F', fontWeight: 600 }}>{msg.text}</div>}
    </div>
  );
}
