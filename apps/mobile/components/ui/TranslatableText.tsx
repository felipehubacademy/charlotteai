import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/Text';
import { translate, translatePhrase } from '@/lib/noviceDictionary';
import { TooltipBalloon } from '@/components/ui/TooltipBalloon';

interface Token {
  display: string;      // text to show (with trailing punctuation)
  translation: string | null;
  isPhrase: boolean;    // true if this token groups 2 words
}

interface TooltipState {
  translation: string;
  pageX: number;
  pageY: number;
  wordWidth: number;
}

interface Props {
  text: string;
  style?: any;
}

function parseTokens(text: string): Token[] {
  const raw = text.split(/\s+/).filter(Boolean);
  const tokens: Token[] = [];
  let i = 0;
  while (i < raw.length) {
    const w1 = raw[i];
    const w2 = raw[i + 1];
    // Try 2-word phrase
    if (w2) {
      const phraseTranslation = translatePhrase(w1, w2);
      if (phraseTranslation) {
        tokens.push({ display: w1 + ' ' + w2, translation: phraseTranslation, isPhrase: true });
        i += 2;
        continue;
      }
    }
    // Single word — dialogue labels like "A:" or "B:" are never translated
    const isDialogueLabel = /^[A-Za-z]:$/.test(w1);
    const wordTranslation = isDialogueLabel ? null : translate(w1);
    tokens.push({ display: w1, translation: wordTranslation, isPhrase: false });
    i++;
  }
  return tokens;
}

function WordTooltip({
  tooltip,
  onDismiss,
}: {
  tooltip: TooltipState;
  onDismiss: () => void;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1}>
        <TooltipBalloon
          text={tooltip.translation}
          anchor={{ x: tooltip.pageX, y: tooltip.pageY, width: tooltip.wordWidth }}
          width={160}
        />
      </TouchableOpacity>
    </Modal>
  );
}

function TranslatableWord({
  display,
  translation,
  textStyle,
  onPress,
}: {
  display: string;
  translation: string | null;
  textStyle?: any;
  onPress: (translation: string, pageX: number, pageY: number, width: number) => void;
}) {
  const ref = useRef<View>(null);

  const handlePress = () => {
    if (!translation) return;
    ref.current?.measure((_x, _y, width, _height, pageX, pageY) => {
      onPress(translation, pageX, pageY, width);
    });
  };

  const hasTranslation = !!translation;

  return (
    <TouchableOpacity
      ref={ref as any}
      onPress={handlePress}
      activeOpacity={hasTranslation ? 0.6 : 1}
      disabled={!hasTranslation}
      style={{ marginRight: 3, marginBottom: 2 }}
    >
      <AppText
        style={[
          textStyle,
          hasTranslation && {
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted' as any,
            textDecorationColor: 'rgba(217,119,6,0.55)',
          },
        ]}
      >
        {display}
      </AppText>
    </TouchableOpacity>
  );
}

export function TranslatableText({ text, style }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const tokens = parseTokens(text);

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {tokens.map((token, i) => (
          <TranslatableWord
            key={i}
            display={token.display}
            translation={token.translation}
            textStyle={style}
            onPress={(translation, pageX, pageY, wordWidth) =>
              setTooltip({ translation, pageX, pageY, wordWidth })
            }
          />
        ))}
      </View>

      {tooltip && (
        <WordTooltip tooltip={tooltip} onDismiss={() => setTooltip(null)} />
      )}
    </>
  );
}
