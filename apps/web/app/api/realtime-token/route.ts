// app/api/realtime-token/route.ts
// Cria uma ephemeral session token para o OpenAI Realtime API via WebRTC.
// Valida o pool mensal de 30 min do usuário antes de emitir o token.
// O client_secret retornado é de curta duração (~1 min) e usado apenas para
// a troca de SDP — a API key nunca sai do servidor.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MODEL = 'gpt-realtime';
const POOL_SECONDS = 30 * 60; // 1 800 s

function thisMonthFirstDayInTz(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  return `${y}-${m}-01`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userLevel, userName, accessToken } = body;

    // ── Validação de pool (opcional mas recomendada) ─────────────────────────
    // Se o app enviou o accessToken, verificamos o pool no servidor.
    // Sem accessToken, deixamos a validação client-side fazer o trabalho.
    if (accessToken && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );

        // Verificar usuário a partir do token JWT
        const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
        if (authErr || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error: dbErr } = await supabase
          .from('charlotte_users')
          .select('live_voice_seconds_used, live_voice_reset_date, is_institutional, timezone')
          .eq('id', user.id)
          .single();

        if (!dbErr && data) {
          if (data.is_institutional) {
            console.log(`✅ Institutional user ${user.id}: Live Voice unlimited`);
          } else {
            const tz           = (data as any).timezone || 'UTC';
            const thisMonth    = thisMonthFirstDayInTz(tz);
            const needsReset   = !data.live_voice_reset_date || data.live_voice_reset_date < thisMonth;
            const secondsUsed  = needsReset ? 0 : (data.live_voice_seconds_used ?? 0);
            const remaining    = Math.max(0, POOL_SECONDS - secondsUsed);

            if (remaining <= 0) {
              console.warn('⛔ Live Voice pool exhausted for user:', user.id);
              return NextResponse.json(
                { error: 'monthly_pool_exhausted', message: 'Monthly Live Voice allowance used up.' },
                { status: 403 }
              );
            }
            console.log(`✅ Pool check: ${remaining}s remaining for user ${user.id}`);
          }
        }
      } catch (poolErr) {
        // Falha na verificação do pool → deixa passar (client-side é o backstop)
        console.warn('⚠️ Pool check skipped due to error:', poolErr);
      }
    }

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
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const session = await sessionRes.json();
    const clientSecret = session.value;

    if (!clientSecret) {
      console.error('❌ No client_secret in session response:', session);
      return NextResponse.json({ error: 'No client_secret returned' }, { status: 500 });
    }

    console.log('✅ Ephemeral session created, expires_at:', session.expires_at);

    return NextResponse.json({
      clientSecret,
      userLevel,
      userName,
    });

  } catch (error: any) {
    console.error('❌ Realtime token error:', error);
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
