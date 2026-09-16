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
        borderBottom: '1px solid #EEEDF5',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/charlotte-avatar.png" alt="" width={28} height={28}
            style={{ borderRadius: '50%', border: '2px solid #A3FF3C' }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#16153A', letterSpacing: '-0.3px' }}>Charlotte</span>
          <span style={{ fontSize: 12, color: '#9896B8', paddingLeft: 4 }}>by Hub Academy</span>
        </a>
        <div className="pub-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="/#como" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Como funciona</a>
          <a href="/#planos" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Planos</a>
          <a href="/faq" style={{ fontSize: 14, color: '#4B4A72', fontWeight: 500 }}>Ajuda</a>
        </div>
        <StoreCTA variant="nav" label="Baixar grátis" className="nav-cta" />
      </nav>
    </>
  );
}
