// ShareCardModal — prévia de um card da conquista no formato Stories
// (1080x1920) e compartilhamento como imagem para qualquer rede instalada
// (Instagram, Facebook, TikTok, X, LinkedIn, WhatsApp...). O card leva o link
// de convite pessoal: quem compartilha também convida.

import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Image, ActivityIndicator, Share, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViewShot, Sharing, Clipboard, canShareImage, RNShare } from '@/lib/nativeOptional';
import Constants from 'expo-constants';
import { X, ShareNetwork, LinkSimple, Check, InstagramLogo, Fire, Medal, GraduationCap, Lightning, Trophy, UsersThree, Crown } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { fetchReferral } from '@/lib/referral';
import { track } from '@/lib/analytics';
import { AchievementIcon } from '@/components/stats/StatsUI';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const PAPER = '#FAF7F0';

// Cores e ícone variam por tipo E dentro do tipo, para o feed não repetir o mesmo card:
//   sequência: cor gira a cada dia e marcos (7, 14, 30...) têm selo; conquista: cor pela raridade e
//   ícone pela categoria; desafio/XP: giram pela semente; nível: cor do nível novo.
// light = fundo saturado: texto branco e logo com o nome em branco.
type Theme = { bg: string; text: string; sub: string; accent: string; light: boolean; linkBg: string; linkText: string; linkAccent: string };
const T: Record<string, Theme> = {
  volt:   { bg: VOLT,      text: INK,       sub: 'rgba(22,19,31,0.72)',   accent: INK,       light: false, linkBg: INK,       linkText: '#FFFFFF', linkAccent: VOLT },
  green:  { bg: '#2BD97C', text: INK,       sub: 'rgba(22,19,31,0.75)',   accent: INK,       light: false, linkBg: INK,       linkText: '#FFFFFF', linkAccent: '#2BD97C' },
  pink:   { bg: '#FF4F8B', text: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', accent: VOLT,     light: true,  linkBg: INK,       linkText: '#FFFFFF', linkAccent: VOLT },
  violet: { bg: '#6B4BFF', text: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', accent: VOLT,     light: true,  linkBg: VOLT,      linkText: INK,       linkAccent: INK },
  paperV: { bg: PAPER,     text: INK,       sub: 'rgba(22,19,31,0.7)',    accent: '#6B4BFF', light: false, linkBg: '#6B4BFF', linkText: '#FFFFFF', linkAccent: VOLT },
  paperG: { bg: PAPER,     text: INK,       sub: 'rgba(22,19,31,0.7)',    accent: '#08804A', light: false, linkBg: INK,       linkText: '#FFFFFF', linkAccent: VOLT },
  paperP: { bg: PAPER,     text: INK,       sub: 'rgba(22,19,31,0.7)',    accent: '#FF4F8B', light: false, linkBg: '#FF4F8B', linkText: '#FFFFFF', linkAccent: INK },
};
const KIND_ICON = { streak: Fire, achievement: Medal, level: GraduationCap, xp: Lightning, challenge: Trophy, rank: Crown } as const;
const STREAK_MILESTONES = new Set([7, 14, 21, 30, 50, 60, 90, 100, 150, 200, 365]);
export const isStreakMilestone = (n: number) => STREAK_MILESTONES.has(n) || (n > 100 && n % 50 === 0);
const RARITY_THEME: Record<string, keyof typeof T> = { common: 'green', rare: 'violet', epic: 'pink', legendary: 'volt' };
const LEVEL_THEME: Record<string, keyof typeof T> = { Novice: 'green', Inter: 'paperV', Advanced: 'pink' };

function seedNum(seed: string | number | undefined): number {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickTheme(c: ShareCardContent): Theme {
  if (c.invite) return T.volt;
  const n = seedNum(c.seed ?? c.big);
  switch (c.kind) {
    case 'streak':      return c.badge ? T.volt : [T.pink, T.violet, T.green, T.paperP, T.paperV][Number(c.seed ?? 0) % 5];
    case 'achievement': return T[RARITY_THEME[c.rarity ?? ''] ?? 'violet'];
    case 'level':       return c.badge ? T.volt : T[LEVEL_THEME[c.big] ?? 'paperV'];
    case 'challenge':   return [T.green, T.violet, T.pink, T.paperG][n % 4];
    case 'rank':        return T.volt; // liderança do ranking: sempre o volt, a cor mais forte da marca
    default:            return [T.paperG, T.green, T.paperV][n % 3];
  }
}

// Posição do ícone ao fundo (também varia pela semente).
const DECOR = [
  { right: -46, top: 70, rotate: '-14deg', size: 230 },
  { right: -60, bottom: 90, rotate: '12deg', size: 250 },
  { left: -70, bottom: 120, rotate: '-8deg', size: 240 },
] as const;

// Prévia na tela: 9:16. A captura sai em 1080x1920.
const W = 270;
const H = 480;

export interface ShareCardContent {
  kind: 'streak' | 'achievement' | 'level' | 'xp' | 'challenge' | 'rank';
  /** Semente da variação (dia da sequência, código da conquista, semana...). */
  seed?: string | number;
  /** Conquista: raridade (define a cor) e categoria (define o ícone). */
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  category?: string;
  /** Selo acima do destaque (ex.: "Marco de 30 dias", "Lendária"). */
  badge?: string;
  /** Número ou palavra em destaque (ex.: "7", "Inter"). */
  big: string;
  /** Linha abaixo do destaque (ex.: "dias seguidos"). */
  title: string;
  subtitle?: string;
  /** Ícone opcional acima do destaque. */
  icon?: React.ReactNode;
  /** Convite: a ação principal é o link (prévia com nome e arte no WhatsApp); a imagem fica como opção. */
  invite?: boolean;
}

export function ShareCardModal({ content, onClose }: { content: ShareCardContent | null; onClose: () => void }) {
  const insets = useSafeAreaInsets(); // barra de navegação do Android / home indicator
  // Tela baixa (iPhone SE, fonte/zoom grandes): a prévia encolhe para os botões caberem.
  // Só a prévia na tela; a imagem compartilhada continua 1080x1920 (o captureRef usa o card sem escala).
  const { height: winH } = useWindowDimensions();
  const ACTIONS_H = 180; // botões + espaços abaixo do card
  const scale = Math.min(1, Math.max(0.6, (winH - insets.top - insets.bottom - 40 - ACTIONS_H - 44) / H));
  const { profile } = useAuth();
  const isPt = systemIsPt; // botões desta tela: idioma do aparelho
  // O card e a mensagem do convite vão sempre em português: são para chamar amigos daqui para estudar.
  const cardPt = true;
  const cardRef = useRef<View>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!content) return;
    let alive = true;
    fetchReferral().then(r => { if (alive && r) setLink(r.link); });
    return () => { alive = false; };
  }, [content]);

  if (!content) return null;
  const th = pickTheme(content);
  const decor = DECOR[seedNum(content.seed ?? content.big) % DECOR.length];
  const DecorIcon = content.invite ? UsersThree : KIND_ICON[content.kind];
  const name = (profile?.name ?? '').trim().split(/\s+/)[0] || null;
  const shortLink = (link ?? 'queizy.com').replace(/^https?:\/\//, '');

  const shareImage = async () => {
    if (!cardRef.current) return;
    // Binário sem os módulos de imagem: compartilha o convite em texto.
    if (!canShareImage || !ViewShot || !Sharing) { await shareLink(); return; }
    setBusy(true);
    try {
      const uri = await ViewShot.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Queizy' });
      } else {
        await Share.share({ url: uri });
      }
      track('share_card', { kind: content.kind });
    } catch { /* cancelado */ }
    finally { setBusy(false); }
  };

  // Story do Instagram direto: abre o editor de Story já com o cartão, sem link (decisão do
  // produto: no Instagram fica melhor só a imagem). Precisa do App ID do Facebook no build.
  const facebookAppId = (Constants.expoConfig?.extra as { facebookAppId?: string } | undefined)?.facebookAppId;
  const canStory = !!(RNShare && canShareImage && facebookAppId);
  const shareStory = async () => {
    if (!cardRef.current || !RNShare || !ViewShot || !facebookAppId) return;
    setBusy(true);
    try {
      const uri = await ViewShot.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      await RNShare.shareSingle({
        social: RNShare.Social.INSTAGRAM_STORIES as never,
        appId: facebookAppId,
        backgroundImage: uri.startsWith('file://') ? uri : `file://${uri}`,
      });
      track('share_story', { kind: content.kind });
    } catch {
      // Sem Instagram instalado (ou cancelado): cai no compartilhar normal da imagem.
      await shareImage();
    } finally { setBusy(false); }
  };

  function inviteMessage() {
    return cardPt
      ? `Vem estudar inglês comigo no Queizy! ${link ?? 'https://queizy.com'}`
      : `Come study English with me on Queizy! ${link ?? 'https://queizy.com'}`;
  }

  const shareLink = async () => {
    const message = inviteMessage();
    try {
      await Share.share(Platform.OS === 'ios' ? { message } : { message, title: 'Queizy' });
      track('share_invite_link', { from: content.kind });
    } catch { /* cancelado */ }
  };

  const copyLink = async () => {
    if (!link) return;
    if (!Clipboard) { await shareLink(); return; }
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.88)', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: 20 + insets.top, paddingBottom: 20 + insets.bottom }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: insets.top + 4, right: 12, padding: 8, zIndex: 2 }} hitSlop={12}>
          <X size={26} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>

        {/* Card capturado (dentro de um invólucro que só escala a prévia) */}
        <View style={{ width: W * scale, height: H * scale, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ scale }] }}>
        <View ref={cardRef} collapsable={false} style={{ width: W, height: H, backgroundColor: th.bg, borderRadius: 22, overflow: 'hidden', padding: 22 }}>
          {/* Ícone grande do tipo, ao fundo */}
          <View pointerEvents="none" style={{ position: 'absolute', ...('right' in decor ? { right: decor.right } : { left: decor.left }), ...('top' in decor ? { top: decor.top } : { bottom: decor.bottom }), opacity: th.light ? 0.16 : 0.1, transform: [{ rotate: decor.rotate }] }}>
            {content.kind === 'achievement' && content.category && !content.invite
              ? <AchievementIcon category={content.category} color={th.light ? '#FFFFFF' : INK} size={decor.size} />
              : <DecorIcon size={decor.size} color={th.light ? '#FFFFFF' : INK} weight="fill" />}
          </View>
          <Image source={th.light ? require('@/assets/logo-lockup-light.png') : require('@/assets/logo-lockup.png')} style={{ height: 26, width: 112 }} resizeMode="contain" />

          <View style={{ flex: 1, justifyContent: 'center' }}>
            {content.icon && <View style={{ marginBottom: 14 }}>{content.icon}</View>}
            {content.badge && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: th.light ? VOLT : INK, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 }}>
                <AppText style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: th.light ? INK : VOLT }}>{content.badge}</AppText>
              </View>
            )}
            <AppText display style={{ fontSize: content.big.length > 6 ? 46 : 72, lineHeight: content.big.length > 6 ? 50 : 76, fontWeight: '800', color: th.accent === INK ? th.text : th.accent, letterSpacing: -2 }}>
              {content.big}
            </AppText>
            <AppText display style={{ fontSize: 24, lineHeight: 28, fontWeight: '800', color: th.text, marginTop: 4 }}>
              {content.title}
            </AppText>
            {content.subtitle && (
              <AppText style={{ fontSize: 14, lineHeight: 19, color: th.sub, marginTop: 10 }}>{content.subtitle}</AppText>
            )}
            {name && (
              <AppText style={{ fontSize: 14, color: th.text, marginTop: 16, fontWeight: '700' }}>
                {/* Convite: prova social. Conquistas: vale para qualquer membro da Família. */}
                {content.invite
                  ? (cardPt ? `${name} já está no Queizy` : `${name} is already on Queizy`)
                  : (cardPt ? `${name}, aprendendo inglês no Queizy` : `${name}, learning English on Queizy`)}
              </AppText>
            )}
          </View>

          <View style={{ backgroundColor: th.linkBg, borderRadius: 16, padding: 14 }}>
            <AppText style={{ fontSize: 13, color: th.linkText, fontWeight: '800' }}>
              {content.invite ? (cardPt ? 'Entre pelo link' : 'Join with the link') : (cardPt ? 'Vem estudar comigo' : 'Come study with me')}
            </AppText>
            <AppText style={{ fontSize: 13, color: th.linkAccent, fontWeight: '700', marginTop: 2 }}>{shortLink}</AppText>
          </View>
        </View>
        </View>
        </View>

        {/* Ações */}
        <View style={{ width: W + 40, marginTop: 22, gap: 10 }}>
          <TouchableOpacity onPress={content.invite ? shareLink : shareImage} disabled={busy}
            style={{ backgroundColor: VOLT, borderRadius: 999, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <ActivityIndicator color={INK} /> : <ShareNetwork size={20} color={INK} weight="bold" />}
            <AppText style={{ fontSize: 16, fontWeight: '800', color: INK }}>
              {content.invite ? (isPt ? 'Enviar convite' : 'Send invite') : (isPt ? 'Compartilhar imagem' : 'Share image')}
            </AppText>
          </TouchableOpacity>
          {canStory && !content.invite ? (
            <TouchableOpacity onPress={shareStory} disabled={busy}
              style={{ backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <InstagramLogo size={20} color={INK} weight="bold" />
              <AppText style={{ fontSize: 15, fontWeight: '800', color: INK }}>{isPt ? 'Postar no Story' : 'Post to Story'}</AppText>
            </TouchableOpacity>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={content.invite ? shareImage : shareLink} disabled={busy}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center' }}>
              {/* Meia largura: o texto encolhe um pouco em vez de vazar do botão. */}
              <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 14, fontWeight: '700', color: PAPER }}>
                {content.invite ? (isPt ? 'Compartilhar imagem' : 'Share image') : (isPt ? 'Enviar convite' : 'Send invite')}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={copyLink} disabled={!link}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {copied ? <Check size={16} color={VOLT} weight="bold" /> : <LinkSimple size={16} color={PAPER} weight="bold" />}
              <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontSize: 14, fontWeight: '700', color: copied ? VOLT : PAPER }}>{copied ? (isPt ? 'Copiado' : 'Copied') : (isPt ? 'Copiar link' : 'Copy link')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
