// BluetoothMicHint — dica visual exibida antes/durante exercicios de fala
// quando ha um fone Bluetooth (AirPods) roteando o microfone. O mic HFP do
// fone cai para ~8kHz e degrada o reconhecimento. Nao altera roteamento —
// apenas orienta o aluno (decisao de produto, Opcao A).
//
// Localizado por nivel: Novice = PT-BR, Inter/Advanced = English.
// Sem emojis (SVG icon Phosphor).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Headphones } from 'phosphor-react-native';
import { useBluetoothMicHint } from '../hooks/useBluetoothMicHint';

interface Props {
  level?: string;
  active?: boolean;
  style?: object;
}

export default function BluetoothMicHint({ level = 'Novice', active = true, style }: Props) {
  const { showHint } = useBluetoothMicHint(active);
  if (!showHint) return null;

  const isNovice = level === 'Novice';
  const message = isNovice
    ? 'Fones Bluetooth conectados. Para um reconhecimento melhor da sua voz, use o microfone do iPhone.'
    : "Bluetooth headphones detected. For better speech recognition, use your iPhone's microphone.";

  return (
    <View style={[styles.container, style]}>
      <Headphones size={18} color="#B45309" weight="fill" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '500',
  },
});
