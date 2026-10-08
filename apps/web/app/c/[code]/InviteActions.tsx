'use client';

import { useEffect, useState } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6760943273';
const PLAY_ID = 'com.hubacademy.charlotte';

type Platform = 'ios' | 'android' | 'desktop';

export default function InviteActions({ code }: { code: string }) {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent;
    const p: Platform = /iPad|iPhone|iPod/.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop';
    setPlatform(p);
    // Se o app já estiver instalado, abre direto no convite.
    if (p !== 'desktop' && code) window.location.href = `queizy://invite/${code}`;
  }, [code]);

  const playUrl = `https://play.google.com/store/apps/details?id=${PLAY_ID}&referrer=${encodeURIComponent(`queizy_invite=${code}`)}`;

  // No iPhone o código vai para a área de transferência: o app oferece colar no primeiro acesso.
  const copyThenGo = async (url: string) => {
    try { await navigator.clipboard.writeText(`QUEIZY:${code}`); } catch { /* segue sem copiar */ }
    window.location.href = url;
  };

  const btn: React.CSSProperties = {
    display: 'block', width: '100%', padding: '16px 20px', borderRadius: 999, fontWeight: 800, fontSize: 16,
    textDecoration: 'none', border: 0, cursor: 'pointer', boxSizing: 'border-box',
  };
  const primary = { ...btn, background: '#16131F', color: '#DCFF4A' };
  const ghost = { ...btn, background: '#FFFFFF', color: '#16131F', border: '1.5px solid #16131F', marginTop: 10 };

  if (platform === 'ios') return <button style={primary} onClick={() => copyThenGo(APP_STORE_URL)}>Baixar na App Store</button>;
  if (platform === 'android') return <a style={primary} href={playUrl}>Baixar no Google Play</a>;
  return (
    <>
      <button style={primary} onClick={() => copyThenGo(APP_STORE_URL)}>App Store</button>
      <a style={ghost} href={playUrl}>Google Play</a>
    </>
  );
}
