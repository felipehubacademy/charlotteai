// lib/site-funnel.ts — passos do funil do site para quem veio de anúncio (cookie qz_utm, gravado pelo
// AdAttribution). Cada passo conta uma vez por sessão e campanha, em ad_events, ao lado da visita:
//   plans    = viu a seção de planos      checkout = abriu a página de assinatura
//   form     = começou a preencher        submit   = tocou em pagar        error = o pagamento voltou com erro
// Só nome de campanha, página de entrada e plataforma: nenhum dado pessoal.
export type FunnelStep = 'plans' | 'checkout' | 'form' | 'submit' | 'error';

function readUtm(): { c?: string; s?: string; lp?: string } | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)qz_utm=([^;]+)/);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  } catch { return null; }
}

export function trackFunnel(step: FunnelStep) {
  try {
    const utm = readUtm();
    if (!utm?.c) return; // sem anúncio: fora do funil por campanha
    // 'error' pode repetir (cada tentativa recusada conta); os demais, uma vez por sessão.
    if (step !== 'error') {
      const key = `qz_funnel_${step}_${utm.c}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    }
    fetch('/api/ad-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ kind: step, campaign: utm.c, source: utm.s ?? '', path: utm.lp ?? window.location.pathname }),
    }).catch(() => {});
  } catch { /* sem cookie/sessão: segue sem medir */ }
}
