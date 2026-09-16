import type { Metadata } from 'next';
import Image from 'next/image';
import StoreCTA from '@/components/StoreCTA';
import HeroCarousel from '@/components/HeroCarousel';

export const metadata: Metadata = {
  title: 'Charlotte — Fale inglês com IA',
  description: 'Aprenda inglês conversando com uma IA que ouve, corrige e te evolui. 7 dias grátis.',
};

export default function Page() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #16153A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        a { text-decoration: none; }
        @media (max-width: 768px) {
          .hero-section { grid-template-columns: 1fr !important; padding: 48px 20px 0 !important; gap: 0 !important; }
          .feat-grid   { grid-template-columns: 1fr !important; }
          .steps-grid  { grid-template-columns: 1fr !important; }
          .nav-links   { display: none !important; }
          .nav-bar     { padding: 0 16px !important; }
          .nav-cta     { font-size: 12px !important; padding: 8px 14px !important; min-height: 44px !important; display: inline-flex !important; align-items: center !important; }
          .hero-text h1 { font-size: 36px !important; letter-spacing: -1.5px !important; }
          .hero-text   { padding-bottom: 32px !important; }
          .hero-cta a  { min-height: 44px !important; }
          section      { padding: 56px 20px !important; }
          .phone-wrap  { margin-top: 32px; display: flex; justify-content: center; }
          .phone-shell { width: 220px !important; height: 476px !important; }
          .stats-row   { gap: 24px !important; padding: 20px 20px !important; }
          .stats-row > div { min-width: 100px; }
          .pricing-card { padding: 28px 20px !important; }
          .pricing-plans { flex-direction: column !important; }
          .pricing-cta  { width: 100% !important; padding: 16px 24px !important; min-height: 44px !important; }
          .footer-wrap  { padding: 20px 16px !important; }
          .support-section { padding: 56px 20px !important; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="nav-bar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #EEEDF5',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/charlotte-avatar.png" alt="" width={28} height={28}
            style={{ borderRadius: '50%', border: '2px solid #A3FF3C' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#16153A', letterSpacing: '-0.3px' }}>Charlotte</span>
          <span style={{ fontSize: 12, color: '#9896B8', paddingLeft: 4 }}>by Hub Academy</span>
        </div>

        <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="#como" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Como funciona</a>
          <a href="#planos" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Planos</a>
          <a href="#suporte" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Suporte</a>
        </div>

        <StoreCTA variant="nav" label="Baixar grátis" className="nav-cta" />
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero-section" style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '96px 40px 0',
        display: 'grid',
        gridTemplateColumns: '1fr 420px',
        gap: 64,
        alignItems: 'flex-end',
      }} id="hero">

        <div className="hero-text" style={{ paddingBottom: 80 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#F0FDE4', border: '1px solid #C6F47A',
            borderRadius: 100, padding: '5px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3D8800', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3D8800' }}>Disponível no iOS e Android</span>
          </div>

          <h1 style={{
            fontSize: 60, fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-2.5px', color: '#16153A', marginBottom: 24,
          }}>
            Aprenda inglês<br />
            <span style={{ color: '#3D8800' }}>conversando.</span>
          </h1>

          <p style={{
            fontSize: 18, lineHeight: 1.75, color: '#4B4A72',
            maxWidth: 420, marginBottom: 40,
          }}>
            Charlotte é sua professora de inglês com IA. Ela te ouve, corrige sua pronúncia e te faz evoluir desde a primeira conversa — 24h por dia.
          </p>

          {/* CTA */}
          <div className="hero-cta" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <StoreCTA variant="hero" label="a Charlotte" />
            <span style={{ fontSize: 13, color: '#9896B8' }}>7 dias grátis · sem cartão</span>
          </div>
        </div>

        {/* Carrossel das artes da App Store */}
        <HeroCarousel />
      </section>

      {/* ── PROOF BAR ────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #EEEDF5', borderBottom: '1px solid #EEEDF5', background: '#FAFAF9', marginTop: 80 }}>
        <div className="stats-row" style={{
          maxWidth: 1100, margin: '0 auto', padding: '28px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 64, flexWrap: 'wrap',
        }}>
          {[
            ['3 níveis', 'do ZERO ao Avançado'],
            ['Ao vivo', 'Conversação em tempo real'],
            ['24 / 7', 'Sempre disponível'],
            ['7 dias', 'Grátis para começar'],
          ].map(([v, l]) => (
            <div key={v} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#16153A', letterSpacing: '-0.5px' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#9896B8', marginTop: 3, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="funcionalidades" style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 40px' }}>
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#3D8800', marginBottom: 12 }}>
            Por que Charlotte
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-1.5px', color: '#16153A', maxWidth: 560, lineHeight: 1.1 }}>
            Tudo que você precisa para falar inglês de verdade.
          </h2>
        </div>

        <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            {
              title: 'Conversação ao vivo',
              desc: 'Sessões de voz em tempo real com Charlotte. Ela te ouve, responde e corrige na hora — como ter uma professora nativa disponível 24h.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D8800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ),
            },
            {
              title: 'Trilha de aprendizado',
              desc: 'Lições personalizadas para o seu nível. Do básico ao avançado, com gramática, vocabulário e pronúncia — no seu ritmo.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D8800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              ),
            },
            {
              title: 'Missões e progresso',
              desc: 'Três missões por dia, XP, streak e leaderboard. Você vê sua evolução acontecer — e Charlotte garante que você não para.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D8800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
            },
          ].map(f => (
            <div key={f.title} style={{
              background: '#fff',
              border: '1px solid #EEEDF5',
              borderRadius: 20,
              padding: '32px 28px',
              boxShadow: '0 1px 12px rgba(22,21,58,0.05)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: '#F0FDE4', border: '1px solid #C6F47A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#16153A', marginBottom: 10, letterSpacing: '-0.3px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#4B4A72', lineHeight: 1.75 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="como" style={{ background: '#F4F3FA', borderTop: '1px solid #EEEDF5', borderBottom: '1px solid #EEEDF5', padding: '96px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#3D8800', marginBottom: 12 }}>
            Como funciona
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.2px', color: '#16153A', marginBottom: 60, lineHeight: 1.1 }}>
            Começa em 3 passos.
          </h2>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {[
              { n: 1, title: 'Baixe a Charlotte', desc: 'Disponível no iOS e Android. Instale e crie sua conta em menos de 2 minutos.' },
              { n: 2, title: 'Faça o teste de nível', desc: 'Charlotte avalia seu inglês e monta uma trilha personalizada para você.' },
              { n: 3, title: 'Comece a falar', desc: 'Converse, pratique pronúncia e complete missões diárias. Sem enrolação.' },
            ].map(s => (
              <div key={s.n}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', border: '1.5px solid #EEEDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: '#16153A',
                  marginBottom: 20,
                  boxShadow: '0 2px 8px rgba(22,21,58,0.08)',
                }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#16153A', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: '#4B4A72', lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="planos" style={{ maxWidth: 680, margin: '0 auto', padding: '96px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#3D8800', marginBottom: 12 }}>
          Planos
        </p>
        <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.2px', color: '#16153A', marginBottom: 12 }}>
          Comece de graça.
        </h2>
        <p style={{ fontSize: 16, color: '#4B4A72', lineHeight: 1.7, marginBottom: 48 }}>
          7 dias com acesso completo. Sem cartão de crédito.
        </p>

        <div className="pricing-card" style={{
          background: '#fff',
          border: '1px solid #EEEDF5',
          borderRadius: 24,
          padding: '44px 48px',
          boxShadow: '0 8px 48px rgba(22,21,58,0.08)',
        }}>
          <div className="pricing-plans" style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 40 }}>
            {[
              { label: 'Mensal', price: 'R$ 29,90', sub: 'por mês' },
              { label: 'Anual', price: 'R$ 199,90', sub: 'por ano · economia de 44%' },
            ].map(p => (
              <div key={p.label} style={{
                flex: 1, background: '#F4F3FA',
                border: '1px solid #EEEDF5',
                borderRadius: 16, padding: '20px 16px',
              }}>
                <div style={{ fontSize: 12, color: '#9896B8', fontWeight: 600, marginBottom: 8 }}>{p.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#16153A', letterSpacing: '-0.5px' }}>{p.price}</div>
                <div style={{ fontSize: 11, color: '#9896B8', marginTop: 4 }}>{p.sub}</div>
              </div>
            ))}
          </div>

          <StoreCTA variant="pricing" label="Experimentar 7 dias grátis" className="pricing-cta" />
          <p style={{ fontSize: 12, color: '#9896B8', marginTop: 16 }}>
            Cancele quando quiser direto na loja.
          </p>
        </div>
      </section>

      {/* ── SUPPORT ──────────────────────────────────────────────────────── */}
      <section id="suporte" className="support-section" style={{ background: '#F4F3FA', borderTop: '1px solid #EEEDF5', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#16153A', marginBottom: 14, letterSpacing: '-0.5px' }}>
            Precisando de ajuda?
          </h2>
          <p style={{ fontSize: 15, color: '#4B4A72', lineHeight: 1.75, marginBottom: 28 }}>
            Nossa equipe responde em até 24h. Para dúvidas sobre assinatura, cancele direto na loja.
          </p>
          <a href="mailto:contato@hubacademybr.com" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #EEEDF5',
            borderRadius: 12, padding: '12px 22px',
            color: '#16153A', fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(22,21,58,0.06)',
          }}>
            contato@hubacademybr.com
          </a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="footer-wrap" style={{
        borderTop: '1px solid #EEEDF5',
        padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/images/charlotte-avatar.png" alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 800, fontSize: 13, color: '#16153A' }}>Charlotte</span>
          <span style={{ fontSize: 12, color: '#9896B8' }}>© 2026 Hub Academy Ltda</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <a href="/privacidade" style={{ fontSize: 12, color: '#9896B8' }}>Privacidade</a>
          <a href="/termos"      style={{ fontSize: 12, color: '#9896B8' }}>Termos</a>
          <a href="/faq"         style={{ fontSize: 12, color: '#9896B8' }}>Ajuda</a>
          <a href="mailto:contato@hubacademybr.com" style={{ fontSize: 12, color: '#9896B8' }}>Contato</a>
        </div>
      </footer>
    </>
  );
}
