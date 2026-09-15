// lib/simple-email-service.ts
// Serviço de email usando Resend

import { Resend } from 'resend';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class SimpleEmailService {
  // Template de email de boas-vindas
  static getWelcomeTemplate(nome: string, nivel: string): EmailTemplate {
    const subject = `🎉 Bem-vindo(a) ao Charlotte, ${nome}!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Charlotte</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #a3ff3c; font-size: 28px; margin: 0;">Bem-vindo ao Charlotte!</h1>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Olá, ${nome}! 👋</h2>
          <p>Seu teste grátis de 7 dias no Charlotte foi ativado com sucesso!</p>
          <p><strong>Nível configurado:</strong> ${nivel}</p>
          <p><strong>Período:</strong> 7 dias grátis</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #a3ff3c;">🚀 O que você pode fazer agora:</h3>
          <ul style="padding-left: 20px;">
            <li>Pratique inglês com conversas inteligentes</li>
            <li>Receba feedback em tempo real</li>
            <li>Use recursos de voz e câmera</li>
            <li>Ganhe conquistas e acompanhe seu progresso</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://charlotte.hubacademybr.com'}/install"
             style="background: #a3ff3c; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            📱 Instalar App Agora
          </a>
        </div>

        <div style="background: #e9ecef; padding: 15px; border-radius: 8px; font-size: 14px; color: #666;">
          <p><strong>Importante:</strong> Seu teste grátis expira em 7 dias. Após esse período, entre em contato conosco para continuar usando o Charlotte.</p>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
          <p>Este é um email automático. Não responda a esta mensagem.</p>
          <p>Hub Academy - Charlotte IA</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Bem-vindo ao Charlotte!

Olá, ${nome}!

Seu teste grátis de 7 dias no Charlotte foi ativado com sucesso!

Nível configurado: ${nivel}
Período: 7 dias grátis

O que você pode fazer agora:
- Pratique inglês com conversas inteligentes
- Receba feedback em tempo real
- Use recursos de voz e câmera
- Ganhe conquistas e acompanhe seu progresso

Instalar App: ${process.env.NEXT_PUBLIC_APP_URL || 'https://charlotte.hubacademybr.com'}/install

Importante: Seu teste grátis expira em 7 dias. Após esse período, entre em contato conosco para continuar usando o Charlotte.

Hub Academy - Charlotte IA
    `;

    return { subject, html, text };
  }

  // Template de aviso de nova versao disponivel na loja
  static getReleaseUpdateTemplate(nome: string | null): EmailTemplate {
    const ola = nome ? `Olá, ${nome}!` : 'Olá!';
    const appStore = 'https://apps.apple.com/app/id6760943273';
    const playStore = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
    const subject = 'Uma nova versão da Charlotte já está disponível';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nova versão da Charlotte</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16153A; font-size: 26px; margin: 0;">Nova versão disponível</h1>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${ola}</h2>
          <p>Acabamos de lançar uma atualização da Charlotte com melhorias importantes:</p>
          <ul style="padding-left: 20px;">
            <li>Conversa por voz mais estável (roteamento de áudio, fones e AirPods)</li>
            <li>Correções de desempenho e estabilidade</li>
            <li>Melhorias no feedback de pronúncia</li>
          </ul>
          <p>Atualize agora para ter a melhor experiência.</p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${appStore}"
             style="background: #16153A; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 6px;">
            Atualizar no iPhone
          </a>
          <a href="${playStore}"
             style="background: #16153A; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 6px;">
            Atualizar no Android
          </a>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
          <p>Este é um email automático. Não responda a esta mensagem.</p>
          <p>Hub Academy - Charlotte IA</p>
        </div>
      </body>
      </html>
    `;

    const text = `Nova versão da Charlotte disponível

${ola}

Acabamos de lançar uma atualização da Charlotte com melhorias importantes:
- Conversa por voz mais estável (roteamento de áudio, fones e AirPods)
- Correções de desempenho e estabilidade
- Melhorias no feedback de pronúncia

Atualize agora:
iPhone: ${appStore}
Android: ${playStore}

Hub Academy - Charlotte IA`;

    return { subject, html, text };
  }

  // Versao de diagnostico: devolve o erro cru do provedor em vez de so um boolean.
  static async sendEmailDetailed(
    to: string,
    template: EmailTemplate,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'Charlotte <noreply@hubacademybr.com>';
      if (!apiKey) return { ok: false, error: 'RESEND_API_KEY ausente no ambiente' };
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: fromEmail, to, subject: template.subject, html: template.html, text: template.text,
      });
      if (error) return { ok: false, error: `${(error as any)?.name ?? ''}: ${(error as any)?.message ?? JSON.stringify(error)}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `exception: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // Enviar email usando Resend
  static async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'Charlotte <noreply@hubacademybr.com>';

      if (!apiKey) {
        console.error('❌ RESEND_API_KEY não configurada');
        return false;
      }

      const resend = new Resend(apiKey);

      const { error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        return false;
      }

      console.log('✅ Email enviado via Resend para:', to);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }
}
