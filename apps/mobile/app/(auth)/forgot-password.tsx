import { useState } from 'react';
import {
  View, TextInput, TouchableOpacity,
   Platform, ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Envelope, ArrowLeft, CheckCircle, WarningCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';

// ── Light theme ───────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  red:       '#DC2626',
};

export default function ForgotPasswordScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { resetPassword }     = useAuth();

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Digite seu e-mail.'); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      const msg = (e?.message ?? '') as string;
      console.error('[ForgotPassword] error:', msg);
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit')) {
        setError('Muitas tentativas. Aguarde alguns minutos.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('email')) {
        setError('E-mail inválido.');
      } else {
        setError(msg || 'Não foi possível enviar o e-mail. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: 'absolute', top: 0, left: 4, padding: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color={C.navyMid} weight="bold" />
          </TouchableOpacity>

          {/* Icon + title */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: 'rgba(163,255,60,0.12)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Envelope size={32} color={C.navy} weight="duotone" />
            </View>
            <AppText style={{ fontSize: 26, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
              Recuperar senha
            </AppText>
            <AppText style={{ fontSize: 14, color: C.navyMid, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              Enviaremos um link de redefinição{'\n'}para o seu e-mail.
            </AppText>
          </View>

          {/* Sent state */}
          {sent ? (
            <View style={{ gap: 24 }}>
              <View style={{
                backgroundColor: C.card, borderRadius: 18, padding: 24,
                alignItems: 'center', gap: 12,
                borderWidth: 1, borderColor: 'rgba(163,255,60,0.3)',
              }}>
                <CheckCircle size={44} color={C.greenDark} weight="fill" />
                <AppText style={{ fontSize: 15, color: C.navy, textAlign: 'center', lineHeight: 22 }}>
                  E-mail enviado! Verifique sua caixa de entrada.
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <AppText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Voltar ao login</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>

              {/* Email input */}
              <View style={inputWrap}>
                <Envelope size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
                <TextInput
                  value={email}
                  onChangeText={t => { setEmail(t); setError(null); }}
                  placeholder="E-mail"
                  placeholderTextColor={C.navyLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  style={[inputStyle, { flex: 1 }]}
                />
              </View>

              {!!error && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <WarningCircle size={15} color={C.red} weight="fill" />
                  <AppText style={{ color: C.red, fontSize: 13 }}>{error}</AppText>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{
                  backgroundColor: loading ? `${C.green}80` : C.green,
                  borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4,
                }}
              >
                <AppText style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>
                  {loading ? 'Enviando...' : 'Enviar link'}
                </AppText>
              </TouchableOpacity>

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputWrap = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(22,21,58,0.10)',
  paddingHorizontal: 16,
  paddingVertical: 15,
};

const inputStyle = {
  color: '#16153A',
  fontSize: 15,
};
