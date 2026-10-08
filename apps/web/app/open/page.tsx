'use client';

// app/open/page.tsx
// Smart redirect page — abre o app Charlotte se instalado,
// senao mostra botoes para App Store / Google Play.
// Desktop: mostra QR code para escanear com o celular.
//
// Fluxo confirmacao de email:
//   Supabase verifica token -> redirect para /open#access_token=...&refresh_token=...&type=signup
//   -> tenta abrir charlotte://auth/callback#... -> AuthProvider.setSession() -> logado
//
// Fluxo convite institucional (admin criou usuario):
//   Email com botao -> /open?mode=invite
//   -> tenta abrir charlotte:// (tela de login)
//
// Com Universal Links (proximo build):
//   iOS intercepta https://charlotte.hubacademybr.com/open direto no app
//   sem nem passar pelo browser — fluxo ainda mais suave.

import { useEffect, useState } from 'react';

const IOS_URL     = 'https://apps.apple.com/app/id6760943273';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
const QR_PAGE_URL = 'https://queizy.com/open';

type Phase = 'launching' | 'fallback' | 'expired';
type OS    = 'ios' | 'android' | 'desktop';

function getOS(): OS {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua))          return 'android';
  return 'desktop';
}

export default function OpenPage() {
  const [phase, setPhase] = useState<Phase>('launching');
  const [os, setOs]       = useState<OS>('desktop');
  const [dots, setDots]   = useState('.');

  useEffect(() => {
    const currentOs = getOS();
    setOs(currentOs);

    // Desktop nao tem o app — vai direto para o fallback com QR code
    if (currentOs === 'desktop') {
      setPhase('fallback');
      return;
    }

    // Le tokens do hash (Supabase redirect) e query string (mode=invite)
    const hash   = window.location.hash.slice(1);
    const search = window.location.search.slice(1);
    const hashParams  = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(search);

    // Erro de token expirado — mostrar mensagem amigavel antes de tentar abrir o app
    const errorCode = hashParams.get('error_code') ?? hashParams.get('error');
    if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
      setPhase('expired');
      return;
    }

    const accessToken  = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type         = hashParams.get('type') ?? 'signup';
    const mode         = queryParams.get('mode');

    // Monta o deep link
    let deepLink = 'charlotte://';
    if (accessToken && refreshToken) {
      deepLink = `charlotte://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&type=${type}`;
    } else if (mode === 'invite') {
      deepLink = 'charlotte://';
    }

    // Tenta abrir o app via iframe (menos agressivo — permite o fallback timer)
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', deepLink);
      iframe.setAttribute('style', 'display:none;width:0;height:0;border:0;');
      document.body.appendChild(iframe);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 3000);
    } catch {}

    // Android: Intent URL para maior compatibilidade com Chrome
    if (currentOs === 'android') {
      const intentBase = accessToken
        ? `intent://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&type=${type}#Intent;scheme=charlotte;package=com.hubacademy.charlotte;end`
        : `intent://#Intent;scheme=charlotte;package=com.hubacademy.charlotte;end`;
      setTimeout(() => { window.location.href = intentBase; }, 200);
    } else {
      // iOS: window.location para trigger adicional
      setTimeout(() => { window.location.href = deepLink; }, 200);
    }

    // Fallback: se o usuario ainda estiver aqui apos 2.5s, o app nao foi aberto
    const fallbackTimer = setTimeout(() => {
      if (currentOs === 'ios') {
        window.location.href = IOS_URL;
      } else if (currentOs === 'android') {
        window.location.href = ANDROID_URL;
      } else {
        setPhase('fallback');
      }
    }, 2500);

    // Animacao de pontos
    const dotsTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.');
    }, 500);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(dotsTimer);
    };
  }, []);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=16153A&bgcolor=F4F3FA&qzone=2&data=${encodeURIComponent(QR_PAGE_URL)}`;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Abrindo o Queizy...</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: #F4F3FA;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            -webkit-font-smoothing: antialiased;
          }
          .card {
            background: #fff;
            border-radius: 24px;
            padding: 48px 32px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(22,21,58,0.08);
          }
          .avatar {
            width: 88px;
            height: 88px;
            border-radius: 50%;
            background: #16153A;
            margin: 0 auto 24px;
            overflow: hidden;
          }
          .avatar img { width: 100%; height: 100%; object-fit: cover; }
          .brand {
            font-size: 11px;
            font-weight: 700;
            color: #9896B8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 8px;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            color: #16153A;
            letter-spacing: -0.3px;
            margin-bottom: 10px;
          }
          .sub {
            font-size: 15px;
            color: #4B4A72;
            line-height: 1.6;
            margin-bottom: 28px;
          }
          .spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(163,255,60,0.3);
            border-top-color: #A3FF3C;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 28px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .store-badges {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .store-badge {
            display: block;
            width: 170px;
            transition: opacity 0.15s;
          }
          .store-badge:hover { opacity: 0.85; }
          .store-badge img { display: block; width: 100%; height: auto; }
          .qr-wrap {
            background: #F4F3FA;
            border-radius: 16px;
            padding: 20px;
            margin: 0 auto 20px;
            display: inline-block;
          }
          .qr-wrap img { display: block; width: 160px; height: 160px; }
          .qr-label {
            font-size: 13px;
            color: #9896B8;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 20px 0;
            color: #9896B8;
            font-size: 12px;
            font-weight: 600;
          }
          .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(22,21,58,0.08);
          }
          .note {
            font-size: 12px;
            color: #9896B8;
            margin-top: 20px;
            line-height: 1.6;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="avatar">
            <img src="/images/queizy-icon.png" alt="Queizy" />
          </div>

          <p className="brand">Queizy</p>

          {phase === 'expired' ? (
            /* ── Link expirado ── */
            <>
              <h1>Link expirado</h1>
              <p className="sub">
                Este link de confirma&ccedil;&atilde;o j&aacute; foi usado ou expirou.<br />
                Abra o app e solicite um novo link pelo login.
              </p>
              {os === 'ios' ? (
                <a href="charlotte://" className="btn-primary">Abrir o Queizy</a>
              ) : os === 'android' ? (
                <a href="intent://#Intent;scheme=charlotte;package=com.hubacademy.charlotte;end" className="btn-primary">Abrir o Queizy</a>
              ) : null}
              <div className="divider">nao tem o app?</div>
              <div className="store-badges">
                <a href={IOS_URL} className="store-badge"><img src="/images/store-badges/app-store-pt.svg" alt="Download on the App Store" /></a>
                <a href={ANDROID_URL} className="store-badge"><img src="/images/store-badges/google-play-pt.png" alt="Disponível no Google Play" /></a>
              </div>
            </>
          ) : phase === 'launching' ? (
            /* ── Tentando abrir o app (mobile) ── */
            <>
              <div className="spinner" />
              <h1>Abrindo o app<span style={{ display: 'inline-block', width: 20, textAlign: 'left' }}>{dots}</span></h1>
              <p className="sub">
                Aguarde enquanto abrimos o Queizy no seu dispositivo.
              </p>
            </>
          ) : os === 'desktop' ? (
            /* ── Desktop: QR code ── */
            <>
              <h1>Abra no seu celular</h1>
              <p className="sub">
                O Queizy &eacute; um app para iPhone e Android.<br />
                Escaneie o QR code com a c&acirc;mera do seu celular.
              </p>

              <div className="qr-wrap">
                <img src={qrUrl} alt="QR code para baixar o Queizy" />
              </div>
              <p className="qr-label">
                Aponte a c&acirc;mera para o QR code<br />e toque no link que aparecer.
              </p>

            </>
          ) : (
            /* ── Mobile: app nao instalado ── */
            <>
              <h1>Baixe o Queizy</h1>
              <p className="sub">
                Instale o app para confirmar sua conta<br />e come&ccedil;ar a praticar ingl&ecirc;s.
              </p>

              <div className="store-badges">
                <a href={IOS_URL} className="store-badge"><img src="/images/store-badges/app-store-pt.svg" alt="Download on the App Store" /></a>
                <a href={ANDROID_URL} className="store-badge"><img src="/images/store-badges/google-play-pt.png" alt="Disponível no Google Play" /></a>
              </div>

              <p className="note">
                J&aacute; tem o app? Abra o Queizy e entre com seu email e senha.
              </p>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
