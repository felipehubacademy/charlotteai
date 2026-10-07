import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  SignIn,
  WarningCircle,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import { MarkerText } from '@/components/ui/MarkerText';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';

// Light theme
const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.10)',
  green:     '#DCFF4A',
  error:     '#D12A64',
};

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const passwordRef                     = useRef<TextInput>(null);
  const { signIn }                      = useAuth();
  // Auth = sistema: idioma segue o device.
  const isPt = systemIsPt;

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError(isPt ? 'Preencha e-mail e senha.' : 'Enter your email and password.'); return; }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(app)');
    } catch (e: any) {
      const msg = e?.message ?? '';
      console.error('[login] signIn error:', { message: msg, name: e?.name, code: e?.code, status: e?.status, raw: e });
      if (msg.includes('Invalid login credentials')) setError(isPt ? 'E-mail ou senha incorretos.' : 'Incorrect email or password.');
      else if (msg.includes('Email not confirmed'))  setError(isPt ? 'Confirme seu e-mail antes de entrar.' : 'Confirm your email before signing in.');
      else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError(isPt ? 'Sem conexão com servidor. Cheque internet e tente de novo.' : 'No server connection. Check your internet and try again.');
      }
      // Modo debug: mostra mensagem real do supabase pra investigar Android
      else setError(`${isPt ? 'Erro' : 'Error'}: ${msg || (isPt ? 'desconhecido' : 'unknown')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >

          {/* ── Branding ── */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>

            {/* Logo Queizy */}
            <View style={{ marginBottom: 14 }}>
              <HeaderLogo height={44} />
            </View>

            {/* by Hub Academy — com linhas laterais */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <View style={{ width: 24, height: 1, backgroundColor: C.navyLight, opacity: 0.35 }} />
              <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyLight, letterSpacing: 0.6 }}>
                by Hub Academy
              </AppText>
              <View style={{ width: 24, height: 1, backgroundColor: C.navyLight, opacity: 0.35 }} />
            </View>

            {/* Assinatura da marca */}
            <View style={{ marginBottom: 8 }}>
              <MarkerText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, lineHeight: 28, textAlign: 'center' }}>
                {isPt ? 'Do queizy ao crazy.' : 'From queizy to crazy.'}
              </MarkerText>
            </View>

            {/* Tagline */}
            <AppText style={{
              fontSize: 14, color: C.navyMid, textAlign: 'center',
              lineHeight: 22, maxWidth: 270,
            }}>
              {isPt
                ? 'Inglês de verdade, com conversa, correção na hora e zero vergonha de errar.'
                : 'Real English, with real conversations, instant corrections and zero shame in getting it wrong.'}
            </AppText>

          </View>

          {/* ── Campos ── */}
          <View style={{ gap: 12, marginBottom: 24 }}>

            {/* E-mail */}
            <View style={[inputWrap, { borderColor: C.border }]}>
              <Envelope size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={t => { setEmail(t); setError(null); }}
                placeholder={isPt ? 'E-mail' : 'Email'}
                placeholderTextColor={C.navyLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={[inputStyle, { color: C.navy }]}
              />
            </View>

            {/* Senha */}
            <View style={[inputWrap, { borderColor: C.border }]}>
              <Lock size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={t => { setPassword(t); setError(null); }}
                placeholder={isPt ? 'Senha' : 'Password'}
                placeholderTextColor={C.navyLight}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={[inputStyle, { flex: 1, color: C.navy }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                {showPassword
                  ? <EyeSlash size={18} color={C.navyLight} weight="regular" />
                  : <Eye     size={18} color={C.navyLight} weight="regular" />
                }
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <WarningCircle size={15} color={C.error} weight="fill" />
                <AppText style={{ color: C.error, fontSize: 13 }}>{error}</AppText>
              </View>
            )}
          </View>

          {/* ── Botão entrar ── */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? `${C.green}80` : C.green,
              borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16,
              shadowColor: C.green, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SignIn size={18} color={C.navy} weight="bold" />
              <AppText style={{ color: C.navy, fontWeight: '800', fontSize: 15 }}>
                {loading ? (isPt ? 'Entrando...' : 'Signing in...') : (isPt ? 'Entrar' : 'Sign in')}
              </AppText>
            </View>
          </TouchableOpacity>

          {/* ── Criar conta ── */}
          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              borderRadius: 14, paddingVertical: 15, alignItems: 'center',
              borderWidth: 1.5, borderColor: C.border, marginBottom: 12,
            }}
            onPress={() => router.push('/(auth)/signup')}
          >
            <AppText style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>
              {isPt ? 'Criar conta grátis' : 'Create free account'}
            </AppText>
          </TouchableOpacity>

          {/* ── Esqueceu senha ── */}
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 10 }}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <AppText style={{ color: C.navyMid, fontSize: 13 }}>
              {isPt ? 'Esqueceu sua senha?' : 'Forgot your password?'}
            </AppText>
          </TouchableOpacity>

          <AppText style={{ color: C.navyLight, fontSize: 11, textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
            Queizy v{Constants.expoConfig?.version ?? '1.0.0'} · {isPt ? 'Todos os direitos reservados' : 'All rights reserved'}
          </AppText>

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
  shadowColor: 'rgba(22,19,31,0.06)',
  shadowOpacity: 1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

const inputStyle = {
  fontSize: 15,
  flex: 1,
};
