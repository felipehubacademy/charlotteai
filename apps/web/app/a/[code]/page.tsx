// /a/[code] — link de afiliado (influenciador). Só rastreio: abre a página inicial normal com
// ?aff=CODIGO; o código fica guardado no navegador e vai junto nos botões de baixar
// (lib/affiliateTracking.ts). Código inexistente ou pausado: página inicial sem rastreio.
import { redirect } from 'next/navigation';
import { affiliateByCode, cleanAffiliateCode } from '@/lib/affiliates';

export const dynamic = 'force-dynamic';

export default async function AffiliateLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const aff = await affiliateByCode(cleanAffiliateCode(code));
  redirect(aff?.status === 'active' ? `/?aff=${aff.code}` : '/');
}
