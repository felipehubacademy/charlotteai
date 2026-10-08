// Peças visuais compartilhadas pela área de Progresso (stats) e pelas telas
// que abrem a partir dela: Conquistas, Ranking e Metas. Paleta Queizy;
// textos de interface no idioma do device (systemIsPt).

import React from 'react';
import { View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, CaretRight, Lightning, Fire, Star, Microphone, PencilLine,
  GraduationCap, Sun, CalendarCheck, X, Lock, CheckCircle,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { CatalogEntry } from '@/lib/achievementsCatalog';
import { Mission } from '@/lib/missions';

export const C = {
  bg:     '#FAF7F0',
  card:   '#FFFFFF',
  ink:    '#16131F',
  mid:    '#4D4858',
  light:  '#8A8494',
  ghost:  'rgba(22,19,31,0.06)',
  border: 'rgba(22,19,31,0.08)',
  volt:   '#DCFF4A',
  voltBg: '#F1FFB8',
  green:  '#08804A',
  greenBright: '#2BD97C',
  pink:   '#FF4F8B',
};

// ── Cabeçalho das telas empilhadas ──────────────────────────────────────────

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.ink} weight="bold" />
        </TouchableOpacity>
        <AppText display style={{ flex: 1, fontSize: 20, fontWeight: '800', color: C.ink }}>
          {title}
        </AppText>
        {right}
      </View>
    </SafeAreaView>
  );
}

// ── Título de seção com contador e seta para expandir ───────────────────────

export function SectionTitle({ title, meta, onPress }: { title: string; meta?: string; onPress?: () => void }) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 12, gap: 8 }}>
      <AppText display style={{ flex: 1, fontSize: 19, fontWeight: '800', color: C.ink }}>{title}</AppText>
      {meta ? (
        <AppText style={{ fontSize: 13, fontWeight: '700', color: C.light }}>{meta}</AppText>
      ) : null}
      {onPress ? (
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.ghost, alignItems: 'center', justifyContent: 'center' }}>
          <CaretRight size={14} color={C.ink} weight="bold" />
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      backgroundColor: C.card, borderRadius: 20, marginHorizontal: 16, padding: 16,
      borderWidth: 1, borderColor: C.border,
    }, style]}>
      {children}
    </View>
  );
}

// ── Conquistas ──────────────────────────────────────────────────────────────

// Raridade na paleta: comum verde, rara violeta, épica rosa, lendária Tinta + Volt.
export const RARITY: Record<string, { color: string; bg: string; pt: string; en: string }> = {
  common:    { color: '#08804A', bg: '#E3F6EC', pt: 'Comum',    en: 'Common' },
  rare:      { color: '#6B4BFF', bg: '#EFECFF', pt: 'Rara',     en: 'Rare' },
  epic:      { color: '#FF4F8B', bg: '#FFEEF4', pt: 'Épica',    en: 'Epic' },
  legendary: { color: '#DCFF4A', bg: '#16131F', pt: 'Lendária', en: 'Legendary' },
};

export function AchievementIcon({ category, color, size = 22 }: { category: string; color: string; size?: number }) {
  switch (category) {
    case 'xp':
    case 'xp_milestone': return <Lightning     size={size} color={color} weight="fill" />;
    case 'streak':       return <Fire          size={size} color={color} weight="fill" />;
    case 'audio':        return <Microphone    size={size} color={color} weight="fill" />;
    case 'grammar':
    case 'text':         return <PencilLine    size={size} color={color} weight="fill" />;
    case 'learn':        return <GraduationCap size={size} color={color} weight="fill" />;
    case 'habit':        return <Sun           size={size} color={color} weight="fill" />;
    case 'consistency':  return <CalendarCheck size={size} color={color} weight="fill" />;
    default:             return <Star          size={size} color={color} weight="fill" />;
  }
}

export function badgeTitle(cat: CatalogEntry | undefined, fallback: string, isPt: boolean) {
  if (!cat) return fallback;
  return isPt ? cat.title : (cat.titleEN ?? cat.title);
}

