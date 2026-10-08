// /r/[code] — link de um rally: "Fulano te desafiou para um rally no Queizy".
// Quem já tem o app entra direto (queizy://rally/CÓDIGO). Quem não tem baixa o
// app levando junto o convite de quem criou o rally (vira dupla e os dois ganham
// minutos) e o código do rally, que o app usa para entrar na disputa.
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rallyLabel, firstName, type RallyMetric } from '@/lib/rally';
import InviteActions from '../../c/[code]/InviteActions';

const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export const dynamic = 'force-dynamic';

async function rallyInfo(code: string) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('rallies').select('creator_id, metric, duration_hours, ends_at, finalized').eq('code', clean).maybeSingle();
  const r = data as { creator_id: string; metric: RallyMetric; duration_hours: number; ends_at: string; finalized: boolean } | null;
  if (!r) return null;
  const [{ data: u }, { data: ref }] = await Promise.all([
    supabase.from('charlotte_users').select('name').eq('id', r.creator_id).maybeSingle(),
    supabase.from('referral_codes').select('code').eq('user_id', r.creator_id).maybeSingle(),
  ]);
  return {
    code: clean,
    name: firstName((u as { name: string | null } | null)?.name),
    referral: (ref as { code: string } | null)?.code ?? '',
    title: rallyLabel(r.metric, r.duration_hours, true),
    ended: r.finalized || new Date(r.ends_at).getTime() <= Date.now(),
    endsAt: r.ends_at,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const info = await rallyInfo(code);
  const title = info?.name ? `${info.name} te desafiou para um rally no Queizy` : 'Rally de inglês no Queizy';
  const description = info ? `${info.title}. Entre na disputa e pratique inglês com a Charlotte.` : 'Dispute com amigos quem estuda mais inglês.';
  return {
    title, description,
    openGraph: { title, description, images: ['/images/queizy-og.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/images/queizy-og.png'] },
  };
}

export default async function RallyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await rallyInfo(code);
  const hoursLeft = info ? Math.max(0, Math.round((new Date(info.endsAt).getTime() - Date.now()) / 3600000)) : 0;

  return (
    <main style={{ minHeight: '100dvh', background: '#FAF7F0', color: '#16131F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <img src="/images/queizy-logo.png" alt="Queizy" style={{ height: 30, margin: '0 auto 40px', display: 'block' }} />
        <div style={{ display: 'inline-block', background: '#16131F', color: '#DCFF4A', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999 }}>
          Rally
        </div>
        <h1 className={display.className} style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, margin: '18px 0 14px', letterSpacing: -1 }}>
          {info?.name ? <>{info.name} te desafiou para um rally</> : <>Rally de inglês no Queizy</>}
        </h1>
        {info ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>{info.title}</p>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: '#4D4858', margin: '0 0 28px' }}>
              {info.ended
                ? 'Este rally já terminou, mas dá para começar outro no app.'
                : `${hoursLeft <= 1 ? 'Termina em menos de 1 hora' : `Faltam ${hoursLeft} horas`}. Pratique com a Charlotte, sua tutora de IA, e quem vencer ganha 5 minutos extras de conversa por voz.`}
            </p>
            <InviteActions code={info.referral} rally={info.ended ? undefined : info.code} />
          </>
        ) : (
          <p style={{ fontSize: 16, color: '#4D4858' }}>Não encontramos este rally. Confira o link com quem te convidou.</p>
        )}
      </div>
    </main>
  );
}
