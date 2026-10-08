import type { Metadata } from 'next';
import Image from 'next/image';
import { Bricolage_Grotesque } from 'next/font/google';
import StoreCTA from '@/components/StoreCTA';

// Fonte de títulos da marca (corte óptico 96, como no app).
const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Queizy — Do queizy ao crazy.',
  description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar. Pratique com a Charlotte, sua tutora de IA. 7 dias grátis.',
};

// Onda da marca: começa reta e verde (o "crazy") e termina torta e rosa
// (o "queizy"), ou o contrário. Usada como divisor e no mock do app.
function Wave({ width = 1100, height = 36, done = 0.35, stroke = 5 }: { width?: number; height?: number; done?: number; stroke?: number }) {
  const mid = height / 2;
  const x0 = width * done;
  let d = `M${x0} ${mid}`;
  let up = true;
  for (let x = x0; x + 28 <= width - stroke; x += 28) {
    d += ` Q${x + 14} ${up ? mid - (height / 2 - stroke) : mid + (height / 2 - stroke)} ${x + 28} ${mid}`;
    up = !up;
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <path d={`M${stroke} ${mid} L${x0} ${mid}`} stroke="#2BD97C" strokeWidth={stroke} strokeLinecap="round" fill="none" />
      <path d={d} stroke="#FF4F8B" strokeWidth={stroke} strokeLinecap="round" fill="none" />
    </svg>
  );
}

const PRACTICE = [
  {
    title: 'Live Voice',
    desc: 'Ligação de voz com a Charlotte. Você fala, ela responde na hora, como numa conversa de verdade.',
    icon: <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />,
  },
  {
    title: 'Free Chat',
    desc: 'Converse por texto ou áudio sobre o que quiser. Ela corrige no meio da conversa, sem travar o papo.',
    icon: <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z" />,
  },
  {
    title: 'Grammar',
    desc: 'Mande uma frase e receba a versão certa com a explicação. Suas correções ficam salvas para revisar.',
    icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  },
  {
    title: 'Pronunciation',
    desc: 'Grave uma frase e veja sua nota palavra por palavra. Acompanhe a evolução a cada tentativa.',
    icon: <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v4" />,
  },
];

