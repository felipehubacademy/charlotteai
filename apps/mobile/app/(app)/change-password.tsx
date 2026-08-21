import React, { useState, useMemo } from 'react';
import {
  View, TextInput, TouchableOpacity, ActivityIndicator,
  Platform,  ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft, Lock, LockKey, Eye, EyeSlash, CheckCircle, XCircle,
  ShieldCheck,
} from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.08)',
  fieldBg:   '#F7F6FD',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  greenBg:   'rgba(163,255,60,0.12)',
  error:     '#DC2626',
  errorBg:   'rgba(220,38,38,0.08)',
  accent:    '#7C3AED',          // hero icon tint
  accentBg:  'rgba(124,58,237,0.10)',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
}) as object;

export default function ChangePasswordScreen() {
  const { profile } = useAuth();
  const isPt = (profile?.charlotte_level ?? 'Novice') === 'Novice';

  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

  // Validacao em tempo real
  const rules = useMemo(() => ({
    min6:     newPass.length >= 6,
    diff:     newPass.length > 0 && newPass !== current,
  }), [newPass, current]);

  const matchState: 'idle' | 'match' | 'mismatch' =
    confirm.length === 0       ? 'idle'
    : confirm === newPass      ? 'match'
                               : 'mismatch';

  const allValid =
    current.length > 0 &&
    rules.min6 &&
    rules.diff &&
    matchState === 'match';

  const handleSubmit = async () => {
    if (!allValid) return;
    setLoading(true);
    setCurrentError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const email = session?.session?.user?.email;
      if (!email) throw new Error(isPt ? 'Sessão não encontrada. Faça login novamente.' : 'Session not found. Please log in again.');

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInError) {
        setCurrentError(isPt ? 'Senha atual incorreta.' : 'Current password is incorrect.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
      if (updateError) throw updateError;

      setSuccess(true);
    } catch (e: any) {
      setCurrentError(e.message ?? (isPt ? 'Não foi possível alterar a senha.' : 'Could not change password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Safe area top na cor do header (branca) — sem barra lavender quebrada */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          height: 56,
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 8,
          backgroundColor: C.card,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 10, borderRadius: 20, marginRight: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CaretLeft size={22} color={C.navy} weight="regular" />
          </TouchableOpacity>
          <AppText style={{ fontSize: 17, fontWeight: '700', color: C.navy }}>
            {isPt ? 'Alterar senha' : 'Change password'}
          </AppText>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          {success ? (
            <SuccessState isPt={isPt} onBack={() => router.back()} />
          ) : (
            <>
              {/* Hero */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: C.accentBg,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <ShieldCheck size={36} color={C.accent} weight="regular" />
                </View>
                <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
                  {isPt ? 'Mantenha sua conta segura' : 'Keep your account secure'}
                </AppText>
                <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', marginTop: 6, paddingHorizontal: 16 }}>
                  {isPt
                    ? 'Escolha uma nova senha forte que você consiga lembrar.'
                    : 'Pick a strong new password you can remember.'}
                </AppText>
              </View>

              {/* Card com os 3 campos */}
              <View style={{
                backgroundColor: C.card,
                borderRadius: 18,
                borderWidth: 1, borderColor: C.border,
                padding: 16,
                ...cardShadow,
              }}>
                <PasswordField
                  label={isPt ? 'Senha atual' : 'Current password'}
                  value={current}
                  onChangeText={(v) => { setCurrent(v); if (currentError) setCurrentError(null); }}
                  show={showCur}
                  onToggle={() => setShowCur(v => !v)}
                  error={currentError}
                />

                <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />

                <PasswordField
                  label={isPt ? 'Nova senha' : 'New password'}
                  value={newPass}
                  onChangeText={setNewPass}
                  show={showNew}
                  onToggle={() => setShowNew(v => !v)}
                />
                <View style={{ marginTop: 10, gap: 6 }}>
                  <Rule
                    done={rules.min6}
                    label={isPt ? 'Pelo menos 6 caracteres' : 'At least 6 characters'}
                  />
                  <Rule
                    done={rules.diff}
                    label={isPt ? 'Diferente da senha atual' : 'Different from current password'}
                  />
                </View>

                <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />

                <PasswordField
                  label={isPt ? 'Confirmar nova senha' : 'Confirm new password'}
                  value={confirm}
                  onChangeText={setConfirm}
                  show={showConf}
                  onToggle={() => setShowConf(v => !v)}
                />
                {matchState !== 'idle' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    {matchState === 'match'
                      ? <CheckCircle size={14} color={C.greenDark} weight="regular" />
                      : <XCircle     size={14} color={C.error}     weight="regular" />}
                    <AppText style={{
                      fontSize: 12, fontWeight: '600',
                      color: matchState === 'match' ? C.greenDark : C.error,
                    }}>
                      {matchState === 'match'
                        ? (isPt ? 'As senhas coincidem' : 'Passwords match')
                        : (isPt ? 'As senhas não coincidem' : 'Passwords do not match')}
                    </AppText>
                  </View>
                )}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !allValid}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: allValid ? C.green : `${C.green}55`,
                  borderRadius: 16,
                  paddingVertical: 16,
                  marginTop: 20,
                  ...(allValid ? cardShadow : {}),
                }}
              >
                {loading ? (
                  <ActivityIndicator color={C.navy} />
                ) : (
                  <>
                    <LockKey size={18} color={allValid ? C.navy : `${C.navy}80`} weight="regular" />
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: allValid ? C.navy : `${C.navy}80` }}>
                      {isPt ? 'Alterar senha' : 'Change password'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChangeText, show, onToggle, error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string | null;
}) {
  return (
    <View>
      <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyMid, marginBottom: 6 }}>
        {label}
      </AppText>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.fieldBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: error ? C.error : C.border,
        paddingHorizontal: 12,
      }}>
        <Lock size={16} color={C.navyLight} weight="regular" style={{ marginRight: 8 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1, height: 48,
            color: C.navy, fontSize: 15,
            fontFamily: 'Nunito_400Regular',
            paddingVertical: 0,
          }}
          placeholderTextColor={C.navyLight}
          placeholder="••••••••"
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {show
            ? <EyeSlash size={18} color={C.navyLight} />
            : <Eye      size={18} color={C.navyLight} />}
        </TouchableOpacity>
      </View>
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <XCircle size={14} color={C.error} weight="regular" />
          <AppText style={{ fontSize: 12, fontWeight: '600', color: C.error }}>{error}</AppText>
        </View>
      )}
    </View>
  );
}

