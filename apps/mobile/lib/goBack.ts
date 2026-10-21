// lib/goBack.ts — botão voltar que nunca prende o aluno: sem tela anterior na pilha (o app
// recarregou com a tela aberta, ou ela veio de um link ou de uma notificação), router.back()
// não faz nada; aí vai para a tela inicial (ou para `fallback`, ex.: o login nas telas de quem não entrou).
import { router } from 'expo-router';

export function goBack(fallback: string = '/(app)/(tabs)'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}
