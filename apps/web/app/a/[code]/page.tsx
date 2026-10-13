// /a/[code] — link de afiliado (influenciador): "Fulano indica o Queizy".
// Leva para a loja certa com o código junto (mesmo mecanismo do convite, em /c/):
//  - Android: no referrer da Play Store; iOS: copiado ao tocar no botão;
//  - app já instalado: abre queizy://aff/CÓDIGO.
// O desconto ao aluno (fase 3) entra aqui quando os produtos com desconto existirem nas lojas.
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { affiliateByCode, cleanAffiliateCode } from '@/lib/affiliates';
import InviteActions from '../../c/[code]/InviteActions';

const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const aff = await affiliateByCode(code);
  const name = aff?.status === 'active' ? aff.name : null;
  const title = name ? `${name} indica o Queizy para praticar inglês` : 'Pratique inglês todo dia no Queizy';
  return {
    title,
    description: 'Converse em inglês com a Charlotte, sua tutora de IA: trilha, gramática, pronúncia e conversa por voz.',
    openGraph: { title, images: ['/images/queizy-og.png'] },
    twitter: { card: 'summary_large_image', title, images: ['/images/queizy-og.png'] },
  };
}

export default async function AffiliatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = cleanAffiliateCode(code);
  const aff = await affiliateByCode(clean);
  const active = aff?.status === 'active';

  return (
    <main style={{ minHeight: '100dvh', background: '#FAF7F0', color: '#16131F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <img src="/images/queizy-logo.png" alt="Queizy" style={{ height: 30, margin: '0 auto 40px', display: 'block' }} />
        {active && (
          <div style={{ display: 'inline-block', background: '#16131F', color: '#DCFF4A', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999 }}>
            Indicação de {aff!.name}
          </div>
        )}
        <h1 className={display.className} style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, margin: '18px 0 14px', letterSpacing: -1 }}>
          Pratique inglês todo dia, do seu jeito
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: '#4D4858', margin: '0 0 28px' }}>
          Converse com a Charlotte, sua tutora de IA: trilha por nível, gramática, pronúncia e conversa por voz. Comece com 7 dias grátis.
        </p>
        <InviteActions code="" aff={active ? clean : undefined} />
      </div>
    </main>
  );
}
