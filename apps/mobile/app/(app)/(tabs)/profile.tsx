// app/(app)/(tabs)/profile.tsx
// Profile tab — avatar, editable name, read-only email, level badge, settings.

import React, { useState, useRef, useCallback } from 'react';
import {
  View, ScrollView, TouchableOpacity, Alert, Platform,
  Linking, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  User, Key, DeviceMobile, GraduationCap, Buildings,
  SignOut, ShieldCheck, CheckCircle, Microphone, FileText,
  ShieldWarning, ArrowsClockwise, Trash, PencilSimple,
  CaretRight, Play,
} from 'phosphor-react-native';
import { useTour } from '@/lib/tourContext';
import { openLink } from '@/lib/openLink';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { restorePurchases } from '@/lib/purchases';
import { getLiveVoiceStatus, LiveVoiceStatus } from '@/lib/liveVoiceUsage';
import { LEVEL_CONFIG, UserLevel } from '@/lib/levelConfig';
import AvatarCropModal from '@/components/ui/AvatarCropModal';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.08)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  error:     '#DC2626',
  inputBg:   '#ECEAF5',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
}) as object;

const LEVEL_ACCENT: Record<UserLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};
const LEVEL_ACCENT_BG: Record<UserLevel, string> = {
  Novice:   '#FFFBEB',
  Inter:    '#F5F3FF',
  Advanced: '#F0FDFA',
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

// Row inside a SettingGroup card — no own card styling
function SettingRow({ icon, label, value, valueColor, onPress, destructive = false, chevron }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 14,
        minHeight: 52,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 22, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <AppText style={{ fontSize: 14, fontWeight: '600', color: destructive ? C.error : C.navy }}>
          {label}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {!!value && (
          <AppText style={{ fontSize: 13, color: valueColor ?? C.navyLight, fontWeight: '600' }}>
            {value}
          </AppText>
        )}
        {(chevron || (!!onPress && !value)) && (
          <CaretRight size={15} color={C.navyLight} weight="bold" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Card wrapper that groups multiple SettingRows with dividers
function SettingGroup({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children);
  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      overflow: 'hidden', marginBottom: 8, ...cardShadow,
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
    <AppText style={{
      fontSize: 11, fontWeight: '700', color: C.navyLight,
      letterSpacing: 0.8, textTransform: 'uppercase',
      marginTop: 22, marginBottom: 8, paddingHorizontal: 2,
    }}>
      {label}
    </AppText>
  );
}

export default function ProfileTab() {
  const { profile, signOut, refreshProfile } = useAuth();
  const level  = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const isPt   = level === 'Novice';
  const { resetTour } = useTour();

  const accent   = LEVEL_ACCENT[level];
  const accentBg = LEVEL_ACCENT_BG[level];

  const [editingName,        setEditingName]        = useState(false);
  const [nameValue,          setNameValue]          = useState(profile?.name ?? '');
  const [savingName,         setSavingName]         = useState(false);
  const [showAvatarModal,    setShowAvatarModal]    = useState(false);
  const [deletingAccount,    setDeletingAccount]    = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [voiceUsage,         setVoiceUsage]         = useState<LiveVoiceStatus | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => {
    setNameValue(profile?.name ?? '');
    getLiveVoiceStatus(level).then(setVoiceUsage).catch(() => {});
  }, [profile?.name, level]));

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
          onPress: async () => {
            if (!profile?.id) return;
            await supabase.from('charlotte_users').update({ placement_test_done: false }).eq('id', profile.id);
            await refreshProfile();
            router.push('/(app)/placement-test');
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
    const supportEmail = 'suporte@hubacademybr.com';
    const subject = encodeURIComponent(isPt ? 'Restaurar compra' : 'Restore purchase');
    const body    = encodeURIComponent(isPt ? `Olá! Tentei restaurar minha assinatura.\n\nMeu email: ${profile?.email ?? ''}` : `Hi! I tried to restore my subscription.\n\nMy email: ${profile?.email ?? ''}`);
    Alert.alert(
      isPt ? 'Nenhuma assinatura encontrada' : 'No subscription found',
      isPt ? 'Não encontramos assinatura vinculada a este usuário. Entre em contato com o suporte.' : 'No subscription found for this account. Please contact support.',
      [{ text: 'OK' }, { text: isPt ? 'Falar com suporte' : 'Contact support', onPress: () => Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`) }],
    );
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
    if (!isActive)                             return { text: isPt ? 'Inativa'       : 'Inactive',      color: C.error };
    if (isInstitutional)                       return { text: isPt ? 'Institucional' : 'Institutional', color: C.greenDark };
    if (subscriptionStatus === 'active')       return { text: isPt ? 'Ativa'         : 'Active',        color: C.greenDark };
    if (subscriptionStatus === 'trial')        return { text: 'Trial',                                  color: '#1D4ED8' };
    if (subscriptionStatus === 'expired')      return { text: isPt ? 'Expirada'      : 'Expired',       color: C.error };
    return                                            { text: isPt ? 'Sem acesso'    : 'No access',     color: C.error };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy }}>
            {isPt ? 'Perfil' : 'Profile'}
          </AppText>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* User card */}
        <View style={{
          backgroundColor: C.card, borderRadius: 20,
          padding: 18, marginTop: 16,
          borderWidth: 1, borderColor: `${accent}25`,
          ...cardShadow,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAvatarModal(true)} style={{ position: 'relative' }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: accentBg,
                borderWidth: 2, borderColor: accent,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 64, height: 64 }} />
                ) : (
                  <User size={28} color={accent} weight="regular" />
                )}
              </View>
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: C.navy,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: C.card,
              }}>
                <PencilSimple size={11} color="#FFF" weight="fill" />
              </View>
            </TouchableOpacity>

            {/* Name + email */}
            <View style={{ flex: 1, gap: 4 }}>
              {editingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    ref={nameInputRef}
                    value={nameValue}
                    onChangeText={setNameValue}
                    style={{
                      flex: 1, fontSize: 15, fontWeight: '700', color: C.navy,
                      backgroundColor: C.inputBg, borderRadius: 10,
                      paddingHorizontal: 10, paddingVertical: 6,
                    }}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    maxLength={50}
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    style={{
                      backgroundColor: accent, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 7,
                    }}
                  >
                    {savingName
                      ? <ActivityIndicator size={14} color="#FFF" />
                      : <AppText style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{isPt ? 'Salvar' : 'Save'}</AppText>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }} numberOfLines={1}>
                    {profile?.name ?? profile?.email?.split('@')[0] ?? '—'}
                  </AppText>
                  <PencilSimple size={14} color={C.navyLight} weight="fill" />
                </TouchableOpacity>
              )}

              <AppText style={{ fontSize: 12, color: C.navyLight }} numberOfLines={1}>
                {profile?.email ?? ''}
              </AppText>

              {/* Level badge */}
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: accentBg,
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
                marginTop: 2,
              }}>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: accent }}>
                  {level}
                </AppText>
              </View>
            </View>
          </View>
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
            icon={<ShieldCheck size={18} color={accessLabel.color} weight="regular" />}
            label={isPt ? 'Acesso' : 'Access'}
            value={accessLabel.text}
            valueColor={accessLabel.color}
          />
          <SettingRow
            icon={<Key size={18} color={C.navyMid} weight="regular" />}
            label={isPt ? 'Alterar senha' : 'Change password'}
            onPress={() => router.push('/(app)/change-password')}
            chevron
          />
          <SettingRow
            icon={<GraduationCap size={18} color={accent} weight="regular" />}
            label={isPt ? 'Refazer teste de nível' : 'Retake placement test'}
            onPress={handleRetakePlacementTest}
            chevron
          />
        </SettingGroup>

        {/* Subscription */}
        {!profile?.is_institutional && (
          <>
            <SectionTitle label={isPt ? 'Assinatura' : 'Subscription'} />
            <SettingGroup>
              <SettingRow
                icon={restoringPurchases
                  ? <ActivityIndicator size={18} color={C.navyMid} />
                  : <ArrowsClockwise size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Restaurar compras' : 'Restore purchases'}
                onPress={restoringPurchases ? undefined : handleRestorePurchases}
                chevron
              />
            </SettingGroup>
          </>
        )}

        {/* Usage — Inter and Advanced only */}
        {voiceUsage !== null && voiceUsage.poolTotal > 0 && level !== 'Novice' && (
          <>
            <SectionTitle label={isPt ? 'Uso' : 'Usage'} />
            <View style={{
              backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
              borderColor: C.border, padding: 16, marginBottom: 8, ...cardShadow,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 9,
                  backgroundColor: 'rgba(22,21,58,0.05)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Microphone size={18} color={C.navyMid} weight="regular" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 14, fontWeight: '600', color: C.navy }}>
                    {isPt ? 'Live Voice este mês' : 'Live Voice this month'}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: C.navyLight, marginTop: 2 }}>
                    {voiceUsage.isUnlimited
                      ? (isPt ? 'Ilimitado' : 'Unlimited')
                      : `${Math.min(Math.ceil(voiceUsage.secondsUsed / 60), Math.floor(voiceUsage.poolTotal / 60))} / ${Math.floor(voiceUsage.poolTotal / 60)} min ${isPt ? 'utilizados' : 'used'}`}
                  </AppText>
                </View>
              </View>
              {!voiceUsage.isUnlimited && (
                <View style={{ height: 5, backgroundColor: 'rgba(22,21,58,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    height: 5, borderRadius: 3,
                    backgroundColor: voiceUsage.secondsRemaining < 60 ? C.error : voiceUsage.secondsRemaining < 120 ? '#F97316' : C.greenDark,
                    width: `${Math.min(100, (voiceUsage.secondsUsed / voiceUsage.poolTotal) * 100)}%` as `${number}%`,
                  }} />
                </View>
              )}
              <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 6 }}>
                {isPt
                  ? `Renova em 1/${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getMonth() + 1).padStart(2, '0')}`
                  : `Resets ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
              </AppText>
            </View>
          </>
        )}

        {/* Beta features */}
        {profile?.beta_features?.includes('karaoke') && (
          <>
            <SectionTitle label="Beta" />
            <SettingGroup>
              <SettingRow
                icon={<Microphone size={18} color={C.navyMid} weight="regular" />}
                label="Read Aloud (Karaoke)"
                onPress={() => router.push('/(app)/karaoke-exercise' as any)}
                chevron
              />
            </SettingGroup>
          </>
        )}

        {/* Tour — admin only */}
        {profile?.is_admin && (
          <>
            <SectionTitle label="Tour" />
            <SettingGroup>
              <SettingRow
                icon={<Play size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Refazer tour da Home' : 'Replay Home tour'}
                onPress={async () => { await resetTour('HOME'); }}
                chevron
              />
              <SettingRow
                icon={<Play size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Refazer tour da Sessão' : 'Replay Learn Session tour'}
                onPress={async () => { await resetTour('learn-session-grammar'); await resetTour('learn-session-pron'); }}
                chevron
              />
              <SettingRow
                icon={<Play size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Refazer tour do Vocab Review' : 'Replay Vocab Review tour'}
                onPress={async () => { await resetTour('vocab-review'); }}
                chevron
              />
              <SettingRow
                icon={<Play size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Refazer tour da Trilha' : 'Replay Trail tour'}
                onPress={async () => { await resetTour('learn-trail'); }}
                chevron
              />
              <SettingRow
                icon={<Play size={18} color={C.navyMid} weight="regular" />}
                label={isPt ? 'Refazer tour do Vocabulário' : 'Replay Vocabulary tour'}
                onPress={async () => { await resetTour('my-vocabulary'); }}
                chevron
              />
            </SettingGroup>
          </>
        )}

        {/* Legal */}
        <SectionTitle label="Legal" />
        <SettingGroup>
          <SettingRow
            icon={<ShieldWarning size={18} color={C.navyMid} weight="regular" />}
            label={isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            onPress={() => openLink('https://charlotte.hubacademybr.com/privacidade')}
            chevron
          />
          <SettingRow
            icon={<FileText size={18} color={C.navyMid} weight="regular" />}
            label={isPt ? 'Termos de Uso' : 'Terms of Use'}
            onPress={() => openLink('https://charlotte.hubacademybr.com/termos')}
            chevron
          />
        </SettingGroup>

        {/* About */}
        <SectionTitle label={isPt ? 'Sobre' : 'About'} />
        <SettingGroup>
          <SettingRow
            icon={<DeviceMobile size={18} color={C.navyMid} weight="regular" />}
            label="Charlotte"
            value={`v${Constants.expoConfig?.version ?? '1.0.0'}`}
          />
          <SettingRow
            icon={<Buildings size={18} color={C.navyMid} weight="regular" />}
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

        <View style={{ paddingVertical: 28, alignItems: 'center', gap: 4 }}>
          <AppText style={{ fontSize: 11, color: C.navyLight, letterSpacing: 0.2 }}>
            {`Charlotte AI v${Constants.expoConfig?.version ?? '1.0.0'}`}
          </AppText>
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
