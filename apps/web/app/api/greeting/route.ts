// app/api/greeting/route.ts
// Generates a short, punchy home-screen greeting via GPT-4o-mini.
// Charlotte personality: direct, warm, real — never generic, never verbose.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logOpenAIUsage } from '@/lib/openai-usage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pronunciation, type MsgRow } from '@/lib/learning-stats';
import { v2Title } from '@/lib/learning-v2';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface GreetingRequest {
  firstName: string;
  streak: number;
  todayXP: number;
  totalXP: number;
  dailyGoal: number;
  hour: number;           // 0–23 local hour
  level: 'Novice' | 'Inter' | 'Advanced';
  isNewUser?: boolean;    // from profile.first_welcome_done — reliable flag
  userId?: string;
  highlight?: string | null; // destaque de ontem, calculado no servidor
}

function buildPrompt(req: GreetingRequest): { system: string; user: string } {
  const { streak, todayXP, totalXP, dailyGoal, level, isNewUser } = req;

  const goalMet   = todayXP >= dailyGoal;
  const xpLeft    = Math.max(0, dailyGoal - todayXP);
  const newUser   = isNewUser ?? (totalXP === 0 && streak === 0);

  // ── System prompt ────────────────────────────────────────────────────────
  const system = level === 'Novice'
    ? `Você é a Charlotte, professora de inglês com personalidade: direta, animada, real. Escreva UMA frase de incentivo em português brasileiro — curta, com personalidade, encorajadora. Estilo: como uma amiga que te conhece e quer que você arrase. A tela já mostra "Bom dia/Boa tarde/Boa noite" com o nome do aluno logo acima da sua frase: NÃO cumprimente, NÃO use o nome do aluno e NÃO mencione o período do dia — vá direto ao incentivo. Nunca use emoji. Nunca seja genérica. Nunca diga "sessão" nem "app". Seja natural e específica ao contexto.`
    : `You are Charlotte — sharp, warm, direct. Write ONE punchy line of encouragement in English. Style: like a cool coach who actually knows the student. The screen already shows "Good morning/afternoon/evening" with the student's name right above your line: do NOT greet, do NOT use the student's name and do NOT mention the time of day — go straight to the encouragement. No emoji. No generic phrases. Never say "session" or "app". Use the context to make it feel personal and real.`;

  // ── User prompt (context) ─────────────────────────────────────────────────
  // Nome e período ficam fora: a Home já os mostra no título acima da fala.
  const ctx: string[] = [];

  if (newUser) {
    ctx.push('This is their very first time here. Welcome them like it is the start of something great. Do not mention streaks or XP.');
  } else if (goalMet) {
    ctx.push(`Streak: ${streak} day${streak !== 1 ? 's' : ''}. Daily goal already crushed (${todayXP} XP). Acknowledge the win.`);
  } else if (todayXP > 0) {
    ctx.push(`Streak: ${streak} day${streak !== 1 ? 's' : ''}. ${todayXP} XP earned today, ${xpLeft} XP left to hit the goal. Push them gently.`);
  } else if (streak > 1) {
    ctx.push(`Streak: ${streak} days. No XP yet today. Motivate them to keep the streak alive.`);
  } else {
    ctx.push(`No XP yet today. Short motivational nudge.`);
  }

  // Destaque de ontem: a Charlotte comenta a evolução real do aluno.
  if (req.highlight && !newUser) {
    ctx.unshift(`Yesterday's highlight (mention it specifically, keep the number exactly as given): ${req.highlight}`);
  }
  const maxWords = req.highlight && !newUser ? 18 : 12;
  const user = `${ctx.join(' | ')}\n\nWrite the line now. ONE sentence only. MAX ${maxWords} WORDS. No greeting, no name. Short, punchy, no fluff.`;

  return { system, user };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
    }

    const body: GreetingRequest = await request.json();
    const { firstName, level } = body;

    if (!level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const safeName = firstName?.trim() || 'there';

    // Destaque só com login verificado (nunca por userId vindo no corpo).
    const highlight = await yesterdayHighlight(request, level === 'Novice');

    const { system, user } = buildPrompt({ ...body, firstName: safeName, highlight });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 45,
      temperature: 0.85,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    });

    logOpenAIUsage({
      userId: body.userId ?? null,
      endpoint: '/api/greeting',
      model: 'gpt-4o-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ message });
  } catch (err) {
    console.error('Greeting API error:', err);
    return NextResponse.json({ error: 'Failed to generate greeting' }, { status: 500 });
  }
}

/**
 * Destaque de ontem (dia de Brasília) para a fala da Charlotte: melhor nota da
 * trilha nova, a melhor nota de pronúncia ou as atividades concluídas. null se não houver.
 */
async function yesterdayHighlight(req: NextRequest, pt: boolean): Promise<string | null> {
  try {
    const h = req.headers.get('authorization') ?? '';
    if (!h.startsWith('Bearer ')) return null;
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.auth.getUser(h.slice(7));
    const userId = data?.user?.id;
    if (!userId) return null;

    const br = new Date(Date.now() - 3 * 3600000);
    const todayStartUtc = Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()) + 3 * 3600000;
    const from = new Date(todayStartUtc - 86400000).toISOString();
    const to = new Date(todayStartUtc).toISOString();

    const [hist, msgs] = await Promise.all([
      supabase.from('learn_history_v2').select('level, module_id, unit_id, activity_type, score, completed').eq('user_id', userId).gte('updated_at', from).lt('updated_at', to).limit(200),
      supabase.from('chat_messages').select('user_id, role, mode, content, created_at').eq('user_id', userId).eq('mode', 'pronunciation').eq('role', 'user').gte('created_at', from).lt('created_at', to).limit(200),
    ]);

    // Trilha: melhor nota de ontem (Gramática ou Listening & Speaking), com o nome do tópico.
    const rows = (hist.data ?? []) as { level: string; module_id: string; unit_id: string; activity_type: string; score: number | string | null; completed: boolean | null }[];
    const ACT: Record<string, [string, string]> = { grammar: ['Gramática', 'Grammar'], speaking: ['Listening & Speaking', 'Listening & Speaking'] };
    const best = rows.filter(r => ACT[r.activity_type] && r.score != null).sort((a, b) => Number(b.score) - Number(a.score))[0];
    if (best && Number(best.score) >= 80) {
      const topic = v2Title(best.level, best.module_id, best.unit_id).topic;
      const act = ACT[best.activity_type][pt ? 0 : 1];
      return pt ? `ontem tirou ${Math.round(Number(best.score))} de 100 em ${act} no tópico "${topic}"` : `yesterday scored ${Math.round(Number(best.score))} out of 100 in ${act} on "${topic}"`;
    }
    const pron = pronunciation((msgs.data ?? []) as MsgRow[]);
    const top = Math.max(0, ...pron.items.map(i => i.score));
    if (top >= 80) return pt ? `ontem tirou nota ${top} de 100 numa frase de pronúncia` : `yesterday scored ${top} out of 100 on a pronunciation phrase`;
    const done = rows.filter(r => r.completed).length;
    if (done >= 2) return pt ? `ontem concluiu ${done} atividades da trilha` : `yesterday completed ${done} trail activities`;
    return null;
  } catch {
    return null;
  }
}