export default function Page() {
  return (
    <div className="qz">
      <style>{`
        .qz {
          --volt: #DCFF4A; --ink: #16131F; --pink: #FF4F8B; --pink-d: #D12A64;
          --green: #2BD97C; --green-d: #08804A; --violet: #6B4BFF; --paper: #FAF7F0;
          --mid: #4D4858; --light: #8A8494; --line: rgba(22,19,31,0.08);
          background: var(--paper); color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
        }
        .qz * { box-sizing: border-box; margin: 0; padding: 0; }
        .qz a { text-decoration: none; color: inherit; }
        .qz .d { font-family: ${display.style.fontFamily}; font-variation-settings: 'opsz' 96; font-weight: 800; letter-spacing: -0.02em; }
        .qz .wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; }
        .qz .eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--light); }
        .qz .marker { background: linear-gradient(transparent 22%, var(--volt) 22%, var(--volt) 88%, transparent 88%); padding: 0 6px; margin: 0 -2px; box-decoration-break: clone; -webkit-box-decoration-break: clone; border-radius: 4px; }
        .qz .card { background: #fff; border: 1px solid var(--line); border-radius: 24px; }

        .qz nav { position: sticky; top: 0; z-index: 50; background: rgba(250,247,240,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
        .qz nav .wrap { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .qz .nav-links { display: flex; gap: 28px; font-size: 14px; font-weight: 600; color: var(--mid); }

        .qz .hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 56px; align-items: center; padding: 88px 0 72px; }
        .qz .hero h1 { font-size: 76px; line-height: 0.98; margin: 20px 0 22px; }
        .qz .hero p.lead { font-size: 19px; line-height: 1.6; color: var(--mid); max-width: 460px; margin-bottom: 32px; }
        .qz .badge { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 100px; padding: 6px 14px; font-size: 13px; font-weight: 700; color: var(--mid); }
        .qz .badge i { width: 7px; height: 7px; border-radius: 50%; background: var(--green); display: inline-block; }

        .qz .mock { background: #fff; border-radius: 36px; border: 1px solid var(--line); padding: 22px; box-shadow: 0 30px 80px rgba(22,19,31,0.12); max-width: 400px; justify-self: center; width: 100%; }
        .qz .bubble { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 14px; }
        .qz .bubble .b { background: var(--paper); border-radius: 18px 18px 18px 6px; padding: 12px 14px; font-size: 14.5px; line-height: 1.45; }
        .qz .bubble.me { justify-content: flex-end; }
        .qz .bubble.me .b { background: var(--ink); color: #fff; border-radius: 18px 18px 6px 18px; }
        .qz .fix { font-size: 13px; margin-top: 6px; }
        .qz .fix s { color: var(--pink-d); }
        .qz .fix b { color: var(--green-d); }

        .qz section { padding: 88px 0; }
        .qz h2 { font-size: 48px; line-height: 1.04; margin: 12px 0 16px; }
        .qz .sub { font-size: 17px; line-height: 1.6; color: var(--mid); max-width: 560px; }
        .qz .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 44px; }
        .qz .grid4 .card { padding: 26px 22px; }
        .qz .ico { width: 46px; height: 46px; border-radius: 50%; background: var(--volt); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .qz .grid4 h3 { font-size: 22px; margin-bottom: 8px; }
        .qz .grid4 p { font-size: 14.5px; line-height: 1.6; color: var(--mid); }

        .qz .dark { background: var(--ink); color: #fff; border-radius: 36px; padding: 64px; display: grid; grid-template-columns: 220px 1fr; gap: 48px; align-items: center; }
        .qz .dark h2 { color: #fff; }
        .qz .dark .sub { color: rgba(255,255,255,0.7); }
        .qz .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
        .qz .chips span { background: rgba(255,255,255,0.08); border-radius: 100px; padding: 8px 14px; font-size: 14px; font-weight: 600; }

        .qz .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; margin-top: 44px; }
        .qz .num { width: 46px; height: 46px; border-radius: 50%; background: var(--ink); color: var(--volt); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 18px; }
        .qz .steps h3 { font-size: 22px; margin-bottom: 8px; }
        .qz .steps p { font-size: 15px; line-height: 1.6; color: var(--mid); }

        .qz .plans { display: flex; gap: 14px; margin: 30px 0 32px; }
        .qz .plan { flex: 1; border: 1px solid var(--line); border-radius: 20px; padding: 22px; text-align: left; }
        .qz .plan.best { border: 2px solid var(--ink); background: #F1FFB8; position: relative; }
        .qz .plan .tag { position: absolute; top: -11px; right: 16px; background: var(--ink); color: var(--volt); font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 10px; }
        .qz .plan .price { font-size: 32px; margin-top: 6px; }

        .qz footer { border-top: 1px solid var(--line); padding: 28px 0; }
        .qz footer .wrap { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--light); }
        .qz footer .links { display: flex; gap: 22px; flex-wrap: wrap; }

        @media (max-width: 900px) {
          .qz .wrap { padding: 0 16px; }
          .qz .nav-links { display: none; }
          .qz .hero { grid-template-columns: 1fr; padding: 48px 0 40px; gap: 40px; }
          .qz .hero h1 { font-size: 52px; }
          .qz section { padding: 60px 0; }
          .qz h2 { font-size: 36px; }
          .qz .grid4 { grid-template-columns: 1fr 1fr; }
          .qz .dark { grid-template-columns: 1fr; padding: 36px 24px; gap: 24px; border-radius: 28px; }
          .qz .steps { grid-template-columns: 1fr; gap: 28px; }
          .qz .plans { flex-direction: column; }
        }
        @media (max-width: 520px) {
          .qz .grid4 { grid-template-columns: 1fr; }
          .qz .hero h1 { font-size: 44px; }
        }
      `}</style>

      {/* ── Navegação ─────────────────────────────────────────────────── */}
      <nav>
        <div className="wrap">
          <a href="/" aria-label="Queizy">
            <Image src="/images/queizy-logo.png" alt="Queizy" width={133} height={31} priority />
          </a>
          <div className="nav-links">
            <a href="#praticar">Como praticar</a>
            <a href="#como">Como começar</a>
            <a href="#planos">Planos</a>
            <a href="/faq">Ajuda</a>
          </div>
          <StoreCTA variant="nav" label="Baixar grátis" />
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="wrap">
        <div className="hero">
          <div>
            <span className="badge"><i /> iOS e Android · 7 dias grátis</span>
            <h1 className="d">Do queizy<br />ao <span className="marker">crazy.</span></h1>
            <p className="lead">
              Inglês de verdade, com conversa, correção na hora e zero vergonha de errar.
              Quem te acompanha é a Charlotte, sua tutora de IA.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <StoreCTA variant="hero" label="o Queizy" />
              <span style={{ fontSize: 13, color: 'var(--light)' }}>Sem cartão para começar</span>
            </div>
          </div>

          {/* Mock da conversa no app */}
          <div className="mock">
            <div className="bubble">
              <Image src="/images/charlotte-avatar.png" alt="Charlotte" width={36} height={36} style={{ borderRadius: '50%', background: 'var(--ink)' }} />
              <div className="b">
                <span className="d marker" style={{ fontSize: 17 }}>Good morning, Ana!</span>
                <div style={{ marginTop: 6 }}>What did you do last weekend?</div>
              </div>
            </div>
            <div className="bubble me">
              <div className="b">I go to the beach with my friends.</div>
            </div>
            <div className="bubble">
              <Image src="/images/charlotte-avatar.png" alt="" width={36} height={36} style={{ borderRadius: '50%', background: 'var(--ink)' }} />
              <div className="b">
                Oh nice! Which beach did you <b>go</b> to?
                <div className="fix"><s>I go</s> &rarr; <b>I went</b> · passado de &ldquo;go&rdquo;</div>
              </div>
            </div>
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--paper)', borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--mid)', marginBottom: 6 }}>
                <span>Meta de hoje</span><span>35 / 50 XP</span>
              </div>
              <Wave width={320} height={16} done={0.7} stroke={4} />
            </div>
          </div>
        </div>
      </div>

      <div className="wrap"><Wave /></div>

      {/* ── Formas de praticar ────────────────────────────────────────── */}
      <section id="praticar">
        <div className="wrap">
          <span className="eyebrow">Como praticar</span>
          <h2 className="d">Quatro jeitos de destravar o inglês.</h2>
          <p className="sub">Escolha o que combina com o seu dia. Tudo conta para a sua evolução: XP, sequência, metas e ranking.</p>
          <div className="grid4">
            {PRACTICE.map(p => (
              <div key={p.title} className="card">
                <div className="ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16131F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
                </div>
                <h3 className="d">{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Charlotte ─────────────────────────────────────────────────── */}
      <div className="wrap">
        <div className="dark">
          <Image src="/images/charlotte-avatar.png" alt="Charlotte, a tutora do Queizy" width={220} height={220} style={{ width: 220, height: 220, borderRadius: '50%', background: '#2A2535', objectFit: 'cover', justifySelf: 'center' }} />
          <div>
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>Sua tutora</span>
            <h2 className="d">Conheça a Charlotte.</h2>
            <p className="sub">
              Ela conversa sobre o que você gosta, corrige sem julgar e lembra do seu nível.
              Errou? Faz parte. É assim que o queizy vira crazy.
            </p>
            <div className="chips">
              <span>Trilha por nível, do zero ao avançado</span>
              <span>Revisão de vocabulário</span>
              <span>Correção na hora</span>
              <span>24 horas por dia</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Como começar ──────────────────────────────────────────────── */}
      <section id="como">
        <div className="wrap">
          <span className="eyebrow">Como começar</span>
          <h2 className="d">Três passos e você já está falando.</h2>
          <div className="steps">
            {[
              { n: 1, t: 'Baixe o Queizy', d: 'Disponível no iOS e no Android. A conta fica pronta em menos de dois minutos.' },
              { n: 2, t: 'Descubra seu nível', d: 'Um teste rápido monta a trilha certa para você. Se preferir, comece direto.' },
              { n: 3, t: 'Comece a falar', d: 'Converse, grave, erre e acerte. A Charlotte acompanha cada passo.' },
            ].map(s => (
              <div key={s.n}>
                <div className="num d">{s.n}</div>
                <h3 className="d">{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ────────────────────────────────────────────────────── */}
      <section id="planos" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="card" style={{ padding: '44px 40px', textAlign: 'center' }}>
            <span className="eyebrow">Planos</span>
            <h2 className="d">Comece de graça.</h2>
            <p className="sub" style={{ margin: '0 auto' }}>7 dias com acesso completo, sem cartão. Depois, escolha o plano no app.</p>
            <div className="plans">
              <div className="plan">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--mid)' }}>Mensal</div>
                <div className="price d">R$ 29,90</div>
                <div style={{ fontSize: 13, color: 'var(--light)' }}>por mês</div>
              </div>
              <div className="plan best">
                <span className="tag">MELHOR VALOR</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--mid)' }}>Anual</div>
                <div className="price d">R$ 199,90</div>
                <div style={{ fontSize: 13, color: 'var(--mid)' }}>por ano · cerca de R$ 16,66 por mês</div>
              </div>
            </div>
            <StoreCTA variant="pricing" label="Experimentar 7 dias grátis" />
            <p style={{ fontSize: 13, color: 'var(--light)', marginTop: 16 }}>Cancele quando quiser, direto na loja.</p>
          </div>
        </div>
      </section>

      {/* ── Suporte ───────────────────────────────────────────────────── */}
      <section id="suporte" style={{ paddingTop: 0, textAlign: 'center' }}>
        <div className="wrap" style={{ maxWidth: 560 }}>
          <h2 className="d" style={{ fontSize: 32 }}>Precisa de ajuda?</h2>
          <p className="sub" style={{ margin: '0 auto 24px' }}>
            Veja as dúvidas frequentes ou fale com a equipe. Respondemos em até 24 horas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/faq" className="card" style={{ padding: '12px 22px', fontWeight: 700, fontSize: 14 }}>Dúvidas frequentes</a>
            <a href="mailto:contato@queizy.com" className="card" style={{ padding: '12px 22px', fontWeight: 700, fontSize: 14 }}>contato@queizy.com</a>
          </div>
        </div>
      </section>

      {/* ── Rodapé ────────────────────────────────────────────────────── */}
      <footer>
        <div className="wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image src="/images/queizy-logo.png" alt="Queizy" width={95} height={22} />
            <span>© 2026 Hub Academy Ltda</span>
          </div>
          <div className="links">
            <a href="/privacidade">Privacidade</a>
            <a href="/termos">Termos</a>
            <a href="/faq">Ajuda</a>
            <a href="mailto:contato@queizy.com">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
