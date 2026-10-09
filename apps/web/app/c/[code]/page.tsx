// /c/[code] — link de convite "Vem estudar comigo no Queizy".
// Mostra quem convidou e leva para a loja certa. O código segue junto:
//  - Android: no referrer da Play Store (o app lê na primeira abertura);
//  - iOS: copiado ao tocar no botão (o app oferece colar no primeiro acesso);
//  - app já instalado: abre queizy://invite/CÓDIGO.
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import InviteActions from './InviteActions';

const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export const dynamic = 'force-dynamic';

async function inviterName(code: string): Promise<string | null> {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return null;
  const supabase = getSupabaseAdmin();
  const { data: owner } = await supabase.from('referral_codes').select('user_id').eq('code', clean).maybeSingle();
  const id = (owner as { user_id: string } | null)?.user_id;
  if (!id) return null;
  const { data } = await supabase.from('charlotte_users').select('name').eq('id', id).maybeSingle();
  return ((data as { name: string | null } | null)?.name ?? '').trim().split(/\s+/)[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const name = await inviterName(code);
  const title = name ? `${name} te chamou para estudar inglês no Queizy` : 'Vem estudar inglês comigo no Queizy';
  return {
    title,
    description: 'Pratique inglês todo dia com a Charlotte, sua tutora de IA. Estude junto e ganhem minutos extras de conversa por voz.',
    openGraph: { title, images: ['/images/queizy-og.png'] },
    twitter: { card: 'summary_large_image', title, images: ['/images/queizy-og.png'] },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const name = await inviterName(clean);

  return (
    <main style={{ minHeight: '100dvh', background: '#FAF7F0', color: '#16131F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <img src="/images/queizy-logo.png" alt="Queizy" style={{ height: 30, margin: '0 auto 40px', display: 'block' }} />
        <div style={{ display: 'inline-block', background: '#16131F', color: '#DCFF4A', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999 }}>
          Convite
        </div>
        <h1 className={display.className} style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, margin: '18px 0 14px', letterSpacing: -1 }}>
          {name ? <>{name} te chamou para estudar inglês junto</> : <>Vem estudar inglês comigo</>}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: '#4D4858', margin: '0 0 28px' }}>
          Pratique todo dia com a Charlotte, sua tutora de IA. Vocês viram amigos de estudo e cada um ganha 5 minutos extras de conversa por voz.
        </p>
        <InviteActions code={clean} />
        <p style={{ fontSize: 13, color: '#8A8494', marginTop: 28 }}>
          Código do convite: <b style={{ color: '#16131F', letterSpacing: 1 }}>{clean}</b>
        </p>
      </div>
    </main>
  );
}
