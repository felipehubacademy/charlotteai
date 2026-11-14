// components/vocabulary/CallVocabCard.tsx — "Palavras desta ligação": no fim da ligação por voz (Charlotte e
// Família), até 5 palavras do dia a dia que apareceram na conversa (/api/call-vocab). O aluno desmarca o que
// não quer e salva no Vocabulário com um toque (source 'charlotte', 1ª revisão no dia seguinte).
// Sem palavras que valham a pena (conversa curta), o cartão não aparece.
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { BookOpen, CheckCircle } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { saveVocabItems, type TrailVocabItem } from '@/lib/trailVocab';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

/** Marcador desmarcado (círculo vazio do mesmo tamanho do CheckCircle). */
function Ring({ size, color }: { size: number; color: string }) {
  const d = size * 0.84;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.6, borderColor: color }} /></View>;
}

export type CallLine = { who: 'ai' | 'user'; text: string };

/** compact = só os termos em etiquetas (tela de fim da ligação com a Família, que não rola); sem ele, cada
 *  palavra vem com o significado (transcrição da ligação com a Charlotte, que rola). */
export function CallVocabCard({ lines, compact = false, ink = '#16131F', sub = '#4D4858', surface = '#FFFFFF' }: {
  lines: CallLine[]; compact?: boolean; ink?: string; sub?: string; surface?: string;
}) {
  const isPt = systemIsPt;
  const [items, setItems] = useState<TrailVocabItem[] | null>(null);
  const [level, setLevel] = useState<string>('Inter');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (lines.length < 4) { setItems([]); return; }
    fetch(`${API_BASE_URL}/api/call-vocab`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.slice(-200) }),
    }).then(r => (r.ok ? r.json() : { items: [] })).then(j => {
      if (!alive) return;
      const list: TrailVocabItem[] = Array.isArray(j?.items) ? j.items : [];
      setItems(list);
      if (j?.level) setLevel(j.level);
      setPicked(new Set(list.map((_, i) => i)));
      if (list.length) track('call_vocab_shown', { count: list.length });
    }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items === null) {
    return (
      <View style={{ backgroundColor: surface, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="small" color={ink} />
        <AppText style={{ fontSize: 13, color: sub }}>{isPt ? 'Separando palavras da conversa...' : 'Picking words from the call...'}</AppText>
      </View>
    );
  }
  if (!items.length) return null;

  const save = async () => {
    const chosen = items.filter((_, i) => picked.has(i));
    if (!chosen.length || saving) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const n = session?.user?.id ? await saveVocabItems(session.user.id, chosen, 'charlotte', level === 'Novice') : 0;
    setSaving(false);
    setSaved(n);
    track('call_vocab_saved', { offered: items.length, picked: chosen.length, saved: n });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ backgroundColor: surface, borderRadius: 18, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <BookOpen size={17} color={ink} weight="fill" />
        <AppText style={{ fontSize: 15, fontWeight: '800', color: ink }}>{isPt ? 'Palavras desta ligação' : 'Words from this call'}</AppText>
      </View>
      {compact ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {items.map((it, i) => {
            const on = picked.has(i);
            return (
              <TouchableOpacity key={it.term} activeOpacity={0.7} disabled={saved !== null}
                onPress={() => setPicked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
                  backgroundColor: on ? 'rgba(8,128,74,0.12)' : 'rgba(22,19,31,0.05)', borderWidth: 1, borderColor: on ? 'rgba(8,128,74,0.35)' : 'rgba(22,19,31,0.12)' }}>
                {on ? <CheckCircle size={14} color="#08804A" weight="fill" /> : <Ring size={14} color={sub} />}
                <AppText style={{ fontSize: 13, fontWeight: '700', color: ink }}>{it.term}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : items.map((it, i) => {
        const on = picked.has(i);
        return (
          <TouchableOpacity key={it.term} activeOpacity={0.7} disabled={saved !== null}
            onPress={() => setPicked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}
            accessibilityRole="checkbox" accessibilityState={{ checked: on }}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 }}>
            {on ? <CheckCircle size={20} color="#08804A" weight="fill" /> : <Ring size={20} color={sub} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 14.5, fontWeight: '800', color: ink }}>{it.term}</AppText>
              <AppText style={{ fontSize: 13, color: sub, marginTop: 1 }}>{it.definition}</AppText>
            </View>
          </TouchableOpacity>
        );
      })}
      {saved !== null ? (
        <AppText style={{ fontSize: 13.5, fontWeight: '700', color: '#08804A', marginTop: 8 }}>
          {saved > 0
            ? (isPt ? `${saved} ${saved === 1 ? 'palavra salva' : 'palavras salvas'} no seu Vocabulário. A revisão começa amanhã.` : `${saved} saved to your Vocabulary. Review starts tomorrow.`)
            : (isPt ? 'Essas palavras já estavam no seu Vocabulário.' : 'These words were already in your Vocabulary.')}
        </AppText>
      ) : (
        <TouchableOpacity onPress={save} disabled={!picked.size || saving} activeOpacity={0.85}
          style={{ marginTop: 10, backgroundColor: picked.size ? '#DCFF4A' : 'rgba(22,19,31,0.08)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
          {saving ? <ActivityIndicator color="#16131F" /> : (
            <AppText style={{ fontSize: 14.5, fontWeight: '800', color: '#16131F' }}>
              {isPt ? `Salvar ${picked.size} no Vocabulário` : `Save ${picked.size} to Vocabulary`}
            </AppText>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
