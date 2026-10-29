// app/open/page.tsx — queizy.com/open: links dos e-mails (criar/recuperar senha, confirmação, convite) e
// "abrir o app". Mesma moldura das outras páginas do site (cabeçalho, rodapé com os links legais);
// o conteúdo que muda conforme o link está em components/OpenFlow.tsx.
import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import OpenFlow from '@/components/OpenFlow';

export const metadata: Metadata = {
  title: 'Queizy',
  robots: { index: false, follow: false },
};

export default function OpenPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF7F0', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif", color: '#16131F' }}>
      <PublicHeader cta="download" />
      <OpenFlow />
      <PublicFooter />
    </div>
  );
}
