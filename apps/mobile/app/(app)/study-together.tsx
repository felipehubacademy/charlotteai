// Estudar junto — convite pessoal, dupla de estudo (XP da semana lado a lado),
// cutucadas com mensagens prontas, rallies (disputas de 24h/7 dias) e o badge
// de Padrinho/Madrinha.

import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Users, HandWaving, Crown, Lightning, Gift, PencilSimple } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, ScreenHeader, SectionTitle, Card } from '@/components/stats/StatsUI';
import { ShareCardModal, ShareCardContent } from '@/components/share/ShareCardModal';
import { RallySection } from '@/components/rally/RallySection';
import { FriendSearchEntry } from '@/components/social/FriendSearch';
import { FriendRequests } from '@/components/social/FriendRequests';
import { fetchMyHandle, setUsername } from '@/lib/friends';
import { systemIsPt } from '@/lib/systemLang';
import {
  fetchReferral, claimInvite, nudgeBuddy, normalizeCode,
  ReferralInfo, Buddy, NUDGE_KEYS, NudgeKey, SPONSOR_TIERS,
} from '@/lib/referral';

const NUDGE_TEXT: Record<NudgeKey, { pt: string; en: string }> = {
  study:   { pt: 'Bora estudar hoje?', en: "Let's study today?" },
  cheer:   { pt: 'Você tá mandando bem, continua!', en: "You're doing great, keep going!" },
  chasing: { pt: 'Tô chegando no seu XP desta semana!', en: "I'm catching up on your XP this week!" },
  miss:    { pt: 'Senti sua falta nos estudos!', en: 'I missed you in our study sessions!' },
};

const CLAIM_ERROR: Record<string, { pt: string; en: string }> = {
  invalid_code:    { pt: 'Código não encontrado.', en: 'Code not found.' },
  own_code:        { pt: 'Esse é o seu próprio código.', en: "That's your own code." },
  too_late:        { pt: 'Convites valem nos primeiros 14 dias de conta.', en: 'Invites work in the first 14 days of an account.' },
  already_claimed: { pt: 'Você já entrou com um convite.', en: 'You already joined with an invite.' },
  already_buddies: { pt: 'Vocês já estudam juntos.', en: "You're already study buddies." },
};

function sponsorTier(n: number) {
  const reached = SPONSOR_TIERS.filter(t => n >= t).length;
  const next = SPONSOR_TIERS.find(t => n < t) ?? null;
  return { reached, next };
}

