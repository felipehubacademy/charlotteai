// Flag global "promotion-pending" — quando true, home renderiza um
// overlay cobrindo trail/spinners proprios ate o PromotionModal aparecer.
// Eliminam-se os 2 estagios de loading que o user reportava (spinner
// roxo do guided-chat seguido do spinner cinza do TrailContent quando
// o level muda Novice -> Inter).
//
// Fluxo:
// 1. Guided-chat onPress Concluir (ultima atividade) -> setPromotionPending(true)
// 2. Spinner local do guided-chat mostra
// 3. Navega pra home -> overlay cobre tudo (TrailContent loading nao vaza)
// 4. PromotionModal renderiza por cima
// 5. Modal fecha (ack) -> setPromotionPending(false) -> overlay some

import { useEffect, useState } from 'react';

let pending = false;
const listeners = new Set<() => void>();

export function setPromotionPending(v: boolean) {
  if (pending === v) return;
  pending = v;
  listeners.forEach(l => l());
}

export function isPromotionPending(): boolean { return pending; }

export function subscribePromotionPending(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePromotionPending(): boolean {
  const [, force] = useState({});
  useEffect(() => subscribePromotionPending(() => force({})), []);
  return pending;
}
