// app/api/realtime-token/route.ts
// Cria uma ephemeral session token para o OpenAI Realtime API via WebRTC.
// Abre a sessão de minutos no servidor (lib/live-voice-usage: pool do mês e bônus, mesmas regras do app) antes de
// emitir o token; o app avisa o fim em /api/live-voice/usage com o usageSessionId devolvido aqui.
// Os 30 min do pacote avulso (minutes30) entram em live_voice_bonus_seconds.
// O client_secret retornado é de curta duração (~1 min) e usado apenas para
// a troca de SDP — a API key nunca sai do servidor.

import { requestUserId } from '@/lib/request-user';
import { NextRequest, NextResponse } from 'next/server';
import { checkAiAccess } from '@/lib/entitlement';
import { startLiveVoiceSession, closeLiveVoiceSession } from '@/lib/live-voice-usage';

const MODEL = 'gpt-realtime-2';

export async function POST(request: NextRequest) {
  // Token não saiu (erro abaixo): fecha a sessão de minutos sem cobrar.
  let cancelUsage: (() => Promise<unknown>) | null = null;
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userLevel, userName } = body;

    // ── Login e limite de minutos: obrigatórios ──────────────────────────────
    // O aluno vem da prova de login conferida no middleware. Sem aluno, sem cadastro ou com erro na
    // checagem do limite, recusa (antes deixava passar e a chave de voz saía para qualquer um).
    const userId = await requestUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'pool_check_unavailable' }, { status: 503 });
    }
    // Plano e limite do aluno (lib/entitlement): sem assinatura, 402; acima do limite, 429.
    const denied = await checkAiAccess(userId, 'live-voice-token');
    if (denied) return denied;
    // Sessão de minutos: cobra a anterior que o app não fechou, faz a virada do mês e confere o saldo.
    const usage = await startLiveVoiceSession(userId, 'charlotte');
    if (!usage.ok) {
      if (usage.error === 'monthly_pool_exhausted') {
        console.warn('⛔ Live Voice pool exhausted for user:', userId);
        return NextResponse.json(
          { error: 'monthly_pool_exhausted', message: 'Monthly Live Voice allowance used up.' },
          { status: 403 }
        );
      }
      console.warn('⛔ Pool check failed for user:', userId, usage.error);
      return NextResponse.json({ error: usage.error === 'no_user' ? 'Unauthorized' : 'pool_check_unavailable' }, { status: usage.error === 'no_user' ? 401 : 503 });
    }
    cancelUsage = () => closeLiveVoiceSession(userId, usage.sessionId, 0, true).catch(e => console.warn('[realtime-token] cancel usage:', e));

    console.log('🔑 Creating Realtime ephemeral session for', userName, '/', userLevel);

    // OpenAI Realtime GA endpoint — cria um client_secret de curta duração.
    // Body novo (wrapped em "session") + voice aninhado em audio.output.
    // Resposta GA é flat: { value, expires_at, session } em vez do antigo
    // { client_secret: { value, expires_at } }.
    const sessionRes = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type:  'realtime',
          model: MODEL,
          audio: {
            output: { voice: 'coral' },
          },
        },
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      console.error('❌ Failed to create realtime session:', err);
      await cancelUsage?.();
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const session = await sessionRes.json();
    const clientSecret = session.value;

    if (!clientSecret) {
      console.error('❌ No client_secret in session response:', session);
      await cancelUsage?.();
      return NextResponse.json({ error: 'No client_secret returned' }, { status: 500 });
    }

    console.log('✅ Ephemeral session created, expires_at:', session.expires_at);
    cancelUsage = null;

    return NextResponse.json({
      clientSecret,
      userLevel,
      userName,
      usageSessionId: usage.sessionId,
      remainingSeconds: usage.remaining,
    });

  } catch (error: any) {
    console.error('❌ Realtime token error:', error);
    await cancelUsage?.();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'realtime-token',
    description: 'Creates an ephemeral OpenAI Realtime session token for WebRTC',
    methods: ['POST'],
  });
}
