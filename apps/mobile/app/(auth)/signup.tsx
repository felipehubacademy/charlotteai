import { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity,
   Platform, ScrollView, Image,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Envelope, Lock, Eye, EyeSlash, UserCircle,
  WarningCircle, ArrowLeft, CheckCircle,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmailFormat, isDisposableEmail, suggestEmailCorrection } from '@/lib/emailValidation';
import { systemIsPt } from '@/lib/systemLang';

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  green:     '#A3FF3C',
  error:     '#DC2626',
};

export default function SignupScreen() {
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { signUp } = useAuth();
  // Auth = sistema: idioma segue o device (usuario novo ainda nao tem nivel).
  const isPt = systemIsPt;

  const handleSignup = async () => {
    if (!name.trim())     { setError(isPt ? 'Digite seu nome.' : 'Enter your name.'); return; }
    if (!email.trim())    { setError(isPt ? 'Digite seu e-mail.' : 'Enter your email.'); return; }
    // Validação forte NA ORIGEM: pega typo/formato/descartável antes de gastar
    // um envio de e-mail (e antes de deixar entrar endereço que nunca receberá
    // reset de senha / campanha).
    if (!isValidEmailFormat(email)) {
      setError(isPt ? 'E-mail inválido. Confira o endereço.' : 'Invalid email. Check the address.');
      const s = suggestEmailCorrection(email);
      if (s) setEmailSuggestion(s);
      return;
    }
    if (isDisposableEmail(email)) {
      setError(isPt ? 'Use um e-mail permanente — descartáveis não são aceitos.' : 'Use a permanent email — disposable addresses aren’t accepted.');
      return;
    }
    // Se há um palpite de typo forte, oferece UMA vez. Se o usuário insistir
    // (submeter de novo com o mesmo palpite já visível), segue em frente —
    // evita bloqueio infinito em eventual falso positivo.
    const suggestion = suggestEmailCorrection(email);
    if (suggestion && suggestion.toLowerCase() !== email.trim().toLowerCase() && emailSuggestion !== suggestion) {
      setEmailSuggestion(suggestion);
      setError(null);
      return;
    }
    if (password.length < 6) { setError(isPt ? 'A senha deve ter pelo menos 6 caracteres.' : 'Password must be at least 6 characters.'); return; }
    setError(null);
    setLoading(true);
    try {
      const { session } = await signUp(email.trim().toLowerCase(), password, name.trim());
      // Auto-confirm ligado no Supabase -> já veio sessão: o AuthProvider pega o
      // login e o AuthGuard leva pro trial. Não mostramos o muro de "verifique
      // seu e-mail". Sem sessão -> confirmação exigida -> mostra o muro.
      if (!session) setEmailSent(true);
    } catch (e: any) {
      const raw = (e?.message ?? '') as string;
      const msg = raw.toLowerCase();
      console.error('[Signup] error:', raw);
      const has = (...words: string[]) => words.some(w => msg.includes(w));
      // ORDEM IMPORTA: rate-limit e falha-de-envio contêm a palavra "email"
      // ("email rate limit exceeded", "Error sending confirmation email"), então
      // precisam ser testados ANTES do match de e-mail inválido — senão viram
      // "E-mail inválido" e o usuário acha que digitou errado.
      if (has('already registered', 'already been registered', 'user already')) {
        setError(isPt ? 'Este e-mail já está cadastrado. Faça login.' : 'This email is already registered. Please log in.');
      } else if (has('rate limit', 'too many', 'exceeded', 'over_email', 'over_request')) {
        setError(isPt ? 'Muitas tentativas agora. Aguarde alguns minutos e tente de novo.' : 'Too many attempts right now. Wait a few minutes and try again.');
      } else if (has('sending', 'confirmation email', 'smtp', 'send email')) {
        setError(isPt ? 'Não foi possível enviar o e-mail de confirmação agora. Tente novamente em instantes.' : 'We couldn’t send the confirmation email right now. Please try again shortly.');
      } else if (has('invalid format', 'validate email', 'invalid email', 'not a valid')) {
        setError(isPt ? 'E-mail inválido. Confira o endereço.' : 'Invalid email. Check the address.');
      } else if (has('password', 'senha')) {
        setError(isPt ? 'Senha fraca. Use pelo menos 6 caracteres.' : 'Weak password. Use at least 6 characters.');
      } else {
        setError(raw || (isPt ? 'Erro ao criar conta. Tente novamente.' : 'Error creating account. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent screen ──────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>

          {/* Avatar com badge de check */}
          <View style={{ marginBottom: 32 }}>
            <View style={{
              width: 120, height: 120, borderRadius: 60,
              borderWidth: 3, borderColor: C.green,
              overflow: 'hidden', backgroundColor: C.navy,
              shadowColor: C.green, shadowOpacity: 0.25,
              shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
            }}>
              <Image
                source={require('@/assets/charlotte-avatar.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            {/* Badge de check no canto inferior direito */}
            <View style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: C.green,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: C.bg,
            }}>
              <CheckCircle size={20} color={C.navy} weight="fill" />
            </View>
          </View>

          {/* Textos */}
          <AppText style={{ fontSize: 26, fontWeight: '800', color: C.navy, textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 }}>
            {isPt ? 'Verifique seu e-mail' : 'Check your email'}
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 23, marginBottom: 6 }}>
            {isPt ? 'Enviamos um link de confirmação para' : 'We sent a confirmation link to'}
          </AppText>
          <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy, textAlign: 'center', marginBottom: 20 }}>
            {email}
          </AppText>
          <AppText style={{ fontSize: 14, color: C.navyLight, textAlign: 'center', lineHeight: 21, marginBottom: 48 }}>
            {isPt ? 'Clique no link para ativar sua conta.' : 'Click the link to activate your account.'}
          </AppText>

          {/* Botão sólido */}
          <TouchableOpacity
            style={{
              backgroundColor: C.navy,
              borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', width: '100%',
            }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <AppText style={{ color: C.bg, fontWeight: '800', fontSize: 15 }}>
              {isPt ? 'Ir para o login' : 'Go to login'}
            </AppText>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Back ── */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{ position: 'absolute', top: 16, left: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color={C.navy} weight="bold" />
          </TouchableOpacity>

          {/* ── Branding ── */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              borderWidth: 3, borderColor: C.green,
              overflow: 'hidden', marginBottom: 16,
              backgroundColor: C.navy,
              shadowColor: C.navy, shadowOpacity: 0.12,
              shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
            }}>
              <Image
                source={require('@/assets/charlotte-avatar.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <AppText style={{ fontSize: 28, fontWeight: '800', color: C.navy, letterSpacing: -0.5, marginBottom: 4 }}>
              {isPt ? 'Criar conta' : 'Create account'}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center' }}>
              {isPt ? '7 dias grátis, sem cartão de crédito.' : '7 days free, no credit card.'}
            </AppText>
          </View>

          {/* ── Campos ── */}
          <View style={{ gap: 12, marginBottom: 24 }}>

            {/* Nome */}
            <View style={[inputWrap, { borderColor: C.border }]}>
              <UserCircle size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                value={name}
                onChangeText={t => { setName(t); setError(null); }}
                placeholder={isPt ? 'Seu nome' : 'Your name'}
                placeholderTextColor={C.navyLight}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                style={[inputStyle, { color: C.navy }]}
              />
            </View>

            {/* E-mail */}
            <View style={[inputWrap, { borderColor: C.border }]}>
              <Envelope size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={t => { setEmail(t); setError(null); setEmailSuggestion(null); }}
                onBlur={() => {
                  const s = suggestEmailCorrection(email);
                  setEmailSuggestion(s && s.toLowerCase() !== email.trim().toLowerCase() ? s : null);
                }}
                placeholder={isPt ? 'E-mail' : 'Email'}
                placeholderTextColor={C.navyLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={[inputStyle, { color: C.navy }]}
              />
            </View>

            {/* Correção de typo — "você quis dizer …?" (tap preenche) */}
            {!!emailSuggestion && (
              <TouchableOpacity
                onPress={() => { setEmail(emailSuggestion); setEmailSuggestion(null); setError(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}
              >
                <AppText style={{ color: C.navyMid, fontSize: 13 }}>{isPt ? 'Você quis dizer ' : 'Did you mean '}</AppText>
                <AppText style={{ color: C.navy, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' }}>
                  {emailSuggestion}
                </AppText>
                <AppText style={{ color: C.navyMid, fontSize: 13 }}>?</AppText>
              </TouchableOpacity>
            )}

            {/* Senha */}
            <View style={[inputWrap, { borderColor: C.border }]}>
              <Lock size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={t => { setPassword(t); setError(null); }}
                placeholder={isPt ? 'Senha (mín. 6 caracteres)' : 'Password (min. 6 characters)'}
                placeholderTextColor={C.navyLight}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                style={[inputStyle, { flex: 1, color: C.navy }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                {showPassword
                  ? <EyeSlash size={18} color={C.navyLight} weight="regular" />
                  : <Eye      size={18} color={C.navyLight} weight="regular" />
                }
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <WarningCircle size={15} color={C.error} weight="fill" />
                <AppText style={{ color: C.error, fontSize: 13, flex: 1 }}>{error}</AppText>
              </View>
            )}
          </View>

          {/* ── Botão criar ── */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={{
              backgroundColor: loading ? `${C.green}80` : C.green,
              borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20,
              shadowColor: C.green, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            }}
          >
            <AppText style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>
              {loading ? (isPt ? 'Criando conta...' : 'Creating account...') : (isPt ? 'Criar conta grátis' : 'Create free account')}
            </AppText>
          </TouchableOpacity>

          {/* ── Já tenho conta ── */}
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 10 }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <AppText style={{ color: C.navyMid, fontSize: 13 }}>
              {isPt ? 'Já tenho uma conta' : 'I already have an account'}
            </AppText>
          </TouchableOpacity>

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
  paddingHorizontal: 16,
  paddingVertical: 15,
  shadowColor: 'rgba(22,21,58,0.06)',
  shadowOpacity: 1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

const inputStyle = {
  fontSize: 15,
  flex: 1,
};
