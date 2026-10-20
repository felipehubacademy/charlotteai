'use client';
// Assinatura pelo site (Asaas). Mensal: cartão com recorrência e 7 dias grátis para quem nunca
// assinou. Anual: cartão à vista (7 dias grátis) ou Pix à vista (reembolso em 7 dias). O pagamento abre na página do Asaas,
// com os dados do pagador já preenchidos daqui (lá o aluno só digita o cartão).
// Checkout próprio (mode 'direct'): cartão e Pix aqui mesmo, sem sair do queizy.com. Ligado para todos
// com CHECKOUT_DIRECT=1; antes disso, só por ?checkout=novo. ?checkout=teste usa o ambiente de testes.
import { useEffect, useState } from 'react';
import { captureAffiliateFromUrl, storedAffiliate } from '@/lib/affiliateTracking';
import StoreCTA from '@/components/StoreCTA';
import { suggestEmailCorrection, isDisposableEmail } from '@/lib/email-validation';
import { track } from '@/lib/meta-pixel';
import { lookupCep, type CepInfo } from '@/lib/cep';

const INK = '#14121A';
const MID = '#5C5668';
const LIGHT = '#8A8494';
const LIME = '#DDFF4A';
const GREEN = '#08804A';
const BORDER = '#E6E2EC';

type Plan = 'monthly' | 'annual';
type AnnualPay = 'card' | 'pix';
type Mode = 'hosted' | 'direct' | 'sandbox';
type Pix = { image: string; payload: string; expiresAt: string };
type Info = { enabled: boolean; direct?: boolean; trialDays: number; discountPct: number; prices: { monthly: number; annual: number };
  coupon: { ok: true; code: string; pct: number } | { ok: false; error: string } | null };

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const maskPhone = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
const maskCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
const maskCard = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskExpiry = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
const maskCep = (v: string) => v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

