/**
 * GET /api/tts-cached?term=bus
 *
 * Returns a public CDN URL for the spoken audio of a vocabulary term.
 *
 * Cache strategy:
 *   1. Check tts_cache table → return existing URL immediately
 *   2. Generate via ElevenLabs → upload to Supabase Storage → cache URL → return
 *
 * Storage bucket: tts-audio (public)
 * File path: {term_slug}.mp3  e.g. "bus.mp3", "take_it_easy.mp3"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logElevenLabsUsage } from '@/lib/openai-usage';

export const dynamic = 'force-dynamic';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ELEVENLABS_KEY    = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID          = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const BUCKET            = 'tts-audio';

function termToSlug(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100);
}

export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get('term')?.trim();
  if (!term) {
    return NextResponse.json({ error: 'Missing term' }, { status: 400 });
  }

  const normalizedTerm = term.toLowerCase().trim();
  const slug           = termToSlug(term);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── 1. Check cache ─────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('tts_cache')
    .select('audio_url')
    .eq('term', normalizedTerm)
    .maybeSingle();

  if (cached?.audio_url) {
    return NextResponse.json({ url: cached.audio_url, cached: true });
  }

  // ── 2. Generate via ElevenLabs ─────────────────────────────────────────────
  if (!ELEVENLABS_KEY) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 });
  }

  const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text: term,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
    }),
  });

  if (!elRes.ok) {
    const err = await elRes.text();
    console.error('[tts-cached] ElevenLabs error:', err);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
  }

  const audioBuffer = await elRes.arrayBuffer();
  const filePath    = `${slug}.mp3`;

  logElevenLabsUsage({ endpoint: '/api/tts-cached', charCount: term.length, userId: 'system:tts-cache' });

  // ── 3. Upload to Supabase Storage ─────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, audioBuffer, {
      contentType:  'audio/mpeg',
      upsert:       false,   // don't overwrite — race condition guard
      cacheControl: '31536000', // 1 year cache
    });

  if (uploadError && uploadError.message !== 'The resource already exists') {
    console.error('[tts-cached] upload error:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // ── 4. Get public URL ──────────────────────────────────────────────────────
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  // ── 5. Save to cache ───────────────────────────────────────────────────────
  await supabase
    .from('tts_cache')
    .upsert({ term: normalizedTerm, audio_url: publicUrl }, { onConflict: 'term' });

  return NextResponse.json({ url: publicUrl, cached: false });
}
