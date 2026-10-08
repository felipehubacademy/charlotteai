// ShareCardProvider — um único ShareCardModal para o app inteiro. Qualquer tela
// chama openShareCard(conteúdo). Quem está dentro de outro modal deve fechá-lo
// antes (o iOS não apresenta dois modais ao mesmo tempo).
import React, { createContext, useCallback, useContext, useState } from 'react';
import { ShareCardModal, ShareCardContent } from './ShareCardModal';

const Ctx = createContext<(c: ShareCardContent) => void>(() => {});

export function ShareCardProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ShareCardContent | null>(null);
  const open = useCallback((c: ShareCardContent) => setContent(c), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <ShareCardModal content={content} onClose={() => setContent(null)} />
    </Ctx.Provider>
  );
}

export function useShareCard() {
  return useContext(Ctx);
}
