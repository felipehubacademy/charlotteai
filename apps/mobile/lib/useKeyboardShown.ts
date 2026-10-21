// lib/useKeyboardShown.ts — se o teclado está aberto agora.
// Usado para ligar o KeyboardAvoidingView (behavior 'height') no Android só com o teclado aberto:
// em alguns aparelhos com navegação por gestos e Android 15+ (caso real: Galaxy S25 Ultra) ele
// calculava a altura errada com o teclado FECHADO e empurrava o rodapé (botão "Verificar") para fora da tela.
// Uso: behavior={Platform.OS === 'ios' ? 'padding' : keyboardShown ? 'height' : undefined}.
// NÃO usar enabled={keyboardShown}: desligado, o KeyboardAvoidingView não zera a medida do teclado
// ao fechar e a tela seguinte fica com a altura antiga travada (faixa branca embaixo).
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return shown;
}
