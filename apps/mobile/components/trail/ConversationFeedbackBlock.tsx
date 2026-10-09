// ConversationFeedbackBlock — no card final do Role-play e do Guided Chat:
// até 3 frases do aluno com a versão certa e um porquê curto, ou o aviso de
// que o inglês estava certo. A conversa em si não corrige (fica para o fim).
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { CheckCircle, PencilSimpleLine } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import type { ConversationFeedback } from '@/lib/trailFeedback';

const INK = '#16131F';
const MID = 'rgba(22,19,31,0.62)';
const PINK = '#D12A64';
const GREEN = '#08804A';

export function ConversationFeedbackBlock({ feedback, loading }: { feedback: ConversationFeedback | null; loading: boolean }) {
  const isPt = systemIsPt;
  if (loading) {
    return (
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginBottom: 12 }}>
        <ActivityIndicator size="small" color={MID} />
        <AppText style={{ fontSize: 13, color: MID }}>{isPt ? 'Revisando o seu inglês…' : 'Reviewing your English…'}</AppText>
      </View>
    );
  }
  if (!feedback) return null;
  if (feedback.errorFree) {
    return (
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(8,128,74,0.08)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <CheckCircle size={18} color={GREEN} weight="fill" />
        <AppText style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: GREEN }}>
          {isPt ? 'Seu inglês estava certinho nessa conversa.' : 'Your English was spot on in this conversation.'}
        </AppText>
      </View>
    );
  }
  return (
    <View style={{ width: '100%', marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <PencilSimpleLine size={15} color={PINK} weight="bold" />
        <AppText style={{ fontSize: 11, fontWeight: '800', color: PINK, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          {isPt ? 'Para caprichar' : 'To polish'}
        </AppText>
      </View>
      {feedback.corrections.map((c, i) => (
        <View key={i} style={{ backgroundColor: 'rgba(22,19,31,0.05)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <AppText style={{ fontSize: 13, color: MID, textDecorationLine: 'line-through' }}>{c.said}</AppText>
          <AppText style={{ fontSize: 15, fontWeight: '700', color: INK, marginTop: 3 }}>{c.correct}</AppText>
          {!!c.tip && <AppText style={{ fontSize: 12.5, color: MID, marginTop: 4 }}>{c.tip}</AppText>}
        </View>
      ))}
    </View>
  );
}
