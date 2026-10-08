// app/(app)/(tabs)/profile.tsx
// Profile tab — avatar, editable name, read-only email, level badge, settings.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Alert, Platform,
  Linking, ActivityIndicator, Image, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  User, Key, DeviceMobile, GraduationCap, Buildings,
  SignOut, Microphone, FileText,
  ShieldWarning, ArrowsClockwise, Trash, PencilSimple,
  CaretRight, SpeakerHigh, Vibrate, ChatCircleText,
  CreditCard, Lifebuoy, UsersThree,
} from 'phosphor-react-native';
import {
  loadAudioPreferences,
  getAudioPreferences,
  setAudioPreference,
  subscribeAudioPreferences,
  type AudioPreferences,
} from '@/lib/audioPreferences';
import { openLink } from '@/lib/openLink';
import { AppText } from '@/components/ui/Text';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { restorePurchases, openManageSubscriptions } from '@/lib/purchases';
import { getLiveVoiceStatus, LiveVoiceStatus } from '@/lib/liveVoiceUsage';
import { systemIsPt } from '@/lib/systemLang';
import { LEVEL_CONFIG, UserLevel } from '@/lib/levelConfig';
import AvatarCropModal from '@/components/ui/AvatarCropModal';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import { QueizyWave } from '@/components/ui/QueizyWave';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  ghost:     'rgba(22,19,31,0.06)',
  border:    'rgba(22,19,31,0.08)',
  volt:      '#DCFF4A',
  greenDark: '#08804A',
  pink:      '#FF4F8B',
  error:     '#D12A64',
  violet:    '#6B4BFF',
};

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
}

// Ícone da linha dentro de um círculo neutro (rosa claro nas destrutivas).
function RowIcon({ children, destructive }: { children: React.ReactNode; destructive?: boolean }) {
  return (
    <View style={{
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: destructive ? '#FFEEF4' : C.ghost,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </View>
  );
}

// Row inside a SettingGroup card — no own card styling
function SettingRow({ icon, label, value, valueColor, onPress, destructive = false, chevron }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 14, paddingVertical: 11, minHeight: 56,
      }}
    >
      <RowIcon destructive={destructive}>{icon}</RowIcon>
      <AppText style={{ flex: 1, fontSize: 15, fontWeight: '600', color: destructive ? C.error : C.navy }}>
        {label}
      </AppText>
      {!!value && (
        <AppText style={{ fontSize: 13, color: valueColor ?? C.navyLight, fontWeight: '700' }}>
          {value}
        </AppText>
      )}
      {(chevron || (!!onPress && !value)) && (
        <CaretRight size={14} color={C.navyLight} weight="bold" />
      )}
    </TouchableOpacity>
  );
}

// Switch row — same paddings as SettingRow, swaps chevron for a Switch
function SwitchRow({
  icon, label, description, value, onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 11, minHeight: 56,
    }}>
      <RowIcon>{icon}</RowIcon>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 15, fontWeight: '600', color: C.navy }}>{label}</AppText>
        {!!description && (
          <AppText style={{ fontSize: 12, color: C.navyLight, marginTop: 2, lineHeight: 16 }} numberOfLines={2}>
            {description}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(22,19,31,0.15)', true: C.navy }}
        thumbColor={Platform.OS === 'android' ? (value ? C.volt : '#FFF') : undefined}
        ios_backgroundColor="rgba(22,19,31,0.15)"
      />
    </View>
  );
}

// Card wrapper that groups multiple SettingRows with dividers
function SettingGroup({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children);
  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 20,
      borderWidth: 1, borderColor: C.border,
      overflow: 'hidden',
    }}>
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < rows.length - 1 && (
            <View style={{ height: 1, backgroundColor: C.border, marginLeft: 60 }} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <AppText display style={{
      fontSize: 17, fontWeight: '800', color: C.navy,
      marginTop: 26, marginBottom: 10, paddingHorizontal: 4,
    }}>
      {label}
    </AppText>
  );
}

