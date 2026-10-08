import Image from 'next/image';
import StoreCTA from '@/components/StoreCTA';

// Header público padrão (igual à home). Usado em /faq, /privacidade, /termos.
export default function PublicHeader() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .pub-nav { padding: 0 16px !important; }
          .pub-nav-links { display: none !important; }
        }
      `}</style>
      <nav className="pub-nav" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #ECE8DF',
        background: 'rgba(250,247,240,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/queizy-logo.png" alt="Queizy" width={124} height={29} />
        </a>
        <div className="pub-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="/#como" style={{ fontSize: 14, color: '#4D4858', fontWeight: 500 }}>Como funciona</a>
          <a href="/#planos" style={{ fontSize: 14, color: '#4D4858', fontWeight: 500 }}>Planos</a>
          <a href="/faq" style={{ fontSize: 14, color: '#4D4858', fontWeight: 500 }}>Ajuda</a>
        </div>
        <StoreCTA variant="nav" label="Baixar grátis" className="nav-cta" />
      </nav>
    </>
  );
}
