// Histórico da Practice para Grammar ("Minhas correções") e Pronunciation
// ("Meu histórico"). Lê as mensagens já salvas em chat_messages — não precisa
// de tabela nova, então o histórico antigo do aluno aparece desde o início.
//   Grammar       → cada frase enviada + a correção da Charlotte
//   Pronunciation → frases agrupadas, com a evolução das notas (58 → 74 → 81)

import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { C, ScreenHeader, Card } from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';

const isPt = systemIsPt;
const PASS = 70; // mesma nota de corte do cartão de pronúncia

interface Row { role: 'user' | 'assistant'; content: string; created_at: string }

// ── Grammar ──────────────────────────────────────────────────────────────────

interface Correction { wrong: string; right: string; why: string }
interface GrammarItem { sentence: string; feedback: string; corrections: Correction[]; date: Date }

const EXPLAIN_RE = /^(explain|explica|me explica|why\?|por que\?|porque\?)/i;

/** Extrai as correções do texto da Charlotte (formatos Novice e Inter/Advanced). */
function parseCorrections(feedback: string): Correction[] {
  const out: Correction[] = [];
  // Novice: ❌ "errado" → ✅ "certo" — explicação
  const arrow = /❌\s*"([^"]+)"\s*→\s*✅\s*"([^"]+)"\s*(?:—|-)?\s*([^❌]*)/g;
  let m: RegExpExecArray | null;
  while ((m = arrow.exec(feedback))) {
    out.push({ wrong: m[1], right: m[2], why: m[3].replace(/Tente escrever outra frase!?|Try another sentence!?/gi, '').trim() });
  }
  if (out.length) return out;
  // Inter/Advanced: Error: Tipo — "certo" — explicação
  const err = /Error:\s*[^—]*—\s*"([^"]+)"\s*—\s*([^\n]*)/g;
  while ((m = err.exec(feedback))) out.push({ wrong: '', right: m[1], why: m[2].trim() });
  return out;
}

function buildGrammar(rows: Row[]): GrammarItem[] {
  const items: GrammarItem[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.role !== 'user' || EXPLAIN_RE.test(r.content.trim())) continue;
    const reply = rows[i + 1]?.role === 'assistant' ? rows[i + 1].content : '';
    if (!reply) continue;
    items.push({ sentence: r.content.trim(), feedback: reply, corrections: parseCorrections(reply), date: new Date(r.created_at) });
  }
  return items.reverse(); // mais recente primeiro
}

// ── Pronunciation ────────────────────────────────────────────────────────────

interface Attempt { score: number; missed: string[]; date: Date; feedback: string }
interface PhraseItem { phrase: string; attempts: Attempt[] }

const SCORE_RE = /^([\s\S]*?)\s*\[score:(\d+)\s+mispronounced:([^\]]*)\]\s*$/;

function buildPronunciation(rows: Row[]): PhraseItem[] {
  const groups = new Map<string, PhraseItem>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.role !== 'user') continue;
    const m = SCORE_RE.exec(r.content);
    // Nota 0 = o reconhecimento falhou (não é a pronúncia do aluno): fica fora.
    if (!m || Number(m[2]) <= 0) continue;
    const phrase = m[1].trim();
    const key = phrase.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
    if (!key) continue;
    const attempt: Attempt = {
      score: Number(m[2]),
      missed: m[3].split(',').map(w => w.trim()).filter(Boolean),
      date: new Date(r.created_at),
      feedback: rows[i + 1]?.role === 'assistant' ? rows[i + 1].content : '',
    };
    const g = groups.get(key) ?? { phrase, attempts: [] };
    g.attempts.push(attempt);
    groups.set(key, g);
  }
  return [...groups.values()].sort(
    (a, b) => b.attempts[b.attempts.length - 1].date.getTime() - a.attempts[a.attempts.length - 1].date.getTime(),
  );
}

// ── Datas ────────────────────────────────────────────────────────────────────

function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return isPt ? 'Hoje' : 'Today';
  if (diff === 1) return isPt ? 'Ontem' : 'Yesterday';
  return d.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' });
}

// ── Peças ────────────────────────────────────────────────────────────────────

function Hero({ eyebrow, big, caption, progress }: { eyebrow: string; big: string; caption: string; progress?: number }) {
  return (
    <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20, marginBottom: 8 }}>
      <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {eyebrow}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
        <AppText display style={{ fontSize: 46, fontWeight: '800', color: '#FFFFFF', lineHeight: 50 }}>{big}</AppText>
        <AppText style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{caption}</AppText>
      </View>
      {progress !== undefined && (
        <View style={{ marginTop: 12 }}>
          <QueizyWave progress={progress} height={14} strokeWidth={4} doneColor="#2BD97C" />
        </View>
      )}
    </View>
  );
}

