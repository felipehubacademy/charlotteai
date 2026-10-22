// ConversationFeedbackBlock — no card final do Role-play e do Guided Chat:
// até 3 frases do aluno com a versão certa e um porquê curto, ou o aviso de
// que o inglês estava certo. A conversa em si não corrige (fica para o fim).
import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { CheckCircle, PencilSimpleLine } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import type { ConversationFeedback } from '@/lib/trailFeedback';

const INK = '#16131F';
const MID = 'rgba(22,19,31,0.62)';
const PINK = '#D12A64';
const GREEN = '#08804A';

// Sem o elogio específico do servidor (falha, versão antiga), sorteia daqui sem repetir o último.
const PRAISE_PT = [
  'Nenhum deslize de inglês nessa conversa. Mandou bem!',
  'Conversa limpinha: nada para corrigir dessa vez.',
  'Você se virou muito bem nessa conversa, sem erros.',
  'Inglês redondinho do começo ao fim.',
  'Zero correções. Dá para sentir a evolução!',
  'Cada frase sua saiu certa. Continua assim!',
  'Você falou com segurança e sem errar.',
  'Nada para ajustar: suas frases ficaram naturais.',
];
const PRAISE_EN = [
  'Not a single slip in this conversation. Nice!',
  'Clean conversation: nothing to fix this time.',
  'You handled this conversation really well, no mistakes.',
  'Smooth English from start to finish.',
  'Zero corrections. You can feel the progress!',
  'Every sentence came out right. Keep it up!',
  'You spoke with confidence and got it all right.',
  'Nothing to adjust: your sentences sounded natural.',
];
let lastPraise = -1;
function pickPraise(isPt: boolean): string {
  const list = isPt ? PRAISE_PT : PRAISE_EN;
  let i = Math.floor(Math.random() * list.length);
  if (i === lastPraise) i = (i + 1) % list.length;
  lastPraise = i;
  return list[i];
}

export function ConversationFeedbackBlock({ feedback, loading }: { feedback: ConversationFeedback | null; loading: boolean }) {
  const isPt = systemIsPt;
  // Um sorteio por resultado (não troca a cada redesenho da tela).
  const fallbackPraise = useMemo(() => pickPraise(isPt), [feedback]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const praise = feedback.praise?.trim() || fallbackPraise;
    return (
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(8,128,74,0.08)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <CheckCircle size={18} color={GREEN} weight="fill" />
        <AppText style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: GREEN }}>
          {praise}
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
