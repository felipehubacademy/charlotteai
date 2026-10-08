// ShareCardModal — prévia de um card da conquista no formato Stories
// (1080x1920) e compartilhamento como imagem para qualquer rede instalada
// (Instagram, Facebook, TikTok, X, LinkedIn, WhatsApp...). O card leva o link
// de convite pessoal: quem compartilha também convida.

import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Image, ActivityIndicator, Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { X, ShareNetwork, LinkSimple, Check } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { fetchReferral } from '@/lib/referral';
import { track } from '@/lib/analytics';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const PAPER = '#FAF7F0';

// Prévia na tela: 9:16. A captura sai em 1080x1920.
const W = 270;
const H = 480;

export interface ShareCardContent {
  kind: 'streak' | 'achievement' | 'level' | 'xp';
  /** Número ou palavra em destaque (ex.: "7", "Inter"). */
  big: string;
  /** Linha abaixo do destaque (ex.: "dias seguidos"). */
  title: string;
  subtitle?: string;
  /** Ícone opcional acima do destaque. */
  icon?: React.ReactNode;
}

export function ShareCardModal({ content, onClose }: { content: ShareCardContent | null; onClose: () => void }) {
  const { profile } = useAuth();
  const isPt = systemIsPt;
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
  const name = (profile?.name ?? '').trim().split(/\s+/)[0] || null;
  const shortLink = (link ?? 'queizy.com').replace(/^https?:\/\//, '');

  const shareImage = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Queizy' });
      } else {
        await Share.share({ url: uri });
      }
      track('share_card', { kind: content.kind });
    } catch { /* cancelado */ }
    finally { setBusy(false); }
  };

  const shareLink = async () => {
    const message = isPt
      ? `Vem estudar inglês comigo no Queizy! ${link ?? 'https://queizy.com'}`
      : `Come study English with me on Queizy! ${link ?? 'https://queizy.com'}`;
    try {
      await Share.share(Platform.OS === 'ios' ? { message } : { message, title: 'Queizy' });
      track('share_invite_link', { from: content.kind });
    } catch { /* cancelado */ }
  };

  const copyLink = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.88)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 56, right: 20, padding: 8 }} hitSlop={12}>
          <X size={26} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>

        {/* Card capturado */}
        <View ref={cardRef} collapsable={false} style={{ width: W, height: H, backgroundColor: VOLT, borderRadius: 22, overflow: 'hidden', padding: 22 }}>
          <Image source={require('@/assets/logo-lockup.png')} style={{ height: 26, width: 112 }} resizeMode="contain" />

          <View style={{ flex: 1, justifyContent: 'center' }}>
            {content.icon && <View style={{ marginBottom: 14 }}>{content.icon}</View>}
            <AppText display style={{ fontSize: content.big.length > 6 ? 46 : 72, lineHeight: content.big.length > 6 ? 50 : 76, fontWeight: '800', color: INK, letterSpacing: -2 }}>
              {content.big}
            </AppText>
            <AppText display style={{ fontSize: 24, lineHeight: 28, fontWeight: '800', color: INK, marginTop: 4 }}>
              {content.title}
            </AppText>
            {content.subtitle && (
              <AppText style={{ fontSize: 14, lineHeight: 19, color: 'rgba(22,19,31,0.72)', marginTop: 10 }}>{content.subtitle}</AppText>
            )}
            {name && (
              <AppText style={{ fontSize: 14, color: INK, marginTop: 16, fontWeight: '700' }}>
                {isPt ? `${name}, aprendendo inglês com a Charlotte` : `${name}, learning English with Charlotte`}
              </AppText>
            )}
          </View>

          <View style={{ backgroundColor: INK, borderRadius: 16, padding: 14 }}>
            <AppText style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '800' }}>
              {isPt ? 'Vem estudar comigo' : 'Come study with me'}
            </AppText>
            <AppText style={{ fontSize: 13, color: VOLT, fontWeight: '700', marginTop: 2 }}>{shortLink}</AppText>
          </View>
        </View>

        {/* Ações */}
        <View style={{ width: W + 40, marginTop: 22, gap: 10 }}>
          <TouchableOpacity onPress={shareImage} disabled={busy}
            style={{ backgroundColor: VOLT, borderRadius: 999, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <ActivityIndicator color={INK} /> : <ShareNetwork size={20} color={INK} weight="bold" />}
            <AppText style={{ fontSize: 16, fontWeight: '800', color: INK }}>{isPt ? 'Compartilhar imagem' : 'Share image'}</AppText>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={shareLink}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: PAPER }}>{isPt ? 'Enviar convite' : 'Send invite'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={copyLink} disabled={!link}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {copied ? <Check size={16} color={VOLT} weight="bold" /> : <LinkSimple size={16} color={PAPER} weight="bold" />}
              <AppText style={{ fontSize: 14, fontWeight: '700', color: copied ? VOLT : PAPER }}>{copied ? (isPt ? 'Copiado' : 'Copied') : (isPt ? 'Copiar link' : 'Copy link')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
