'use client';
// Quem está logado no /admin (papel e áreas liberadas), para as páginas
// esconderem ou bloquearem o que o papel não pode usar.

import { createContext, useContext } from 'react';
import type { AdminRole, AdminArea } from '@/lib/admin-roles';

export interface AdminMe {
  email: string | null;
  name: string | null;
  role: AdminRole;
  roleLabel: string;
  areas: string[];
  legacy: boolean;
}

export const AdminMeContext = createContext<AdminMe | null>(null);

export function useAdminMe(): AdminMe | null {
  return useContext(AdminMeContext);
}

export function canArea(me: AdminMe | null, area: AdminArea): boolean {
  return !!me && me.areas.includes(area);
}
