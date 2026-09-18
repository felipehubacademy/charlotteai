import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Termos de Uso — Charlotte AI',
  description: 'Termos de Uso do aplicativo Charlotte AI, desenvolvido pela Hub Academy.',
  robots: { index: true, follow: true },
};

export default function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <PublicHeader />

      {/* Hero */}
      <div style={{ backgroundColor: '#16153A', padding: '48px 24px 56px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: '#A3FF3C', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Legal
          </p>
          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Termos de Uso
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            Última atualização: 17 de abril de 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <InfoBox>
          Ao baixar, instalar ou utilizar o <strong>Charlotte AI</strong>, você concorda com estes Termos de Uso. Se não concordar com qualquer disposição, não utilize o aplicativo. O app é desenvolvido e operado pela <strong>Hub Academy</strong>.
        </InfoBox>

        <Section title="1. Descrição do Serviço">
          <p style={{ marginBottom: 14 }}>Charlotte AI é um assistente de aprendizado de inglês com inteligência artificial que oferece:</p>
          <List items={[
            'Conversas em tempo real com IA para prática de inglês',
            'Lições interativas de gramática, pronúncia e vocabulário',
            'Sistema de progresso gamificado com streaks e níveis',
            'Funcionalidades completas disponíveis mediante assinatura',
          ]} />
        </Section>

        <Section title="2. Elegibilidade">
          <List items={[
            'Você deve ter 13 anos de idade ou mais para usar o app',
            'Usuários entre 13 e 17 anos necessitam de autorização dos responsáveis legais',
            'Você deve ter capacidade legal para celebrar contratos em sua jurisdição',
          ]} />
        </Section>

        <Section title="3. Conta de Usuário">
          <p style={{ marginBottom: 14 }}>Ao criar uma conta, você é responsável por:</p>
          <List items={[
            'Manter a confidencialidade da sua senha',
            'Todas as atividades realizadas em sua conta',
            'Notificar-nos imediatamente em caso de acesso não autorizado',
          ]} />
          <p style={{ marginTop: 14 }}>É vedada a criação de contas falsas, representação de terceiros ou uso de dados de outras pessoas.</p>
        </Section>

        <Section title="4. Assinaturas e Pagamentos">
          <DataTable rows={[
            ['Período de teste', 'O Charlotte AI oferece 7 dias de acesso gratuito completo, sem necessidade de cartão de crédito. Não há cobrança automática nem conversão em assinatura sem a sua ação: ao término dos 7 dias, o acesso é interrompido e, para continuar, você escolhe um plano pago (Mensal ou Anual) dentro do app.'],
            ['Cobrança', 'Automática no início de cada período (mensal ou anual) até o cancelamento.'],
            ['Cancelamento', 'A qualquer momento nas configurações da App Store ou Google Play. O acesso permanece ativo até o fim do período pago.'],
            ['Reembolsos', 'Regidos pelas políticas da Apple ou Google. Solicite diretamente nas plataformas.'],
            ['Preços', 'Sujeitos a alteração com aviso prévio razoável.'],
          ]} />
        </Section>

        <Section title="5. Uso Aceitável">
          <p style={{ marginBottom: 14 }}>É estritamente proibido:</p>
          <List items={[
            'Usar o app para fins ilegais, difamatórios, abusivos ou prejudiciais',
            'Tentar fazer engenharia reversa, descompilar ou modificar o aplicativo',
            'Utilizar bots, scripts ou automações não autorizadas',
            'Compartilhar sua conta com terceiros',
            'Reproduzir ou explorar comercialmente o conteúdo sem autorização',
            'Interferir na operação ou segurança do aplicativo',
            'Contornar medidas de controle de acesso ao conteúdo premium',
          ]} />
        </Section>

        <Section title="6. Conteúdo Gerado por IA e Consentimento">
          <p style={{ marginBottom: 14 }}>O Charlotte AI usa serviços de Inteligência Artificial de terceiros (OpenAI GPT-4o, ElevenLabs e Microsoft Azure Speech) para gerar respostas, sintetizar voz e avaliar pronúncia. Ao utilizar o aplicativo pela primeira vez, você consente explicitamente com o envio de dados a esses serviços, conforme detalhado na nossa <a href="/privacidade" style={{ color: '#7c3aed' }}>Política de Privacidade</a>.</p>
          <List items={[
            'O conteúdo gerado pela IA é para fins educacionais e pode conter imprecisões',
            'As respostas não substituem instrução profissional de idiomas',
            'Não nos responsabilizamos por decisões tomadas com base exclusivamente na IA',
            'Conversas e interações de voz são processadas pelos serviços de IA descritos acima e descartadas conforme suas políticas de retenção',
            'A Charlotte AI pode informar que determinado conteúdo foi gerado por IA; isso é parte normal do serviço',
          ]} />
        </Section>

        <Section title="7. Propriedade Intelectual">
          <p>Todo o conteúdo do aplicativo — textos, imagens, áudios, algoritmos e software — é de propriedade da <strong>Hub Academy</strong> ou licenciado por terceiros, protegido por leis de direitos autorais.</p>
          <p style={{ marginTop: 12 }}>Concedemos a você uma licença <strong>limitada, não exclusiva, intransferível e revogável</strong> para uso pessoal e não comercial.</p>
          <p style={{ marginTop: 12 }}>Os flashcards e conteúdo criados por você pertencem a você. Ao criá-los, você nos concede licença para armazená-los e exibi-los na sua conta.</p>
        </Section>

        <Section title="8. Limitação de Responsabilidade">
          <List items={[
            'O app é fornecido "no estado em que se encontra" (as is), sem garantias de qualquer tipo',
            'Não nos responsabilizamos por danos indiretos, incidentais ou consequentes',
            'Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses',
            'Não garantimos disponibilidade ininterrupta do serviço',
          ]} />
        </Section>

        <Section title="9. Lei Aplicável e Foro">
          <p>Estes Termos são regidos pela <strong>legislação brasileira</strong>. Quaisquer disputas serão submetidas ao foro da <strong>Comarca de São Paulo, SP, Brasil</strong>, ressalvadas as exceções previstas em lei (incluindo o Código de Defesa do Consumidor).</p>
        </Section>

        <Section title="10. Contato">
          <ContactCard label="Hub Academy — Suporte" email="contato@hubacademybr.com" />
        </Section>

      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 16,
        fontWeight: 700,
        color: '#16153A',
        margin: '0 0 14px',
        paddingBottom: 10,
        borderBottom: '2px solid #A3FF3C',
        display: 'inline-block',
      }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: 10,
      padding: '16px 20px',
      marginBottom: 40,
      fontSize: 15,
      color: '#374151',
      lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6, color: '#374151', fontSize: 15, lineHeight: 1.6 }}>{item}</li>
      ))}
    </ul>
  );
}

function DataTable({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      {rows.map(([label, value], i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb',
          borderBottom: i < rows.length - 1 ? '1px solid #e5e7eb' : 'none',
        }}>
          <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#16153A', borderRight: '1px solid #e5e7eb' }}>
            {label}
          </div>
          <div style={{ padding: '12px 16px', fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactCard({ label, email }: { label: string; email: string }) {
  return (
    <div style={{
      backgroundColor: '#faf5ff',
      border: '1px solid #e9d5ff',
      borderRadius: 8,
      padding: '14px 16px',
      marginTop: 12,
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <a href={`mailto:${email}`} style={{ color: '#7c3aed', fontSize: 15, fontWeight: 500 }}>{email}</a>
    </div>
  );
}