function DayHeader({ label }: { label: string }) {
  return (
    <AppText style={{ fontSize: 12, fontWeight: '800', color: C.light, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 8, marginHorizontal: 20 }}>
      {label}
    </AppText>
  );
}

function GrammarCard({ item }: { item: GrammarItem }) {
  const [open, setOpen] = useState(false);
  const ok = item.corrections.length === 0;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(o => !o)}>
      <Card style={{ marginBottom: 10 }}>
        <AppText style={{ fontSize: 15, color: C.ink, lineHeight: 22 }}>{item.sentence}</AppText>

        {ok ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <CheckCircle size={16} color={C.green} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '700', color: C.green }}>
              {isPt ? 'Sem correções' : 'No corrections'}
            </AppText>
          </View>
        ) : (
          <View style={{ marginTop: 10, gap: 8 }}>
            {item.corrections.map((c, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  {!!c.wrong && (
                    <>
                      <AppText style={{ fontSize: 14, color: '#D12A64', textDecorationLine: 'line-through' }}>{c.wrong}</AppText>
                      <ArrowRight size={13} color={C.light} weight="bold" />
                    </>
                  )}
                  <AppText style={{ fontSize: 14, fontWeight: '800', color: C.green }}>{c.right}</AppText>
                </View>
                {open && !!c.why && (
                  <AppText style={{ fontSize: 13, color: C.mid, marginTop: 4, lineHeight: 19 }}>{c.why}</AppText>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Feedback que não deu para separar em correções: mostra o texto ao abrir */}
        {open && ok && !!item.feedback && (
          <AppText style={{ fontSize: 13, color: C.mid, marginTop: 8, lineHeight: 19 }}>
            {item.feedback.replace(/[❌✅]/g, '').trim()}
          </AppText>
        )}
        {!open && (
          <AppText style={{ fontSize: 12, fontWeight: '700', color: C.light, marginTop: 10 }}>
            {isPt ? 'Toque para ver a explicação' : 'Tap to see the explanation'}
          </AppText>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function ScorePill({ score }: { score: number }) {
  const ok = score >= PASS;
  return (
    <View style={{ backgroundColor: ok ? '#E3F6EC' : '#FFEEF4', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
      <AppText style={{ fontSize: 13, fontWeight: '800', color: ok ? C.green : '#D12A64' }}>{score}</AppText>
    </View>
  );
}

function PhraseCard({ item }: { item: PhraseItem }) {
  const [open, setOpen] = useState(false);
  const last = item.attempts[item.attempts.length - 1];
  const first = item.attempts[0];
  const gain = last.score - first.score;
  const shown = item.attempts.slice(-5);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(o => !o)}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <AppText display style={{ flex: 1, fontSize: 17, fontWeight: '800', color: C.ink, lineHeight: 22 }}>{item.phrase}</AppText>
          <ScorePill score={last.score} />
        </View>

        {/* Evolução das tentativas (só quando há mais de uma) */}
        {item.attempts.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {item.attempts.length > shown.length && (
            <AppText style={{ fontSize: 13, color: C.light }}>…</AppText>
          )}
          {shown.map((a, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ArrowRight size={11} color={C.light} weight="bold" />}
              <AppText style={{ fontSize: 13, fontWeight: i === shown.length - 1 ? '800' : '600', color: i === shown.length - 1 ? C.ink : C.mid }}>
                {a.score}
              </AppText>
            </React.Fragment>
          ))}
          {item.attempts.length > 1 && gain !== 0 && (
            <View style={{ marginLeft: 4, backgroundColor: gain > 0 ? C.voltBg : C.ghost, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: C.ink }}>
                {gain > 0 ? `+${gain}` : gain}
              </AppText>
            </View>
          )}
        </View>
        )}

        {last.missed.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {[...new Set(last.missed)].map(w => (
              <View key={w} style={{ backgroundColor: '#FFEEF4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: '#D12A64' }}>{w}</AppText>
              </View>
            ))}
          </View>
        )}

        {open && !!last.feedback && (
          <AppText style={{ fontSize: 13, color: C.mid, marginTop: 10, lineHeight: 19 }}>{last.feedback}</AppText>
        )}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: C.light, marginTop: 10 }}>
          {item.attempts.length} {isPt ? (item.attempts.length === 1 ? 'tentativa' : 'tentativas') : (item.attempts.length === 1 ? 'attempt' : 'attempts')}
          {' · '}{dayLabel(last.date)}
          {!open && last.feedback ? (isPt ? ' · toque para ver a dica' : ' · tap for the tip') : ''}
        </AppText>
      </Card>
    </TouchableOpacity>
  );
}

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function PracticeHistoryScreen() {
  const { mode } = useLocalSearchParams<{ mode: 'grammar' | 'pronunciation' }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const isGrammar = mode !== 'pronunciation';

  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('chat_messages')
      .select('role,content,created_at')
      .eq('user_id', profile.id)
      .eq('mode', isGrammar ? 'grammar' : 'pronunciation')
      .order('created_at', { ascending: false })
      .limit(600)
      .then(({ data }) => setRows(((data ?? []) as Row[]).reverse()), () => setRows([]));
  }, [profile?.id, isGrammar]);

  const grammar = useMemo(() => (rows && isGrammar ? buildGrammar(rows) : []), [rows, isGrammar]);
  const phrases = useMemo(() => (rows && !isGrammar ? buildPronunciation(rows) : []), [rows, isGrammar]);

  const title = isGrammar ? (isPt ? 'Minhas correções' : 'My corrections') : (isPt ? 'Meu histórico' : 'My history');

  // Agrupa por dia (a lista já vem do mais recente para o mais antigo)
  const byDay = <T,>(items: T[], dateOf: (t: T) => Date) => {
    const out: { label: string; items: T[] }[] = [];
    items.forEach(it => {
      const label = dayLabel(dateOf(it));
      if (out[out.length - 1]?.label === label) out[out.length - 1].items.push(it);
      else out.push({ label, items: [it] });
    });
    return out;
  };

  let hero: React.ReactNode = null;
  if (rows && isGrammar && grammar.length > 0) {
    const fixed = grammar.reduce((s, g) => s + g.corrections.length, 0);
    const clean = grammar.filter(g => g.corrections.length === 0).length;
    hero = (
      <Hero
        eyebrow={isPt ? 'Frases analisadas' : 'Sentences checked'}
        big={String(grammar.length)}
        caption={isPt ? `${fixed} ${fixed === 1 ? 'correção' : 'correções'} · ${clean} sem erro` : `${fixed} ${fixed === 1 ? 'correction' : 'corrections'} · ${clean} error-free`}
      />
    );
  } else if (rows && !isGrammar && phrases.length > 0) {
    const latest = phrases.map(p => p.attempts[p.attempts.length - 1].score);
    const avg = Math.round(latest.reduce((s, n) => s + n, 0) / latest.length);
    const passed = latest.filter(s => s >= PASS).length;
    hero = (
      <Hero
        eyebrow={isPt ? 'Nota média' : 'Average score'}
        big={String(avg)}
        caption={isPt
          ? `${phrases.length} ${phrases.length === 1 ? 'frase praticada' : 'frases praticadas'} · ${passed} acima de ${PASS}`
          : `${phrases.length} ${phrases.length === 1 ? 'phrase' : 'phrases'} practiced · ${passed} above ${PASS}`}
        progress={avg / 100}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={title} />
      {rows === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      ) : (isGrammar ? grammar.length : phrases.length) === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 8 }}>
            {isPt ? 'Nada por aqui ainda' : 'Nothing here yet'}
          </AppText>
          <AppText style={{ fontSize: 14, color: C.mid, textAlign: 'center', lineHeight: 20 }}>
            {isGrammar
              ? (isPt ? 'Mande uma frase no Grammar e a correção aparece aqui.' : 'Send a sentence in Grammar and the correction shows up here.')
              : (isPt ? 'Grave uma frase no Pronunciation e sua nota aparece aqui.' : 'Record a phrase in Pronunciation and your score shows up here.')}
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          {hero}
          {isGrammar
            ? byDay(grammar, g => g.date).map(d => (
                <View key={d.label}>
                  <DayHeader label={d.label} />
                  {d.items.map((g, i) => <GrammarCard key={i} item={g} />)}
                </View>
              ))
            : byDay(phrases, p => p.attempts[p.attempts.length - 1].date).map(d => (
                <View key={d.label}>
                  <DayHeader label={d.label} />
                  {d.items.map((p, i) => <PhraseCard key={i} item={p} />)}
                </View>
              ))}
        </ScrollView>
      )}
    </View>
  );
}
