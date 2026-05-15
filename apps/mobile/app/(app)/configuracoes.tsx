// configuracoes.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Platform, Linking, ActivityIndicator, Image, Switch } from 'react-native';
import { openLink } from '@/lib/openLink';
import {
  loadAudioPreferences,
  getAudioPreferences,
  setAudioPreference,
  subscribeAudioPreferences,
  type AudioPreferences,
} from '@/lib/audioPreferences';
import AvatarCropModal from '@/components/ui/AvatarCropModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretRight,
  User,
  Key,
  DeviceMobile,
  GraduationCap,
  Buildings,
  SignOut,
  ShieldCheck,
  CheckCircle,
  Microphone,
  FileText,
  ShieldWarning,
  ArrowsClockwise,
  Trash,
  PencilSimple,
  BookOpen,
  Play,
  SpeakerHigh,
  Vibrate,
  ChatCircleText,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { restorePurchases } from '@/lib/purchases';
import { getLiveVoiceStatus, LiveVoiceStatus } from '@/lib/liveVoiceUsage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// Light theme palette
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.07)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  error:     '#DC2626',
  shadow: Platform.select({
    ios: {
      shadowColor: 'rgba(22,21,58,0.08)',
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 3 },
  }),
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

function SettingRow({ icon, label, value, valueColor, onPress, destructive = false, chevron }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 15,
        backgroundColor: C.card,
        borderRadius: 14,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: C.border,
        minHeight: 52,
        ...C.shadow,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: destructive ? 'rgba(220,38,38,0.08)' : 'rgba(163,255,60,0.12)',
          alignItems: 'center', justifyContent: 'center',
        }}>
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

interface SwitchRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

function SwitchRow({ icon, label, description, value, onValueChange }: SwitchRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: C.card,
        borderRadius: 14,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: C.border,
        minHeight: 52,
        ...C.shadow,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: 'rgba(163,255,60,0.12)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 14, fontWeight: '600', color: C.navy }}>
            {label}
          </AppText>
          {!!description && (
            <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 2 }} numberOfLines={2}>
              {description}
            </AppText>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(22,21,58,0.15)', true: C.green }}
        thumbColor={Platform.OS === 'android' ? (value ? C.greenDark : '#FFF') : undefined}
        ios_backgroundColor="rgba(22,21,58,0.15)"
      />
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <AppText style={{
      fontSize: 11, fontWeight: '700', color: C.navyLight,
      letterSpacing: 0.8, textTransform: 'uppercase',
      marginTop: 22, marginBottom: 8, paddingHorizontal: 4,
    }}>
      {label}
    </AppText>
  );
}

