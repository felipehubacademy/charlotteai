// app/api/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiFetch, transcribeModel, transcribedSeconds } from '@/lib/ai-models';
import { logOpenAIUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ fetch: aiFetch,
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

// ✅ GET - API status and configuration check
export async function GET() {
  try {
    // Verificar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenAI API key not configured',
        endpoint: '/api/transcribe',
        method: 'GET',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Transcribe endpoint is working',
      endpoint: '/api/transcribe',
      method: 'GET',
      supportedMethods: ['POST'],
      description: 'Send POST request with audio file in FormData',
      timestamp: new Date().toISOString(),
      openaiConfigured: true
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Endpoint test failed',
      error: error.message,
      endpoint: '/api/transcribe',
      method: 'GET',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Obter o FormData do request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userId   = (formData.get('userId') as string | null) ?? null;
    const hintNames = ((formData.get('names') as string | null) ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').slice(0, 120).trim();

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please provide an audio file.' },
        { status: 400 }
      );
    }

    console.log('Processing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Guard: WAV files under ~8KB are essentially empty/silent — skip Whisper
    // (WAV header = 44 bytes; 4096 bytes total = ~0.12s of audio at 16kHz mono)
    const MIN_BYTES = audioFile.type === 'audio/vnd.wave' ? 8192 : 1024;
    if (audioFile.size <= MIN_BYTES) {
      console.log('Audio file too small, skipping transcription');
      return NextResponse.json({ transcription: '', success: true });
    }

    // Whisper path — discourage semantic correction so minimal-pair errors
    // are preserved (e.g. user says "word" instead of "world").
    // A duração (custo) vem em usage.seconds no json do gpt-transcribe.
    // Accepts: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.
    // iOS sends .wav, Android sends .m4a — both supported natively.
    const model = transcribeModel();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model,
      language: 'en',
      response_format: 'json',
      temperature: 0.2,
      // names (opcional): nomes que podem aparecer na fala (do aluno, do personagem). Sem a dica, nome em
      // português vira palavra inventada ("I'm Felipe" -> "Amphilippe").
      prompt: `Transcribe exactly what was said, word for word, without correcting or improving the speech.${hintNames ? ` Names that may be said: ${hintNames}.` : ''}`,
    });

    logOpenAIUsage({
      userId,
      endpoint: '/api/transcribe',
      model,
      audioSeconds: transcribedSeconds(transcription),
    });

    console.log('Transcription result:', transcription.text);

    return NextResponse.json({
      transcription: transcription.text,
      success: true
    });

  } catch (error: any) {
    // Áudio ilegível (corrompido, curto demais): não é erro do servidor. Devolve transcrição vazia e o app
    // mostra "Não ouvimos nada, fale de novo" em vez de uma tela de erro.
    if (error?.status === 400) {
      console.warn('Transcription: áudio ilegível:', error?.message);
      return NextResponse.json({ transcription: '', success: true, unreadable: true });
    }
    console.error('Transcription error:', error);
    
    // Diferentes tipos de erro
    if (error?.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI quota exceeded. Please check your billing.' },
        { status: 402 }
      );
    }
    
    if (error?.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio', 
        details: error?.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Configurar o tamanho máximo do arquivo (10MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}