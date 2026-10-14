'use client';
// Assinatura pelo site (Asaas). Mensal: cartão com recorrência e 7 dias grátis para quem nunca
// assinou. Anual: Pix à vista ou cartão em até 12x. O pagamento abre na página do Asaas.
import { useEffect, useState } from 'react';
import { captureAffiliateFromUrl, storedAffiliate } from '@/lib/affiliateTracking';
import StoreCTA from '@/components/StoreCTA';

const INK = '#14121A';
const MID = '#5C5668';
const LIGHT = '#8A8494';
const LIME = '#DDFF4A';
const GREEN = '#08804A';
const BORDER = '#E6E2EC';

type Plan = 'monthly' | 'annual';
type AnnualPay = 'card' | 'pix' | 'installments';
type Info = { enabled: boolean; trialDays: number; discountPct: number; prices: { monthly: number; annual: number; annual_12x?: number };
  coupon: { ok: true; code: string; pct: number } | { ok: false; error: string } | null };

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const maskCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskPhone = (v: string) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');

export default function WebCheckout({ initialPlan, notice }: { initialPlan: Plan; notice?: string }) {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [annualPay, setAnnualPay] = useState<AnnualPay>('card');
  const [info, setInfo] = useState<Info | null>(null);
  const [aff, setAff] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
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
  const annual12 = info?.prices.annual_12x ?? Math.round(((annual + 0.49) / (1 - 0.0399)) * 100) / 100;
  const method = plan === 'monthly' ? 'monthly' : annualPay === 'card' ? 'annual' : annualPay === 'pix' ? 'annual_pix' : 'annual_12x';
  const hasTrial = method === 'monthly' || method === 'annual';
  const disc = info?.discountPct ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const r = await fetch('/api/checkout/asaas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, name, email, cpf, phone, aff, coupon }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error ?? 'Não foi possível abrir o pagamento agora.'); setBusy(false); return; }
      window.location.href = j.url;
    } catch {
      setError('Sem conexão. Tente de novo.'); setBusy(false);
    }
  }

  const planCard = (p: Plan) => {
    const sel = plan === p;
    return (
      <button type="button" onClick={() => setPlan(p)} className="wc-plan" style={{
        borderColor: sel ? INK : BORDER, background: sel ? '#F4FFC2' : '#fff',
      }}>
        {p === 'annual' && <span className="wc-tag">MELHOR VALOR</span>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{p === 'annual' ? 'Anual' : 'Mensal'}</div>
            <div style={{ fontSize: 13, color: MID, marginTop: 2 }}>
              {p === 'annual' ? `${brl(annual / 12)}/mês · cartão, Pix ou 12x` : 'Cartão de crédito, renova todo mês'}
            </div>
            {trial > 0 && <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginTop: 4 }}>{trial} dias grátis{p === 'annual' ? ' no cartão' : ''}</div>}
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{brl(p === 'annual' ? annual : monthly)}</div>
            <div style={{ fontSize: 12, color: LIGHT }}>{p === 'annual' ? '/ano' : '/mês'}</div>
          </div>
        </div>
      </button>
    );
  };

  const cta = hasTrial && trial > 0
    ? `Começar ${trial} dias grátis`
    : method === 'annual_12x' ? `Assinar — 12x de ${brl(annual12 / 12)}` : `Assinar — ${brl(plan === 'annual' ? annual : monthly)}`;
  const note = method === 'monthly'
    ? (trial > 0
        ? `Grátis por ${trial} dias, depois ${brl(monthly)}/mês no cartão. Cancele antes do fim do teste e não paga nada. O teste vale para quem nunca assinou.`
        : `${brl(monthly)}/mês no cartão. Cancele quando quiser.`)
    : method === 'annual'
    ? (trial > 0
        ? `Grátis por ${trial} dias, depois ${brl(annual)} por ano no cartão, em 1x. Cancele antes do fim do teste e não paga nada. O teste vale para quem nunca assinou.`
        : `${brl(annual)} por ano no cartão, em 1x. Cancele a renovação quando quiser.`)
    : method === 'annual_pix'
    ? `Pagamento único de ${brl(annual)} no Pix, sem renovação automática. O teste de 7 dias é só no cartão; no Pix, se desistir em até 7 dias, devolvemos o valor.`
    : `Total de ${brl(annual12)} em até 12x no cartão (inclui a taxa do parcelamento), sem renovação automática. Se desistir em até 7 dias, devolvemos o valor.`;

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

  return (
    <div className="wc">
      <style>{`
        .wc { max-width: 480px; margin: 0 auto; padding: 32px 16px 48px; color: ${INK}; }
        .wc h1 { font-size: 28px; line-height: 1.15; margin: 0 0 8px; font-weight: 800; letter-spacing: -0.5px; }
        .wc-plan { position: relative; display: block; width: 100%; border: 2px solid; border-radius: 18px; padding: 16px 18px; cursor: pointer; font: inherit; color: inherit; }
        .wc-tag { position: absolute; top: -11px; right: 16px; background: ${INK}; color: ${LIME}; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.5px; }
        .wc label { display: block; font-size: 13px; font-weight: 600; color: ${MID}; margin: 14px 0 6px; }
        .wc input { width: 100%; box-sizing: border-box; border: 1px solid ${BORDER}; border-radius: 12px; padding: 13px 14px; font-size: 16px; background: #fff; color: ${INK}; }
        .wc input:focus { outline: 2px solid ${INK}; border-color: transparent; }
        .wc-btn { width: 100%; border: 0; border-radius: 14px; background: ${LIME}; color: ${INK}; font-weight: 800; font-size: 17px; padding: 16px; cursor: pointer; margin-top: 20px; }
        .wc-btn[disabled] { opacity: 0.6; cursor: default; }
        .wc-pay { display: flex; gap: 12px; align-items: flex-start; width: 100%; border: 1.5px solid; border-radius: 14px; padding: 12px 14px; cursor: pointer; font: inherit; color: inherit; }
        .wc-radio { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
        .wc-radio i { width: 8px; height: 8px; border-radius: 50%; background: ${INK}; }
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
      {notice && <div style={{ background: '#FFF4E5', color: '#8A5300', borderRadius: 12, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>{notice}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {planCard('annual')}
        {plan === 'annual' && (
          <div role="radiogroup" aria-label="Forma de pagamento do anual" style={{ display: 'grid', gap: 8, marginTop: -4 }}>
            {payOption('card', trial > 0 ? `Cartão: ${trial} dias grátis` : 'Cartão em 1x', `Depois ${brl(annual)} por ano, em 1x. Renova sozinho; cancele quando quiser.`)}
            {payOption('pix', 'Pix à vista', `${brl(annual)} de uma vez, sem renovação automática.`)}
            {payOption('installments', 'Até 12x no cartão', `12x de ${brl(annual12 / 12)} (total ${brl(annual12)}, com a taxa do parcelamento).`)}
          </div>
        )}
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

      <form onSubmit={submit} style={{ marginTop: 10 }}>
        <label htmlFor="wc-name">Nome completo</label>
        <input id="wc-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
        <label htmlFor="wc-email">E-mail (é com ele que você entra no app)</label>
        <input id="wc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
        <label htmlFor="wc-cpf">CPF (exigido para a nota e o pagamento)</label>
        <input id="wc-cpf" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} inputMode="numeric" required />
        <label htmlFor="wc-phone">Celular (opcional)</label>
        <input id="wc-phone" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} autoComplete="tel" inputMode="tel" />

        {error && <p role="alert" style={{ color: '#C0264F', fontSize: 14, marginTop: 14 }}>{error}</p>}
        <button className="wc-btn" type="submit" disabled={busy || info?.enabled === false}>
          {info?.enabled === false ? 'Em breve' : busy ? 'Abrindo o pagamento...' : cta}
        </button>
        <p style={{ fontSize: 13, color: LIGHT, textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>{note}</p>
        <p style={{ fontSize: 12, color: LIGHT, textAlign: 'center', lineHeight: 1.5, marginTop: 8 }}>
          Pagamento processado pelo Asaas. Ao assinar, você concorda com os <a href="/termos" style={{ color: MID }}>Termos de Uso</a> e
          a <a href="/privacidade" style={{ color: MID }}>Política de Privacidade</a>.
        </p>
      </form>

      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 28, paddingTop: 22, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: MID, margin: '0 0 12px' }}>Prefere assinar pela App Store ou pelo Google Play?</p>
        <StoreCTA variant="nav" label="Baixar o app" direct />
      </div>
    </div>
  );
}
