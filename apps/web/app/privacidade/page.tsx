import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Charlotte AI',
  description: 'Política de Privacidade do aplicativo Charlotte AI, desenvolvido pela Hub Academy.',
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            Última atualização: 17 de abril de 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <InfoBox>
          O aplicativo <strong>Charlotte AI</strong> é desenvolvido e operado pela <strong>Hub Academy</strong>. Este documento descreve como coletamos, usamos, armazenamos e protegemos as suas informações pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
        </InfoBox>

        <Section title="1. Quem somos">
          <p>O controlador dos seus dados pessoais é a <strong>Hub Academy</strong>, responsável pelo aplicativo Charlotte AI.</p>
          <ContactCard
            label="Contato do Encarregado (DPO)"
            email="privacidade@hubacademybr.com"
          />
        </Section>

        <Section title="2. Dados que coletamos">
          <DataTable rows={[
            ['Dados de cadastro', 'Nome, e-mail e senha (armazenada com hash seguro).'],
            ['Dados de uso', 'Histórico de conversas com a IA, progresso nas lições, streak diário, nível de inglês e preferências de aprendizado.'],
            ['Dados de áudio', 'Gravações de voz durante exercícios de pronúncia e sessões de conversação. Enviados ao Microsoft Azure Speech Services para análise em tempo real e descartados imediatamente após o processamento — não são armazenados permanentemente.'],
['Dados de dispositivo', 'Token de notificações push, sistema operacional e versão do app (para lembretes de estudo).'],
            ['Dados de pagamento', 'Processados exclusivamente pela App Store ou Google Play via RevenueCat. Não armazenamos dados bancários.'],
          ]} />
        </Section>

        <Section title="3. Como usamos seus dados">
          <List items={[
            'Criação e gestão da sua conta de usuário',
            'Personalização da experiência com base no seu nível e progresso',
            'Processamento de comandos de voz e geração de respostas pela IA',
            'Envio de notificações de lembrete de estudo (com sua autorização)',
            'Processamento de assinaturas premium',
            'Melhoria contínua do serviço e segurança da plataforma',
            'Cumprimento de obrigações legais e regulatórias',
          ]} />
        </Section>

        <Section title="4. Bases legais (LGPD)">
          <DataTable rows={[
            ['Execução de contrato (art. 7º, V)', 'Criação de conta, uso do app e pagamentos.'],
            ['Consentimento (art. 7º, I)', 'Notificações push e acesso ao microfone/câmera.'],
            ['Legítimo interesse (art. 7º, IX)', 'Segurança, personalização e melhoria do serviço.'],
            ['Obrigação legal (art. 7º, II)', 'Quando exigido por lei ou autoridade competente.'],
          ]} />
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p style={{ marginBottom: 16 }}>Não vendemos seus dados. Compartilhamos somente com os parceiros abaixo, contratualmente obrigados a protegê-los:</p>
          <DataTable rows={[
            ['Supabase', 'Banco de dados e autenticação.'],
            ['OpenAI', 'Geração de respostas, explicações e exercícios via inteligência artificial (GPT-4o). Suas mensagens são processadas e descartadas conforme a política de dados da OpenAI.'],
            ['ElevenLabs', 'Síntese de voz (text-to-speech) para as falas da Charlotte. Apenas texto é transmitido.'],
            ['Microsoft Azure Speech', 'Reconhecimento e avaliação de pronúncia. Áudio enviado em tempo real e descartado imediatamente após a análise.'],
            ['RevenueCat', 'Gestão de assinaturas e pagamentos.'],
            ['Apple / Google', 'Distribuição do app e compras in-app.'],
            ['Autoridades públicas', 'Quando exigido por lei ou ordem judicial.'],
          ]} />
        </Section>

        <Section title="6. Inteligência Artificial e tratamento de dados">
          <p style={{ marginBottom: 14 }}>O Charlotte AI utiliza serviços de IA de terceiros para personalizar sua experiência de aprendizado. Antes do primeiro uso, o aplicativo solicita seu consentimento explícito para o envio de dados a esses serviços.</p>
          <DataTable rows={[
            ['OpenAI GPT-4o', 'Suas mensagens de chat e respostas a exercícios são enviadas à API da OpenAI para geração de respostas personalizadas. A OpenAI não usa esses dados para treinar modelos por padrão (API usage).'],
            ['ElevenLabs TTS', 'Texto das respostas da Charlotte é enviado para síntese de voz. Nenhuma informação pessoal identificável é transmitida.'],
            ['Azure Speech Services', 'Áudio capturado pelo microfone é enviado ao Azure para reconhecimento de fala e avaliação de pronúncia em tempo real. O áudio é descartado imediatamente após o processamento e não é retido pela Microsoft para fins de treino.'],
          ]} />
          <p style={{ marginTop: 16 }}>Você pode revogar seu consentimento de uso de IA a qualquer momento entrando em contato pelo e-mail <a href="mailto:privacidade@hubacademybr.com" style={{ color: '#7c3aed' }}>privacidade@hubacademybr.com</a>, ficando ciente de que o aplicativo não funcionará sem esses serviços.</p>
        </Section>

        <Section title="7. Retenção de dados">
          <List items={[
            'Dados de conta: enquanto ativa ou por até 5 anos após o encerramento',
            'Histórico de conversas: enquanto a conta estiver ativa',
            'Gravações de voz: não armazenadas — descartadas após processamento',
            'Dados de pagamento: conforme prazos legais (geralmente 5 anos)',
          ]} />
        </Section>

        <Section title="8. Seus direitos (LGPD)">
          <p style={{ marginBottom: 16 }}>Você tem os seguintes direitos em relação aos seus dados:</p>
          <List items={[
            'Confirmação da existência de tratamento',
            'Acesso aos dados',
            'Correção de dados incompletos ou incorretos',
            'Anonimização, bloqueio ou eliminação de dados desnecessários',
            'Portabilidade a outro fornecedor',
            'Eliminação de dados tratados com base em consentimento',
            'Revogação do consentimento a qualquer momento',
          ]} />
          <ContactCard
            label="Para exercer seus direitos (resposta em até 15 dias úteis)"
            email="privacidade@hubacademybr.com"
          />
        </Section>

        <Section title="9. Segurança">
          <List items={[
            'Criptografia em trânsito (TLS/HTTPS) e em repouso',
            'Autenticação segura via Supabase Auth',
            'Senhas armazenadas com hash — nunca em texto plano',
            'Acesso restrito aos dados por equipe autorizada',
          ]} />
        </Section>

        <Section title="10. Crianças e adolescentes">
          <p>O Charlotte AI é destinado a usuários com <strong>13 anos ou mais</strong>. Não coletamos intencionalmente dados de crianças menores de 13 anos. Em caso de coleta inadvertida, entre em contato para exclusão imediata.</p>
        </Section>

        <Section title="11. Alterações nesta política">
          <p>Notificaremos sobre mudanças significativas por e-mail ou notificação no app. O uso continuado após alterações constitui concordância com a nova versão.</p>
        </Section>

        <Section title="12. Contato e ANPD">
          <p style={{ marginBottom: 16 }}>Para dúvidas ou reclamações:</p>
          <ContactCard label="Hub Academy — DPO" email="privacidade@hubacademybr.com" />
          <p style={{ marginTop: 16, fontSize: 14, color: '#6b7280' }}>
            Você também pode apresentar reclamação à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>:{' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>www.gov.br/anpd</a>.
          </p>
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
          gridTemplateColumns: '180px 1fr',
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
