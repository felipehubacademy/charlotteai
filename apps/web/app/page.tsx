import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Queizy — Do queizy ao crazy.',
  description: 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar. Pratique com a Charlotte, sua tutora de IA. 7 dias grátis.',
};

export default function Page() {
  return <LandingPage />;
}
