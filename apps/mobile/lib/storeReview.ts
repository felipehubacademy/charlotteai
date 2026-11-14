// lib/storeReview.ts — pedido de avaliação na loja (App Store / Google Play), nativo.
//
// Sem pergunta antes ("Está gostando?"): o Google Play proíbe perguntar a opinião antes do
// pedido de avaliação, e a Apple pede a tela dela (SKStoreReviewController). Então o app só
// escolhe um BOM MOMENTO: ao voltar para a Início depois de concluir tópicos.
// Regras: conta com 3+ dias, 3+ tópicos concluídos desde o último pedido, no máximo 1 pedido a
// cada 90 dias e 3 no total. A loja ainda decide se mostra (o iOS limita a 3 por ano).
import * as SecureStore from 'expo-secure-store';
import { StoreReview } from '@/lib/nativeOptional';

const KEY = 'store_review_state';
const DAY = 86_400_000;
interface State { topics: number; asks: number; lastAskAt: number }

async function read(): Promise<State> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) return { topics: 0, asks: 0, lastAskAt: 0, ...JSON.parse(raw) };
  } catch { /* sem estado salvo */ }
  return { topics: 0, asks: 0, lastAskAt: 0 };
}
async function write(s: State) { await SecureStore.setItemAsync(KEY, JSON.stringify(s)).catch(() => {}); }

/** Chamar quando o aluno conclui um tópico (as 4 atividades). */
export async function noteTopicCompleted() {
  const s = await read();
  await write({ ...s, topics: s.topics + 1 });
}

/** Chamar com a Início em foco. Pede a avaliação se for um bom momento. */
export async function maybeRequestReview(accountCreatedAt: string | null | undefined): Promise<boolean> {
  if (!StoreReview) return false;
  const s = await read();
  const created = accountCreatedAt ? new Date(accountCreatedAt).getTime() : 0;
  if (!created || Date.now() - created < 3 * DAY) return false;
  if (s.topics < 3 || s.asks >= 3) return false;
  if (s.lastAskAt && Date.now() - s.lastAskAt < 90 * DAY) return false;
  try {
    if (!(await StoreReview.hasAction())) return false;
    await write({ topics: 0, asks: s.asks + 1, lastAskAt: Date.now() });
    await StoreReview.requestReview();
    return true;
  } catch { return false; }
}
