// /api/goals — missões do dia e desafio da semana do aluno (Bearer), já com o progresso medido
// no servidor e o XP do que foi concluído creditado (uma vez por período). Fonte: lib/missions.
//   GET → GoalsState (inclui `granted` e `dailyAllDoneNow` para a comemoração no app)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { goalsFor } from '@/lib/missions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await goalsFor(supabase, auth.user.id, { credit: true }));
  } catch (e) {
    console.error('[goals] error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