export default function WebCheckout({ initialPlan, notice, forceMode }: { initialPlan: Plan; notice?: string; forceMode?: Mode }) {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [annualPay, setAnnualPay] = useState<AnnualPay>('card');
  const [info, setInfo] = useState<Info | null>(null);
  const [aff, setAff] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const emailSuggestion = email.includes('@') ? suggestEmailCorrection(email) : null;
  useEffect(() => { setConfirmedEmail(false); }, [email]);
  // Pixel (só com aceite): abriu a página de assinar.
  useEffect(() => { track('ViewContent', { content_name: 'assinar' }); }, []);
  const [phone, setPhone] = useState('');
  // Dados do pagador: pedidos uma vez aqui e enviados já preenchidos para a página de pagamento,
  // onde o aluno só digita o cartão.
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [street, setStreet] = useState('');
  const [cepInfo, setCepInfo] = useState<CepInfo | null>(null);
  const [cepState, setCepState] = useState<'idle' | 'loading' | 'notfound'>('idle');
  // Checkout próprio: cartão aqui mesmo e Pix com o QR code na página.
  const [urlMode, setUrlMode] = useState<Mode | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [pix, setPix] = useState<Pix | null>(null);
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null); // id da compra aguardando confirmação
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('checkout');
    if (q === 'teste') setUrlMode('sandbox'); else if (q === 'novo') setUrlMode('direct');
  }, []);
  useEffect(() => {
    const d = cep.replace(/\D/g, '');
    setCepInfo(null);
    if (d.length !== 8) { setCepState('idle'); return; }
    let alive = true;
    setCepState('loading');
    lookupCep(d).then(info => { if (!alive) return; setCepInfo(info); setCepState(info ? 'idle' : 'notfound'); });
    return () => { alive = false; };
  }, [cep]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null); // cupom aplicado
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  async function loadInfo(affCode: string | null, couponCode: string | null) {
    const q = new URLSearchParams();
    if (affCode) q.set('aff', affCode);
    if (couponCode) q.set('coupon', couponCode);
    const r = await fetch(`/api/checkout/asaas${q.toString() ? `?${q}` : ''}`);
    const j = (await r.json()) as Info;
    setInfo(j);
    return j;
  }

  async function applyCoupon(raw?: string) {
    const code = (raw ?? couponInput).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return;
    setCouponBusy(true); setCouponMsg(null);
    try {
      const j = await loadInfo(aff, code);
      if (j.coupon?.ok) {
        setCoupon(code); setCouponInput(code);
        setCouponMsg({ ok: true, text: j.coupon.pct > 0 ? `Cupom ${code} aplicado: ${j.coupon.pct}% de desconto.` : `Cupom ${code} aplicado.` });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: (j.coupon && !j.coupon.ok ? j.coupon.error : null) ?? 'Cupom não encontrado.' });
        await loadInfo(aff, null);
      }
    } catch { setCouponMsg({ ok: false, text: 'Sem conexão. Tente de novo.' }); }
    setCouponBusy(false);
  }

  useEffect(() => {
    captureAffiliateFromUrl();
    const code = storedAffiliate();
    setAff(code);
    // Campanha pode trazer o cupom no link: queizy.com/assinar?cupom=CODIGO
    const fromUrl = new URLSearchParams(window.location.search).get('cupom');
    if (fromUrl) { setCouponOpen(true); setCouponInput(fromUrl.toUpperCase()); }
    (async () => {
      try {
        if (fromUrl) { await loadInfo(code, null); await applyCouponWith(code, fromUrl); }
        else if (code) {
          // Veio pelo link de um afiliado: mostra o código dele já aplicado no campo de cupom.
          setCouponOpen(true); setCouponInput(code);
          await applyCouponWith(code, code);
        }
        else await loadInfo(code, null);
      } catch { setInfo(null); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Igual ao applyCoupon, mas com o afiliado já lido (o estado ainda não atualizou na primeira carga).
  async function applyCouponWith(affCode: string | null, raw: string) {
    const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const j = await loadInfo(affCode, code);
    if (j.coupon?.ok) { setCoupon(code); setCouponMsg({ ok: true, text: j.coupon.pct > 0 ? `Cupom ${code} aplicado: ${j.coupon.pct}% de desconto.` : `Cupom ${code} aplicado.` }); }
    else { setCouponMsg({ ok: false, text: (j.coupon && !j.coupon.ok ? j.coupon.error : null) ?? 'Cupom não encontrado.' }); await loadInfo(affCode, null); }
  }

  const monthly = info?.prices.monthly ?? 29.99;
  const annual = info?.prices.annual ?? 199.99;
  const trial = info?.trialDays ?? 7;
  const method = plan === 'monthly' ? 'monthly' : annualPay === 'card' ? 'annual' : 'annual_pix';
  const hasTrial = method === 'monthly' || method === 'annual';
  const disc = info?.discountPct ?? 0;
  const mode: Mode = urlMode ?? forceMode ?? (info?.direct ? 'direct' : 'hosted');
  const ownCard = mode !== 'hosted' && method !== 'annual_pix';

  // Aguardando o pagamento cair (Pix, ou cartão que o banco ainda está confirmando): consulta a cada 3 s.
  useEffect(() => {
    if (!waiting) return;
    let alive = true;
    const started = Date.now();
    let n = 0;
    const tick = async () => {
      if (!alive) return;
      // A cada 3 s olha o nosso banco; a cada ~20 s pede também para conferir no processador de pagamento.
      const check = n++ % 7 === 0 ? '&check=1' : '';
      try {
        const r = await fetch(`/api/checkout/asaas/direct?id=${encodeURIComponent(waiting)}${check}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (j.paid) { window.location.href = '/assinar/sucesso'; return; }
      } catch { /* tenta de novo */ }
      // Cartão: até 2 minutos. Pix: até 30 minutos (depois o e-mail de acesso chega quando o Pix cair).
      if (pix && Date.now() - started > 30 * 60000) {
        setWaiting(null);
        setError('Ainda não recebemos o Pix. Se você já pagou, fique tranquilo: o e-mail com o acesso chega assim que o pagamento cair.');
        return;
      }
      if (!pix && Date.now() - started > 120000) {
        setBusy(false); setWaiting(null);
        setError('Seu pagamento está em análise. Assim que for confirmado, você recebe um e-mail com o acesso.');
        return;
      }
      setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 2000);
    return () => { alive = false; clearTimeout(t); };
  }, [waiting, pix]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // E-mail com cara de erro de digitação: pede confirmação antes (o acesso vai para ele).
    if (emailSuggestion && !confirmedEmail) {
      setConfirmedEmail(true);
      setError(`Confira o e-mail: você quis dizer ${emailSuggestion}? Se o seu é ${email.trim()} mesmo, toque em continuar de novo.`);
      return;
    }
    if (isDisposableEmail(email)) { setError('Use um e-mail que você acessa: é com ele que você entra no app.'); return; }
    if (mode !== 'hosted') return submitDirect();
    return submitHosted();
  }

  async function submitDirect() {
    setBusy(true); setFallback(false);
    try {
      const r = await fetch('/api/checkout/asaas/direct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method, name, email, phone, cpf, cep, number: addrNumber, street, aff, coupon, sandbox: mode === 'sandbox',
          card: ownCard ? { number: cardNumber, name: cardName, expiry: cardExpiry, cvv: cardCvv } : undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) {
        setError(j.error ?? 'Não foi possível concluir agora.'); setFallback(!!j.fallback && mode !== 'sandbox'); setBusy(false); return;
      }
      if (mode !== 'sandbox') track('InitiateCheckout', { value: j.value, currency: 'BRL', content_name: method }, `ck_${j.id}_checkout`);
      setCardNumber(''); setCardCvv(''); // não deixa o cartão na tela
      if (j.done) { window.location.href = '/assinar/sucesso'; return; }
      if (j.pix) { setPix(j.pix); setBusy(false); }
      setWaiting(j.id);
    } catch {
      setError('Sem conexão. Tente de novo.'); setBusy(false);
    }
  }

  async function submitHosted() {
    setBusy(true);
    try {
      const r = await fetch('/api/checkout/asaas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, name, email, phone, cpf, cep, number: addrNumber, street, aff, coupon }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error ?? 'Não foi possível abrir o pagamento agora.'); setBusy(false); return; }
      // Pixel (só com aceite): foi para o pagamento.
      track('InitiateCheckout', { value: j.value, currency: 'BRL', content_name: method }, j.checkoutId ? `ck_${j.checkoutId}_checkout` : undefined);
      window.location.href = j.url;
    } catch {
      setError('Sem conexão. Tente de novo.'); setBusy(false);
    }
  }

  const payOption = (k: AnnualPay, title: string, detail: string) => {
    const sel = annualPay === k;
    return (
      <button type="button" key={k} onClick={() => setAnnualPay(k)} className="wc-pay"
        style={{ borderColor: sel ? INK : BORDER, background: sel ? '#fff' : 'transparent' }}>
        <span className="wc-radio" style={{ borderColor: sel ? INK : BORDER }}>{sel && <i />}</span>
        <span style={{ textAlign: 'left' }}>
          <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{title}</span>
          <span style={{ display: 'block', fontSize: 13, color: MID, marginTop: 2 }}>{detail}</span>
        </span>
      </button>
    );
  };

  const planCard = (p: Plan) => {
    const sel = plan === p;
    const annualSel = p === 'annual' && sel;
    return (
      <div className="wc-plan" style={{ borderColor: sel ? INK : BORDER, background: sel ? '#F4FFC2' : '#fff' }}>
        {p === 'annual' && <span className="wc-tag">MELHOR VALOR</span>}
        <button type="button" onClick={() => setPlan(p)} className="wc-plan-head" aria-pressed={sel}>
          <span className="wc-radio" style={{ borderColor: sel ? INK : BORDER, marginTop: 4 }}>{sel && <i />}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 17 }}>{p === 'annual' ? 'Anual' : 'Mensal'}</span>
            <span style={{ display: 'block', fontSize: 13, color: MID, marginTop: 2 }}>
              {p === 'annual' ? `${brl(annual / 12)}/mês · cartão ou Pix` : 'Cartão de crédito, renova todo mês'}
            </span>
            {trial > 0 && <span style={{ display: 'block', fontSize: 13, color: GREEN, fontWeight: 700, marginTop: 4 }}>{trial} dias grátis</span>}
          </span>
          <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 22 }}>{brl(p === 'annual' ? annual : monthly)}</span>
            <span style={{ display: 'block', fontSize: 12, color: LIGHT }}>{p === 'annual' ? '/ano' : '/mês'}</span>
          </span>
        </button>
        {annualSel && (
          <div className="wc-pays" role="radiogroup" aria-label="Como pagar o Anual">
            <div className="wc-pays-title">Como você quer pagar o Anual?</div>
            {payOption('card', 'Cartão de crédito à vista', trial > 0
              ? `${trial} dias grátis: a primeira cobrança é só no ${trial + 1}º dia. Depois ${brl(annual)} por ano, em 1x, e renova sozinho.`
              : `${brl(annual)} por ano, em 1x, e renova sozinho. Cancele quando quiser.`)}
            {payOption('pix', 'Pix à vista', `Paga ${brl(annual)} agora. Não gostou? Reembolso em até 7 dias. Não renova sozinho.`)}
            {annualPay !== 'card' && (
              <details className="wc-help">
                <summary>Como peço o reembolso?</summary>
                <p>Em até 7 dias depois do pagamento, no app: <strong>Perfil &gt; Assinatura &gt; Gerenciar assinatura &gt; Pedir reembolso</strong>. Se preferir, escreva para <a href="mailto:suporte@queizy.com">suporte@queizy.com</a> com o e-mail da sua conta.</p>
                <p>O valor volta para a mesma conta do Pix em instantes. O acesso termina quando o reembolso é feito.</p>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  const cta = hasTrial && trial > 0
    ? `Começar ${trial} dias grátis`
    : mode !== 'hosted' && method === 'annual_pix'
    ? `Gerar o Pix — ${brl(annual)}`
    : `Assinar — ${brl(plan === 'annual' ? annual : monthly)}`;
  const note = method === 'monthly'
    ? (trial > 0
        ? `Grátis por ${trial} dias, depois ${brl(monthly)}/mês no cartão. Cancele antes do fim do teste e não paga nada. O teste vale para quem nunca assinou.`
        : `${brl(monthly)}/mês no cartão. Cancele quando quiser.`)
    : method === 'annual'
    ? (trial > 0
        ? `Grátis por ${trial} dias, depois ${brl(annual)} por ano no cartão, em 1x. Cancele antes do fim do teste e não paga nada. O teste vale para quem nunca assinou.`
        : `${brl(annual)} por ano no cartão, em 1x. Cancele a renovação quando quiser.`)
    : `Pagamento único de ${brl(annual)} no Pix, sem renovação automática. Teste por 7 dias: se não gostar, peça o reembolso no app ou por e-mail e devolvemos o valor.`;


  return (
    <div className="wc">
      <style>{`
        .wc { width: 100%; box-sizing: border-box; max-width: 480px; margin: 0 auto; padding: 32px 16px 48px; color: ${INK}; }
        .wc h1 { font-size: 28px; line-height: 1.15; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.5px; }
        .wc-plan { position: relative; display: block; width: 100%; box-sizing: border-box; border: 2px solid; border-radius: 18px; padding: 16px 18px; color: inherit; }
        .wc-plan-head { display: flex; gap: 12px; align-items: flex-start; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; font: inherit; color: inherit; }
        .wc-pays { display: grid; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(22,19,31,0.12); }
        .wc-pays-title { font-size: 13px; font-weight: 800; color: ${INK}; }
        .wc-tag { position: absolute; top: -11px; right: 16px; background: ${INK}; color: ${LIME}; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.5px; }
        .wc label { display: block; font-size: 13px; font-weight: 600; color: ${MID}; margin: 14px 0 6px; }
        .wc input { width: 100%; box-sizing: border-box; border: 1px solid ${BORDER}; border-radius: 12px; padding: 13px 14px; font-size: 16px; background: #fff; color: ${INK}; }
        .wc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .wc-row > div { min-width: 0; }
        .wc-card { margin-top: 20px; padding: 4px 16px 14px; border: 1.5px solid ${BORDER}; border-radius: 16px; background: #fff; }
        .wc-card-title { font-size: 15px; font-weight: 800; color: ${INK}; margin-top: 12px; }
        .wc-pix { margin-top: 18px; padding: 20px 16px; border: 1.5px solid ${BORDER}; border-radius: 18px; background: #fff; text-align: center; }
        .wc-pix p { font-size: 14.5px; color: ${MID}; line-height: 1.5; }
        .wc-addr { font-size: 13.5px; color: ${MID}; margin: 8px 0 0; line-height: 1.4; }
        .wc input:focus { outline: 2px solid ${INK}; border-color: transparent; }
        .wc-btn { width: 100%; border: 0; border-radius: 14px; background: ${LIME}; color: ${INK}; font-weight: 800; font-size: 17px; padding: 16px; cursor: pointer; margin-top: 20px; }
        .wc-btn[disabled] { opacity: 0.6; cursor: default; }
        .wc-pay { display: flex; gap: 12px; align-items: flex-start; width: 100%; border: 1.5px solid; border-radius: 14px; padding: 12px 14px; cursor: pointer; font: inherit; color: inherit; }
        .wc-radio { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
        .wc-radio i { width: 8px; height: 8px; border-radius: 50%; background: ${INK}; }
        .wc-help { border-radius: 12px; background: #fff; border: 1px solid ${BORDER}; padding: 10px 14px; font-size: 14px; color: ${MID}; }
        .wc-help summary { cursor: pointer; font-weight: 700; color: ${INK}; list-style: none; display: flex; align-items: center; gap: 8px; }
        .wc-help summary::-webkit-details-marker { display: none; }
        .wc-help summary::before { content: '?'; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: ${INK}; color: ${LIME}; font-size: 12px; font-weight: 800; flex: none; }
        .wc-help p { margin: 8px 0 0; line-height: 1.5; }
        .wc-help a { color: ${INK}; }
      `}</style>

      <h1>Assine o Queizy</h1>
      <p style={{ color: MID, margin: '0 0 22px', lineHeight: 1.5 }}>
        Acesso completo: conversa por voz com a Charlotte, correção na hora e a trilha inteira, do básico ao avançado.
      </p>
      {disc > 0 && !coupon && (
        <div style={{ background: '#E3F6EC', color: GREEN, borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
          Desconto de {disc}% aplicado pelo seu link.
        </div>
      )}
      {mode === 'sandbox' && (
        <div style={{ background: '#FFF4E5', color: '#8A5300', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
          Modo de teste: nada é cobrado. Use um cartão de teste e um e-mail da equipe.
        </div>
      )}
      {notice && <div style={{ background: '#FFF4E5', color: '#8A5300', borderRadius: 12, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>{notice}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {planCard('annual')}
        {planCard('monthly')}
      </div>

      <div style={{ marginTop: 14 }}>
        {!couponOpen ? (
          <button type="button" onClick={() => setCouponOpen(true)}
            style={{ background: 'none', border: 0, padding: 0, color: MID, fontSize: 14, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
            Tem um cupom?
          </button>
        ) : (
          <div>
            <label htmlFor="wc-coupon" style={{ marginTop: 0 }}>Cupom</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="wc-coupon" value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponMsg(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                autoCapitalize="characters" autoComplete="off" style={{ flex: 1, minWidth: 0 }} />
              <button type="button" onClick={() => applyCoupon()} disabled={couponBusy || !couponInput.trim()}
                style={{ border: 0, borderRadius: 12, background: INK, color: LIME, fontWeight: 800, fontSize: 15, padding: '0 18px', cursor: 'pointer', opacity: couponBusy || !couponInput.trim() ? 0.6 : 1 }}>
                {couponBusy ? '...' : 'Aplicar'}
              </button>
            </div>
            {couponMsg && (
              <p role="status" style={{ fontSize: 14, marginTop: 8, color: couponMsg.ok ? GREEN : '#C0264F', fontWeight: couponMsg.ok ? 700 : 400 }}>{couponMsg.text}</p>
            )}
          </div>
        )}
      </div>

      {pix ? (
        <div className="wc-pix" role="status">
          <div className="wc-card-title" style={{ fontSize: 20 }}>Pague com Pix</div>
          <p>No app do seu banco, escolha Pix e use o código abaixo (copia e cola) ou leia o QR code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${pix.image}`} alt="QR code do Pix" width={220} height={220} />
          <button type="button" className="wc-btn" style={{ marginTop: 12 }}
            onClick={() => { navigator.clipboard?.writeText(pix.payload).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); }}>
            {copied ? 'Código copiado' : 'Copiar código Pix'}
          </button>
          <p className="wc-addr" style={{ wordBreak: 'break-all', textAlign: 'left' }}>{pix.payload}</p>
          <p style={{ fontWeight: 700, color: INK, marginTop: 16 }}>Aguardando o pagamento... Assim que cair, esta página avança sozinha.</p>
          <p className="wc-addr">Valor: {brl(annual)}, pagamento único, sem renovação automática.</p>
        </div>
      ) : (
      <form onSubmit={submit} style={{ marginTop: 10 }}>
        <label htmlFor="wc-name">Nome completo</label>
        <input id="wc-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
        <label htmlFor="wc-email">E-mail (é com ele que você entra no app)</label>
        <input id="wc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
        {emailSuggestion && (
          <p style={{ fontSize: 13.5, color: MID, marginTop: 6 }}>
            Você quis dizer <b style={{ color: INK }}>{emailSuggestion}</b>?{' '}
            <button type="button" onClick={() => setEmail(emailSuggestion)}
              style={{ background: 'none', border: 0, padding: 0, color: '#6B4BFF', fontWeight: 700, cursor: 'pointer', fontSize: 13.5 }}>Usar este</button>
          </p>
        )}
        <div className="wc-row">
          <div>
            <label htmlFor="wc-cpf">CPF</label>
            <input id="wc-cpf" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required />
          </div>
          <div>
            <label htmlFor="wc-phone">Celular</label>
            <input id="wc-phone" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} autoComplete="tel" inputMode="tel" placeholder="(11) 90000-0000" required />
          </div>
        </div>
        <div className="wc-row">
          <div>
            <label htmlFor="wc-cep">CEP</label>
            <input id="wc-cep" value={cep} onChange={e => setCep(maskCep(e.target.value))} autoComplete="postal-code" inputMode="numeric" placeholder="00000-000" required />
          </div>
          <div>
            <label htmlFor="wc-num">Número</label>
            <input id="wc-num" value={addrNumber} onChange={e => setAddrNumber(e.target.value)} autoComplete="address-line2" placeholder="Ex.: 120 ou S/N" required />
          </div>
        </div>
        {cepState === 'loading' && <p className="wc-addr">Buscando o endereço...</p>}
        {cepState === 'notfound' && <p className="wc-addr" style={{ color: '#C0264F' }}>Não achamos esse CEP. Confira os números.</p>}
        {cepInfo && cepInfo.street && (
          <p className="wc-addr">{cepInfo.street}{cepInfo.district ? `, ${cepInfo.district}` : ''} · {cepInfo.city}/{cepInfo.uf}</p>
        )}
        {cepInfo && !cepInfo.street && (
          <>
            <p className="wc-addr">{cepInfo.city}/{cepInfo.uf}</p>
            <label htmlFor="wc-street">Rua</label>
            <input id="wc-street" value={street} onChange={e => setStreet(e.target.value)} autoComplete="address-line1" required />
          </>
        )}

        {mode === 'hosted' && (
          <p style={{ fontSize: 13.5, color: MID, marginTop: 16, lineHeight: 1.5 }}>
            {method === 'annual_pix'
              ? 'Na próxima tela aparece o Pix para pagar, em ambiente seguro. Depois você volta para cá sozinho.'
              : 'Na próxima tela você só digita o cartão, em ambiente seguro de pagamento. Depois você volta para cá sozinho.'}
          </p>
        )}
        {ownCard && (
          <div className="wc-card">
            <div className="wc-card-title">Cartão de crédito</div>
            <label htmlFor="wc-cc-number">Número do cartão</label>
            <input id="wc-cc-number" value={cardNumber} onChange={e => setCardNumber(maskCard(e.target.value))}
              autoComplete="cc-number" inputMode="numeric" placeholder="0000 0000 0000 0000" required />
            <label htmlFor="wc-cc-name">Nome impresso no cartão</label>
            <input id="wc-cc-name" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
              autoComplete="cc-name" autoCapitalize="characters" required />
            <div className="wc-row">
              <div>
                <label htmlFor="wc-cc-exp">Validade</label>
                <input id="wc-cc-exp" value={cardExpiry} onChange={e => setCardExpiry(maskExpiry(e.target.value))}
                  autoComplete="cc-exp" inputMode="numeric" placeholder="MM/AA" required />
              </div>
              <div>
                <label htmlFor="wc-cc-cvv">CVV</label>
                <input id="wc-cc-cvv" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoComplete="cc-csc" inputMode="numeric" placeholder="000" required />
              </div>
            </div>
            <p className="wc-addr">
              {hasTrial && trial > 0
                ? `Nada é cobrado hoje: o cartão só é validado. A primeira cobrança é no ${trial + 1}º dia.`
                : 'Pagamento seguro.'} Os dados do cartão não ficam guardados no Queizy.
            </p>
          </div>
        )}
        {error && <p role="alert" style={{ color: '#C0264F', fontSize: 14, marginTop: 14 }}>{error}</p>}
        {error && fallback && (
          <button type="button" onClick={() => { setError(null); setFallback(false); submitHosted(); }}
            style={{ background: 'none', border: 0, padding: 0, marginTop: 8, color: INK, fontSize: 14, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
            Pagar na página segura do parceiro de pagamento
          </button>
        )}
        <button className="wc-btn" type="submit" disabled={busy || (info?.enabled === false && mode !== 'sandbox')}>
          {info?.enabled === false && mode !== 'sandbox' ? 'Em breve' : busy ? (mode === 'hosted' ? 'Abrindo o pagamento...' : waiting ? 'Confirmando o pagamento...' : 'Processando...') : cta}
        </button>
        <p style={{ fontSize: 13, color: LIGHT, textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>{note}</p>
        <p style={{ fontSize: 12, color: LIGHT, textAlign: 'center', lineHeight: 1.5, marginTop: 8 }}>
          Pagamento seguro. Ao assinar, você concorda com os <a href="/termos" style={{ color: MID }}>Termos de Uso</a> e
          a <a href="/privacidade" style={{ color: MID }}>Política de Privacidade</a>.
        </p>
      </form>
      )}

      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 28, paddingTop: 22, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: MID, margin: '0 0 12px' }}>Prefere assinar pela App Store ou pelo Google Play?</p>
        <StoreCTA variant="nav" label="Baixar o app" direct />
      </div>
    </div>
  );
}
