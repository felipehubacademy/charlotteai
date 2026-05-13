import { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeSlash, CheckCircle, WarningCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const C = {
  bg:        '#F4F3FA',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  red:       '#DC2626',
};

export default function FirstAccessScreen() {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const confirmRef                      = useRef<TextInput>(null);
  const { session, refreshProfile, profile } = useAuth();
  const userEmail = session?.user?.email ?? '';
  const isPt = (profile?.charlotte_level ?? 'Novice') === 'Novice';

  const handleSave = async () => {
    if (password.length < 8) {
      setError(isPt ? 'A senha deve ter pelo menos 8 caracteres.' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError(isPt ? 'As senhas não coincidem.' : 'Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (session?.user?.id) {
        const { error: dbErr } = await supabase
          .from('charlotte_users')
          .update({ must_change_password: false })
          .eq('id', session.user.id);
        if (dbErr) throw dbErr;
      }

      const { error: authError } = await supabase.auth.updateUser({ password });

      if (authError) {
        if (session?.user?.id) {
          await supabase.from('charlotte_users')
            .update({ must_change_password: true })
            .eq('id', session.user.id);
        }
        throw authError;
      }

      await refreshProfile();
      router.replace('/(app)');
    } catch (e: any) {
      const msg = (e?.message ?? '') as string;
      setError(
        msg.includes('different from the old password')
          ? (isPt ? 'A nova senha deve ser diferente da senha temporária.' : 'New password must differ from the temporary one.')
          : msg || (isPt ? 'Erro ao salvar. Tente novamente.' : 'Error saving. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const strongEnough = password.length >= 8;
  const matches      = confirm.length > 0 && password === confirm;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon + title */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(163,255,60,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Lock size={32} color={C.navy} weight="duotone" />
            </View>
            <AppText style={{ fontSize: 26, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
              {isPt ? 'Crie sua senha' : 'Create your password'}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.navyMid, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              {isPt
                ? `É seu primeiro acesso.\nDefina uma senha pessoal para continuar.`
                : `First access.\nSet a personal password to continue.`}
            </AppText>
          </View>

          {/* Hidden username for iOS Keychain */}
          <TextInput
            value={userEmail}
            textContentType="username"
            autoComplete="username"
            style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
            editable={false}
          />

          <View style={{ gap: 12, marginBottom: 20 }}>
            {/* Password */}
            <View style={inputWrap}>
              <Lock size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError(null); }}
                placeholder={isPt ? 'Nova senha' : 'New password'}
                placeholderTextColor={C.navyLight}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                style={[inputStyle, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                {showPassword
                  ? <EyeSlash size={18} color={C.navyLight} weight="regular" />
                  : <Eye     size={18} color={C.navyLight} weight="regular" />}
              </TouchableOpacity>
            </View>

            {/* Confirm */}
            <View style={inputWrap}>
              <Lock size={18} color={C.navyLight} weight="regular" style={{ marginRight: 10 }} />
              <TextInput
                ref={confirmRef}
                value={confirm}
                onChangeText={t => { setConfirm(t); setError(null); }}
                placeholder={isPt ? 'Confirmar senha' : 'Confirm password'}
                placeholderTextColor={C.navyLight}
                secureTextEntry={!showConfirm}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={[inputStyle, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={{ padding: 6 }}>
                {showConfirm
                  ? <EyeSlash size={18} color={C.navyLight} weight="regular" />
                  : <Eye     size={18} color={C.navyLight} weight="regular" />}
              </TouchableOpacity>
            </View>

            {/* Validation hints */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} color={strongEnough ? C.greenDark : C.navyLight} weight={strongEnough ? 'fill' : 'regular'} />
                <AppText style={{ fontSize: 12, color: strongEnough ? C.greenDark : C.navyLight }}>
                  {isPt ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}
                </AppText>
              </View>
              {confirm.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} color={matches ? C.greenDark : C.red} weight={matches ? 'fill' : 'regular'} />
                  <AppText style={{ fontSize: 12, color: matches ? C.greenDark : C.red }}>
                    {matches
                      ? (isPt ? 'Senhas coincidem' : 'Passwords match')
                      : (isPt ? 'Senhas não coincidem' : 'Passwords do not match')}
                  </AppText>
                </View>
              )}
            </View>

            {!!error && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <WarningCircle size={15} color={C.red} weight="fill" />
                <AppText style={{ color: C.red, fontSize: 13 }}>{error}</AppText>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{ backgroundColor: loading ? `${C.green}80` : C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <AppText style={{ color: C.navy, fontWeight: '700', fontSize: 15 }}>
              {loading ? (isPt ? 'Salvando...' : 'Saving...') : (isPt ? 'Salvar e entrar' : 'Save and continue')}
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
  borderColor: 'rgba(22,21,58,0.10)',
  paddingHorizontal: 16,
  paddingVertical: 15,
};

const inputStyle = { color: '#16153A', fontSize: 15 };
