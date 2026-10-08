// app/api/chat-title/route.ts
// Gera o título curto (3 a 5 palavras) de uma conversa do Free Chat a partir
// da primeira mensagem do aluno e grava em charlotte_chat_sessions.title.
// Idioma do título = idioma do device (lang 'pt' | 'en'), como o resto da UI.
// Sem `text`, busca a primeira mensagem do aluno na session (backfill de
// conversas antigas).

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
  lang:      'pt' | 'en';
  text?:     string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI not configured' }, { status: 500 });
    }

    const { sessionId, userId, lang = 'en', text } = (await request.json()) as Partial<Body>;
    if (!sessionId || !userId) {
      return NextResponse.json({ success: false, error: 'sessionId, userId required' }, { status: 400 });
    }

    // A session precisa ser do aluno que pediu.
    const { data: session } = await supabase
      .from('charlotte_chat_sessions')
      .select('id, title')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.title) {
      return NextResponse.json({ success: true, title: session.title, skipped: 'exists' });
    }

    let source = (text ?? '').trim();
    if (!source) {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(4);
      // Primeira fala do aluno; se a conversa abriu por tema, a primeira da Charlotte serve.
      source = (msgs?.find(m => m.role === 'user')?.content ?? msgs?.[0]?.content ?? '').trim();
    }
    if (!source) {
      return NextResponse.json({ success: true, title: null, skipped: 'empty' });
    }

    const language = lang === 'pt' ? 'Brazilian Portuguese (PT-BR, with correct accents)' : 'English';
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 20,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Create a short title (2 to 5 words) in ${language} for a casual English-practice chat, based on the student's first message. Name the topic, like a chat app would ("Pizza perto de casa", "Mudanças no trabalho", "Weekend plans"). Sentence case (only the first word capitalized, plus proper nouns). Do not use the words "chat" or "conversation". No quotes, no emoji, no final period. Return only the title.`,
        },
        { role: 'user', content: source.slice(0, 500) },
      ],
    });

    logOpenAIUsage({
      userId,
      endpoint: '/api/chat-title',
      model: 'gpt-4.1-mini',
      promptTokens:     completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens:      completion.usage?.total_tokens,
    });

    const title = (completion.choices[0]?.message?.content ?? '')
      .trim()
      .replace(/^["'“”]+|["'“”.]+$/g, '')
      .slice(0, 60) || null;

    if (title) {
      const { error } = await supabase
        .from('charlotte_chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .is('title', null);
      if (error) console.warn('[chat-title] update error:', error);
    }

    return NextResponse.json({ success: true, title });
  } catch (err) {
    console.error('[chat-title] error:', err);
    return NextResponse.json({ success: false, error: 'Title failed' }, { status: 500 });
  }
}
