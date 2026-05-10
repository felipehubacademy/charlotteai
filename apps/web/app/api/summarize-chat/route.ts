// app/api/summarize-chat/route.ts
// Resume uma session de Free Chat em 1-2 frases curtas e atualiza o registro
// em charlotte_chat_sessions. Idioma do resumo segue o nível:
// Novice → PT-BR, Inter → PT-BR, Advanced → EN.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

interface Body {
  sessionId: string;
  userId:    string;
  userLevel: 'Novice' | 'Inter' | 'Advanced';
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = (await request.json()) as Partial<Body>;
    const { sessionId, userId, userLevel } = body;

    if (!sessionId || !userId || !userLevel) {
      return NextResponse.json(
        { success: false, error: 'sessionId, userId, userLevel required' },
        { status: 400 },
      );
    }

    // Busca todas as mensagens da session (charlotte schema via view)
    const { data: messages, error: msgsError } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (msgsError) {
      console.error('[summarize-chat] fetch error:', msgsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Session vazia ou só welcome — não vale resumo
    const realMessages = (messages ?? []).filter(m => m.content && m.content.trim().length > 0);
    if (realMessages.length < 2) {
      return NextResponse.json({ success: true, summary: null, skipped: 'too_short' });
    }

    const transcript = realMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Charlotte'}: ${m.content}`)
      .join('\n');

    const isPt = userLevel === 'Novice' || userLevel === 'Inter';
    const summaryLang = isPt ? 'Brazilian Portuguese (PT-BR)' : 'English';

    const systemPrompt = `You are a language coach summarizing a chat conversation between a student and Charlotte (an AI English tutor). The student's level is ${userLevel}.
Summarize in ONE short sentence in ${summaryLang} (max 18 words):
- The main topic discussed
- A small note about the student's performance or focus

Examples:
- "Conversaram sobre viagem a Paris; você praticou bem o futuro com 'will'."
- "Discussed weekend plans; good vocabulary, watch preposition use."
Return only the sentence, no quotes, no extra text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 80,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: transcript.slice(0, 4000) },
      ],
    });

    logOpenAIUsage({
      userId,
      endpoint: '/api/summarize-chat',
      model: 'gpt-4.1-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? null;

    // Atualiza session com summary + message_count real
    const { error: updateError } = await supabase
      .from('charlotte_chat_sessions')
      .update({ summary, message_count: realMessages.length })
      .eq('id', sessionId);
    if (updateError) {
      console.warn('[summarize-chat] update error:', updateError);
    }

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error('[summarize-chat] error:', err);
    return NextResponse.json({ success: false, error: 'Summary failed' }, { status: 500 });
  }
}
