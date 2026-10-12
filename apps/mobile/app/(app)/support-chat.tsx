// app/(app)/support-chat.tsx — chat do Suporte Queizy dentro do app.
// A IA do suporte responde pela FAQ; o que ela não resolve vai para a equipe, que responde
// por aqui (aviso por push). Não usa a Charlotte (ela é a tutora, não o suporte).
// Textos da tela seguem o idioma do aparelho.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { PaperPlaneRight, Headset } from 'phosphor-react-native';
import { ScreenHeader } from '@/components/stats/StatsUI';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { loadSupportChat, sendSupportChat, type SupportChatMessage } from '@/lib/supportChat';

const C = {
  bg: '#FAF7F0', card: '#FFFFFF', ink: '#16131F', inkMid: '#4D4858', inkLight: '#8A8494',
  volt: '#DCFF4A', bubble: '#F3F0E8', border: 'rgba(22,19,31,0.08)',
};

/** Ícone do suporte (no lugar de um avatar de pessoa). */
function SupportAvatar() {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Headset size={17} color={C.volt} weight="fill" />
    </View>
  );
}

function TypingDots() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
      <SupportAvatar />
      <View style={{ backgroundColor: C.bubble, borderRadius: 18, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 }}>
        <ActivityIndicator size="small" color={C.inkLight} />
      </View>
    </View>
  );
}

function Bubble({ m, isPt }: { m: SupportChatMessage; isPt: boolean }) {
  const mine = m.author === 'user';
  // Aviso do sistema (ex.: "Ana, da equipe Queizy, assumiu o seu atendimento").
  if (m.author === 'system') {
    return (
      <View style={{ alignSelf: 'center', maxWidth: '90%', backgroundColor: 'rgba(22,19,31,0.06)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14 }}>
        <AppText style={{ fontSize: 12.5, color: C.inkMid, textAlign: 'center', lineHeight: 17 }}>{m.body}</AppText>
      </View>
    );
  }
  if (mine) {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: C.volt, borderRadius: 20, borderTopRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 }}>
        <AppText style={{ fontSize: 15, color: C.ink, lineHeight: 21 }}>{m.body}</AppText>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14, maxWidth: '88%' }}>
      <SupportAvatar />
      <View style={{ flexShrink: 1 }}>
        {m.author === 'human' && (
          <AppText style={{ fontSize: 11.5, fontWeight: '700', color: C.inkLight, marginBottom: 4, marginLeft: 4 }}>
            {m.author_name ? `${m.author_name} · ${isPt ? 'Equipe Queizy' : 'Queizy team'}` : (isPt ? 'Equipe Queizy' : 'Queizy team')}
          </AppText>
        )}
        <View style={{ backgroundColor: C.bubble, borderRadius: 20, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10 }}>
          <AppText style={{ fontSize: 15, color: C.ink, lineHeight: 21 }}>{m.body}</AppText>
        </View>
      </View>
    </View>
  );
}

export default function SupportChatScreen() {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  const refresh = useCallback(async () => {
    const r = await loadSupportChat();
    if ('error' in r) { setErr(isPt ? 'Não foi possível carregar a conversa. Confira a internet.' : "Couldn't load the chat. Check your connection."); }
    else { setMessages(r.messages); setStatus(r.status); setErr(null); }
    setLoading(false);
  }, [isPt]);

  // Recarrega ao abrir/voltar para a tela; com a equipe cuidando, confere novas respostas a cada 20 s.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => {
    if (status !== 'escalated') return;
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [status, refresh]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [messages.length, sending]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText(''); setSending(true); setErr(null);
    // Mostra a mensagem na hora; a lista oficial volta do servidor.
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, author: 'user', body: t, created_at: new Date().toISOString() }]);
    const r = await sendSupportChat(t, isPt);
    setSending(false);
    if ('error' in r) {
      setErr(r.error === 'rate_limited'
        ? (isPt ? 'Muitas mensagens seguidas. Espere um pouco e tente de novo.' : 'Too many messages in a row. Wait a bit and try again.')
        : (isPt ? 'Não foi possível enviar. Confira a internet e tente de novo.' : "Couldn't send. Check your connection and try again."));
      setMessages(prev => prev.filter(m => !m.id.startsWith('local-')));
      setText(t);
      return;
    }
    setMessages(r.messages); setStatus(r.status);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Suporte Queizy' : 'Queizy support'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {/* Abertura fixa (não é gravada no servidor). */}
          <Bubble isPt={isPt} m={{ id: 'intro', author: 'agent', created_at: '', body: isPt
            ? 'Oi! Aqui é o suporte do Queizy. Conte sua dúvida sobre o app, sua conta ou assinatura. Respondemos na hora e, se precisar, alguém da equipe continua com você por aqui.'
            : "Hi! This is Queizy support. Tell us your question about the app, your account or subscription. We reply right away and, if needed, someone from the team will follow up here." }} />
          {loading ? <ActivityIndicator style={{ marginTop: 20 }} color={C.inkLight} /> : messages.map(m => <Bubble key={m.id} m={m} isPt={isPt} />)}
          {sending && <TypingDots />}
          {status === 'escalated' && !sending && (
            <AppText style={{ fontSize: 12.5, color: C.inkLight, textAlign: 'center', marginTop: 4, marginBottom: 10 }}>
              {isPt ? 'A equipe do Queizy está com o seu caso. Você recebe um aviso quando responderem.' : "The Queizy team has your case. You'll get a notification when they reply."}
            </AppText>
          )}
          {!!err && <AppText style={{ fontSize: 13, color: '#C2410C', textAlign: 'center', marginBottom: 10 }}>{err}</AppText>}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 + insets.bottom, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput
            value={text} onChangeText={setText} multiline maxLength={2000}
            placeholder={isPt ? 'Escreva sua mensagem' : 'Type your message'} placeholderTextColor={C.inkLight}
            style={{ flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.bg, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: C.ink }}
          />
          <TouchableOpacity onPress={send} disabled={!text.trim() || sending} activeOpacity={0.8}
            accessibilityLabel={isPt ? 'Enviar' : 'Send'}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() && !sending ? C.ink : 'rgba(22,19,31,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <PaperPlaneRight size={19} color={text.trim() && !sending ? C.volt : '#FFFFFF'} weight="fill" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
