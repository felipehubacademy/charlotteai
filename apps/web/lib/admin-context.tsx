'use client';
// Quem está logado no /admin (papel e áreas liberadas), para as páginas
// esconderem ou bloquearem o que o papel não pode usar.

import { createContext, useContext } from 'react';

export interface AdminMe {
  email: string | null;
  name: string | null;
  role: 'owner' | 'partner' | 'finance' | 'support' | 'viewer';
  roleLabel: string;
  areas: string[];
  legacy: boolean;
}

export const AdminMeContext = createContext<AdminMe | null>(null);

export function useAdminMe(): AdminMe | null {
  return useContext(AdminMeContext);
}

export function canArea(me: AdminMe | null, area: string): boolean {
  return !!me && me.areas.includes(area);
}
