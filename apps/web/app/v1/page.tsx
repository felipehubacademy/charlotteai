import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

// Variação da página principal para teste de anúncio. Fora dos buscadores: quem chega aqui vem do link do anúncio.
export const metadata: Metadata = {
  title: 'Queizy — Do queizy ao crazy.',
  description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar. Pratique com a Charlotte, sua tutora de IA. 7 dias grátis.',
  alternates: { canonical: '/' },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LandingPage variant="v1" />;
}