export default function ConfiguracoesScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const isPt = (profile?.charlotte_level ?? 'Novice') === 'Novice';
  const [deletingAccount, setDeletingAccount]     = React.useState(false);
  const [restoringPurchases, setRestoringPurchases] = React.useState(false);
  const [voiceUsage, setVoiceUsage]               = React.useState<LiveVoiceStatus | null>(null);
  const [showAvatarModal, setShowAvatarModal]     = React.useState(false);
  const [audioPrefs, setAudioPrefs]               = React.useState<AudioPreferences>(getAudioPreferences());
  React.useEffect(() => {
    getLiveVoiceStatus(profile?.charlotte_level ?? undefined)
      .then(setVoiceUsage)
      .catch(() => {});
  }, [profile?.charlotte_level]);

  React.useEffect(() => {
    // Garante que o cache foi populado (caso a tela abra antes do boot terminar)
    loadAudioPreferences().then(setAudioPrefs).catch(() => {});
    const unsub = subscribeAudioPreferences(setAudioPrefs);
    return unsub;
  }, []);

  const togglePref = (key: keyof AudioPreferences) => (v: boolean) => {
    setAudioPreference(key, v).catch(() => {});
  };

  const handleRetakePlacementTest = () => {
    Alert.alert(
      isPt ? 'Refazer teste de nível' : 'Retake placement test',
      isPt
        ? 'Isso vai sobrescrever seu nível atual. Deseja continuar?'
        : 'This will override your current level. Continue?',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Refazer' : 'Retake',
          onPress: async () => {
            if (!profile?.id) return;
            await supabase
              .from('charlotte_users')
              .update({ placement_test_done: false })
              .eq('id', profile.id);
            await refreshProfile();
            router.push('/(app)/placement-test');
          },
        },
      ]
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
            // Dupla confirmação
            Alert.alert(
              isPt ? 'Tem certeza?' : 'Are you sure?',
              isPt
                ? 'Última chance. Sua conta e todos os dados serão apagados para sempre.'
                : 'Last chance. Your account and all data will be erased forever.',
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
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`,
                        },
                      });
                      if (!res.ok) throw new Error('Delete failed');
                      await signOut();
                    } catch (e: any) {
                      console.error('Delete account error:', e);
                      Alert.alert(
                        isPt ? 'Erro' : 'Error',
                        isPt ? 'Não foi possível excluir. Tente novamente ou entre em contato com o suporte.' : 'Could not delete. Try again or contact support.',
                      );
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    const r = await restorePurchases();
    await refreshProfile();
    setRestoringPurchases(false);

    if (r.hasPremium) {
      Alert.alert(
        isPt ? 'Compras restauradas' : 'Purchases restored',
        isPt ? 'Sua assinatura foi atualizada.' : 'Your subscription has been updated.',
      );
      return;
    }

    const isReceiptInUse = r.errorCode === 7;
    const supportEmail = 'suporte@hubacademybr.com';
    const subject = encodeURIComponent(
      isReceiptInUse
        ? (isPt ? 'Assinatura vinculada a outra conta' : 'Subscription linked to another account')
        : (isPt ? 'Restaurar compra' : 'Restore purchase'),
    );
    const body = encodeURIComponent(
      isPt
        ? `Olá! Tentei restaurar minha assinatura no app.\n\nMeu email Charlotte: ${profile?.email ?? ''}\n\nPode me ajudar?`
        : `Hi! I tried to restore my subscription in the app.\n\nMy Charlotte email: ${profile?.email ?? ''}\n\nCan you help?`,
    );

    Alert.alert(
      isReceiptInUse
        ? (isPt ? 'Assinatura vinculada a outra conta' : 'Subscription linked to another account')
        : (isPt ? 'Nenhuma assinatura encontrada nesta conta' : 'No subscription found for this account'),
      isReceiptInUse
        ? (isPt
            ? 'Esta conta Apple já tem uma assinatura Charlotte ativa em outro usuário. Entre com a conta Charlotte original ou fale com o suporte.'
            : 'This Apple account already has an active Charlotte subscription on another user. Sign in with the original Charlotte account or contact support.')
        : (isPt
            ? 'Não encontramos assinatura Charlotte vinculada a este usuário.\n\nSe você já comprou antes, pode ser que a assinatura esteja em outra conta Charlotte. Entre com a conta original ou fale com o suporte.'
            : 'No Charlotte subscription found for this user.\n\nIf you bought before, the subscription may be under another Charlotte account. Sign in with the original account or contact support.'),
      [
        { text: 'OK' },
        {
          text: isPt ? 'Falar com suporte' : 'Contact support',
          onPress: () => Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`),
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      isPt ? 'Sair da conta' : 'Sign out',
      isPt ? 'Tem certeza que deseja sair?' : 'Are you sure you want to sign out?',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Sair' : 'Sign out', style: 'destructive',
          onPress: () => { signOut().catch(console.error); },
        },
      ]
    );
  };

  const userLevel          = profile?.charlotte_level ?? '—';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 10, borderRadius: 20, marginRight: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isPt ? 'Voltar / Go back' : 'Go back'}
          accessibilityRole="button"
        >
          <CaretLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <AppText style={{ fontSize: 17, fontWeight: '700', color: C.navy }}>{isPt ? 'Configurações' : 'Settings'}</AppText>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.card,
          borderRadius: 18,
          padding: 16,
          marginTop: 16,
          marginBottom: 4,
          borderWidth: 1,
          borderColor: 'rgba(163,255,60,0.2)',
          gap: 14,
          ...C.shadow,
        }}>
          {/* Avatar with pencil badge */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAvatarModal(true)}
            style={{ position: 'relative' }}
          >
            <View style={{
              width: 58, height: 58, borderRadius: 29,
              backgroundColor: 'rgba(163,255,60,0.10)',
              borderWidth: 2, borderColor: C.green,
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 58, height: 58 }}
                />
              ) : (
                <User size={26} color={C.greenDark} weight="duotone" />
              )}
            </View>
            {/* Pencil badge */}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: C.navy,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: C.card,
            }}>
              <PencilSimple size={10} color="#FFF" weight="fill" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <AppText style={{ color: C.navy, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
              {profile?.name ?? profile?.email?.split('@')[0] ?? '—'}
            </AppText>
            <AppText style={{ color: C.navyLight, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {profile?.email ?? ''}
            </AppText>
          </View>
        </View>

        <AvatarCropModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          userId={profile?.id ?? ''}
          currentAvatarUrl={profile?.avatar_url}
          onSaved={(url) => {
            setShowAvatarModal(false);
            refreshProfile();
          }}
        />

        {/* Preferences */}
        <SectionTitle label={isPt ? 'Preferências' : 'Preferences'} />
        <SwitchRow
          icon={<SpeakerHigh size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Sons' : 'Sounds'}
          description={isPt ? 'Efeitos sonoros de acerto, erro e conquistas.' : 'Sound effects for correct, wrong and achievements.'}
          value={audioPrefs.sfx}
          onValueChange={togglePref('sfx')}
        />
        <SwitchRow
          icon={<Vibrate size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Vibração' : 'Haptics'}
          description={isPt ? 'Feedback tátil ao interagir com o app.' : 'Tactile feedback when interacting with the app.'}
          value={audioPrefs.haptic}
          onValueChange={togglePref('haptic')}
        />
        <SwitchRow
          icon={<ChatCircleText size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Voz da Charlotte' : "Charlotte's voice cues"}
          description={isPt ? 'Reações curtas em momentos especiais (não afeta a Charlotte no chat).' : 'Short reactions in special moments (does not affect Charlotte in chat).'}
          value={audioPrefs.voice}
          onValueChange={togglePref('voice')}
        />

        {/* Account */}
        <SectionTitle label={isPt ? 'Conta' : 'Account'} />
        <SettingRow
          icon={<ShieldCheck size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Nível' : 'Level'}
          value={userLevel}
        />
        <SettingRow
          icon={<CheckCircle size={18} color={accessLabel.color} weight="duotone" />}
          label={isPt ? 'Acesso' : 'Access'}
          value={accessLabel.text}
          valueColor={accessLabel.color}
        />
        <SettingRow
          icon={<Key size={18} color={C.navyMid} weight="duotone" />}
          label={isPt ? 'Alterar senha' : 'Change password'}
          onPress={() => router.push('/(app)/change-password')}
          chevron
        />
        <SettingRow
          icon={<GraduationCap size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Refazer teste de nível' : 'Retake placement test'}
          onPress={handleRetakePlacementTest}
          chevron
        />
        <SettingRow
          icon={<BookOpen size={18} color={C.greenDark} weight="duotone" />}
          label={isPt ? 'Meu Vocabulário' : 'My Vocabulary'}
          onPress={() => router.push('/(app)/my-vocabulary')}
          chevron
        />

        {/* Assinatura — oculto para usuários institucionais (sem acesso via loja) */}
        {!profile?.is_institutional && (
          <>
            <SectionTitle label={isPt ? 'Assinatura' : 'Subscription'} />
            <SettingRow
              icon={restoringPurchases
                ? <ActivityIndicator size={18} color={C.navyMid} />
                : <ArrowsClockwise size={18} color={C.navyMid} weight="duotone" />}
              label={isPt ? 'Restaurar compras' : 'Restore purchases'}
              onPress={restoringPurchases ? undefined : handleRestorePurchases}
              chevron
            />
          </>
        )}

        {/* Uso — só para Inter e Advanced (Novice não tem Live Voice) */}
        {voiceUsage !== null && voiceUsage.poolTotal > 0 && profile?.charlotte_level !== 'Novice' && (
          <>
            <SectionTitle label={isPt ? 'Uso' : 'Usage'} />
            <View style={{
              backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
              borderColor: C.border, padding: 14, marginBottom: 6, ...C.shadow,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: 'rgba(163,255,60,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Microphone size={18} color={C.greenDark} weight="duotone" />
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
              {/* Progress bar — oculta para usuários ilimitados */}
              {!voiceUsage.isUnlimited && (
                <View style={{ height: 5, backgroundColor: 'rgba(22,21,58,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    height: 5, borderRadius: 3,
                    backgroundColor: voiceUsage.secondsRemaining < 60 ? C.error
                      : voiceUsage.secondsRemaining < 120 ? '#F97316'
                      : C.greenDark,
                    width: `${Math.min(100, (voiceUsage.secondsUsed / voiceUsage.poolTotal) * 100)}%` as `${number}%`,
                  }} />
                </View>
              )}
              <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 6 }}>
                {isPt
                  ? `Renova em 1/${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getMonth() + 1).padStart(2,'0')}`
                  : `Resets ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
                }
              </AppText>
            </View>
          </>
        )}

        {/* Beta features */}
        {profile?.beta_features?.includes('karaoke') && (
          <>
            <SectionTitle label="Beta" />
            <SettingRow
              icon={<Microphone size={18} color={C.greenDark} weight="duotone" />}
              label="Read Aloud (Karaoke)"
              onPress={() => router.push('/(app)/karaoke-exercise' as any)}
              chevron
            />
          </>
        )}

        {/* Legal */}
        <SectionTitle label="Legal" />
        <SettingRow
          icon={<ShieldWarning size={18} color={C.navyMid} weight="duotone" />}
          label={isPt ? 'Política de Privacidade' : 'Privacy Policy'}
          onPress={() => openLink('https://charlotte.hubacademybr.com/privacidade')}
          chevron
        />
        <SettingRow
          icon={<FileText size={18} color={C.navyMid} weight="duotone" />}
          label={isPt ? 'Termos de Uso' : 'Terms of Use'}
          onPress={() => openLink('https://charlotte.hubacademybr.com/termos')}
          chevron
        />

        {/* About */}
        <SectionTitle label={isPt ? 'Sobre' : 'About'} />
        <SettingRow
          icon={<DeviceMobile size={18} color={C.navyMid} weight="duotone" />}
          label="Charlotte"
          value="v1.0.0"
        />
        <SettingRow
          icon={<Buildings size={18} color={C.navyMid} weight="duotone" />}
          label="Hub Academy"
        />

        {/* Session */}
        <SectionTitle label={isPt ? 'Sessão' : 'Session'} />
        <SettingRow
          icon={<SignOut size={18} color={C.error} weight="duotone" />}
          label={isPt ? 'Sair da conta' : 'Sign out'}
          onPress={handleSignOut}
          destructive
          chevron
        />
        <SettingRow
          icon={deletingAccount
            ? <ActivityIndicator size={18} color={C.error} />
            : <Trash size={18} color={C.error} weight="duotone" />}
          label={isPt ? 'Excluir minha conta' : 'Delete my account'}
          onPress={deletingAccount ? undefined : handleDeleteAccount}
          destructive
          chevron
        />

        {/* Version footer */}
        <View style={{ paddingVertical: 32, alignItems: 'center', gap: 4 }}>
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
    </SafeAreaView>
  );
}
