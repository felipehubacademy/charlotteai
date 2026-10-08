// RallySection — Rallies na tela Estudar junto: convites recebidos, disputas em
// andamento (placar ao vivo e tempo restante), resultados recentes com revanche
// e a criação de um rally (disputa + duração + quem chamar da dupla, ou link).
import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, Modal, Pressable, ActivityIndicator, Share, Platform, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Flag, Crown, Lightning, Target, Barbell, Check, ShareNetwork, ArrowsClockwise } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, SectionTitle, Card } from '@/components/stats/StatsUI';
import { systemIsPt } from '@/lib/systemLang';
import type { Buddy } from '@/lib/referral';
import {
  fetchRallies, createRally, joinRally, declineRally, rematchRally, takePendingRally,
  formatRallyScore, rallyTimeLeft, Rally, RallyList, RallyMetric,
} from '@/lib/rally';

const METRICS: { id: RallyMetric; Icon: typeof Lightning; pt: string; en: string; subPt: string; subEn: string }[] = [
  { id: 'xp',        Icon: Lightning, pt: 'Mais XP',           en: 'Most XP',         subPt: 'Quem soma mais pontos',          subEn: 'Who earns the most points' },
  { id: 'practices', Icon: Barbell,   pt: 'Mais práticas',     en: 'Most practices',  subPt: 'Quem estuda mais vezes',         subEn: 'Who studies the most times' },
  { id: 'accuracy',  Icon: Target,    pt: 'Maior acerto',      en: 'Best accuracy',   subPt: 'Quem acerta mais na trilha',     subEn: 'Who gets the most right on the trail' },
];

const ERRORS: Record<string, { pt: string; en: string }> = {
  too_many_active: { pt: 'Você já tem 3 competições em andamento. Espere uma terminar.', en: 'You already have 3 challenges running. Wait for one to end.' },
  ended:           { pt: 'Essa competição já terminou.', en: 'That challenge has already ended.' },
  full:            { pt: 'Essa competição já está cheia.', en: 'That challenge is already full.' },
  not_found:       { pt: 'Competição não encontrada.', en: 'Challenge not found.' },
};

