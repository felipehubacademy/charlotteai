// Sugestão diária ancorada ABAIXO do pill (seta pra cima). Persistente: só
// fecha via botão X no balão ou ao tocar no pill sugerido (que dispara
// dismiss via handleModeSwitch no practice.tsx). Sem auto-dismiss.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TooltipBalloon, TooltipAnchor } from '@/components/ui/TooltipBalloon';

interface Props {
  visible: boolean;
  text:    string;
  anchor:  TooltipAnchor | null;
  onClose: () => void;
}

export function PracticeSuggestionTooltip({ visible, text, anchor, onClose }: Props) {
  if (!visible || !anchor) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TooltipBalloon
        text={text}
        anchor={anchor}
        width={240}
        arrowDirection="up"
        onClose={onClose}
      />
    </View>
  );
}
