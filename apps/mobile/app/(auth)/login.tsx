import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
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
import { useAuth } from '@/hooks/useAuth';

// Light theme
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

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const passwordRef                     = useRef<TextInput>(null);
  const { signIn }                      = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return; }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(app)');
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Email not confirmed'))  setError('Confirme seu e-mail antes de entrar.');
      else setError('Erro ao entrar. Tente novamente.');
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

            {/* Avatar */}
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              borderWidth: 3, borderColor: C.green,
              overflow: 'hidden', marginBottom: 18,
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

            {/* Charlotte */}
            <AppText style={{ fontSize: 34, fontWeight: '800', color: C.navy, letterSpacing: -0.5, marginBottom: 6 }}>
              Charlotte
            </AppText>

            {/* by Hub Academy — com linhas laterais */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 24, height: 1, backgroundColor: C.navyLight, opacity: 0.35 }} />
              <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyLight, letterSpacing: 0.6 }}>
                by Hub Academy
              </AppText>
              <View style={{ width: 24, height: 1, backgroundColor: C.navyLight, opacity: 0.35 }} />
            </View>

            {/* Tagline */}
            <AppText style={{
              fontSize: 14, color: C.navyMid, textAlign: 'center',
              lineHeight: 22, maxWidth: 270,
            }}>
              Pratique inglês com conversas inteligentes e feedback em tempo real.
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
                placeholder="E-mail"
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
                placeholder="Senha"
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
                {loading ? 'Entrando...' : 'Entrar'}
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
              Criar conta grátis
            </AppText>
          </TouchableOpacity>

          {/* ── Esqueceu senha ── */}
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 10 }}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <AppText style={{ color: C.navyMid, fontSize: 13 }}>
              Esqueceu sua senha?
            </AppText>
          </TouchableOpacity>

          <AppText style={{ color: C.navyLight, fontSize: 11, textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
            Charlotte v1.0 · All rights reserved
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
  shadowColor: 'rgba(22,21,58,0.06)',
  shadowOpacity: 1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

const inputStyle = {
  fontSize: 15,
  flex: 1,
};
