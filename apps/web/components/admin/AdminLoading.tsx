// Carregamento em tela cheia do /admin (PWA): spinner até a primeira tela ficar pronta.
export default function AdminLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, background: '#FAF7F0' }}>
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(22,19,31,0.12)', borderTopColor: '#16131F', animation: 'adm-spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontFamily: 'Inter, -apple-system, sans-serif' }}>{label}</span>
    </div>
  );
}
