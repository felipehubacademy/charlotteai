'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * StoreCTA — botão que leva pra loja certa baseado no device.
 * - Mobile iOS → App Store direto (se disponível)
 * - Mobile Android → Play Store direto
 * - Desktop ou ambíguo → abre modal com os 2 badges
 *
 * Para "virar on" quando Apple aprovar: troca APP_STORE_AVAILABLE pra true.
 */

const APP_STORE_URL = 'https://apps.apple.com/app/id6760943273';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
const APP_STORE_AVAILABLE = true; // ativado — link dará 404 até Apple aprovar a submissão 1.0 (89)

type Variant = 'nav' | 'hero' | 'pricing';

interface Props {
  variant: Variant;
  label: string;
  className?: string;
}

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function StoreCTA({ variant, label, className }: Props) {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setMounted(true); // garante que createPortal só roda client-side
  }, []);

  // Fecha modal ao clicar fora ou Esc
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (platform === 'android') {
      window.open(PLAY_STORE_URL, '_blank');
      return;
    }
    if (platform === 'ios' && APP_STORE_AVAILABLE) {
      window.open(APP_STORE_URL, '_blank');
      return;
    }
    // iOS sem flag ou desktop → modal
    setModalOpen(true);
  };

  // Styles por variant
  const styleByVariant: Record<Variant, React.CSSProperties> = {
    nav: {
      background: '#16131F', color: '#fff',
      fontSize: 13, fontWeight: 700,
      padding: '9px 20px', borderRadius: 10,
      border: 'none', cursor: 'pointer',
    },
    hero: {
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: '#DCFF4A', color: '#16131F',
      borderRadius: 16, padding: '14px 26px',
      border: 'none', cursor: 'pointer',
      fontFamily: 'inherit',
    },
    pricing: {
      display: 'inline-block',
      background: '#DCFF4A', color: '#16131F',
      fontWeight: 800, fontSize: 16,
      padding: '16px 48px', borderRadius: 16,
      border: 'none', cursor: 'pointer',
      fontFamily: 'inherit',
    },
  };

  const hero = (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#16131F">
        <path d="M12 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <div>
        <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1 }}>Experimente</div>
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{label}</div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={handleClick}
        className={className}
        style={styleByVariant[variant]}
        type="button"
      >
        {variant === 'hero' ? hero : label}
      </button>

      {modalOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escolha a loja"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(22,19,31,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            ref={dialogRef}
            style={{
              background: '#fff', borderRadius: 20,
              maxWidth: 440, width: '100%',
              padding: '36px 28px 28px',
              boxShadow: '0 20px 60px rgba(22,19,31,0.25)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              aria-label="Fechar"
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'transparent', border: 'none',
                fontSize: 22, color: '#8A8494', cursor: 'pointer',
                padding: 8, lineHeight: 1,
              }}
            >
              ×
            </button>

            <h3 style={{
              fontSize: 22, fontWeight: 800, color: '#16131F',
              marginBottom: 8, letterSpacing: '-0.5px',
            }}>
              Baixe a Charlotte
            </h3>
            <p style={{
              fontSize: 14, color: '#4D4858', marginBottom: 24,
              lineHeight: 1.5,
            }}>
              Escolha a loja do seu dispositivo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              {APP_STORE_AVAILABLE && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setModalOpen(false)}
                  aria-label="Baixar na App Store"
                  style={{ display: 'block', width: 170, transition: 'opacity 0.15s' }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/store-badges/app-store-pt.svg"
                    alt="Download on the App Store"
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </a>
              )}

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setModalOpen(false)}
                aria-label="Disponível no Google Play"
                style={{ display: 'block', width: 170, transition: 'opacity 0.15s' }}
                onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/store-badges/google-play-pt.png"
                  alt="Disponível no Google Play"
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </a>
            </div>

            <p style={{
              fontSize: 12, color: '#8A8494', marginTop: 20,
            }}>
              7 dias grátis · sem cartão
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
