import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import WebCheckout from '@/components/WebCheckout';

export const metadata: Metadata = {
  title: 'Assinar — Queizy',
  description: 'Assine o Queizy pelo site: Plano Mensal ou Anual com 7 dias grátis; o Anual também no Pix.',
  robots: { index: false, follow: true },
};

export default async function AssinarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice = sp.cancelado ? 'O pagamento não foi concluído. Você pode tentar de novo quando quiser.'
    : sp.expirado ? 'A página de pagamento expirou. É só tentar de novo.' : undefined;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF7F0', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif" }}>
      <PublicHeader />
      <WebCheckout initialPlan={sp.plano === 'mensal' ? 'monthly' : 'annual'} notice={notice} />
      <PublicFooter />
    </div>
  );
}
