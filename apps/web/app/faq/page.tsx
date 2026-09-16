import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perguntas Frequentes — Charlotte AI',
  description: 'Dúvidas sobre assinatura, conta e uso do Charlotte AI, o app para aprender inglês com IA da Hub Academy.',
  robots: { index: true, follow: true },
};

const NAVY = '#16153A';
const LIME = '#A3FF3C';

interface Item { q: string; a: React.ReactNode; }
interface Section { title: string; items: Item[]; }

const SECTIONS: Section[] = [
  {
    title: 'Assinatura e pagamento',
    items: [
      { q: 'Quais são os planos e preços?', a: <>Você começa com um <strong>teste grátis de 7 dias</strong>. Depois, o plano <strong>Mensal</strong> custa R$ 29,90/mês e o <strong>Anual</strong> R$ 199,90/ano (equivale a ~R$ 16,66/mês). Os valores exatos e a compra ficam na tela de assinatura dentro do app.</> },
      { q: 'Como funciona o teste grátis?', a: <>São 7 dias com acesso completo. Você só é cobrado se continuar após o período — e pode cancelar a qualquer momento antes disso, sem cobrança.</> },
      { q: 'Como cancelo minha assinatura?', a: <>O cancelamento é feito na loja onde você assinou:<br/>• <strong>iPhone:</strong> Ajustes &gt; seu nome &gt; Assinaturas &gt; Charlotte &gt; Cancelar assinatura.<br/>• <strong>Android:</strong> Google Play &gt; foto de perfil &gt; Pagamentos e assinaturas &gt; Assinaturas &gt; Charlotte &gt; Cancelar.<br/>No app, em Perfil, também há "Gerenciar assinatura", que abre essa tela.</> },
      { q: 'Cancelei — perco o acesso na hora?', a: <>Não. Ao cancelar, você <strong>mantém o acesso até o fim do período já pago</strong>. O acesso só encerra quando a assinatura expira.</> },
      { q: 'Como peço reembolso?', a: <>Os reembolsos são processados pela loja, não pela Hub Academy:<br/>• <strong>iPhone:</strong> em <a href="https://reportaproblem.apple.com" style={{ color: '#3D8800' }}>reportaproblem.apple.com</a>.<br/>• <strong>Android:</strong> pela ajuda do Google Play, dentro do prazo do Google.<br/>Se precisar de ajuda, fale com a gente em suporte@hubacademybr.com.</> },
      { q: 'Como restauro minha compra?', a: <>Em <strong>Perfil &gt; Restaurar compra</strong>. Você precisa estar logado na mesma conta da App Store ou Google Play usada na compra.</> },
    ],
  },
  {
    title: 'Conta e acesso',
    items: [
      { q: 'Como redefino minha senha?', a: <>Na tela de login, toque em <strong>"Esqueci minha senha"</strong>, informe seu email e siga o link enviado.</> },
      { q: 'Não consigo entrar, o que faço?', a: <>Confirme que está usando o mesmo email do cadastro e tente redefinir a senha. Se você assinou mas o acesso não liberou, use "Restaurar compra" no Perfil (na mesma conta da loja usada na compra).</> },
      { q: 'Como excluo minha conta?', a: <>Em <strong>Perfil &gt; Excluir minha conta</strong>. A exclusão é permanente e apaga sua conta e todos os dados.</> },
    ],
  },
  {
    title: 'Usando a Charlotte',
    items: [
      { q: 'O que é a Live Voice?', a: <>É a conversa por voz em tempo real com a Charlotte — você fala e ela responde, como numa conversa de verdade, corrigindo e ajudando você a soltar o inglês.</> },
      { q: 'Como funciona a trilha de estudos?', a: <>A trilha (Learning Trail) leva você do básico ao avançado, no seu ritmo, destravando os conteúdos conforme você evolui — com gramática, pronúncia e prática.</> },
      { q: 'Em quais aparelhos funciona?', a: <>No iPhone (App Store) e no Android (Google Play). Para a conversa por voz, recomendamos usar com uma boa conexão de internet.</> },
    ],
  },
];

export default function FaqPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif" }}>
      <style>{`
        details.faq { border-bottom: 1px solid #ececf2; }
        details.faq > summary {
          list-style: none; cursor: pointer; padding: 18px 4px;
          font-size: 16px; font-weight: 600; color: ${NAVY};
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        details.faq > summary::-webkit-details-marker { display: none; }
        details.faq > summary::after {
          content: '+'; font-size: 22px; color: #9896b8; font-weight: 400; line-height: 1;
          transition: transform 180ms ease;
        }
        details.faq[open] > summary::after { content: '\\2212'; }
        details.faq > summary:hover { color: #000; }
        details.faq .ans { padding: 0 4px 20px; font-size: 15px; line-height: 1.65; color: #515154; }
        details.faq .ans a { text-decoration: underline; }
      `}</style>

      <header style={{ backgroundColor: NAVY, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ backgroundColor: LIME, color: NAVY, fontWeight: 800, fontSize: 15, padding: '4px 10px', borderRadius: 6, letterSpacing: '-0.3px' }}>Charlotte</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>by Hub Academy</span>
        </div>
        <a href="mailto:suporte@hubacademybr.com" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>Falar com o suporte →</a>
      </header>

      <div style={{ backgroundColor: NAVY, padding: '48px 24px 56px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Perguntas frequentes</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 10, lineHeight: 1.5 }}>Tudo sobre assinatura, sua conta e como usar a Charlotte. Não achou o que procura? É só falar com a gente.</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>
        {SECTIONS.map((sec, si) => (
          <section key={si} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9896b8', marginBottom: 8 }}>{sec.title}</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '4px 20px', boxShadow: '0 1px 3px rgba(22,21,58,0.06)' }}>
              {sec.items.map((it, ii) => (
                <details className="faq" key={ii}>
                  <summary>{it.q}</summary>
                  <div className="ans">{it.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div style={{ backgroundColor: '#eef7e2', border: '1px solid #d6ecbf', borderRadius: 16, padding: '24px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: NAVY }}>Ainda com dúvida?</p>
          <p style={{ margin: '6px 0 16px', fontSize: 14, color: '#4a6b2f' }}>Nossa equipe responde por email — e em breve pelo WhatsApp.</p>
          <a href="mailto:suporte@hubacademybr.com" style={{ display: 'inline-block', backgroundColor: NAVY, color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 999, textDecoration: 'none' }}>Enviar email para o suporte</a>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #ececf2', padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#9896b8' }}>Charlotte — Hub Academy Ltda · <a href="/privacidade" style={{ color: '#9896b8' }}>Privacidade</a> · <a href="/termos" style={{ color: '#9896b8' }}>Termos</a></p>
      </footer>
    </div>
  );
}