function Avatar({ uri, name, size = 44 }: { uri: string | null; name: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontSize: size * 0.4, fontWeight: '800', color: C.ink }}>{(name ?? '?').charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

export default function StudyTogetherScreen() {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [nudgeFor, setNudgeFor] = useState<Buddy | null>(null);
  const [share, setShare] = useState<ShareCardContent | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState('');
  const [handleErr, setHandleErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ref, me] = await Promise.all([fetchReferral(), fetchMyHandle()]);
    setInfo(ref);
    if (me?.username) setHandle(me.username);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async () => {
    const c = normalizeCode(code);
    if (!c) return;
    setClaiming(true); setClaimMsg(null);
    const r = await claimInvite(c);
    setClaiming(false);
    if (r.ok) {
      setClaimMsg({ ok: true, text: t(`Pronto! Você e ${r.inviter ?? 'sua dupla'} agora estudam juntos. +${r.rewardMinutes} min de Live Voice.`, `Done! You and ${r.inviter ?? 'your buddy'} are now study buddies. +${r.rewardMinutes} Live Voice min.`) });
      setCode(''); load();
    } else {
      const e = CLAIM_ERROR[r.error];
      setClaimMsg({ ok: false, text: e ? t(e.pt, e.en) : t('Não foi possível usar o código.', "Couldn't use the code.") });
    }
  };

  const sendNudge = async (b: Buddy, key: NudgeKey) => {
    setNudgeFor(null);
    setInfo(prev => prev ? { ...prev, buddies: prev.buddies.map(x => x.id === b.id ? { ...x, nudgedToday: true } : x) } : prev);
    await nudgeBuddy(b.id, key);
  };

  const saveHandle = async () => {
    setHandleErr(null);
    const r = await setUsername(handleDraft);
    if (r.ok && r.username) { setHandle(r.username); setEditingHandle(false); return; }
    setHandleErr(r.error === 'username_taken'
      ? t('Esse @ já está em uso. Tente outro.', 'That @ is taken. Try another.')
      : t('Use de 3 a 20 letras, números, ponto ou _.', 'Use 3 to 20 letters, numbers, dot or _.'));
  };

  const tier = sponsorTier(info?.invitedCount ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={t('Estudar junto', 'Study together')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>

        {/* Convite */}
        <View style={{ margin: 16, backgroundColor: C.ink, borderRadius: 24, padding: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Users size={20} color={C.volt} weight="bold" />
            <AppText style={{ fontSize: 12, fontWeight: '800', color: C.volt, letterSpacing: 1, textTransform: 'uppercase' }}>{t('Convite', 'Invite')}</AppText>
          </View>
          <AppText display style={{ fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#FFFFFF' }}>
            {t('Vem estudar comigo no Queizy', 'Come study with me on Queizy')}
          </AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.72)', marginTop: 8 }}>
            {t(`Vocês viram dupla de estudo e cada um ganha ${info?.rewardMinutes ?? 5} minutos de Live Voice.`, `You become study buddies and each get ${info?.rewardMinutes ?? 5} Live Voice minutes.`)}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
            <AppText style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t('Seu código', 'Your code')}</AppText>
            {loading && !info ? <ActivityIndicator color={C.volt} /> : <AppText style={{ fontSize: 18, fontWeight: '800', color: C.volt, letterSpacing: 1.5 }}>{info?.code ?? '—'}</AppText>}
          </View>
          {!!handle && (
            <TouchableOpacity onPress={() => { setHandleDraft(handle); setHandleErr(null); setEditingHandle(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
              <AppText style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t('Seu @ para amigos te acharem', 'Your @ so friends can find you')}</AppText>
              <AppText style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginRight: 8 }}>@{handle}</AppText>
              <PencilSimple size={15} color="rgba(255,255,255,0.6)" weight="bold" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            disabled={!info}
            onPress={() => setShare({ kind: 'xp', big: t('Bora?', "Let's go?"), title: t('Vem estudar inglês comigo', 'Come study English with me'), subtitle: t('Dupla de estudo no Queizy, com a Charlotte como tutora.', 'Study buddies on Queizy, with Charlotte as our tutor.') })}
            style={{ marginTop: 14, backgroundColor: C.volt, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('Convidar amigos', 'Invite friends')}</AppText>
          </TouchableOpacity>
        </View>

        {/* Pedidos de amizade recebidos */}
        <FriendRequests onChange={load} />

        {/* Encontrar amigos pelo nome ou @ */}
        <SectionTitle title={t('Encontrar amigos', 'Find friends')} />
        <FriendSearchEntry />

        {/* Dupla */}
        <SectionTitle title={t('Seus amigos de estudo', 'Your study friends')} meta={info?.buddies.length ? String(info.buddies.length) : undefined} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {info && info.buddies.length === 0 && (
            <Card style={{ padding: 18, alignItems: 'center' }}>
              <AppText style={{ fontSize: 14, color: C.mid, textAlign: 'center', lineHeight: 20 }}>
                {t('Ninguém por aqui ainda. Convide alguém para estudar com você.', 'No one here yet. Invite someone to study with you.')}
              </AppText>
            </Card>
          )}
          {info?.buddies.map(b => {
            const max = Math.max(1, b.weekXp, info.me.weekXp);
            return (
              <Card key={b.id} style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar uri={b.avatarUrl} name={b.name} />
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{b.name ?? t('Sua dupla', 'Your buddy')}</AppText>
                    <AppText style={{ fontSize: 12.5, color: C.light, marginTop: 1 }}>
                      {b.relation === 'sponsor' ? t('Te convidou', 'Invited you') : b.relation === 'invited' ? t('Você convidou', 'You invited') : t('Amigo de estudo', 'Study friend')}
                      {b.level ? ` · ${b.level}` : ''}{b.streak ? ` · ${b.streak} ${t(b.streak === 1 ? 'dia' : 'dias', b.streak === 1 ? 'day' : 'days')}` : ''}
                    </AppText>
                  </View>
                  <TouchableOpacity disabled={b.nudgedToday} onPress={() => setNudgeFor(b)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: b.nudgedToday ? C.ghost : C.voltBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <HandWaving size={16} color={b.nudgedToday ? C.light : C.ink} weight="bold" />
                    <AppText style={{ fontSize: 13, fontWeight: '800', color: b.nudgedToday ? C.light : C.ink }}>
                      {b.nudgedToday ? t('Cutucado', 'Nudged') : t('Cutucar', 'Nudge')}
                    </AppText>
                  </TouchableOpacity>
                </View>
                {/* XP da semana lado a lado */}
                <View style={{ marginTop: 14, gap: 8 }}>
                  {[{ label: t('Você', 'You'), xp: info.me.weekXp, color: C.ink }, { label: b.name ?? t('Dupla', 'Buddy'), xp: b.weekXp, color: C.pink }].map(row => (
                    <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <AppText style={{ width: 64, fontSize: 12.5, color: C.mid }} numberOfLines={1}>{row.label}</AppText>
                      <View style={{ flex: 1, height: 8, backgroundColor: C.ghost, borderRadius: 999, overflow: 'hidden' }}>
                        <View style={{ width: `${(row.xp / max) * 100}%`, height: '100%', backgroundColor: row.color, borderRadius: 999 }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: 64, justifyContent: 'flex-end' }}>
                        <Lightning size={12} color={C.ink} weight="fill" />
                        <AppText style={{ fontSize: 12.5, fontWeight: '800', color: C.ink }}>{row.xp}</AppText>
                      </View>
                    </View>
                  ))}
                  <AppText style={{ fontSize: 11.5, color: C.light }}>{t('XP desta semana', 'XP this week')}</AppText>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Rallies */}
        <RallySection buddies={info?.buddies ?? []} />

        {/* Padrinho / Madrinha */}
        <SectionTitle title={t('Padrinho de estudos', 'Study sponsor')} />
        <Card style={{ marginHorizontal: 16, padding: 18 }}>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
            {SPONSOR_TIERS.map((n, i) => {
              const on = i < tier.reached;
              return (
                <View key={n} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : C.ghost }}>
                    <Crown size={24} color={on ? C.volt : C.light} weight={on ? 'fill' : 'regular'} />
                  </View>
                  <AppText style={{ fontSize: 12, fontWeight: '800', color: on ? C.ink : C.light }}>
                    {n} {t(n === 1 ? 'amigo' : 'amigos', n === 1 ? 'friend' : 'friends')}
                  </AppText>
                </View>
              );
            })}
          </View>
          <AppText style={{ fontSize: 13, color: C.mid, textAlign: 'center', marginTop: 14 }}>
            {tier.next
              ? (() => { const left = tier.next - (info?.invitedCount ?? 0); return t(`Você trouxe ${info?.invitedCount ?? 0}. ${left === 1 ? 'Falta 1' : `Faltam ${left}`} para o próximo nível.`, `You brought ${info?.invitedCount ?? 0}. ${left} more to the next level.`); })()
              : t('Nível máximo de padrinho. Obrigado por espalhar o Queizy!', 'Top sponsor level. Thanks for spreading Queizy!')}
          </AppText>
        </Card>

        {/* Tenho um código */}
        {info?.canClaim && (
          <>
            <SectionTitle title={t('Recebeu um convite?', 'Got an invite?')} />
            <Card style={{ marginHorizontal: 16, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false}
                  placeholder={t('Código do convite', 'Invite code')} placeholderTextColor={C.light}
                  style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: C.ink, letterSpacing: 1 }} />
                <TouchableOpacity onPress={claim} disabled={claiming || !normalizeCode(code)}
                  style={{ backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', opacity: normalizeCode(code) ? 1 : 0.4 }}>
                  {claiming ? <ActivityIndicator color={C.volt} /> : <Gift size={20} color={C.volt} weight="bold" />}
                </TouchableOpacity>
              </View>
              {claimMsg && <AppText style={{ fontSize: 13, color: claimMsg.ok ? C.green : '#D12A64' }}>{claimMsg.text}</AppText>}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Escolha da cutucada */}
      <Modal visible={!!nudgeFor} transparent animationType="fade" onRequestClose={() => setNudgeFor(null)}>
        <Pressable onPress={() => setNudgeFor(null)} style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 10 }}>
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 6 }}>
              {t(`Cutucar ${nudgeFor?.name ?? ''}`, `Nudge ${nudgeFor?.name ?? ''}`)}
            </AppText>
            {NUDGE_KEYS.map(k => (
              <TouchableOpacity key={k} onPress={() => nudgeFor && sendNudge(nudgeFor, k)}
                style={{ backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
                <AppText style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{t(NUDGE_TEXT[k].pt, NUDGE_TEXT[k].en)}</AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Trocar o @ */}
      <Modal visible={editingHandle} transparent animationType="fade" onRequestClose={() => setEditingHandle(false)}>
        <Pressable onPress={() => setEditingHandle(false)} style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 }}>
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{t('Seu @', 'Your @')}</AppText>
            <AppText style={{ fontSize: 13.5, color: C.mid }}>{t('É assim que amigos te acham na busca. Precisa ser único.', "That's how friends find you in search. It has to be unique.")}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14 }}>
              <AppText style={{ fontSize: 17, fontWeight: '800', color: C.light }}>@</AppText>
              <TextInput value={handleDraft} onChangeText={v => setHandleDraft(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                autoCapitalize="none" autoCorrect={false} maxLength={20} autoFocus
                style={{ flex: 1, paddingVertical: 13, fontSize: 17, fontWeight: '700', color: C.ink, marginLeft: 2 }} />
            </View>
            {handleErr && <AppText style={{ fontSize: 13, color: '#D12A64' }}>{handleErr}</AppText>}
            <TouchableOpacity onPress={saveHandle} style={{ backgroundColor: C.volt, borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
              <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('Salvar', 'Save')}</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ShareCardModal content={share} onClose={() => setShare(null)} />
    </View>
  );
}
