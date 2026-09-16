import Image from 'next/image';

// Footer público padrão (igual à home). Usado em /faq, /privacidade, /termos.
export default function PublicFooter() {
  return (
    <footer style={{
      borderTop: '1px solid #EEEDF5',
      padding: '24px 40px', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Image src="/images/charlotte-avatar.png" alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: '#16153A' }}>Charlotte</span>
        <span style={{ fontSize: 12, color: '#9896B8' }}>© 2026 Hub Academy Ltda</span>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <a href="/privacidade" style={{ fontSize: 12, color: '#9896B8' }}>Privacidade</a>
        <a href="/termos" style={{ fontSize: 12, color: '#9896B8' }}>Termos</a>
        <a href="/faq" style={{ fontSize: 12, color: '#9896B8' }}>Ajuda</a>
        <a href="mailto:contato@hubacademybr.com" style={{ fontSize: 12, color: '#9896B8' }}>Contato</a>
      </div>
    </footer>
  );
}
