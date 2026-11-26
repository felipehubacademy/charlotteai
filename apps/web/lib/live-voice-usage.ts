// lib/live-voice-usage.ts — minutos de Live Voice (Charlotte e Família) contados só no servidor.
// Banco: supabase/migrations/20261126160000_live_voice_server_ledger.sql (funções live_voice_*, tabela live_voice_sessions).
//   startLiveVoiceSession  antes de emitir o token da ligação: cobra sessão antiga não fechada, faz a virada do mês
//                          e abre a sessão com o teto (saldo restante). Sem saldo: 'monthly_pool_exhausted'.
//   closeLiveVoiceSession  o app avisa o fim (/api/live-voice/usage): cobra min(tempo corrido, teto); o valor do
//                          app só baixa, até 20 s. failed = o token não saiu (fecha sem cobrar).
//   liveVoiceStatus        saldo para a tela (mesmo formato de getLiveVoiceStatus do app).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type LiveVoiceKind = 'charlotte' | 'family';

export interface LiveVoiceStatus {
  secondsUsed: number;
  secondsRemaining: number;
  poolTotal: number;
  bonusSeconds: number;
  resetDate: string;
  taster: boolean;
}

export type StartResult =
  | { ok: true; sessionId: string; remaining: number }
  | { ok: false; error: 'monthly_pool_exhausted' | 'no_user' | 'pool_check_unavailable' };

// Teto de uma ligação (a chave de voz não dá para revogar: limita o que uma sessão pode cobrar).
const SESSION_CAP_SECONDS = 3600;

export async function startLiveVoiceSession(userId: string, kind: LiveVoiceKind): Promise<StartResult> {
  const { data, error } = await getSupabaseAdmin().rpc('live_voice_start', { p_user: userId, p_kind: kind, p_cap: SESSION_CAP_SECONDS });
  if (error || !data) {
    console.warn('[live-voice] start failed:', error?.message);
    return { ok: false, error: 'pool_check_unavailable' };
  }
  const r = data as { ok: boolean; session?: string; remaining?: number; error?: string };
  if (r.ok && r.session) return { ok: true, sessionId: r.session, remaining: Number(r.remaining ?? 0) };
  return { ok: false, error: r.error === 'no_user' ? 'no_user' : 'monthly_pool_exhausted' };
}

export async function closeLiveVoiceSession(userId: string, sessionId: string, reportedSeconds: number | null, failed = false): Promise<{ closed: boolean; charged: number }> {
  const reported = reportedSeconds == null || !Number.isFinite(reportedSeconds) ? null : Math.max(0, Math.round(reportedSeconds));
  const { data, error } = await getSupabaseAdmin().rpc('live_voice_close', {
    p_user: userId, p_session: sessionId, p_reported: reported, p_failed: failed,
  });
  if (error) throw new Error(`live_voice_close: ${error.message}`);
  const r = (data ?? {}) as { closed?: boolean; charged?: number };
  return { closed: !!r.closed, charged: Number(r.charged ?? 0) };
}

export async function liveVoiceStatus(userId: string): Promise<LiveVoiceStatus | null> {
  const { data, error } = await getSupabaseAdmin().rpc('live_voice_status', { p_user: userId });
  if (error) throw new Error(`live_voice_status: ${error.message}`);
  return (data as LiveVoiceStatus | null) ?? null;
}