/** Medalha redonda + nome. Conquistada = cor da raridade; bloqueada = neutra. */
export function BadgeMedal({ category, rarity, earned, label, xp, size = 56, onPress }: {
  category: string; rarity: string; earned: boolean; label: string;
  xp?: number; size?: number; onPress?: () => void;
}) {
  const r = RARITY[rarity] ?? RARITY.common;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width: size + 28, alignItems: 'center' }}>
      <View style={{ width: size, height: size, marginBottom: 7 }}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: earned ? r.bg : C.ghost,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AchievementIcon category={category} color={earned ? r.color : 'rgba(22,19,31,0.22)'} size={size * 0.45} />
        </View>
        {!earned && (
          <View style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 20, height: 20, borderRadius: 10, backgroundColor: C.card,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={11} color={C.light} weight="bold" />
          </View>
        )}
        {xp ? (
          <View style={{
            position: 'absolute', top: -6, right: -12,
            backgroundColor: earned ? C.ink : '#E9E6EE',
            borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2,
            borderWidth: 1.5, borderColor: C.bg,
          }}>
            <AppText style={{ fontSize: 9, fontWeight: '800', color: earned ? C.volt : C.light }}>+{xp}</AppText>
          </View>
        ) : null}
      </View>
      <AppText numberOfLines={2} style={{
        fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14,
        color: earned ? C.ink : C.light,
      }}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

