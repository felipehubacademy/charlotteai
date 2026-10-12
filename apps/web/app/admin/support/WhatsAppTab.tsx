'use client';

// Aba WhatsApp do /admin/suporte: situação do número na Meta e ativação (registro com o
// PIN de duas etapas + ligação do app à conta para os webhooks). Só administradores.
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check } from 'lucide-react';

interface Status {
  configured: boolean;
  phone?: { display_phone_number?: string; verified_name?: string; name_status?: string; code_verification_status?: string; status?: string; quality_rating?: string; platform_type?: string; messaging_limit_tier?: string } | null;
  phoneError?: string | null;
  subscribedApps?: string[] | null;
  appsError?: string | null;
}

const LABEL: Record<string, string> = {
  CONNECTED: 'Conectado', PENDING: 'Pendente (falta registrar)', DISCONNECTED: 'Desconectado', FLAGGED: 'Sinalizado', RESTRICTED: 'Restrito', BANNED: 'Banido',
  VERIFIED: 'Verificado', NOT_VERIFIED: 'Não verificado', EXPIRED: 'Expirado',
  APPROVED: 'Aprovado', PENDING_REVIEW: 'Em revisão', DECLINED: 'Recusado', AVAILABLE_WITHOUT_REVIEW: 'Liberado',
  CLOUD_API: 'Cloud API', NOT_APPLICABLE: 'Não registrado', GREEN: 'Alta', YELLOW: 'Média', RED: 'Baixa', UNKNOWN: 'Sem dados',
};
const l = (v?: string | null) => (v ? LABEL[v] ?? v : '—');

export function WhatsAppTab() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch('/api/admin/support/whatsapp');
    if (r.status === 401) { setErr('Só administradores veem esta aba.'); return; }
    if (r.ok) setS(await r.json()); else setErr('Não foi possível consultar a Meta.');
  }, []);
  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fetch('/api/admin/support/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? 'Não foi possível concluir.'); return; }
      setMsg(j.subscribeError ? `${ok} Mas a ligação do app à conta falhou: ${j.subscribeError}` : ok);
      if (j.status) setS(j.status); else load();
      setPin('');
    } finally { setBusy(false); }
  };

  const p = s?.phone;
  const registered = p?.status === 'CONNECTED' || p?.platform_type === 'CLOUD_API';
  const subscribed = !!s?.subscribedApps?.length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>
      </div>
      {err && <div className="adm-alert crit" style={{ marginBottom: 16 }}>{err}</div>}
      {msg && <div className="adm-alert" style={{ marginBottom: 16 }}>{msg}</div>}

      {s && !s.configured && <div className="adm-alert crit">Faltam as variáveis do WhatsApp na Vercel (WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN).</div>}

      {s?.configured && (
        <div className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-hdr"><div className="adm-panel-title">Número do suporte</div></div>
          {s.phoneError ? <div className="adm-panel-body"><div className="adm-alert crit">{s.phoneError}</div></div> : (
            <table className="adm-table"><tbody>
              <tr><td>Número</td><td style={{ color: 'var(--t1)' }}>{p?.display_phone_number ?? '—'}</td></tr>
              <tr><td>Nome</td><td style={{ color: 'var(--t1)' }}>{p?.verified_name ?? '—'} · {l(p?.name_status)}</td></tr>
              <tr><td>Verificação</td><td>{l(p?.code_verification_status)}</td></tr>
              <tr><td>Situação</td><td>{l(p?.status)} · {l(p?.platform_type)}</td></tr>
              <tr><td>Qualidade</td><td>{l(p?.quality_rating)}</td></tr>
              <tr><td>Webhooks (app ligado à conta)</td><td>{s.appsError ? <span style={{ color: 'var(--err)' }}>{s.appsError}</span> : subscribed ? <span className="badge badge-ok"><Check size={11} /> {s.subscribedApps!.join(', ')}</span> : 'Não'}</td></tr>
            </tbody></table>
          )}
        </div>
      )}

      {s?.configured && !s.phoneError && !registered && (
        <div className="adm-panel" style={{ marginBottom: 16 }}>
          <div className="adm-panel-hdr">
            <div className="adm-panel-title">Ativar o número</div>
            <div className="adm-panel-sub">Crie um PIN de 6 números (verificação em duas etapas) e guarde bem: a Meta pede de novo se o número for registrado outra vez.</div>
          </div>
          <div className="adm-panel-body" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="adm-input" style={{ width: 160, letterSpacing: 4 }} inputMode="numeric" maxLength={6} type="password" autoComplete="new-password"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN" />
            <button className="adm-btn-sm primary" disabled={busy || pin.length !== 6} onClick={() => post({ action: 'register', pin }, 'Número registrado.')}>
              {busy ? 'Registrando…' : 'Registrar número'}
            </button>
          </div>
        </div>
      )}

      {s?.configured && registered && !subscribed && !s.appsError && (
        <button className="adm-btn-sm primary" disabled={busy} onClick={() => post({ action: 'subscribe' }, 'App ligado à conta: os webhooks vão chegar.')}>Ligar webhooks</button>
      )}
    </>
  );
}
