import { NextRequest, NextResponse } from 'next/server';
import { EmailNotificationService } from '@/lib/email-notification-service';

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma chamada autorizada (pode ser um webhook do cron)
    const authHeader = request.headers.get('authorization');
    // Sem segredo configurado, recusa (antes ficava aberta quando CRON_SECRET_TOKEN não existia).
    const expectedToken = process.env.CRON_SECRET_TOKEN || process.env.CRON_SECRET;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Processar fila de emails
    await EmailNotificationService.processEmailQueue();

    return NextResponse.json({
      success: true,
      message: 'Fila de emails processada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar fila de emails:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Endpoint para verificar status da fila
    return NextResponse.json({
      success: true,
      message: 'API de processamento de emails ativa',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na API de emails:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
