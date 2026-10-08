import Image from 'next/image';

// Footer público padrão (igual à home). Usado em /faq, /privacidade, /termos.
export default function PublicFooter() {
  return (
    <footer style={{
      borderTop: '1px solid #ECE8DF',
      padding: '24px 40px', background: '#FAF7F0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Image src="/images/queizy-logo.png" alt="Queizy" width={95} height={22} />
        <span style={{ fontSize: 12, color: '#8A8494' }}>© 2026 Hub Academy Ltda</span>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <a href="/privacidade" style={{ fontSize: 12, color: '#8A8494' }}>Privacidade</a>
        <a href="/termos" style={{ fontSize: 12, color: '#8A8494' }}>Termos</a>
        <a href="/faq" style={{ fontSize: 12, color: '#8A8494' }}>Ajuda</a>
        <a href="mailto:contato@queizy.com" style={{ fontSize: 12, color: '#8A8494' }}>Contato</a>
      </div>
    </footer>
  );
}
