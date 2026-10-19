// hooks/useKeyboardOpen.ts — true enquanto o teclado está aberto.
// Usado nas telas de chat para recolher o que não precisa aparecer e tirar a margem da barra
// de navegação de baixo (o teclado já a cobre, e a margem virava um vão acima dele).
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}