function Rule({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {done
        ? <CheckCircle size={14} color={C.greenDark} weight="regular" />
        : (
          <View style={{
            width: 14, height: 14, borderRadius: 7,
            borderWidth: 1.5, borderColor: C.navyLight,
          }} />
        )}
      <AppText style={{
        fontSize: 12,
        fontWeight: done ? '700' : '500',
        color: done ? C.greenDark : C.navyMid,
      }}>
        {label}
      </AppText>
    </View>
  );
}

function SuccessState({ isPt, onBack }: { isPt: boolean; onBack: () => void }) {
  return (
    <View style={{ marginTop: 32, alignItems: 'center' }}>
      <View style={{
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: C.greenBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <CheckCircle size={56} color={C.greenDark} weight="regular" />
      </View>
      <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
        {isPt ? 'Senha alterada!' : 'Password changed!'}
      </AppText>
      <AppText style={{ fontSize: 14, color: C.navyMid, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }}>
        {isPt
          ? 'Sua senha foi atualizada com sucesso. Sua conta continua segura.'
          : 'Your password was updated successfully. Your account stays secure.'}
      </AppText>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginTop: 32,
          backgroundColor: C.green,
          borderRadius: 16,
          paddingVertical: 14, paddingHorizontal: 36,
          ...cardShadow,
        }}
      >
        <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>
          {isPt ? 'Voltar' : 'Back'}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
