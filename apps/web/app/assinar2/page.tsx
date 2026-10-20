import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import WebCheckout from '@/components/WebCheckout';

// Checkout próprio (cartão e Pix aqui no site) em produção, para a equipe testar antes de ligar para todos.
// Sem link no site e fora dos buscadores. Quando aprovado, liga em /assinar com CHECKOUT_DIRECT=1.
export const metadata: Metadata = {
  title: 'Assinar — Queizy',
  robots: { index: false, follow: false },
};

export default async function Assinar2Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF7F0', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif" }}>
      <PublicHeader />
      <WebCheckout initialPlan={sp.plano === 'mensal' ? 'monthly' : 'annual'} forceMode="direct" />
      <PublicFooter />
    </div>
  );
}
