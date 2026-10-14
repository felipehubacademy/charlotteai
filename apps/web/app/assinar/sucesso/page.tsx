import type { Metadata } from 'next';
import Image from 'next/image';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import StoreCTA from '@/components/StoreCTA';

export const metadata: Metadata = {
  title: 'Bem-vindo à Família Queizy',
  robots: { index: false, follow: false },
};

const INK = '#14121A';
const MID = '#5C5668';
const LIME = '#DDFF4A';

const STEPS = [
  { t: 'Baixe o Queizy', d: 'No iPhone ou no Android, pelo botão abaixo.' },
  { t: 'Entre com o mesmo e-mail', d: 'O que você usou aqui. Se ainda não tem senha, mandamos um e-mail com o link para criar.' },
  { t: 'Comece a falar', d: 'A Charlotte já está te esperando. Pode errar à vontade: é assim que se aprende.' },
];

export default function AssinarSucessoPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F0', fontFamily: "'Inter',-apple-system,'Segoe UI',Arial,sans-serif", color: INK }}>
      <PublicHeader />
      <style>{`
        .ok-wrap { max-width: 560px; margin: 0 auto; padding: 40px 16px 56px; text-align: center; }
        .ok-avs { display: flex; justify-content: center; margin-bottom: 20px; }
        .ok-avs img { border-radius: 50%; background: ${INK}; border: 4px solid #FAF7F0; }
        .ok-avs img + img { margin-left: -18px; }
        .ok-h1 { font-size: 34px; line-height: 1.1; font-weight: 800; letter-spacing: -0.8px; margin: 0 0 12px; }
        .ok-h1 mark { background: ${LIME}; color: ${INK}; padding: 0 6px; border-radius: 6px; }
        .ok-lead { font-size: 17px; line-height: 1.55; color: ${MID}; margin: 0 auto 28px; max-width: 460px; }
        .ok-steps { text-align: left; background: #fff; border: 1px solid #E6E2EC; border-radius: 20px; padding: 8px 20px; margin-bottom: 26px; }
        .ok-step { display: flex; gap: 14px; padding: 14px 0; }
        .ok-step + .ok-step { border-top: 1px solid #F0EDF3; }
        .ok-num { flex: none; width: 30px; height: 30px; border-radius: 50%; background: ${INK}; color: ${LIME}; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .ok-step b { display: block; font-size: 16px; }
        .ok-step span { display: block; font-size: 14px; color: ${MID}; line-height: 1.5; margin-top: 2px; }
        .ok-note { font-size: 13px; color: #8A8494; line-height: 1.5; margin-top: 18px; }
      `}</style>
      <div className="ok-wrap">
        <div className="ok-avs" aria-hidden="true">
          <Image src="/images/charlotte-avatar.png" alt="" width={84} height={84} priority />
          <Image src="/images/igorfina-avatar.png" alt="" width={84} height={84} priority />
        </div>
        <h1 className="ok-h1">Bem-vindo à <mark>Família Queizy!</mark></h1>
        <p className="ok-lead">
          Agora é com você: conversa de verdade, correção na hora e zero vergonha de errar.
          Do queizy ao crazy, a gente vai junto até o seu inglês sair natural.
        </p>

        <div className="ok-steps">
          {STEPS.map((s, i) => (
            <div key={s.t} className="ok-step">
              <div className="ok-num">{i + 1}</div>
              <div><b>{s.t}</b><span>{s.d}</span></div>
            </div>
          ))}
        </div>

        <StoreCTA variant="pricing" label="Baixar o Queizy" direct />
        <p className="ok-note">
          Sua assinatura fica ativa assim que o pagamento é confirmado (no Pix, em segundos).
          Dúvidas? Escreva para suporte@queizy.com.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
