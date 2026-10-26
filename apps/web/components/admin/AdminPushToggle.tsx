'use client';
// Botão "Alertas no celular" do /admin: registra o service worker do PWA e inscreve este aparelho
// nos alertas da gestão (checkout, banco, custos de IA, suporte). No iPhone o push só funciona
// com o painel instalado na Tela de Início, então mostra como instalar.
import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';

type State = 'loading' | 'unsupported' | 'install' | 'off' | 'on' | 'denied' | 'busy' | 'noserver';

function urlB64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const isIos = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export default function AdminPushToggle() {
  const [state, setState] = useState<State>('loading');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator)) { setState('unsupported'); return; }
      const reg = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => null);
      if (!reg || !('PushManager' in window) || !('Notification' in window)) { setState(isIos() && !isStandalone() ? 'install' : 'unsupported'); return; }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      const sub = await reg.pushManager.getSubscription();
      const r = await fetch(`/api/admin/push${sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ''}`).then(x => x.json()).catch(() => null);
      if (!r?.publicKey) { setState('noserver'); return; }
      setState(sub && r.subscribed ? 'on' : 'off');
    })();
  }, []);

  const enable = async () => {
    setState('busy'); setHint(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/admin/push').then(x => x.json());
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) as BufferSource });
      const r = await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Não foi possível ativar.');
      await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) });
      setState('on'); setHint('Pronto. Mandamos um alerta de teste.');
    } catch (e) {
      setState('off'); setHint((e as Error).message);
    }
  };

  const disable = async () => {
    setState('busy');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/admin/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe().catch(() => {});
    }
    setState('off'); setHint(null);
  };

  if (state === 'loading' || state === 'unsupported' || state === 'noserver') return null;

  const label = state === 'on' ? 'Alertas no celular: ativados'
    : state === 'install' ? 'Alertas no celular'
    : state === 'denied' ? 'Alertas bloqueados'
    : state === 'busy' ? 'Ativando…' : 'Ativar alertas no celular';
  const help = state === 'install'
    ? 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra o Queizy Gestão por lá e ative os alertas.'
    : state === 'denied' ? 'Libere as notificações deste site nos ajustes do navegador.'
    : hint;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={state === 'on' ? disable : state === 'off' ? enable : undefined}
        disabled={state === 'busy' || state === 'install' || state === 'denied'}
        className="adm-nav-item"
        title={state === 'on' ? 'Toque para desativar neste aparelho' : undefined}
        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: state === 'on' || state === 'off' ? 'pointer' : 'default' }}
      >
        {state === 'on' ? <BellRing size={14} className="adm-nav-icon" /> : <Bell size={14} className="adm-nav-icon" />}
        <span className="adm-nav-label" style={{ fontSize: 12 }}>{label}</span>
      </button>
      {help && <div className="adm-nav-label" style={{ fontSize: 11, color: 'var(--t3)', padding: '2px 10px 6px', lineHeight: 1.4, whiteSpace: 'normal' }}>{help}</div>}
    </div>
  );
}