export function BadgeModal({ cat, earnedAt, isPt, onClose, onShare }: {
  cat: CatalogEntry; earnedAt?: Date | null; isPt: boolean; onClose: () => void;
  /** Conquistas ganhas: fecha o modal e abre o card de compartilhamento. */
  onShare?: (title: string) => void;
}) {
  const earned = !!earnedAt;
  const r = RARITY[cat.rarity] ?? RARITY.common;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        onPress={onClose}
      >
        <Pressable onPress={e => e.stopPropagation()} style={{ width: '100%' }}>
          <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 24, alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 16, right: 16 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={C.light} weight="bold" />
            </TouchableOpacity>

            <View style={{
              width: 88, height: 88, borderRadius: 44, marginTop: 6, marginBottom: 14,
              backgroundColor: earned ? r.bg : C.ghost, alignItems: 'center', justifyContent: 'center',
            }}>
              <AchievementIcon category={cat.category} color={earned ? r.color : 'rgba(22,19,31,0.22)'} size={40} />
            </View>

            <View style={{
              paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8,
              backgroundColor: earned ? r.bg : C.ghost,
            }}>
              <AppText style={{
                fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8,
                color: earned ? r.color : C.light,
              }}>
                {isPt ? r.pt : r.en}
              </AppText>
            </View>

            <AppText display style={{ fontSize: 24, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 8 }}>
              {badgeTitle(cat, cat.title, isPt)}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.mid, textAlign: 'center', lineHeight: 21, marginBottom: 18 }}>
              {isPt ? cat.howToEarnPT : cat.howToEarnEN}
            </AppText>

            {earned && earnedAt ? (
              <View style={{
                alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#E3F6EC', borderRadius: 14, paddingVertical: 12,
              }}>
                <CheckCircle size={16} color={C.green} weight="fill" />
                <AppText style={{ fontSize: 13, fontWeight: '700', color: C.green }}>
                  {(isPt ? 'Conquistada em ' : 'Earned on ') + earnedAt.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {cat.xpReward > 0 ? ` · +${cat.xpReward} XP` : ''}
                </AppText>
              </View>
            ) : (
              null
            )}
            {earned && onShare && (
              <TouchableOpacity onPress={() => onShare(badgeTitle(cat, cat.title, isPt))}
                style={{ alignSelf: 'stretch', marginTop: 10, backgroundColor: C.ink, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: C.volt }}>{isPt ? 'Compartilhar' : 'Share'}</AppText>
              </TouchableOpacity>
            )}
            {earned ? null : (
              <View style={{
                alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: C.ghost, borderRadius: 14, paddingVertical: 12,
              }}>
                <Lock size={14} color={C.mid} weight="bold" />
                <AppText style={{ fontSize: 13, fontWeight: '700', color: C.mid }}>
                  {cat.xpReward > 0
                    ? (isPt ? `Vale +${cat.xpReward} XP` : `Worth +${cat.xpReward} XP`)
                    : (isPt ? 'Ainda não conquistada' : 'Not earned yet')}
                </AppText>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Ranking ─────────────────────────────────────────────────────────────────

export function firstName(name: string, fallback: string) {
  const f = (name ?? '').trim().split(/\s+/)[0];
  return f || fallback;
}

/** Linha do ranking. 1º lugar com selo Volt; o aluno com fundo Volt claro. */
export function RankRow({ rank, name, xp, isUser, youLabel, last }: {
  rank: number; name: string; xp: number; isUser: boolean; youLabel: string; last?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 11, paddingHorizontal: isUser ? 10 : 0,
      marginHorizontal: isUser ? -10 : 0,
      backgroundColor: isUser ? C.voltBg : 'transparent',
      borderRadius: isUser ? 14 : 0,
      borderBottomWidth: last || isUser ? 0 : 1, borderBottomColor: C.border,
    }}>
      <View style={{
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: rank === 1 ? C.volt : rank <= 3 ? C.ghost : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <AppText display style={{ fontSize: 14, fontWeight: '800', color: rank <= 3 ? C.ink : C.light }}>
          {rank}
        </AppText>
      </View>
      <AppText numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: isUser ? '800' : '600', color: C.ink }}>
        {name}
        {isUser ? <AppText style={{ fontSize: 13, fontWeight: '600', color: C.mid }}>{`  ${youLabel}`}</AppText> : null}
      </AppText>
      <AppText style={{ fontSize: 14, fontWeight: '800', color: isUser ? C.ink : C.mid }}>
        {xp.toLocaleString()} XP
      </AppText>
    </View>
  );
}

// ── Metas ───────────────────────────────────────────────────────────────────

/** Missão do dia. compact = linha da prévia; senão, cartão completo. */
export function MissionRow({ mission, isPt, compact, onPress, last }: {
  mission: Mission; isPt: boolean; compact?: boolean; onPress?: () => void; last?: boolean;
}) {
  const done = mission.completed;
  const icon = (
    <View style={{
      width: compact ? 36 : 46, height: compact ? 36 : 46, borderRadius: compact ? 18 : 23,
      backgroundColor: done ? '#E3F6EC' : mission.accentBg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {done
        ? <CheckCircle size={compact ? 20 : 24} color={C.green} weight="fill" />
        : React.isValidElement(mission.icon)
          ? React.cloneElement(mission.icon as React.ReactElement<any>, { size: compact ? 18 : 22 })
          : mission.icon}
    </View>
  );
  const xpPill = (
    <View style={{
      backgroundColor: done ? '#E3F6EC' : C.ghost,
      borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    }}>
      <AppText style={{ fontSize: 11, fontWeight: '800', color: done ? C.green : C.mid }}>
        +{mission.xpReward} XP
      </AppText>
    </View>
  );

  if (compact) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border,
      }}>
        {icon}
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 14, fontWeight: '700', color: done ? C.light : C.ink }}>{mission.label}</AppText>
          {!done && (
            <AppText style={{ fontSize: 12, color: C.light, marginTop: 1 }}>{mission.progressLabel}</AppText>
          )}
        </View>
        {xpPill}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={done ? 1 : 0.8}
      onPress={done ? undefined : onPress}
      style={{
        backgroundColor: C.card, borderRadius: 20, marginHorizontal: 16, marginBottom: 10,
        padding: 16, borderWidth: 1, borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: done ? C.light : C.ink }}>{mission.label}</AppText>
          <AppText style={{ fontSize: 12, color: C.light, marginTop: 2 }}>
            {done ? (isPt ? 'Concluída hoje' : 'Completed today') : mission.sub}
          </AppText>
        </View>
        {xpPill}
      </View>
      {!done && (
        <View style={{ marginTop: 12 }}>
          <QueizyWave progress={mission.progress} height={12} strokeWidth={3.5} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: C.light }}>{mission.progressLabel}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: C.ink }}>{isPt ? 'Fazer agora' : 'Do it now'}</AppText>
              <CaretRight size={11} color={C.ink} weight="bold" />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
