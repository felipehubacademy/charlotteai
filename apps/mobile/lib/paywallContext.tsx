import { createContext, useContext, useState, ReactNode } from 'react';

/** De onde a oferta foi aberta: muda a frase do paywall (degustação). */
export type PaywallReason = 'placement' | 'track' | 'trail' | 'taste_today' | 'taste_done' | 'taste_extra' | null;

/** Degustação: próximo tópico da trilha, para a "atividade extra" (1x por dia) oferecida no fim do tópico do dia. */
export type PaywallNext = { level: string; moduleId: string; unitId: string } | null;

interface PaywallContextType {
  paywallOpen: boolean;
  paywallReason: PaywallReason;
  paywallNext: PaywallNext;
  openPaywall: (reason?: PaywallReason, next?: PaywallNext) => void;
  closePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextType>({
  paywallOpen: false,
  paywallReason: null,
  paywallNext: null,
  openPaywall: () => {},
  closePaywall: () => {},
});

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>(null);
  const [paywallNext, setPaywallNext] = useState<PaywallNext>(null);
  return (
    <PaywallContext.Provider value={{
      paywallOpen,
      paywallReason,
      paywallNext,
      // Só aceita o motivo em texto: passado direto num onPress, chegava o evento do toque e ia para a métrica.
      openPaywall: (reason?: PaywallReason, next?: PaywallNext) => {
        setPaywallReason(typeof reason === 'string' ? reason : null);
        setPaywallNext(next && typeof next === 'object' && 'unitId' in next ? next : null);
        setPaywallOpen(true);
      },
      closePaywall: () => setPaywallOpen(false),
    }}>
      {children}
    </PaywallContext.Provider>
  );
}

export const usePaywallContext = () => useContext(PaywallContext);
