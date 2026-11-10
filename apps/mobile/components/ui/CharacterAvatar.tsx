// components/ui/CharacterAvatar.tsx — avatar de um personagem da Família Queizy.
// Charlotte usa o CharlotteAvatar de sempre; os outros, a imagem do registro (lib/characters).
import React from 'react';
import { View, Image } from 'react-native';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { characterInfo, impressionInfo } from '@/lib/characters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
const SIZES: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, xxl: 96 };

/** impression = conversa inteira com uma imitação: usa a foto dela (fantasiado), quando houver. */
export default function CharacterAvatar({ character, impression, size = 'md' }: { character?: string | null; impression?: string | null; size?: AvatarSize }) {
  const c = characterInfo(character);
  if (c.id === 'charlotte') return <CharlotteAvatar size={size} />;
  const px = SIZES[size];
  return (
    <View style={{ width: px, height: px, borderRadius: px / 2, overflow: 'hidden', backgroundColor: '#16131F' }}>
      <Image source={impressionInfo(c, impression)?.avatar ?? c.avatar} style={{ width: px, height: px }} resizeMode="cover" />
    </View>
  );
}

/** Personagem do chat atual, para os avatares dentro do ChatBox. */
export const ChatCharacterContext = React.createContext<string>('charlotte');
export function ChatCharacterAvatar({ size = 'xs' }: { size?: AvatarSize }) {
  const character = React.useContext(ChatCharacterContext);
  return <CharacterAvatar character={character} size={size} />;
}