export default function ProfileTab() {
  const { profile, signOut, refreshProfile } = useAuth();
  const level  = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  // Profile = tela de sistema/config: idioma segue o device (nao o nivel).
  const isPt   = systemIsPt;

  const [editingName,        setEditingName]        = useState(false);
  const [nameValue,          setNameValue]          = useState(profile?.name ?? '');
  const [savingName,         setSavingName]         = useState(false);
  const [showAvatarModal,    setShowAvatarModal]    = useState(false);
  const [deletingAccount,    setDeletingAccount]    = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [voiceUsage,         setVoiceUsage]         = useState<LiveVoiceStatus | null>(null);
  const [audioPrefs,         setAudioPrefs]         = useState<AudioPreferences>(getAudioPreferences());
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadAudioPreferences().then(setAudioPrefs).catch(() => {});
    const unsub = subscribeAudioPreferences(setAudioPrefs);
    return unsub;
  }, []);

  const togglePref = (key: keyof AudioPreferences) => (v: boolean) => {
    setAudioPreference(key, v).catch(() => {});
  };

  useFocusEffect(useCallback(() => {
    setNameValue(profile?.name ?? '');
    // Passa o id da sessão pra evitar o auth.getUser() de rede (frágil).
    getLiveVoiceStatus(level, profile?.id).then(setVoiceUsage).catch(() => {});
  }, [profile?.name, profile?.id, level]));

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === profile?.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await supabase.from('charlotte_users').update({ name: trimmed }).eq('id', profile?.id ?? '');
      await refreshProfile();
      setEditingName(false);
    } catch {
      Alert.alert(isPt ? 'Erro' : 'Error', isPt ? 'Não foi possível salvar.' : 'Could not save.');
    } finally {
      setSavingName(false);
    }
  };

  const handleRetakePlacementTest = () => {
    Alert.alert(
      isPt ? 'Refazer teste de nível' : 'Retake placement test',
      isPt ? 'Isso vai sobrescrever seu nível atual. Deseja continuar?' : 'This will override your current level. Continue?',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Refazer' : 'Retake',
          onPress: () => {
            if (!profile?.id) return;
            // Fase 1: o placement é opcional e navegamos direto (não há mais
            // gate por placement_test_done). direct=1 pula o intro (o usuário
            // já escolheu refazer). Ao concluir, seta nível + placement_test_done.
            router.push('/(app)/placement-test?direct=1');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      isPt ? 'Excluir minha conta' : 'Delete my account',
      isPt
        ? 'Todos os seus dados serão excluídos permanentemente. Essa ação NÃO pode ser desfeita.'
        : 'All your data will be permanently deleted. This action CANNOT be undone.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Sim, excluir tudo' : 'Yes, delete everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              isPt ? 'Tem certeza?' : 'Are you sure?',
              isPt ? 'Última chance. Sua conta e todos os dados serão apagados para sempre.' : 'Last chance. Your account and all data will be erased forever.',
              [
                { text: isPt ? 'Não, manter' : 'No, keep it', style: 'cancel' },
                {
                  text: isPt ? 'Excluir definitivamente' : 'Delete permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) throw new Error('No session');
                      const res = await fetch(`${API_BASE_URL}/api/delete-account`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      });
                      if (!res.ok) throw new Error('Delete failed');
                      await signOut();
                    } catch {
                      Alert.alert(isPt ? 'Erro' : 'Error', isPt ? 'Não foi possível excluir. Tente novamente.' : 'Could not delete. Try again.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    const r = await restorePurchases();
    await refreshProfile();
    setRestoringPurchases(false);

    if (r.hasPremium) {
      Alert.alert(isPt ? 'Compras restauradas' : 'Purchases restored', isPt ? 'Sua assinatura foi atualizada.' : 'Your subscription has been updated.');
      return;
    }
    const supportEmail = 'suporte@queizy.com';
    const subject = encodeURIComponent(isPt ? 'Restaurar compra' : 'Restore purchase');
    const body    = encodeURIComponent(isPt ? `Olá! Tentei restaurar minha assinatura.\n\nMeu email: ${profile?.email ?? ''}` : `Hi! I tried to restore my subscription.\n\nMy email: ${profile?.email ?? ''}`);
    Alert.alert(
      isPt ? 'Nenhuma assinatura encontrada' : 'No subscription found',
      isPt ? 'Não encontramos assinatura vinculada a este usuário. Entre em contato com o suporte.' : 'No subscription found for this account. Please contact support.',
      [{ text: 'OK' }, { text: isPt ? 'Falar com suporte' : 'Contact support', onPress: () => Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`) }],
    );
  };

  const handleManageSubscription = async () => {
    const r = await openManageSubscriptions();
    if (r.ok) return;
    // Fallback: abrir a pagina de assinaturas da loja direto.
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {
      Alert.alert(
        isPt ? 'Não foi possível abrir' : 'Could not open',
        isPt ? 'Abra a loja de apps e gerencie a assinatura por lá.' : 'Open your app store and manage the subscription there.',
      );
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      isPt ? 'Sair da conta' : 'Sign out',
      isPt ? 'Tem certeza que deseja sair?' : 'Are you sure you want to sign out?',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: isPt ? 'Sair' : 'Sign out', style: 'destructive', onPress: () => { signOut().catch(console.error); } },
      ],
    );
  };

  const subscriptionStatus = profile?.subscription_status ?? 'none';
  const isActive           = profile?.is_active;
  const isInstitutional    = !!profile?.is_institutional;

  const accessLabel = (() => {
    // Institucional tem acesso garantido — checar ANTES de is_active (senao
    // um institucional com is_active=false aparecia como "Inativa").
    if (isInstitutional)                       return { text: isPt ? 'Institucional' : 'Institutional', color: C.greenDark };
    if (!isActive)                             return { text: isPt ? 'Inativa'       : 'Inactive',      color: C.error };
    if (subscriptionStatus === 'active')       return { text: isPt ? 'Ativa'         : 'Active',        color: C.greenDark };
    // 'cancelled' = auto-renew desligado mas acesso valido ate expires_at.
    if (subscriptionStatus === 'cancelled')    return { text: isPt ? 'Ativa · cancelada' : 'Active · cancelling', color: C.error };
    if (subscriptionStatus === 'trial')        return { text: 'Trial',                                  color: C.violet };
    if (subscriptionStatus === 'expired')      return { text: isPt ? 'Expirada'      : 'Expired',       color: C.error };
    return                                            { text: isPt ? 'Sem acesso'    : 'No access',     color: C.error };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, height: 52, // mesma altura do HeaderPills (logo não pula)
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <AppText display style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Perfil' : 'Profile'}
          </AppText>
          <HeaderLogo />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cartão do aluno */}
        <View style={{ backgroundColor: C.navy, borderRadius: 24, padding: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAvatarModal(true)}>
              <View style={{
                width: 76, height: 76, borderRadius: 38,
                backgroundColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 76, height: 76 }} />
                ) : (
                  <User size={32} color="rgba(255,255,255,0.7)" weight="regular" />
                )}
              </View>
              <View style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: C.volt,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.navy,
              }}>
                <PencilSimple size={12} color={C.navy} weight="bold" />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1, gap: 2 }}>
              {editingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    ref={nameInputRef}
                    value={nameValue}
                    onChangeText={setNameValue}
                    style={{
                      flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF',
                      backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12,
                      paddingHorizontal: 12, paddingVertical: 8,
                    }}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    maxLength={50}
                    selectionColor={C.volt}
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    style={{ backgroundColor: C.volt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}
                  >
                    {savingName
                      ? <ActivityIndicator size={14} color={C.navy} />
                      : <AppText style={{ color: C.navy, fontSize: 13, fontWeight: '800' }}>{isPt ? 'Salvar' : 'Save'}</AppText>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <AppText display style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', flexShrink: 1 }} numberOfLines={1}>
                    {profile?.name ?? profile?.email?.split('@')[0] ?? '—'}
                  </AppText>
                  <PencilSimple size={15} color="rgba(255,255,255,0.6)" weight="bold" />
                </TouchableOpacity>
              )}

              <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>
                {profile?.email ?? ''}
              </AppText>

              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: C.volt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '800', color: C.navy }}>{level}</AppText>
                </View>
                <View style={{ backgroundColor: accessLabel.color === C.error ? C.pink : 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{accessLabel.text}</AppText>
                </View>
              </View>
            </View>
          </View>

          {/* Live Voice do mês dentro do cartão */}
          {voiceUsage !== null && voiceUsage.poolTotal > 0 && (
            <View style={{ marginTop: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Microphone size={15} color={C.volt} weight="fill" />
                <AppText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isPt ? 'Live Voice este mês' : 'Live Voice this month'}
                </AppText>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
                  {voiceUsage.isUnlimited
                    ? (isPt ? 'Ilimitado' : 'Unlimited')
                    : `${Math.min(Math.ceil(voiceUsage.secondsUsed / 60), Math.floor(voiceUsage.poolTotal / 60))} / ${Math.floor(voiceUsage.poolTotal / 60)} min`}
                </AppText>
              </View>
              {!voiceUsage.isUnlimited && (
                <QueizyWave progress={voiceUsage.secondsUsed / voiceUsage.poolTotal} height={12} strokeWidth={3.5} doneColor="#2BD97C" />
              )}
              <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                {isPt
                  ? `Renova em 1/${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getMonth() + 1).padStart(2, '0')}`
                  : `Resets ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
              </AppText>
            </View>
          )}
        </View>

        <AvatarCropModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          userId={profile?.id ?? ''}
          currentAvatarUrl={profile?.avatar_url}
          onSaved={() => { setShowAvatarModal(false); refreshProfile(); }}
        />

        {/* Account */}
        <SectionTitle label={isPt ? 'Conta' : 'Account'} />
        <SettingGroup>
          <SettingRow
            icon={<Key size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Alterar senha' : 'Change password'}
            onPress={() => router.push('/(app)/change-password')}
            chevron
          />
          <SettingRow
            icon={<GraduationCap size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Refazer teste de nível' : 'Retake placement test'}
            onPress={handleRetakePlacementTest}
            chevron
          />
        </SettingGroup>

        {/* Preferences */}
        <SectionTitle label={isPt ? 'Preferências' : 'Preferences'} />
        <SettingGroup>
          <SwitchRow
            icon={<SpeakerHigh size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Sons' : 'Sounds'}
            description={isPt ? 'Efeitos de acerto, erro e conquistas.' : 'Sound effects for correct, wrong and achievements.'}
            value={audioPrefs.sfx}
            onValueChange={togglePref('sfx')}
          />
          <SwitchRow
            icon={<Vibrate size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Vibração' : 'Haptics'}
            description={isPt ? 'Feedback tátil ao interagir com o app.' : 'Tactile feedback when interacting.'}
            value={audioPrefs.haptic}
            onValueChange={togglePref('haptic')}
          />
          <SwitchRow
            icon={<ChatCircleText size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Voz da Charlotte' : "Charlotte's voice cues"}
            description={isPt ? 'Reações curtas em momentos especiais (não afeta a Charlotte no chat).' : 'Short reactions in special moments (does not affect Charlotte in chat).'}
            value={audioPrefs.voice}
            onValueChange={togglePref('voice')}
          />
        </SettingGroup>

        {/* Subscription */}
        {!profile?.is_institutional && (
          <>
            <SectionTitle label={isPt ? 'Assinatura' : 'Subscription'} />
            <SettingGroup>
              <SettingRow
                icon={<CreditCard size={18} color={C.navy} weight="regular" />}
                label={isPt ? 'Gerenciar assinatura' : 'Manage subscription'}
                onPress={handleManageSubscription}
                chevron
              />
              <SettingRow
                icon={restoringPurchases
                  ? <ActivityIndicator size={18} color={C.navy} />
                  : <ArrowsClockwise size={18} color={C.navy} weight="regular" />}
                label={isPt ? 'Restaurar compras' : 'Restore purchases'}
                onPress={restoringPurchases ? undefined : handleRestorePurchases}
                chevron
              />
            </SettingGroup>
          </>
        )}

        {/* Comunidade */}
        <SectionTitle label={isPt ? 'Comunidade' : 'Community'} />
        <SettingGroup>
          <SettingRow
            icon={<UsersThree size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Estudar junto' : 'Study together'}
            onPress={() => router.push('/(app)/study-together' as any)}
            chevron
          />
        </SettingGroup>

        {/* Help */}
        <SectionTitle label={isPt ? 'Ajuda' : 'Help'} />
        <SettingGroup>
          <SettingRow
            icon={<Lifebuoy size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Ajuda e suporte' : 'Help & support'}
            onPress={() => router.push('/(app)/support' as any)}
            chevron
          />
        </SettingGroup>

        {/* Legal */}
        <SectionTitle label="Legal" />
        <SettingGroup>
          <SettingRow
            icon={<ShieldWarning size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            onPress={() => openLink('https://queizy.com/privacidade')}
            chevron
          />
          <SettingRow
            icon={<FileText size={18} color={C.navy} weight="regular" />}
            label={isPt ? 'Termos de Uso' : 'Terms of Use'}
            onPress={() => openLink('https://queizy.com/termos')}
            chevron
          />
        </SettingGroup>

        {/* About */}
        <SectionTitle label={isPt ? 'Sobre' : 'About'} />
        <SettingGroup>
          <SettingRow
            icon={<DeviceMobile size={18} color={C.navy} weight="regular" />}
            label="Queizy"
            value={`v${Constants.expoConfig?.version ?? '1.0.0'}`}
          />
          <SettingRow
            icon={<Buildings size={18} color={C.navy} weight="regular" />}
            label="Hub Academy"
          />
        </SettingGroup>

        {/* Session */}
        <SectionTitle label={isPt ? 'Sessão' : 'Session'} />
        <SettingGroup>
          <SettingRow
            icon={<SignOut size={18} color={C.error} weight="regular" />}
            label={isPt ? 'Sair da conta' : 'Sign out'}
            onPress={handleSignOut}
            destructive
            chevron
          />
          <SettingRow
            icon={deletingAccount
              ? <ActivityIndicator size={18} color={C.error} />
              : <Trash size={18} color={C.error} weight="regular" />}
            label={isPt ? 'Excluir minha conta' : 'Delete my account'}
            onPress={deletingAccount ? undefined : handleDeleteAccount}
            destructive
            chevron
          />
        </SettingGroup>

        {/* Versão já aparece em Sobre; aqui só o id do OTA para admin. */}
        <View style={{ paddingVertical: 28, alignItems: 'center', gap: 4 }}>
          {profile?.is_admin && (
            <AppText style={{ fontSize: 10, color: C.navyLight, opacity: 0.6, letterSpacing: 0.2 }}>
              {`OTA: ${Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'}`}
            </AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
