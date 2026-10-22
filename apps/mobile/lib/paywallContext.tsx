import { createContext, useContext, useState, ReactNode } from 'react';

/** De onde a oferta foi aberta: muda a frase do paywall (degustação). */
export type PaywallReason = 'placement' | 'track' | 'trail' | 'taste_done' | null;

interface PaywallContextType {
  paywallOpen: boolean;
  paywallReason: PaywallReason;
  openPaywall: (reason?: PaywallReason) => void;
  closePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextType>({
  paywallOpen: false,
  paywallReason: null,
  openPaywall: () => {},
  closePaywall: () => {},
});

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>(null);
  return (
    <PaywallContext.Provider value={{
      paywallOpen,
      paywallReason,
      openPaywall:  (reason?: PaywallReason) => { setPaywallReason(reason ?? null); setPaywallOpen(true); },
      closePaywall: () => setPaywallOpen(false),
    }}>
      {children}
    </PaywallContext.Provider>
  );
}

export const usePaywallContext = () => useContext(PaywallContext);
