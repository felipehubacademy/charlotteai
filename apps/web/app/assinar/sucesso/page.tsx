import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Assinatura confirmada — Queizy',
  robots: { index: false, follow: false },
};

export default function AssinarSucessoPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F0', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif", color: '#14121A' }}>
      <PublicHeader />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px 56px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px', letterSpacing: -0.5 }}>Pronto! Agora é só baixar o app</h1>
        <p style={{ color: '#5C5668', lineHeight: 1.55, margin: '0 0 8px' }}>
          Assim que o pagamento for confirmado, sua assinatura fica ativa (no Pix, leva poucos segundos).
        </p>
        <p style={{ color: '#5C5668', lineHeight: 1.55, margin: '0 0 24px' }}>
          Entre no app com o mesmo e-mail que você usou aqui. Enviamos um e-mail com o link para criar sua senha, caso ainda não tenha uma.
        </p>
        <a href="/open" style={{ display: 'inline-block', background: '#DDFF4A', color: '#14121A', fontWeight: 800, textDecoration: 'none', padding: '16px 28px', borderRadius: 14 }}>Baixar o Queizy</a>
      </div>
      <PublicFooter />
    </div>
  );
}
