// Sugestão diária ancorada num pill do toggle de modos do Practice.
// Auto-dismiss em 5s. Tap fora não fecha (pointerEvents='none'). Tocar no pill
// sugerido fecha naturalmente via handleModeSwitch que limpa o state.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TooltipBalloon, TooltipAnchor } from '@/components/ui/TooltipBalloon';

interface Props {
  visible:    boolean;
  text:       string;
  anchor:     TooltipAnchor | null;
  onAutoDismiss: () => void;
  durationMs?: number;
}

export function PracticeSuggestionTooltip({
  visible, text, anchor, onAutoDismiss,
  durationMs = 5000,
}: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onAutoDismiss, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onAutoDismiss]);

  if (!visible || !anchor) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <TooltipBalloon text={text} anchor={anchor} width={240} />
    </View>
  );
}