function Mini({ uri, name }: { uri: string | null; name: string | null }) {
  if (uri) return <Image source={{ uri }} style={{ width: 30, height: 30, borderRadius: 15 }} />;
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{(name ?? '?').charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

export function RallySection({ buddies }: { buddies: Buddy[] }) {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [list, setList] = useState<RallyList | null>(null);
  const [creating, setCreating] = useState(false);
  const [metric, setMetric] = useState<RallyMetric>('xp');
  const [hours, setHours] = useState<24 | 168>(24);
  const [invite, setInvite] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => { setList(await fetchRallies()); }, []);

  // Entra no rally pendente (link ou instalação) e carrega a lista.
  useFocusEffect(useCallback(() => {
    (async () => {
      const pending = await takePendingRally();
      if (pending) {
        const r = await joinRally(pending);
        if (!r.ok) setMsg({ ok: false, text: ERRORS[r.error] ? t(ERRORS[r.error].pt, ERRORS[r.error].en) : t('Não foi possível entrar na competição.', "Couldn't join the challenge.") });
        else if (!r.already) setMsg({ ok: true, text: t('Você entrou na competição. Boa disputa!', 'You joined the challenge. Good luck!') });
      }
      await load();
    })();
  }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza o tempo restante a cada minuto.
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 60000); return () => clearInterval(id); }, []);

  const shareLink = async (r: { link?: string; title?: string }) => {
    if (!r.link) return;
    const message = t(`Te desafio para uma competição no Queizy: ${r.title ?? 'quem estuda mais inglês'}. Entra aqui: ${r.link}`,
                      `I challenge you on Queizy: ${r.title ?? 'who studies more English'}. Join here: ${r.link}`);
    await Share.share(Platform.OS === 'ios' ? { message } : { message, title: 'Queizy' }).catch(() => {});
  };

  const create = async () => {
    setBusy('create'); setMsg(null);
    const r = await createRally(metric, hours, invite);
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: ERRORS[r.error] ? t(ERRORS[r.error].pt, ERRORS[r.error].en) : t('Não foi possível criar a competição.', "Couldn't create the challenge.") }); return; }
    setCreating(false); setInvite([]);
    setMsg({ ok: true, text: invite.length ? t('Competição criada! Seus amigos receberam o convite.', 'Challenge created! Your friends got the invite.') : t('Competição criada! Mande o link para quem você quer desafiar.', 'Challenge created! Send the link to whoever you want to challenge.') });
    await load();
    if (!invite.length) {
      const span = hours === 24 ? t('em 24 horas', 'in 24 hours') : t('em 7 dias', 'in 7 days');
      const what = metric === 'xp' ? t('quem faz mais XP', 'most XP') : metric === 'practices' ? t('quem pratica mais', 'most practices') : t('quem acerta mais na trilha', 'best trail accuracy');
      shareLink({ link: r.link, title: `${what} ${span}` });
    }
  };

  const act = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) => {
    setBusy(key); setMsg(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) setMsg({ ok: false, text: r.error && ERRORS[r.error] ? t(ERRORS[r.error].pt, ERRORS[r.error].en) : t('Algo deu errado. Tente de novo.', 'Something went wrong. Try again.') });
    else if (okText) setMsg({ ok: true, text: okText });
    await load();
  };

  const Standings = ({ r }: { r: Rally }) => {
    const started = r.standings.some(s => (s.score ?? 0) > 0);
    return (
    <View style={{ marginTop: 14, gap: 6 }}>
      {r.standings.map(s => {
        const lead = s.rank === 1 && s.score != null && s.score > 0 && r.standings.filter(x => x.rank === 1).length === 1;
        return (
          <View key={s.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: s.isMe ? C.voltBg : 'transparent' }}>
            <AppText style={{ width: 24, fontSize: 13, fontWeight: '800', color: C.light }}>{started && s.score != null ? `${s.rank}º` : '·'}</AppText>
            <Mini uri={s.avatarUrl} name={s.name} />
            <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: s.isMe ? '800' : '600', color: C.ink }} numberOfLines={1}>
              {s.isMe ? t('Você', 'You') : (s.name ?? t('Participante', 'Player'))}
            </AppText>
            {lead && <Crown size={16} color="#F59E0B" weight="fill" />}
            <AppText style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>{formatRallyScore(r.metric, s.score, isPt)}</AppText>
          </View>
        );
      })}
      {r.metric === 'accuracy' && (
        <AppText style={{ fontSize: 11.5, color: C.light, paddingHorizontal: 10 }}>{t('Conta a partir de 5 respostas na trilha.', 'Counts from 5 trail answers.')}</AppText>
      )}
    </View>
    );
  };

  return (
    <>
      <SectionTitle title={t('Competições', 'Challenges')} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {msg && <AppText style={{ fontSize: 13, color: msg.ok ? C.green : '#D12A64', paddingHorizontal: 4 }}>{msg.text}</AppText>}

        {/* Convites recebidos */}
        {list?.invites.map(r => (
          <Card key={`i${r.code}`} style={{ padding: 16, borderWidth: 1.5, borderColor: C.ink }}>
            <AppText style={{ fontSize: 12, fontWeight: '800', color: C.pink, letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('Convite para competição', 'Challenge invite')}</AppText>
            <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 4 }}>
              {t(`${r.creator ?? 'Alguém'} te desafiou`, `${r.creator ?? 'Someone'} challenged you`)}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.mid, marginTop: 2 }}>{r.title} · {rallyTimeLeft(r.endsAt, isPt)}</AppText>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => act(`j${r.code}`, () => joinRally(r.code), t('Você entrou na competição. Boa disputa!', 'You joined the challenge. Good luck!'))}
                style={{ flex: 1, backgroundColor: C.ink, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
                {busy === `j${r.code}` ? <ActivityIndicator color={C.volt} /> : <AppText style={{ fontSize: 15, fontWeight: '800', color: C.volt }}>{t('Entrar', 'Join')}</AppText>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => act(`d${r.code}`, () => declineRally(r.code))}
                style={{ paddingHorizontal: 18, borderRadius: 999, paddingVertical: 12, alignItems: 'center', backgroundColor: C.ghost }}>
                <AppText style={{ fontSize: 15, fontWeight: '700', color: C.mid }}>{t('Agora não', 'Not now')}</AppText>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Em andamento */}
        {list?.active.map(r => (
          <Card key={`a${r.code}`} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flag size={13} color={C.pink} weight="fill" />
              <AppText style={{ fontSize: 11.5, fontWeight: '800', color: C.pink, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {t('Em andamento', 'Live')} · {rallyTimeLeft(r.endsAt, isPt)}
              </AppText>
            </View>
            <AppText display style={{ fontSize: 19, lineHeight: 24, fontWeight: '800', color: C.ink, marginTop: 6 }}>{r.title}</AppText>
            <Standings r={r} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              <TouchableOpacity onPress={() => shareLink(r)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <ShareNetwork size={15} color={C.green} weight="bold" />
                <AppText style={{ fontSize: 13, fontWeight: '800', color: C.green }}>{t('Chamar mais gente', 'Invite more people')}</AppText>
              </TouchableOpacity>
              <AppText style={{ fontSize: 12, color: C.light }}>
                {isPt ? `${r.standings.length} ${r.standings.length === 1 ? 'participante' : 'participantes'}` : `${r.standings.length} ${r.standings.length === 1 ? 'player' : 'players'}`}
              </AppText>
            </View>
          </Card>
        ))}

        {/* Criar */}
        <TouchableOpacity onPress={() => { setMsg(null); setCreating(true); }}
          style={{ backgroundColor: C.volt, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Flag size={22} color={C.ink} weight="fill" />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('Criar uma competição', 'Start a challenge')}</AppText>
            <AppText style={{ fontSize: 12.5, color: C.ink, opacity: 0.75 }}>{t('Desafie amigos por 24 horas ou 7 dias', 'Challenge friends for 24 hours or 7 days')}</AppText>
          </View>
        </TouchableOpacity>

        {/* Encerrados */}
        {list?.finished.map(r => {
          const me = r.standings.find(s => s.isMe);
          const won = !!r.winnerId && me?.userId === r.winnerId;
          const winner = r.standings.find(s => s.userId === r.winnerId);
          return (
            <Card key={`f${r.code}`} style={{ padding: 16, opacity: 0.95 }}>
              <AppText style={{ fontSize: 12, fontWeight: '800', color: won ? C.green : C.light, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {won ? t('Você venceu', 'You won') : winner ? t(`${winner.name ?? 'Alguém'} venceu`, `${winner.name ?? 'Someone'} won`) : t('Terminou', 'Ended')}
              </AppText>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 2 }}>{r.title}</AppText>
              <Standings r={r} />
              {r.standings.length > 1 && (
                <TouchableOpacity onPress={() => act(`r${r.code}`, () => rematchRally(r.code), t('Revanche criada! Todos foram convidados.', 'Rematch created! Everyone was invited.'))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' }}>
                  {busy === `r${r.code}` ? <ActivityIndicator color={C.green} /> : <ArrowsClockwise size={15} color={C.green} weight="bold" />}
                  <AppText style={{ fontSize: 13, fontWeight: '800', color: C.green }}>{t('Revanche', 'Rematch')}</AppText>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}
      </View>

      {/* Criar rally */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable onPress={() => setCreating(false)} style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 10 }}>
            <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{t('Nova competição', 'New challenge')}</AppText>

            <AppText style={{ fontSize: 12, fontWeight: '800', color: C.light, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>{t('Disputa', 'Challenge')}</AppText>
            {METRICS.map(m => {
              const on = metric === m.id;
              return (
                <TouchableOpacity key={m.id} onPress={() => setMetric(m.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, backgroundColor: on ? C.ink : C.bg }}>
                  <m.Icon size={20} color={on ? C.volt : C.ink} weight="bold" />
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: on ? '#FFFFFF' : C.ink }}>{t(m.pt, m.en)}</AppText>
                    <AppText style={{ fontSize: 12.5, color: on ? 'rgba(255,255,255,0.7)' : C.mid }}>{t(m.subPt, m.subEn)}</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}

            <AppText style={{ fontSize: 12, fontWeight: '800', color: C.light, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>{t('Duração', 'Duration')}</AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([24, 168] as const).map(h => {
                const on = hours === h;
                return (
                  <TouchableOpacity key={h} onPress={() => setHours(h)}
                    style={{ flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: on ? C.ink : C.bg }}>
                    <AppText style={{ fontSize: 15, fontWeight: '800', color: on ? C.volt : C.ink }}>{h === 24 ? t('24 horas', '24 hours') : t('7 dias', '7 days')}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {buddies.length > 0 && (
              <>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: C.light, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>{t('Chamar seus amigos de estudo', 'Invite your study friends')}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {buddies.map(b => {
                    const on = invite.includes(b.id);
                    return (
                      <TouchableOpacity key={b.id} onPress={() => setInvite(v => (on ? v.filter(x => x !== b.id) : [...v, b.id]))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: on ? C.ink : C.bg }}>
                        {on && <Check size={13} color={C.volt} weight="bold" />}
                        <AppText style={{ fontSize: 14, fontWeight: '700', color: on ? C.volt : C.ink }}>{b.name ?? t('Dupla', 'Buddy')}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            <AppText style={{ fontSize: 12.5, color: C.mid }}>
              {t('Depois de criar, você também pode mandar o link para qualquer pessoa. Quem vencer ganha 5 minutos de Live Voice.',
                 'After creating it you can also send the link to anyone. The winner gets 5 Live Voice minutes.')}
            </AppText>

            <TouchableOpacity onPress={create} disabled={busy === 'create'}
              style={{ marginTop: 6, backgroundColor: C.volt, borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
              {busy === 'create' ? <ActivityIndicator color={C.ink} /> : (
                <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
                  {invite.length ? t('Criar e convidar', 'Create and invite') : t('Criar e mandar o link', 'Create and send the link')}
                </AppText>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
