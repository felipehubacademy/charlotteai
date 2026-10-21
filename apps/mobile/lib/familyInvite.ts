// lib/familyInvite.ts — quando mostrar o convite "Conheça a Família Queizy" na Tela Inicial.
// Só para quem nunca escolheu outro membro da Família. Nos primeiros 7 dias da conta aparece
// todo dia (o "x" esconde até o dia seguinte); depois, uma vez por semana. Some de vez quando o
// aluno escolhe alguém na Família (ou já está com outro membro na Tela Inicial).
import * as SecureStore from 'expo-secure-store';

const PICKED_KEY    = 'family_member_picked';
const DISMISSED_KEY = 'family_invite_dismissed_at';
const DAY = 86_400_000;

export async function markFamilyMemberPicked() {
  await SecureStore.setItemAsync(PICKED_KEY, '1').catch(() => {});
}

export async function dismissFamilyInvite() {
  await SecureStore.setItemAsync(DISMISSED_KEY, String(Date.now())).catch(() => {});
}

export async function shouldShowFamilyInvite(activeCharacter: string | null | undefined, accountCreatedAt: string | null | undefined): Promise<boolean> {
  if (activeCharacter && activeCharacter !== 'charlotte') { await markFamilyMemberPicked(); return false; }
  const picked = await SecureStore.getItemAsync(PICKED_KEY).catch(() => null);
  if (picked) return false;
  const last = Number(await SecureStore.getItemAsync(DISMISSED_KEY).catch(() => null)) || 0;
  if (!last) return true;
  const created = accountCreatedAt ? new Date(accountCreatedAt).getTime() : 0;
  const isFirstWeek = created > 0 && Date.now() - created < 7 * DAY;
  if (isFirstWeek) return new Date(last).toDateString() !== new Date().toDateString(); // 1x por dia
  return Date.now() - last >= 7 * DAY;                                                  // 1x por semana
}
